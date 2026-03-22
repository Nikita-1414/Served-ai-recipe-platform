"use server";

import { checkUser } from "@/lib/checkUser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { freeMealRecommendations, proTierLimit } from "@/lib/arcjet";
import { request } from "@arcjet/next";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper function to normalize recipe title
function normalizeTitle(title) {
  return title
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Helper function to normalize recipe data from Strapi to match component expectations
function normalizeRecipeFromDB(strapiRecipe) {
  // Helper to generate intelligent description from recipe metadata
  const generateDescriptionFromMetadata = (recipe) => {
    if (!recipe) return "A delicious recipe";
    
    const { title, category, cuisine, servings, cooktime, preptime } = recipe;
    const totalTime = (parseInt(cooktime) || 0) + (parseInt(preptime) || 0);
    const categoryDisplay = category ? category.charAt(0).toUpperCase() + category.slice(1) : "dish";
    const cuisineDisplay = cuisine ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1).replace("-", " ") : "international";
    
    const descriptions = {
      breakfast: `A delightful ${cuisineDisplay} breakfast ${categoryDisplay} that takes ${totalTime} minutes to prepare.`,
      lunch: `A satisfying ${cuisineDisplay} ${categoryDisplay} perfect for lunch, ready in just ${totalTime} minutes.`,
      dinner: `An elegant ${cuisineDisplay} ${categoryDisplay} ideal for dinner, prepared in ${totalTime} minutes.`,
      snack: `A quick and easy ${cuisineDisplay} snack that comes together in just ${totalTime} minutes.`,
      dessert: `A delectable ${cuisineDisplay} ${categoryDisplay} that will impress your guests in ${totalTime} minutes.`,
    };
    
    return descriptions[category] || `A wonderful ${cuisineDisplay} ${categoryDisplay} recipe serving ${servings || 1} people.`;
  };
  
  // Helper to extract text from various description formats
  const extractDescription = (desc, recipe) => {
    if (!desc) {
      return generateDescriptionFromMetadata(recipe);
    }
    
    // If it's a string, return it directly
    if (typeof desc === "string") {
      const trimmed = desc.trim();
      if (trimmed && trimmed.length > 0 && trimmed !== "A delicious recipe") {
        return trimmed;
      }
      return generateDescriptionFromMetadata(recipe);
    }
    
    // If it's blocks format from Strapi rich text editor
    if (typeof desc === "object") {
      try {
        let extractedText = "";
        
        // Handle Strapi's blocks format
        if (desc.content && Array.isArray(desc.content)) {
          extractedText = desc.content
            .map((block) => {
              // For paragraph blocks
              if (block.type === "paragraph" && block.content && Array.isArray(block.content)) {
                return block.content
                  .map((item) => item.text || "")
                  .join("");
              }
              // For heading blocks
              if (block.type === "heading" && block.content && Array.isArray(block.content)) {
                return block.content
                  .map((item) => item.text || "")
                  .join("");
              }
              // Fallback for other block types
              return "";
            })
            .filter((text) => text.trim().length > 0)
            .join(" ")
            .trim();
        }
        
        if (extractedText && extractedText.length > 0 && extractedText !== "A delicious recipe") {
          return extractedText;
        }
      } catch (e) {
        console.error("Error extracting description from blocks:", e, desc);
      }
    }
    
    return generateDescriptionFromMetadata(recipe);
  };

  // Convert Strapi field names (lowercase) to component expected names (camelCase)
  const normalized = {
    ...strapiRecipe,
    // Map field names from Strapi schema to expected component names
    prepTime: Number(strapiRecipe.preptime || strapiRecipe.prepTime || 0),
    cookTime: Number(strapiRecipe.cooktime || strapiRecipe.cookTime || 0),
    servings: Number(strapiRecipe.serving || strapiRecipe.servings || 1),
    // Properly extract description from blocks format with intelligent fallback
    description: extractDescription(strapiRecipe.description, strapiRecipe),
    // Ensure imageUrl is present
    imageUrl: strapiRecipe.imageUrl || "",
  };

  console.log("📦 Normalized recipe:", {
    title: normalized.title,
    prepTime: normalized.prepTime,
    cookTime: normalized.cookTime,
    servings: normalized.servings,
    descriptionLength: normalized.description?.length || 0,
    description: normalized.description?.substring(0, 100) + "...",
    imageUrl: normalized.imageUrl,
  });

  return normalized;
}

// Helper function to fetch image from Unsplash or use fallback
async function fetchRecipeImage(recipeName) {
  try {
    if (!UNSPLASH_ACCESS_KEY) {
      console.warn("⚠️ UNSPLASH_ACCESS_KEY not set, skipping image fetch");
      return "";
    }

    const searchQuery = `${recipeName}`;
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        searchQuery
      )}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error("❌ Unsplash API error:", response.statusText);
      // Try fallback: use a placeholder image from a public source
      return `https://images.unsplash.com/photo-1495624861653-28add1d32d8d?w=800&q=80`; // Fork and knife image
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const photo = data.results[0];
      console.log("✅ Found Unsplash image:", photo.urls.regular);
      return photo.urls.regular;
    }

    console.log("ℹ️ No Unsplash image found for:", recipeName);
    return ""; // Will show placeholder
  } catch (error) {
    console.error("❌ Error fetching image:", error.message);
    return ""; // Will show placeholder
  }
}

// Get or generate recipe details
export async function getOrGenerateRecipe(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const recipeName = formData.get("recipeName");
    if (!recipeName) {
      throw new Error("Recipe name is required");
    }

    // Normalize the title (e.g., "apple cake" → "Apple Cake")
    const normalizedTitle = normalizeTitle(recipeName);
    console.log("🔍 Searching for recipe:", normalizedTitle);

    const isPro = user.subscriptionTier === "pro";

    // Step 1: Check if recipe already exists in DB (case-insensitive search)
    const searchResponse = await fetch(
      `${STRAPI_URL}/api/recipes?filters[title][$eqi]=${encodeURIComponent(
        normalizedTitle
      )}&populate=*`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();

      if (searchData.data && searchData.data.length > 0) {
        console.log("✅ Recipe found in database:", searchData.data[0].id);

        // Check if user has saved this recipe
        const savedRecipeResponse = await fetch(
          `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${searchData.data[0].id}`,
          {
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            cache: "no-store",
          }
        );

        let isSaved = false;
        if (savedRecipeResponse.ok) {
          const savedData = await savedRecipeResponse.json();
          isSaved = savedData.data && savedData.data.length > 0;
        }

        // Normalize recipe data from Strapi to match component expectations
        let normalizedRecipe = normalizeRecipeFromDB(searchData.data[0]);

        // If recipe doesn't have an image, fetch one now
        if (!normalizedRecipe.imageUrl) {
          console.log("🖼️ Recipe has no image, fetching from Unsplash...");
          const imageUrl = await fetchRecipeImage(normalizedRecipe.title);
          normalizedRecipe = {
            ...normalizedRecipe,
            imageUrl: imageUrl || "",
          };

          // Optionally update Strapi with the image URL
          if (imageUrl) {
            console.log("📤 Updating recipe in database with image...");
            await fetch(
              `${STRAPI_URL}/api/recipes/${searchData.data[0].id}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
                },
                body: JSON.stringify({
                  data: {
                    imageUrl: imageUrl,
                  },
                }),
              }
            ).catch((err) =>
              console.log("ℹ️ Could not update recipe in DB:", err.message)
            );
          }
        }

        return {
          success: true,
          recipe: normalizedRecipe,
          recipeId: searchData.data[0].id,
          isSaved: isSaved,
          fromDatabase: true,
          isPro,
          message: "Recipe loaded from database",
        };
      }
    }

    // Step 2: Recipe doesn't exist, generate with Gemini
    console.log("🤖 Recipe not found, generating with Gemini...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
You are a professional chef and recipe expert. Generate a detailed recipe for: "${normalizedTitle}"

CRITICAL REQUIREMENTS:
1. The "title" field MUST be EXACTLY: "${normalizedTitle}" (no changes, no additions)
2. The "description" field MUST be 3-5 complete sentences (never just one short sentence)
3. Description MUST include: what the dish is, origin/cuisine, flavor profile, texture, why it's special
4. Description MUST NEVER be "A delicious recipe" - it must be SPECIFIC and DETAILED

Return ONLY a valid JSON object with this EXACT structure (no markdown, no code blocks):
{
  "title": "${normalizedTitle}",
  "description": "Start with a clear statement of what this dish is. Then explain its cultural origin and why it matters. Describe the flavor profiles and textures people will experience. Finally, explain why someone should make this dish. Make it engaging and specific to ${normalizedTitle}, not generic.",
  "category": "Must be ONE of these EXACT values: breakfast, lunch, dinner, snack, dessert",
  "cuisine": "Must be ONE of these EXACT values: italian, chinese, mexican, indian, american, thai, japanese, mediterranean, french, korean, vietnamese, spanish, greek, turkish, moroccan, brazilian, caribbean, middle-eastern, british, german, portuguese, other",
  "prepTime": "Time in minutes (number only)",
  "cookTime": "Time in minutes (number only)",
  "servings": "Number of servings (number only)",
  "ingredients": [
    {
      "item": "ingredient name",
      "amount": "quantity with unit",
      "category": "Protein|Vegetable|Spice|Dairy|Grain|Other"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "title": "Brief step title",
      "instruction": "Detailed step instruction",
      "tip": "Optional cooking tip for this step"
    }
  ],
  "nutrition": {
    "calories": "calories per serving",
    "protein": "grams",
    "carbs": "grams",
    "fat": "grams"
  },
  "tips": [
    "General cooking tip 1",
    "General cooking tip 2",
    "General cooking tip 3"
  ],
  "substitutions": [
    {
      "original": "ingredient name",
      "alternatives": ["substitute 1", "substitute 2"]
    }
  ]
}

IMPORTANT - DESCRIPTION EXAMPLES:
❌ WRONG: "A delicious recipe"
❌ WRONG: "Brief 2-3 sentence description"
✅ RIGHT: "Pad Thai is a stir-fried noodle dish from Thailand that perfectly balances sweet, sour, spicy, and savory flavors. This beloved street food combines soft rice noodles with protein, vegetables, and a tangy tamarind-lime sauce. The dish offers a wonderful contrast of textures - chewy noodles, crispy peanuts, and tender ingredients. Pad Thai is quick to prepare yet delivers complex, restaurant-quality flavor that makes it a favorite worldwide."

IMPORTANT RULES FOR CATEGORY:
- Breakfast items (pancakes, eggs, cereal, etc.) → "breakfast"
- Main meals for midday (sandwiches, salads, pasta, etc.) → "lunch"
- Main meals for evening (heavier dishes, roasts, etc.) → "dinner"
- Light items between meals (chips, crackers, fruit, etc.) → "snack"
- Sweet treats (cakes, cookies, ice cream, etc.) → "dessert"

IMPORTANT RULES FOR CUISINE:
- Use lowercase only
- Pick the closest match from the allowed values
- If uncertain, use "other"

Guidelines:
- Make ingredients realistic and commonly available
- Instructions should be clear and beginner-friendly
- Include 6-10 detailed steps
- Provide practical cooking tips
- Estimate realistic cooking times
- Keep total instructions under 12 steps
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let recipeData;
    try {
      const cleanText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      recipeData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Failed to generate recipe. Please try again.");
    }

    // FORCE the title to be our normalized version
    recipeData.title = normalizedTitle;
    
    // Log the description from Gemini to verify it's complete
    console.log("🤖 Gemini Generated Description:", {
      length: recipeData.description?.length || 0,
      preview: recipeData.description?.substring(0, 150) || "NO DESCRIPTION",
      fullDescription: recipeData.description || "EMPTY",
    });

    // Validate and sanitize category
    const validCategories = [
      "breakfast",
      "lunch",
      "dinner",
      "snack",
      "dessert",
    ];
    const category = validCategories.includes(
      recipeData.category?.toLowerCase()
    )
      ? recipeData.category.toLowerCase()
      : "dinner";

    // Validate and sanitize cuisine
    const validCuisines = [
      "italian",
      "chinese",
      "mexican",
      "indian",
      "american",
      "thai",
      "japanese",
      "mediterranean",
      "french",
      "korean",
      "vietnamese",
      "spanish",
      "greek",
      "turkish",
      "moroccan",
      "brazilian",
      "caribbean",
      "middle - eastern",
      "british",
      "german",
      "portuguese",
      "other",
    ];
    let cuisine = (recipeData.cuisine?.toLowerCase() || "other").replace(
      /middle-eastern/,
      "middle - eastern"
    );
    cuisine = validCuisines.includes(cuisine) ? cuisine : "other";

    // Step 3: Fetch image from Unsplash
    console.log("🖼️ Fetching image from Unsplash...");
    const imageUrl = await fetchRecipeImage(normalizedTitle);

    // Step 4: Save generated recipe to database
    const strapiRecipeData = {
      data: {
        title: normalizedTitle,
        description: recipeData.description,
        cuisine,
        category,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        preptime: Number(recipeData.prepTime),
        cooktime: Number(recipeData.cookTime),
        serving: Number(recipeData.servings),
        nutrition: recipeData.nutrition,
        tips: recipeData.tips,
        substitutions: recipeData.substitutions,
        imageUrl: imageUrl || "",
        isPublic: true,
        author: user.id,
      },
    };

    console.log(
      "📤 Saving new recipe to database with title:",
      normalizedTitle
    );

    const createRecipeResponse = await fetch(`${STRAPI_URL}/api/recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify(strapiRecipeData),
    });

    if (!createRecipeResponse.ok) {
      const errorText = await createRecipeResponse.text();
      console.error("❌ Failed to save recipe:");
      console.error("   Status:", createRecipeResponse.status);
      console.error("   Response:", errorText);
      console.error("   Strapi URL:", STRAPI_URL);
      console.error("   Sent data keys:", Object.keys(strapiRecipeData.data));
      throw new Error(
        `Failed to save recipe to database (${createRecipeResponse.status}): ${errorText}`
      );
    }

    const createdRecipe = await createRecipeResponse.json();
    console.log("✅ Recipe saved to database:", createdRecipe.data.id);

    return {
      success: true,
      recipe: {
        ...recipeData,
        title: normalizedTitle,
        category,
        cuisine,
        imageUrl: imageUrl || "",
      },
      recipeId: createdRecipe.data.id,
      isSaved: false,
      fromDatabase: false,
      recommendationsLimit: isPro ? "unlimited" : 5,
      isPro,
      message: "Recipe generated and saved successfully!",
    };
  } catch (error) {
    console.error("❌ Error in getOrGenerateRecipe:", error.message);
    console.error("   Full error:", error);
    console.error("   Stack:", error.stack);
    console.error("   Strapi URL:", STRAPI_URL);
    console.error("   Has API Token:", !!STRAPI_API_TOKEN);
    throw new Error(error.message || "Failed to load recipe");
  }
}

// Save recipe to user's collection (bookmark)
export async function saveRecipeToCollection(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const recipeId = formData.get("recipeId");
    if (!recipeId) {
      throw new Error("Recipe ID is required");
    }

    // Check if already saved
    const existingResponse = await fetch(
      `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipeId}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      if (existingData.data && existingData.data.length > 0) {
        return {
          success: true,
          alreadySaved: true,
          message: "Recipe is already in your collection",
        };
      }
    }

    // Create saved recipe relation
    const saveResponse = await fetch(`${STRAPI_URL}/api/saved-recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          user: user.id,
          recipe: recipeId,
          savedAt: new Date().toISOString(),
        },
      }),
    });

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      console.error("❌ Failed to save recipe:", errorText);
      throw new Error("Failed to save recipe to collection");
    }

    const savedRecipe = await saveResponse.json();
    console.log("✅ Recipe saved to user collection:", savedRecipe.data.id);

    return {
      success: true,
      alreadySaved: false,
      savedRecipe: savedRecipe.data,
      message: "Recipe saved to your collection!",
    };
  } catch (error) {
    console.error("❌ Error saving recipe to collection:", error);
    throw new Error(error.message || "Failed to save recipe");
  }
}

// Remove recipe from user's collection (unbookmark)
export async function removeRecipeFromCollection(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const recipeId = formData.get("recipeId");
    if (!recipeId) {
      throw new Error("Recipe ID is required");
    }

    // Find saved recipe relation
    const searchResponse = await fetch(
      `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipeId}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!searchResponse.ok) {
      throw new Error("Failed to find saved recipe");
    }

    const searchData = await searchResponse.json();

    if (!searchData.data || searchData.data.length === 0) {
      return {
        success: true,
        message: "Recipe was not in your collection",
      };
    }

    // Delete saved recipe relation
    const savedRecipeId = searchData.data[0].id;
    const deleteResponse = await fetch(
      `${STRAPI_URL}/api/saved-recipes/${savedRecipeId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      throw new Error("Failed to remove recipe from collection");
    }

    console.log("✅ Recipe removed from user collection");

    return {
      success: true,
      message: "Recipe removed from your collection",
    };
  } catch (error) {
    console.error("❌ Error removing recipe from collection:", error);
    throw new Error(error.message || "Failed to remove recipe");
  }
}

// Get recipes based on pantry ingredients
export async function getRecipesByPantryIngredients() {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // ✅ ARCJET RATE LIMIT CHECK
    const isPro = user.subscriptionTier === "pro";
    const arcjetClient = isPro ? proTierLimit : freeMealRecommendations;

    // Create a request object for Arcjet
    const req = await request();

    const decision = await arcjetClient.protect(req, {
      userId: user.clerkId,
      requested: 1,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new Error(
          `Monthly AI recipe limit reached. ${
            isPro ? "Please contact support." : "Upgrade to Pro!"
          }`
        );
      }
      throw new Error("Request denied");
    }

    // Get user's pantry items
    const pantryResponse = await fetch(
      `${STRAPI_URL}/api/pantry-items?filters[owner][id][$eq]=${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!pantryResponse.ok) {
      throw new Error("Failed to fetch pantry items");
    }

    const pantryData = await pantryResponse.json();

    if (!pantryData.data || pantryData.data.length === 0) {
      return {
        success: false,
        message: "Your pantry is empty. Add ingredients first!",
      };
    }

    const ingredients = pantryData.data.map((item) => item.name).join(", ");

    console.log("🥘 Finding recipes for ingredients:", ingredients);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
You are a professional chef. Given these available ingredients: ${ingredients}

Suggest 5 recipes that can be made primarily with these ingredients. It's okay if the recipes need 1-2 common pantry staples (salt, pepper, oil, etc.) that aren't listed.

Return ONLY a valid JSON array (no markdown, no explanations):
[
  {
    "title": "Recipe name",
    "description": "Brief 1-2 sentence description",
    "matchPercentage": 85,
    "missingIngredients": ["ingredient1", "ingredient2"],
    "category": "breakfast|lunch|dinner|snack|dessert",
    "cuisine": "italian|chinese|mexican|etc",
    "prepTime": 20,
    "cookTime": 30,
    "servings": 4
  }
]

Rules:
- matchPercentage should be 70-100% (how many listed ingredients are used)
- missingIngredients should be common items or optional additions
- Sort by matchPercentage descending
- Make recipes realistic and delicious
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let recipeSuggestions;
    try {
      const cleanText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      recipeSuggestions = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error(
        "Failed to generate recipe suggestions. Please try again."
      );
    }

    return {
      success: true,
      recipes: recipeSuggestions,
      ingredientsUsed: ingredients,
      recommendationsLimit: isPro ? "unlimited" : 5,
      message: `Found ${recipeSuggestions.length} recipes you can make!`,
    };
  } catch (error) {
    console.error("❌ Error in getRecipesByPantryIngredients:", error);
    throw new Error(error.message || "Failed to get recipe suggestions");
  }
}

// Get user's saved recipes
export async function getSavedRecipes() {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Fetch saved recipes with populated recipe data
    const response = await fetch(
      `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&populate[recipe][populate]=*&sort=savedAt:desc`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch saved recipes");
    }

    const data = await response.json();

    // Extract recipes from saved-recipes relations
    const recipes = data.data
      .map((savedRecipe) => savedRecipe.recipe)
      .filter(Boolean); // Remove any null recipes

    return {
      success: true,
      recipes,
      count: recipes.length,
    };
  } catch (error) {
    console.error("Error fetching saved recipes:", error);
    throw new Error(error.message || "Failed to load saved recipes");
  }
}

# Servd Frontend

The frontend is a modern, user-friendly web application built with Next.js that lets users explore recipes, manage their pantry, and discover based on what they have available.

## Overview

This is a Next.js application that provides the user interface for the Servd recipe and pantry management system. It includes user authentication with Clerk, recipe browsing, pantry management, and a freemium subscription model.

## Getting Started

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The page auto-updates as you make changes.

### Production Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
app/
├── globals.css              # Global styles
├── layout.js                # Root layout
├── page.js                  # Landing page
├── (auth)/                  # Authentication routes
│   ├── sign-in/            # Sign in page
│   └── sign-up/            # Sign up page
└── (main)/                 # Main app routes
    ├── dashboard/          # User dashboard
    ├── pantry/             # Pantry management
    ├── recipe/             # Individual recipe view
    ├── recipes/            # Recipe listing and filtering
    │   ├── category/       # Filter by category
    │   └── cuisine/        # Filter by cuisine
    └── layout.jsx          # Main app layout

components/
├── AddToPantryModal.jsx     # Modal to add items
├── RecipeCard.jsx           # Recipe display card
├── RecipeGrid.jsx           # Grid layout for recipes
├── RecipePDF.jsx            # PDF export component
├── PricingSection.jsx       # Subscription pricing
├── Header.jsx               # Navigation header
├── UserDropdown.jsx         # User menu
├── ImageUploader.jsx        # Image upload utility
├── HowToCookModal.jsx       # Recipe instructions modal
└── ui/                      # Reusable UI components

actions/
├── recipe.actions.js        # Server actions for recipes
├── pantry.actions.js        # Server actions for pantry
└── mealdb.actions.js        # External API integration

hooks/
└── use-fetch.js             # Custom fetch hook

lib/
├── utils.js                 # Utility functions
├── data.js                  # Static data and constants
├── checkUser.js             # User existence check
├── arcjet.js                # Security/rate limiting
└── dummy.js                 # Demo data

public/
└── uploads/                 # User uploaded images
```

## Key Features

### Authentication
- Sign in/Sign up with Clerk
- Email verification
- Secure session management

### Recipe Discovery
- Browse all available recipes
- Filter by cuisine type
- Filter by recipe category
- Search functionality
- View detailed recipe information

### Pantry Management
- Add items to your pantry
- Track what ingredients you have
- Find recipes based on pantry items

### Recipe Management
- Save favorite recipes
- View saved recipes
- Generate PDF of recipes
- Step-by-step cooking instructions

### Subscription Tiers
- **Free Plan** - Basic recipe browsing
- **Pro Plan** - Additional features like advanced filters and cooking guides

## Technology Stack

- **Framework** - Next.js 16.1.6
- **UI Library** - React 19.2.3
- **Styling** - Tailwind CSS with PostCSS
- **Authentication** - Clerk
- **Icons** - Lucide React
- **PDF Generation** - @react-pdf/renderer
- **AI Integration** - Google Generative AI
- **Form Building** - Radix UI components
- **Toast Notifications** - Sonner

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key_here
CLERK_SECRET_KEY=your_secret_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_PRO_PLAN_ID=your_plan_id
NEXT_PUBLIC_API_URL=http://localhost:1337
```

See [CLERK_SETUP.md](../CLERK_SETUP.md) for detailed authentication setup.

## API Integration

The frontend communicates with the Strapi backend API for:
- Fetching recipe data
- Managing pantry items
- Saving/retrieving user recipes
- User authentication integration

## Server Actions

Server actions in the `actions/` directory handle:
- Fetching recipes from the backend
- Managing pantry data
- External API calls
- Processing user requests securely

## Style Guide

- Uses Tailwind CSS for all styling
- Component-based architecture
- Server components for better performance
- Client components where interactivity is needed

## Performance

- Image optimization with Next.js Image component
- Server-side rendering for better SEO
- Code splitting and lazy loading
- Static generation where possible

---

For more information about Next.js, visit [nextjs.org](https://nextjs.org)

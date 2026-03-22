# Clerk Pro Plan Setup Guide

## Problem Fixed
The pricing page was showing "Plan not found" because the hardcoded Clerk plan ID didn't exist. I've updated the code to use an environment variable for flexibility.

## How to Configure Your Plan

### Step 1: Get Your Plan ID from Clerk Dashboard
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Look for "Pricing Plans" or "Subscriptions" in the settings
3. Find your "Head Chef" (Pro) plan
4. Copy the **Plan ID** (looks like: `price_xxxxx` or `plan_xxxxx`)

### Step 2: Add Plan ID to Environment Variables
Open `frontend/.env` and find this line:
```
NEXT_PUBLIC_CLERK_PRO_PLAN_ID=
```

Add your plan ID:
```
NEXT_PUBLIC_CLERK_PRO_PLAN_ID=your_plan_id_here
```

**Example:**
```
NEXT_PUBLIC_CLERK_PRO_PLAN_ID=price_1234567890abcdef
```

### Step 3: Restart Your Development Server
After updating the `.env` file, restart your Next.js server:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 4: Test the Plan
1. Go to the pricing page
2. The "Subscribe Now" button should now work
3. Click it to complete the checkout

## If You Don't Have a Plan Yet

### Create a New Plan in Clerk:
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **Settings** → **Billing & Plans** or **Pricing Plans**
3. Click "**Add Plan**" or "**Create Plan**"
4. Set up your Pro plan with:
   - **Name:** Head Chef
   - **Price:** $7.99
   - **Billing Cycle:** Monthly
   - **Features:** (Your desired features)
5. Copy the Plan ID generated
6. Paste it in your `.env` file

## Files Modified
- `frontend/.env` - Added `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` variable
- `frontend/components/PricingSection.jsx` - Updated to use environment variable with proper error handling

## Need Help?
- Check your Clerk account is active and has payment methods configured
- Ensure the plan ID is correct (copy directly from Clerk dashboard)
- Restart the dev server after updating `.env`
- Check browser console for any error messages

## Alternative: Contact Support
If setting up Stripe/payment plans is complex, you can contact Clerk support for assistance with plan configuration.

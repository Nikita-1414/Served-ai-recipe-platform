# Servd - Recipe & Pantry Management App

Servd is a full-stack web application that helps users discover recipes, manage their pantry, and save favorite recipes. The project combines a robust backend API with a modern, user-friendly frontend.

## Project Structure

The project is organized into two main directories:

- **`backend/`** - Strapi CMS and REST API server
- **`frontend/`** - Next.js web application

## Quick Start

### Backend Setup
```bash
cd backend
npm install
npm run develop
```

The backend will run on `http://localhost:1337`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

## Key Features

- **Recipe Discovery** - Browse and search for recipes with filters by category and cuisine
- **Pantry Management** - Keep track of items in your pantry and what you can cook
- **Recipe Saving** - Save favorite recipes for later reference
- **User Authentication** - Secure login with Clerk authentication
- **Subscription Plans** - Free and Pro tier with additional features
- **PDF Export** - Generate PDF versions of recipes

## Tech Stack

**Backend:**
- Node.js with Strapi (v5.39.0)
- PostgreSQL database
- REST API architecture

**Frontend:**
- Next.js (v16.1.6)
- React 19
- Tailwind CSS for styling
- Clerk for authentication
- Google Generative AI integration

## Setup Instructions

See [CLERK_SETUP.md](./CLERK_SETUP.md) for authentication configuration.

## Development

- Backend runs with hot reload in development mode
- Frontend uses Next.js dev server with fast refresh
- Check individual README files in backend/ and frontend/ for specific details

## Environment Configuration

Both backend and frontend require environment files. Check each folder's documentation for required variables.

---

For more details, check the README files in each folder.

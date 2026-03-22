# Servd Backend API

This is the backend API server built with Strapi, a headless CMS that provides a REST API for managing all recipe and pantry data.

## Overview

The backend handles all data management for the Servd application. It uses Strapi's powerful content management system combined with PostgreSQL for data storage. The API provides endpoints for recipes, pantry items, saved recipes, and user management.

## Getting Started

### Installation

```bash
npm install
```

### Development Server

```bash
npm run develop
```

This starts the Strapi development server with auto-reload enabled. The admin panel will be available at `http://localhost:1337/admin`

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── api/                    # API endpoints and data models
│   ├── recipe/            # Recipe content type and controllers
│   ├── pantry-item/       # Pantry items content type
│   └── saved-recipe/      # User's saved recipes content type
├── extensions/            # Extended configuration
│   └── users-permissions/ # User authentication setup
└── index.js              # Server bootstrap file

config/
├── database.js           # Database configuration
├── server.js             # Server settings
├── api.js                # API configuration
├── middlewares.js        # Middleware setup
├── admin.js              # Admin panel configuration
└── plugins.js            # Plugin configuration
```

## API Endpoints

The API provides RESTful endpoints for:

- **Recipes** - Create, read, update, delete recipe data
- **Pantry Items** - Manage user pantry inventory
- **Saved Recipes** - Store user's favorite recipes
- **Users** - Authentication and user management (via users-permissions plugin)

Each endpoint follows Strapi's REST convention with full CRUD operations.

## Database

The backend uses PostgreSQL as the primary database. Database migrations can be found in the `database/migrations/` directory.

## Content Types

Three main content types are defined:

1. **Recipe** - Contains recipe details, ingredients, instructions
2. **Pantry Item** - Tracks items in user's pantry
3. **Saved Recipe** - Links users to their favorite recipes

Each content type has a schema definition in `src/api/[content-type]/content-types/`

## Authentication

User authentication is handled via the `@strapi/plugin-users-permissions` plugin. This provides:
- User registration and login
- JWT token generation
- Role-based access control

## Admin Panel

Access the Strapi admin panel at `http://localhost:1337/admin` when the server is running. This provides a user-friendly interface for managing all content.

## Scripts

- `npm run develop` - Start with auto-reload
- `npm start` - Start production server
- `npm run build` - Build admin panel
- `npm run strapi` - Run strapi CLI commands
- `npm run upgrade` - Upgrade Strapi to latest version

## Environment Variables

Create a `.env` file in the backend directory with your database credentials and other configuration.

## Deployment

The backend can be deployed to various platforms including Strapi Cloud, Heroku, or your own server. See [Strapi deployment docs](https://docs.strapi.io/dev-docs/deployment) for options.

---

For more information about Strapi, visit [strapi.io](https://strapi.io)

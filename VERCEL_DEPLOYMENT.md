# Vercel Deployment Guide

This project has been converted from a traditional Express server to Vercel serverless functions with PostgreSQL database.

## Project Structure

```
/api/
  /auth/
    - login.ts (POST /api/auth/login)
    - register.ts (POST /api/auth/register)
    - admin-login.ts (POST /api/auth/admin-login)
  /user/
    - profile.ts (GET /api/user/profile)
    - purchases.ts (GET /api/user/purchases)
  /admin/
    - users.ts (GET /api/admin/users)
    - add-balance.ts (POST /api/admin/add-balance)
    - stats.ts (GET /api/admin/stats)
    - purchases.ts (GET /api/admin/purchases)
  /smsbower/
    - buy.ts (POST /api/smsbower/buy)
    - check-code.ts (GET /api/smsbower/check-code)
    - cancel.ts (POST /api/smsbower/cancel)
  /utils/
    - auth.ts (Authentication utilities)
/src/
  - React frontend (Vite)
/lib/
  - db.ts (PostgreSQL connection and queries)
```

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com (free tier available, no credit card required)
2. **PostgreSQL Database**: Use Vercel Postgres (free tier available under Vercel dashboard)
3. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

## Deployment Steps

### 1. Set Up PostgreSQL Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on "Storage" tab
3. Click "Create Database" → "Create Postgres"
4. Select your region and create the database
5. Copy the connection string (POSTGRES_URL)

### 2. Environment Variables

1. In Vercel Dashboard, go to your Project Settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
JWT_SECRET=your-secret-key-here
ADMIN_PASSWORD=SHINE@786
SMSBOWER_API_KEY=your-api-key-here
POSTGRES_URL=<copied from step 1>
DATABASE_URL=<same as POSTGRES_URL>
GEMINI_API_KEY=your-gemini-api-key-if-used
```

### 3. Deploy to Vercel

**Option A: Git Integration (Recommended)**

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Select your repository
5. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. Click "Deploy"

**Option B: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project directory
vercel

# Deploy to production
vercel --prod
```

### 4. Run Database Migrations

The database tables will be created automatically on first request. If you need to run migrations manually:

```bash
# Install dependencies
npm install

# Create .env.local with your database URL
echo "POSTGRES_URL=your-database-url" > .env.local

# Run initialization (via API call or manually in database)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/admin-login` - Admin login

### User
- `GET /api/user/profile` - Get user profile (requires auth)
- `GET /api/user/purchases` - Get user purchases (requires auth)

### Admin
- `GET /api/admin/users` - List all users (requires admin auth)
- `POST /api/admin/add-balance` - Add balance to user (requires admin auth)
- `GET /api/admin/stats` - Get system stats (requires admin auth)
- `GET /api/admin/purchases` - Get all purchases (requires admin auth)

### SMSBower
- `POST /api/smsbower/buy` - Buy email activation (requires auth)
- `GET /api/smsbower/check-code` - Check verification code (requires auth)
- `POST /api/smsbower/cancel` - Cancel activation (requires auth)

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local file with your variables
cp .env.example .env.local

# Edit .env.local with actual values
nano .env.local

# Run development server
npm run dev

# Frontend will be at http://localhost:5173
# API endpoints at http://localhost:5173/api/*
```

## Important Notes

1. **Database URLs**: Vercel provides both `POSTGRES_URL` and `DATABASE_URL`. Both point to the same database and can be used interchangeably.

2. **API Routes**: Vercel automatically routes `/api/*` requests to the corresponding files in the `/api` folder. No additional configuration needed.

3. **Static Files**: The React build output in `/dist` is automatically served as static files.

4. **CORS**: Vercel handles CORS for same-origin requests. Cross-origin requests may need headers configuration.

5. **Database Pool**: The PostgreSQL connection pool is shared across all serverless functions. Vercel automatically manages connection limits.

6. **Cold Starts**: First request to a function may take a few seconds (cold start). Subsequent requests are faster.

## Troubleshooting

### Database Connection Issues
- Verify `POSTGRES_URL` is correctly set in environment variables
- Check if PostgreSQL database is created in Vercel Storage
- Ensure JWT_SECRET and other env vars are set

### Auth Errors
- Verify JWT_SECRET matches in all deployments
- Check if tokens are being sent in Authorization header: `Bearer <token>`

### File Not Found (404)
- Vercel automatically serves `/api/*` files as serverless functions
- Ensure API files are in `/api` folder with proper structure
- React SPA should show application at root path (/)

### Cold Start Delays
- This is normal for serverless functions
- Performance improves after first request
- Use Vercel Analytics to monitor function performance

## Best Practices

1. **Environment Variables**: Never commit `.env` to git. Use `.env.example` as template.
2. **Error Handling**: All API functions should return proper error messages
3. **Authentication**: Always verify JWT tokens and user permissions
4. **Database**: Connection pool is automatically managed by Vercel
5. **Monitoring**: Use Vercel Dashboard to monitor function calls and performance

## References

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Postgres](https://vercel.com/docs/postgres)
- [Node.js Runtime on Vercel](https://vercel.com/docs/functions/serverless-functions/node-js)

# Quick Start: Vercel Deployment

## 5-Minute Setup

### Step 1: Prepare Your Code
```bash
# You already have all files configured
# Just ensure you have git initialized
cd /workspaces/myotpweb
git init
git add .
git commit -m "Vercel migration: serverless functions + PostgreSQL"
```

### Step 2: Push to GitHub
```bash
# Create a repository on GitHub, then:
git remote add origin https://github.com/yourusername/myotpweb.git
git branch -M main
git push -u origin main
```

### Step 3: Create Vercel Account & Project
1. Go to https://vercel.com (sign up if needed)
2. Click "New Project"
3. Select your GitHub repository
4. Click "Import"

### Step 4: Create PostgreSQL Database
1. In Vercel Dashboard → "Storage" tab
2. Click "Create Database" → "Create Postgres"
3. Choose a region near your users
4. Click "Create"
5. **Copy the connection string** (you'll need it next)

### Step 5: Set Environment Variables
In your Vercel project settings:

**Environment Variables:**
```
JWT_SECRET=fb-verifier-secret-key-12345
ADMIN_PASSWORD=SHINE@786
SMSBOWER_API_KEY=yu5BsIwXebcjYInuoaYDGojVW1ayPOFv
POSTGRES_URL=<paste the connection string from Step 4>
DATABASE_URL=<same as POSTGRES_URL>
GEMINI_API_KEY=your-key-if-used
```

### Step 6: Deploy
1. Click "Deploy" button
2. Wait for build to complete (2-3 minutes)
3. Your app will be live at `https://yourproject.vercel.app`

## Test Your Deployment

```bash
# Replace with your Vercel domain
VERCEL_URL="yourproject.vercel.app"

# Test register endpoint
curl -X POST https://$VERCEL_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@email.com","password":"password123"}'

# Test login endpoint
curl -X POST https://$VERCEL_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@email.com","password":"password123"}'
```

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Edit .env.local with your database URL for testing
# (or use a local PostgreSQL instance)

# Run development server
npm run dev

# Open http://localhost:5173
```

## Important Environment Variables

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `JWT_SECRET` | `your-secret-key` | Create any strong string |
| `ADMIN_PASSWORD` | `SHINE@786` | Your admin password |
| `SMSBOWER_API_KEY` | `api-key-here` | SMSBower dashboard |
| `POSTGRES_URL` | `postgresql://...` | Vercel Storage tab |
| `DATABASE_URL` | `postgresql://...` | Same as POSTGRES_URL |

## Vercel Dashboard Features

### Monitor Your App
- **Deployments** - See deployment history
- **Analytics** - View function calls and performance
- **Logs** - Check function execution logs
- **Storage** - Manage PostgreSQL database

### Important Links
- Deployments: `https://vercel.com/dashboard/yourProject`
- Database: `https://vercel.com/dashboard/yourProject/storage`
- Logs: `https://vercel.com/dashboard/yourProject/logs`

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 404 on API endpoints | Check vercel.json routing config |
| Database connection fails | Verify POSTGRES_URL in environment |
| 500 errors on first request | Check Vercel logs tab |
| Slow first request | Normal cold start, takes 1-3s |

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test all API endpoints
3. ✅ Update frontend domain if needed
4. ✅ Monitor Vercel Analytics
5. ✅ Set up automatic deployments on git push

## Free Tier Limits

- **Functions**: Unlimited
- **Deployments**: Unlimited
- **Database**: 256MB PostgreSQL
- **Bandwidth**: Generous free tier
- **Always free** - No credit card needed!

## Support & Documentation

- 📖 Full guide: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- 📋 Migration details: [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)
- 🔗 Vercel Docs: https://vercel.com/docs
- 🐘 PostgreSQL Docs: https://www.postgresql.org/docs/

---

**You're all set! Deploy and go live in 5 minutes! 🚀**

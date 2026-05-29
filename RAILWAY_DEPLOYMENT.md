# Railway Deployment Guide

Step-by-step guide for deploying CyberRx to Railway.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Preparation](#repository-preparation)
3. [Railway Project Setup](#railway-project-setup)
4. [Database Deployment](#database-deployment)
5. [Backend API Deployment](#backend-api-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Custom Domain Setup](#custom-domain-setup)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### Required Accounts

- [GitHub](https://github.com/) account
- [Railway](https://railway.app/) account
- (Optional) Custom domain

### Required Tools

- Git installed locally
- Browser with Railway access

## Repository Preparation

### Step 1: Push to GitHub

Ensure your code is on GitHub:

```bash
# Navigate to project
cd /Users/briandibassinga/Github/Cyber-Rx

# Initialize git (if not done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: CyberRx application ready for Railway deployment"

# Create main branch
git branch -M main

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/Cyber-Rx.git

# Push to GitHub
git push -u origin main
```

### Step 2: Verify Repository Structure

Ensure your repository has this structure:

```
Cyber-Rx/
├── cyberrx-api/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

**Important:**
- No `.env` files should be committed
- `node_modules/` should be in `.gitignore`
- Only `.env.example` files should be present

## Railway Project Setup

### Step 1: Create Railway Account

1. Go to https://railway.app/
2. Click "Start" or "Login"
3. Authenticate with GitHub (recommended)
4. Select a plan (Free tier available)

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select your `Cyber-Rx` repository

## Database Deployment

### Step 1: Add PostgreSQL Service

1. In your Railway project, click "New Service"
2. Select "Database"
3. Choose "PostgreSQL"
4. Click "Add PostgreSQL"

### Step 2: Configure Database

Railway will automatically:
- Provision PostgreSQL database
- Set up connection string
- Provide `DATABASE_URL` variable

### Step 3: Verify Database

1. Click on your PostgreSQL service
2. Go to "Variables" tab
3. Copy the `DATABASE_URL` (you'll need this for the API)

**Note:** Railway's PostgreSQL includes automatic backups and high availability.

## Backend API Deployment

### Step 1: Add API Service

1. Click "New Service"
2. Select "GitHub Repo"
3. Choose the same `Cyber-Rx` repository
4. Railway will auto-detect the `cyberrx-api` service

### Step 2: Configure API Service

#### Root Directory

Set root directory to: `cyberrx-api`

#### Build Configuration

Railway uses `railway.json` in the cyberrx-api folder:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

### Step 3: Set Environment Variables

1. Go to API service → "Variables" tab
2. Add these variables:

```bash
# Core Configuration
DATABASE_URL=<paste-from-postgres-service>
NODE_ENV=production
PORT=3001

# Security
JWT_SECRET=<generate-secure-secret>
VAULT_MODE=local

# Frontend URL (update after frontend deployment)
FRONTEND_URL=https://your-frontend-url.railway.app
```

#### Generate JWT Secret

```bash
# Generate secure secret
openssl rand -base64 32
# Use output as JWT_SECRET
```

### Step 4: Deploy API

1. Click "Deploy" button
2. Wait for deployment to complete (~2-3 minutes)
3. Check logs for success message: "CyberRx API running on port 3001"

### Step 5: Verify API Deployment

1. Go to API service → "Networking"
2. Copy the generated URL (e.g., `https://cyberrx-api-production.railway.app`)
3. Test health endpoint:

```bash
curl https://your-api-url.railway.app/health
# Should return: {"status":"ok","version":"1.0.0","ts":"..."}
```

## Frontend Deployment

### Step 1: Add Frontend Service

1. Click "New Service"
2. Select "GitHub Repo"
3. Choose the same `Cyber-Rx` repository

### Step 2: Configure Frontend Service

#### Root Directory

Set root directory to: `frontend`

#### Build Configuration

Railway uses `railway.json` in the frontend folder:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run preview"
  }
}
```

### Step 3: Set Environment Variables

1. Go to Frontend service → "Variables" tab
2. Add the API URL:

```bash
VITE_API_URL=https://your-api-url.railway.app
```

**Important:** Use the exact API URL from the previous step.

### Step 4: Deploy Frontend

1. Click "Deploy" button
2. Wait for deployment to complete (~2-3 minutes)
3. Check logs for success message

### Step 5: Verify Frontend Deployment

1. Go to Frontend service → "Networking"
2. Copy the generated URL
3. Open in browser - should load CyberRx dashboard

### Step 6: Update API CORS Configuration

1. Go back to API service → "Variables"
2. Update `FRONTEND_URL` with the actual frontend URL:

```bash
FRONTEND_URL=https://your-frontend-url.railway.app
```

3. Railway will automatically redeploy the API

## Post-Deployment Configuration

### Step 1: Verify End-to-End Connectivity

1. Open your frontend URL in browser
2. Check browser console (F12) for errors
3. Verify API calls are successful (no CORS errors)

### Step 2: Test Core Functionality

1. **Health Check**
   ```bash
   curl https://your-api-url.railway.app/health
   ```

2. **Create Test Organization**
   - Use the frontend to create a test organization
   - Verify it's stored in the database

3. **Check Dashboard**
   - Verify metrics display correctly
   - Check CMMI scoring functionality

### Step 3: Configure Security Tools (Optional)

Add security tool credentials to API service variables:

```bash
# ServiceNow Example
SNOW_INSTANCE=your-instance
SNOW_USER=admin
SNOW_PASSWORD=your-password
SNOW_ASSIGN_GROUP=IT Security

# Okta Example
OKTA_DOMAIN=your-org.okta.com
OKTA_APITOKEN=your-token

# Add more tools as needed...
```

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for complete list.

## Custom Domain Setup

### Step 1: Choose Domain Names

You'll need two subdomains:
- API: `api.cyberrx.com` (or similar)
- Frontend: `app.cyberrx.com` (or similar)

### Step 2: Configure Frontend Domain

1. Go to Frontend service → "Networking"
2. Click "Generate Domain"
3. Enter your custom domain: `app.cyberrx.com`
4. Railway will provide DNS records

### Step 3: Configure API Domain

1. Go to API service → "Networking"
2. Click "Generate Domain"
3. Enter your custom domain: `api.cyberrx.com`
4. Railway will provide DNS records

### Step 4: Update DNS

Add CNAME records at your DNS provider:

```
Type: CNAME
Name: app
Value: cname.railway.app

Type: CNAME
Name: api
Value: cname.railway.app
```

### Step 5: Update Configuration

1. Update frontend `VITE_API_URL` to use new API domain
2. Update API `FRONTEND_URL` to use new frontend domain
3. Redeploy both services

## Monitoring and Maintenance

### Health Monitoring

Railway provides built-in monitoring:

1. **Service Health**
   - Go to service → "Metrics"
   - Monitor CPU, memory, and response times

2. **Logs**
   - Go to service → "Logs"
   - View real-time application logs

3. **Health Checks**
   - API includes `/health` endpoint
   - Railway monitors service health automatically

### Database Maintenance

Railway PostgreSQL includes:

- **Automatic Backups**: Daily backups retained for 7 days
- **High Availability**: Automatic failover
- **Connection Pooling**: Managed by Railway

### Deployment Updates

When you push code changes:

1. **Automatic Deployments**
   - Railway auto-deploys on push to main branch
   - Manual deployment available in dashboard

2. **Environment Variables**
   - Changes to variables trigger automatic redeployment
   - No manual intervention needed

### Scaling

As your application grows:

1. **Vertical Scaling**
   - Go to service → "Settings"
   - Adjust CPU/RAM allocation

2. **Horizontal Scaling**
   - Enable "High Availability" mode
   - Railway runs multiple instances

## Cost Management

### Free Tier Limitations

Railway's free tier includes:
- $5/month credit
- 512MB RAM per service
- Shared CPU

### Production Recommendations

For production use:
- **Pro Plan**: $20/month per service
- **Better performance** and dedicated resources
- **Priority support**
- **Longer logs retention**

### Cost Optimization Tips

1. **Delete unused services**
2. **Use appropriate resource allocation**
3. **Monitor usage regularly**
4. **Set spending limits**

## Troubleshooting

### Common Deployment Issues

#### Build Failures

```bash
# Check build logs
Railway Dashboard → Service → Deployments → Latest → Logs

# Common causes:
# - Missing dependencies in package.json
# - Syntax errors in code
# - Incorrect build command
```

#### Runtime Errors

```bash
# Check runtime logs
Railway Dashboard → Service → Logs

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Port conflicts
```

#### Database Connection Issues

```bash
# Verify DATABASE_URL is set
# Test connection manually
psql $DATABASE_URL

# Check SSL configuration
# Railway requires SSL for PostgreSQL
```

### Getting Help

1. Check Railway logs first
2. Verify all variables are set
3. Test health endpoints
4. Review [ENV_VARIABLES.md](./ENV_VARIABLES.md)
5. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Security Best Practices

### Production Checklist

- [ ] Strong `JWT_SECRET` (32+ characters)
- [ ] HTTPS enabled (automatic on Railway)
- [ ] CORS configured correctly
- [ ] Database uses SSL (automatic on Railway)
- [ ] Secrets not in repository
- [ ] Monitoring enabled
- [ ] Backups enabled
- [ ] Custom domain configured
- [ ] Security tools integrated

### Secret Rotation

Rotate secrets regularly:

1. Update variables in Railway dashboard
2. Automatic redeployment occurs
3. Test new configuration
4. Document rotation date

## Next Steps

After successful deployment:

1. Configure security tool credentials
2. Set up custom domains
3. Configure monitoring alerts
4. Set up CI/CD pipeline
5. Document your deployment
6. Train team on Railway dashboard

For additional configuration, see:
- [SETUP.md](./SETUP.md) - Detailed setup guide
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment variable reference
- [README.md](./README.md) - Project overview

---

**Deployment Status Checklist**

- [ ] GitHub repository created and pushed
- [ ] Railway project created
- [ ] PostgreSQL database deployed
- [ ] Backend API deployed and verified
- [ ] Frontend deployed and verified
- [ ] Environment variables configured
- [ ] End-to-end testing completed
- [ ] Custom domains configured (optional)
- [ ] Monitoring enabled
- [ ] Documentation updated

**Your CyberRx application is now live on Railway!**
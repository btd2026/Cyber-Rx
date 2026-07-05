# Vercel + Render Deployment Guide

Complete deployment guide for Nerion using Vercel (frontend) and Render (backend + database).

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Backend Deployment (Render)](#backend-deployment-render)
- [Database Setup (Render)](#database-setup-render)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Environment Configuration](#environment-configuration)
- [Post-Deployment Verification](#post-deployment-verification)
- [Security Tool Integration](#security-tool-integration)
- [Monitoring and Logs](#monitoring-and-logs)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Vercel        │         │   Render        │         │   Render        │
│   (Frontend)    │────────▶│   (Backend)     │────────▶│   (PostgreSQL)  │
│                 │  HTTPS  │                 │  TCP    │                 │
│  React + Vite   │         │  Express API    │         │  Database       │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

**Deployment Flow:**
1. GitHub repository → Vercel (frontend)
2. GitHub repository → Render (backend)
3. Render PostgreSQL database
4. Vercel frontend → Render backend API calls

## Prerequisites

### Required Accounts

1. **GitHub**: Repository at https://github.com/btd2026/Cyber-Rx
2. **Vercel**: https://vercel.com - for frontend deployment
3. **Render**: https://render.com - for backend + database deployment

### Required Tools

- Git installed locally
- Node.js 20+ installed locally
- GitHub CLI (optional but recommended)

### Repository Structure

```
Cyber-Rx/
├── frontend/              # Vercel deployment
│   ├── vercel.json
│   ├── package.json
│   └── .env.example
├── cyberrx-api/          # Render deployment
│   ├── render.yaml
│   ├── package.json
│   └── .env.example
└── README.md
```

## Backend Deployment (Render)

### Step 1: Create Render Account

1. Go to https://render.com/
2. Click "Sign Up"
3. Choose "Sign up with GitHub" (recommended)
4. Authorize Render to access your GitHub repositories
5. Verify your email address

### Step 2: Deploy Backend Service

1. **Create New Web Service**
   - Click "New" → "Web Service"
   - You'll see your GitHub repositories
   - Find and select "Cyber-Rx"

2. **Configure Service Settings**
   - **Name**: `cyberrx-api`
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `main`
   - **Root Directory**: `cyberrx-api`
   - **Runtime**: Node (default)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Plan Selection**
   - **Free Plan**: Good for development/testing
     - 512 MB RAM
     - 0.1 CPU
     - Sleeps after 15 min inactivity
     - Spins up in ~30 seconds
   - **Paid Plan ($7/month)**: Recommended for production
     - 512 MB RAM
     - Always on
     - Faster spin up

4. **Deploy**
   - Click "Create Web Service"
   - Render will clone your repo and build
   - Watch the build logs in real-time
   - Deployment takes 3-5 minutes

### Step 3: Backend Health Check

After deployment, verify your backend:

```bash
# Test health endpoint
curl https://cyberrx-api.onrender.com/health

# Expected response:
# {"status":"ok","version":"1.0.0","ts":"2024-01-01T00:00:00.000Z"}
```

If you see this response, your backend is deployed successfully!

## Database Setup (Render)

### Step 1: Create PostgreSQL Database

1. **Create New Database**
   - In Render dashboard, click "New" → "PostgreSQL"
   - Configure:
     - **Name**: `cyberrx-db`
     - **Database Name**: `cyberrx`
     - **User**: `cyberrx_user`
     - **Region**: Same as backend (Oregon)
     - **PostgreSQL Version**: 14 (default)
     - **Plan**: Free (recommended for testing)

2. **Create Database**
   - Click "Create Database"
   - Render provisions PostgreSQL in 1-2 minutes
   - You'll see connection details in the dashboard

### Step 2: Link Database to Backend

1. **Get Database Connection Details**
   - Go to your database in Render dashboard
   - You'll see "Connections" section with:
     - `Internal Database URL` (for backend)
     - `External Database URL` (for external access)
     - Individual variables: `PGHOST`, `PGPORT`, etc.

2. **Add Environment Variables to Backend**
   - Go to `cyberrx-api` service → "Settings" → "Environment"
   - Click "Add Environment Variable"
   - Render automatically adds these when you link the database:
     ```bash
     DATABASE_URL = postgresql://cyberrx_user:password@host:5432/cyberrx
     PGHOST = dpg-xxxxx.oregon-postgres.render.com
     PGPORT = 5432
     PGDATABASE = cyberrx
     PGUSER = cyberrx_user
     PGPASSWORD = your-password
     ```

3. **Add Additional Backend Variables**
   ```bash
   NODE_ENV = production
   PORT = 3001
   JWT_SECRET = <generate-a-secure-secret-min-32-chars>
   VAULT_MODE = local
   FRONTEND_URL = https://your-vercel-app.vercel.app
   ```

4. **Restart Backend**
   - Click "Save Changes"
   - Render automatically restarts your service
   - Check logs to verify database connection

### Step 3: Verify Database Connection

After linking, check backend logs:

```
# In Render dashboard → Logs
# Look for successful database connection messages
# No errors about database connection failures
```

## Frontend Deployment (Vercel)

### Step 1: Create Vercel Account

1. Go to https://vercel.com/
2. Click "Sign Up"
3. Choose "Sign up with GitHub" (recommended)
4. Authorize Vercel to access your GitHub repositories
5. Verify your email address

### Step 2: Import and Deploy Frontend

1. **Create New Project**
   - In Vercel dashboard, click "Add New" → "Project"
   - You'll see your GitHub repositories
   - Find and select "Cyber-Rx"

2. **Configure Project Settings**
   - **Project Name**: `cyberrx-frontend` (or any name you prefer)
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `frontend/`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Configure Environment Variables**
   - Click "Environment Variables"
   - Add the following:
     ```bash
     VITE_API_URL = https://cyberrx-api.onrender.com
     ```
   - Or add as `render-backend-url` for vercel.json reference

4. **Deploy**
   - Click "Deploy"
   - Vercel builds and deploys in 1-2 minutes
   - Get your deployment URL: `https://cyberrx-frontend.vercel.app`

### Step 3: Update Backend CORS

After frontend deployment:

1. **Get Vercel URL**
   - Copy your Vercel frontend URL
   - Example: `https://cyberrx-frontend.vercel.app`

2. **Update Backend Environment Variable**
   - Go to Render backend service → "Settings" → "Environment"
   - Update `FRONTEND_URL`:
     ```bash
     FRONTEND_URL = https://cyberrx-frontend.vercel.app
     ```
   - Click "Save Changes"
   - Render restarts backend with updated CORS

### Step 4: Configure Vercel Settings (Optional)

1. **Custom Domain** (optional)
   - Go to project settings → "Domains"
   - Add your custom domain
   - Configure DNS records as instructed

2. **Environment Variables** (production)
   - In project settings → "Environment Variables"
   - Add production variables:
     ```bash
     VITE_API_URL = https://cyberrx-api.onrender.com
     ```

3. **Deployment Protection** (optional)
   - "Settings" → "Git"
   - Configure branch deployment rules
   - Enable "Preview Deployments" for testing

## Environment Configuration

### Backend Environment Variables (Render)

Required variables:

```bash
# Database (auto-configured by Render)
DATABASE_URL = postgresql://user:pass@host:port/db
PGHOST = database-host
PGPORT = 5432
PGDATABASE = cyberrx
PGUSER = cyberrx_user
PGPASSWORD = password

# Application
NODE_ENV = production
PORT = 3001
JWT_SECRET = generate-secure-secret-min-32-chars
VAULT_MODE = local

# Frontend URL for CORS
FRONTEND_URL = https://cyberrx-frontend.vercel.app
```

### Frontend Environment Variables (Vercel)

Required variables:

```bash
# Backend API URL
VITE_API_URL = https://cyberrx-api.onrender.com
```

### Optional Security Tool Variables

Add these to Render backend as needed:

```bash
# ServiceNow
SNOW_INSTANCE = your-instance
SNOW_USER = admin
SNOW_PASSWORD = your-password
SNOW_ASSIGN_GROUP = IT Security

# Okta
OKTA_DOMAIN = your-org.okta.com
OKTA_APITOKEN = your-token

# CrowdStrike
CROWDSTRIKE_CLIENT_ID = your-client-id
CROWDSTRIKE_CLIENT_SECRET = your-client-secret
```

## Post-Deployment Verification

### 1. Backend Health Check

```bash
# Test backend health
curl https://cyberrx-api.onrender.com/health

# Expected response
{"status":"ok","version":"1.0.0","ts":"2024-01-01T00:00:00.000Z"}
```

### 2. Frontend Access

```bash
# Open in browser
https://cyberrx-frontend.vercel.app

# Should load React application without errors
# Check browser console for API connectivity
```

### 3. API Connectivity

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any CORS errors
4. Go to Network tab
5. Check API requests are successful (200 status)

### 4. Database Connectivity

Check backend logs in Render:

```
# Should see successful database connection
# No errors about database connection failures
```

## Security Tool Integration

After basic deployment, add security tool credentials:

### Step 1: Gather Credentials

Collect credentials for your security tools:
- ServiceNow instance details
- Okta API token
- CrowdStrike client credentials
- etc.

### Step 2: Add to Render Backend

1. Go to `cyberrx-api` → "Settings" → "Environment"
2. Add tool-specific environment variables
3. Click "Save Changes"
4. Render restarts backend automatically

### Step 3: Test Integration

```bash
# Test tool endpoints
curl https://cyberrx-api.onrender.com/api/tools/status

# Should return status of configured tools
```

## Monitoring and Logs

### Backend Monitoring (Render)

1. **View Logs**
   - Go to `cyberrx-api` service
   - Click "Logs" tab
   - Real-time logs from your backend

2. **Metrics**
   - "Metrics" tab shows:
     - CPU usage
     - Memory usage
     - Response times
     - Error rates

3. **Health Checks**
   - Render automatically checks `/health` endpoint
   - View health status in dashboard

### Frontend Monitoring (Vercel)

1. **View Logs**
   - Go to Vercel project
   - Click "Deployments"
   - Click on a deployment → "Build Logs"

2. **Analytics**
   - "Analytics" tab shows:
     - Page views
     - Unique visitors
     - Top pages
     - Geographic distribution

3. **Performance**
   - Vercel automatically monitors performance
   - Web Vitals (LCP, FID, CLS)

### Alert Configuration

**Render Alerts:**
- "Settings" → "Alerts"
- Configure email/Slack alerts for:
  - Service down
  - High error rate
  - High memory usage

**Vercel Alerts:**
- "Settings" → "Notifications"
- Configure email alerts for:
  - Deployment failures
  - Build errors
  - Domain issues

## Troubleshooting

### Common Issues and Solutions

#### 1. Backend Won't Start

**Symptoms:**
- Service shows "Deploy failed"
- Logs show "Cannot start service"

**Solutions:**
- Check package.json has `"start": "node src/index.js"`
- Verify PORT environment variable is set
- Check Node.js version compatibility (20+)
- Review build logs for dependency errors

#### 2. Database Connection Errors

**Symptoms:**
- Backend logs show "ECONNREFUSED"
- API returns 500 errors

**Solutions:**
- Verify DATABASE_URL is correct
- Check database is running in Render
- Ensure database is in same region as backend
- Verify PGHOST, PGPORT, PGDATABASE are set

#### 3. CORS Errors in Frontend

**Symptoms:**
- Browser console shows CORS errors
- API calls fail with 401/403

**Solutions:**
- Verify FRONTEND_URL is set in backend
- Check frontend URL matches exactly (https vs http)
- Clear browser cache and cookies
- Check backend CORS configuration

#### 4. Frontend Build Failures

**Symptoms:**
- Vercel deployment fails
- Build logs show npm errors

**Solutions:**
- Check package.json scripts are correct
- Verify all dependencies are in package.json
- Check Node.js version in Vercel settings
- Review build logs for specific errors

#### 5. Environment Variables Not Working

**Symptoms:**
- Application can't read environment variables
- Config values showing as undefined

**Solutions:**
- Verify variable names match exactly (case-sensitive)
- Check variables are in correct environment (production vs preview)
- Redeploy service after adding variables
- Check for typos in variable names

### Getting Help

**Render Support:**
- Documentation: https://render.com/docs
- Status Page: https://status.render.com
- Email: support@render.com

**Vercel Support:**
- Documentation: https://vercel.com/docs
- Status Page: https://vercel-status.com
- Community: https://vercel.com/discord

**GitHub Issues:**
- Check existing issues at https://github.com/btd2026/Cyber-Rx/issues
- Create new issue with detailed description

## Cost Optimization

### Free Tier Limitations

**Render Free Tier:**
- 512 MB RAM
- 0.1 CPU
- Sleeps after 15 minutes inactivity
- 512 MB database storage
- 100 GB network traffic/month

**Vercel Free Tier:**
- Unlimited projects
- 100 GB bandwidth/month
- Automatic SSL certificates
- 5000 builds/month

### Upgrade Recommendations

**When to upgrade Render ($7/month):**
- Production applications
- Need always-on service
- Faster cold starts
- More RAM/CPU

**When to upgrade Vercel ($20/month):**
- High-traffic applications
- Need team collaboration
- Advanced analytics
- Priority support

## Continuous Deployment

### Automatic Deployments

**Both platforms automatically deploy on git push:**

1. Push to GitHub main branch:
   ```bash
   git add .
   git commit -m "Update features"
   git push origin main
   ```

2. Automatic deployments:
   - Vercel builds and deploys frontend
   - Render builds and deploys backend
   - Both platforms run tests if configured

3. Monitor deployments:
   - Vercel: Real-time build logs
   - Render: Deployment logs

### Branch Preview Deployments

**Vercel Preview Deployments:**
- Every branch gets a unique URL
- Test changes before merging
- Automatic HTTPS for all previews
- Comment on PR for preview link

**Render Preview Deployments:**
- Available with paid plan
- Configurable in service settings
- Useful for staging environments

## Security Best Practices

### 1. Environment Variable Security

- Never commit `.env` files to Git
- Use strong, unique secrets
- Rotate secrets regularly
- Use different secrets for different environments

### 2. API Security

- Enable HTTPS only (automatic on both platforms)
- Implement rate limiting
- Add authentication middleware
- Validate all input data

### 3. Database Security

- Render automatically enables SSL
- Use strong database passwords
- Restrict database network access
- Regular database backups

### 4. CORS Configuration

- Whitelist allowed origins
- Use specific frontend URLs
- Avoid wildcard origins in production
- Implement proper authentication

## Backup and Recovery

### Database Backups

**Render Automatic Backups:**
- Daily backups included
- Point-in-time recovery
- 7-day retention (free tier)
- 30-day retention (paid)

**Manual Backups:**
```bash
# Connect to Render database
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

### Disaster Recovery

**If backend service is deleted:**
1. Redeploy from GitHub
2. Reattach existing database
3. Restore environment variables
4. Service recovers in minutes

**If database is deleted:**
1. Create new database
2. Restore from latest backup
3. Update connection strings
4. Redeploy backend

## Migration Checklist

Use this checklist when migrating from Railway to Vercel + Render:

### Pre-Migration
- [ ] Backup existing Railway database
- [ ] Document all environment variables
- [ ] Test local development environment
- [ ] Verify GitHub repository is up to date

### Backend Migration
- [ ] Create Render account
- [ ] Deploy backend service to Render
- [ ] Create PostgreSQL database on Render
- [ ] Link database to backend
- [ ] Add all environment variables
- [ ] Test backend health endpoint
- [ ] Verify database connectivity
- [ ] Add security tool credentials

### Frontend Migration
- [ ] Create Vercel account
- [ ] Import and deploy frontend to Vercel
- [ ] Configure environment variables
- [ ] Update backend CORS settings
- [ ] Test frontend in browser
- [ ] Verify API connectivity
- [ ] Test all user flows

### Post-Migration
- [ ] Remove Railway deployments
- [ ] Delete Railway configuration files
- [ ] Update documentation
- [ ] Configure monitoring and alerts
- [ ] Test all integrations
- [ ] Update team on new URLs
- [ ] Configure custom domains (optional)

## Next Steps

After successful deployment:

1. **Configure Custom Domains**
   - Add your own domain names
   - Configure DNS records
   - Update SSL certificates

2. **Set Up Monitoring**
   - Configure alert notifications
   - Set up log aggregation
   - Implement error tracking

3. **Add Security Tools**
   - Configure ServiceNow integration
   - Add Okta MFA tracking
   - Implement CrowdStrike EDR monitoring

4. **Scale as Needed**
   - Upgrade to paid plans for production
   - Add load balancing for high traffic
   - Implement caching strategies

5. **Team Collaboration**
   - Add team members to platforms
   - Configure role-based access
   - Set up deployment approvals

---

**Deployment Status Reference:**

- Frontend URL: https://cyberrx-frontend.vercel.app
- Backend URL: https://cyberrx-api.onrender.com
- Backend Health: https://cyberrx-api.onrender.com/health
- Repository: https://github.com/btd2026/Cyber-Rx

**Platform Documentation:**
- Vercel: https://vercel.com/docs
- Render: https://render.com/docs

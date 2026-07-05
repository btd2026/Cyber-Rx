# Nerion Troubleshooting Guide

Common issues and solutions for Nerion deployment and operation.

## Table of Contents

1. [Development Issues](#development-issues)
2. [Railway Deployment Issues](#railway-deployment-issues)
3. [Database Issues](#database-issues)
4. [API Issues](#api-issues)
5. [Frontend Issues](#frontend-issues)
6. [Integration Issues](#integration-issues)
7. [Performance Issues](#performance-issues)

## Development Issues

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solutions:**

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3002 npm start
```

### Module Not Found

**Problem:** `Error: Cannot find module 'express'`

**Solutions:**

```bash
# Navigate to correct directory
cd cyberrx-api

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify Node version
node --version  # Should be 20+
```

### Environment Variables Not Loading

**Problem:** Environment variables are `undefined`

**Solutions:**

```bash
# Verify .env file exists
ls -la .env

# Check .env format (no quotes around values)
DATABASE_URL=postgresql://user:pass@host:5432/db
# NOT: DATABASE_URL="postgresql://user:pass@host:5432/db"

# Restart server after .env changes
npm start
```

## Railway Deployment Issues

### Build Failures

**Problem:** Build fails during deployment

**Solutions:**

1. **Check Build Logs**
   - Railway Dashboard → Service → Deployments
   - Review error messages in latest deployment

2. **Verify package.json Scripts**
   ```json
   {
     "scripts": {
       "start": "node src/index.js",
       "build": "vite build"  // Frontend only
     }
   }
   ```

3. **Check Root Directory**
   - API service should use root: `cyberrx-api`
   - Frontend service should use root: `frontend`

4. **Verify Dependencies**
   ```bash
   # Check if all dependencies are listed
   npm install --save-exact
   ```

### Service Not Starting

**Problem:** Service builds but fails to start

**Solutions:**

1. **Check Runtime Logs**
   - Railway Dashboard → Service → Logs
   - Look for error messages

2. **Verify Start Command**
   - API: `npm start`
   - Frontend: `npm run preview`

3. **Check Environment Variables**
   - All required variables must be set
   - `DATABASE_URL` is mandatory for API
   - `VITE_API_URL` is mandatory for frontend

4. **Test Locally**
   ```bash
   # Build locally
   npm run build

   # Test start command
   npm start
   ```

### Service Unhealthy

**Problem:** Railway shows service as unhealthy

**Solutions:**

1. **Verify Health Endpoint**
   ```bash
   curl https://your-api.railway.app/health
   ```

2. **Check Health Check Configuration**
   - API has `/health` endpoint
   - Railway health check path: `/health`

3. **Review Logs**
   - Look for startup errors
   - Check database connection errors

## Database Issues

### Connection Refused

**Problem:** `Error: connect ECONNREFUSED`

**Solutions:**

```bash
# Verify DATABASE_URL format
psql $DATABASE_URL

# Check PostgreSQL is running (local)
docker ps | grep postgres
# OR
brew services list | grep postgresql

# Verify port is correct
# Local: 5432
# Railway: Check service variables
```

### SSL Certificate Errors

**Problem:** `SSL error: certificate verification failed`

**Solutions:**

1. **Local Development**
   ```bash
   # Disable SSL (local only)
   DATABASE_URL=postgresql://user:pass@localhost:5432/db?sslmode=disable
   ```

2. **Railway Production**
   ```javascript
   // API already handles Railway SSL
   // In src/utils/db.js:
   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
   ```

### Database Schema Not Created

**Problem:** Tables don't exist

**Solutions:**

```bash
# Check API logs for initialization
# Should see: "Database schema initialized"

# Manual schema creation (if needed)
psql $DATABASE_URL < schema.sql

# Or restart API to trigger initialization
```

### Connection Pool Exhausted

**Problem:** Too many database connections

**Solutions:**

1. **Check Connection Count**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Update Pool Configuration**
   - In `src/utils/db.js`
   - Increase `max` pool size
   - Reduce `connectionTimeoutMillis`

## API Issues

### CORS Errors

**Problem:** Browser shows CORS policy errors

**Solutions:**

1. **Verify FRONTEND_URL**
   ```bash
   # In API variables
   FRONTEND_URL=https://your-frontend.railway.app

   # Must match exactly (protocol + domain)
   ```

2. **Check CORS Configuration**
   - In `src/index.js`
   - Ensure origin includes frontend URL
   - Restart API after changes

3. **Test API Directly**
   ```bash
   curl https://your-api.railway.app/health
   # Should work without CORS
   ```

### JWT Authentication Not Working

**Problem:** `Error: jwt verify failed`

**Solutions:**

1. **Verify JWT_SECRET**
   ```bash
   # Must be 32+ characters
   # Check API variables
   ```

2. **Regenerate Secret**
   ```bash
   openssl rand -base64 32
   # Update in Railway variables
   ```

3. **Check Token Format**
   - Ensure `Authorization: Bearer <token>`
   - Verify token hasn't expired

### API Returns 404

**Problem:** API routes return 404

**Solutions:**

1. **Verify Route Registration**
   ```javascript
   // In src/index.js
   app.use('/api/itsm', require('./routes/itsm'));
   app.use('/api/tools', require('./routes/tools'));
   ```

2. **Check Request Path**
   ```bash
   # Correct:
   curl https://api/health

   # Incorrect:
   curl https://health
   ```

3. **Verify Express Version**
   ```bash
   npm list express
   # Should be ^4.19.0
   ```

## Frontend Issues

### Build Fails

**Problem:** `npm run build` fails

**Solutions:**

```bash
# Clear build cache
rm -rf dist node_modules/.vite

# Reinstall dependencies
npm install

# Check Vite version
npm list vite
# Should be ^8.0.12
```

### Assets Not Loading

**Problem:** Images/CSS not loading after deployment

**Solutions:**

1. **Check Build Output**
   ```bash
   npm run build
   ls -la dist/
   # Should include assets/ folder
   ```

2. **Verify Base Path**
   - In `vite.config.js`
   - Add base URL if using subdirectory

3. **Check Railway Networking**
   - Ensure service is deployed
   - Verify networking tab shows URL

### API Calls Failing

**Problem:** Frontend can't reach API

**Solutions:**

1. **Verify VITE_API_URL**
   ```bash
   # In frontend variables
   VITE_API_URL=https://your-api.railway.app
   ```

2. **Check Browser Console**
   - Look for network errors
   - Verify API URL is correct
   - Check CORS headers

3. **Test API Directly**
   ```bash
   curl https://your-api.railway.app/health
   ```

### Environment Variables Not Available

**Problem:** `import.meta.env.VITE_API_URL` is undefined

**Solutions:**

1. **Variable Naming**
   - Must start with `VITE_`
   - `VITE_API_URL` ✅
   - `API_URL` ❌

2. **Restart Build**
   - Variable changes require rebuild
   - Railway auto-rebuilds on variable changes

3. **Check Build Logs**
   - Verify variables are injected
   - Look for: "VITE_API_URL=https://..."

## Integration Issues

### ServiceNow Integration Failing

**Problem:** Tickets not created in ServiceNow

**Solutions:**

1. **Verify Credentials**
   ```bash
   SNOW_INSTANCE=your-instance
   SNOW_USER=admin
   SNOW_PASSWORD=your-password
   ```

2. **Test Connection**
   ```bash
   curl -u admin:password https://your-instance.service-now.com/api/now/table/incident
   ```

3. **Check API Permissions**
   - User has `incident_creator` role
   - API access is enabled

### Okta API Errors

**Problem:** Okta metrics not fetching

**Solutions:**

1. **Verify API Token**
   ```bash
   OKTA_DOMAIN=your-org.okta.com
   OKTA_APITOKEN=your-token
   ```

2. **Test Token**
   ```bash
   curl -H "Authorization: SSWS your-token" \
     https://your-org.okta.com/api/v1/users
   ```

3. **Check Okta Scopes**
   - Token has `read` scope
   - User management is enabled

### CrowdStrike Connection Issues

**Problem:** CrowdStrike API not responding

**Solutions:**

1. **Verify OAuth Credentials**
   ```bash
   CROWDSTRIKE_CLIENT_ID=your-client-id
   CROWDSTRIKE_CLIENT_SECRET=your-client-secret
   ```

2. **Check OAuth Token**
   - API requires OAuth token exchange
   - Verify token is not expired

3. **Test API Access**
   ```bash
   # Get OAuth token
   curl -X POST https://api.crowdstrike.com/oauth2/token \
     -d "client_id=$id&client_secret=$secret"
   ```

## Performance Issues

### Slow API Response

**Problem:** API takes too long to respond

**Solutions:**

1. **Check Database Queries**
   - Review slow query logs
   - Add database indexes
   - Optimize complex queries

2. **Increase Resources**
   - Railway Dashboard → Service → Settings
   - Increase CPU/RAM allocation

3. **Enable Caching**
   - Cache frequently accessed data
   - Use Redis for distributed caching

### High Memory Usage

**Problem:** Service runs out of memory

**Solutions:**

1. **Check Memory Leaks**
   ```bash
   # Railway logs show memory usage
   # Look for steady increase
   ```

2. **Optimize Code**
   - Close database connections
   - Clear unnecessary caches
   - Process data in chunks

3. **Increase Memory Limit**
   - Railway Dashboard → Settings
   - Adjust memory allocation

### Frontend Slow to Load

**Problem:** Large bundle size, slow initial load

**Solutions:**

1. **Analyze Bundle**
   ```bash
   npm run build -- --report
   # Check dist/report.html
   ```

2. **Code Splitting**
   ```javascript
   // Dynamic imports
   const Dashboard = lazy(() => import('./Dashboard'));
   ```

3. **Enable Compression**
   - Railway automatically gzip compresses
   - Verify it's enabled in settings

## Debugging Tips

### Enable Debug Logging

```bash
# API
DEBUG=cyberrx:* npm start

# Railway variables
DEBUG=cyberrx:*
LOG_LEVEL=debug
```

### Check All Services

```bash
# API Health
curl https://your-api.railway.app/health

# Frontend Load
curl -I https://your-frontend.railway.app

# Database Connection
psql $DATABASE_URL -c "SELECT 1"
```

### Review Logs Systematically

1. Railway Dashboard → Service → Logs
2. Filter by error level
3. Check startup sequence
4. Look for error patterns
5. Note timestamps

### Common Error Patterns

- `ECONNREFUSED` → Service not running or wrong port
- `EADDRINUSE` → Port already in use
- `JWT expired` → Token needs refresh
- `CORS error` → Frontend URL not whitelisted
- `404 Not Found` → Route not registered
- `500 Internal Server` → Check application logs

## Getting Help

### Information to Provide

When seeking help, include:

1. **Environment**
   - Local or Railway
   - Node version
   - Browser (if frontend issue)

2. **Error Messages**
   - Full error stack trace
   - Timestamps from logs
   - Steps to reproduce

3. **Configuration**
   - Environment variables (sanitized)
   - Service names/URLs
   - Railway plan

### Resources

- [Railway Documentation](https://docs.railway.app/)
- [SETUP.md](./SETUP.md) - Setup issues
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Configuration issues
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Deployment issues

### Emergency Procedures

1. **Service Down**
   - Check Railway status page
   - Review service logs
   - Verify database connectivity
   - Check recent deployments

2. **Data Loss**
   - Railway backups automatic
   - Restore from backup in dashboard
   - Contact Railway support for assistance

3. **Security Incident**
   - Rotate all secrets immediately
   - Review access logs
   - Update dependencies
   - Enable additional monitoring

---

**Still having issues?**

1. Check logs first
2. Verify all variables
3. Test health endpoints
4. Review configuration files
5. Consult specific documentation above
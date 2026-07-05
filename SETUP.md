# Nerion Setup Guide

Complete setup instructions for developers and operators deploying Nerion.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Production Deployment](#production-deployment)
3. [Database Setup](#database-setup)
4. [Security Tool Integration](#security-tool-integration)
5. [Verification Steps](#verification-steps)

## Development Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** 20.0 or higher ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **PostgreSQL** (for local development, optional)
- **Code editor** (VSCode recommended)

### Step 1: Clone and Setup Repository

```bash
# Clone the repository
git clone <your-repository-url>
cd Cyber-Rx

# Verify structure
ls -la
# Should show: cyberrx-api/, frontend/, README.md
```

### Step 2: Backend API Setup

```bash
# Navigate to API directory
cd cyberrx-api

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# For local development, defaults usually work
nano .env
```

#### Development .env Configuration

```bash
# Database (use Railway DATABASE_URL in production)
DATABASE_URL=postgresql://cyberrx:cyberrx@localhost:5432/cyberrx

# Environment
NODE_ENV=development
PORT=3001

# Security
JWT_SECRET=development-secret-change-in-production-min-32-chars
VAULT_MODE=local

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env to point to API
nano .env
```

#### Frontend .env Configuration

```bash
# API URL - Point to local development API
VITE_API_URL=http://localhost:3001
```

### Step 4: Start Development Servers

```bash
# Terminal 1 - Start Backend API
cd cyberrx-api
npm start

# Terminal 2 - Start Frontend
cd frontend
npm run dev
```

### Step 5: Verify Development Setup

1. **API Health Check**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok","version":"1.0.0","ts":"..."}
   ```

2. **Frontend Access**
   - Open browser: http://localhost:5173
   - Should load Nerion dashboard

## Production Deployment

### Railway Deployment (Recommended)

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed Railway deployment instructions.

#### Quick Railway Setup

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Railway deployment"
   git push origin main
   ```

2. **Create Railway Project**
   - Go to https://railway.app/
   - New Project → Deploy from GitHub
   - Select repository

3. **Deploy Services in Order**
   - Add PostgreSQL database
   - Deploy Backend API (cyberrx-api)
   - Deploy Frontend (frontend)

4. **Configure Environment Variables**
   - Set `DATABASE_URL` from PostgreSQL service
   - Set `FRONTEND_URL` for CORS
   - Set `VITE_API_URL` in frontend

## Database Setup

### Local PostgreSQL Setup

#### Option 1: Docker (Recommended for Local)

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name cyberrx-db \
  -e POSTGRES_USER=cyberrx \
  -e POSTGRES_PASSWORD=cyberrx \
  -e POSTGRES_DB=cyberrx \
  -p 5432:5432 \
  postgres:16-alpine

# Verify connection
docker exec -it cyberrx-db psql -U cyberrx -d cyberrx
```

#### Option 2: Native PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Create database
psql postgres
CREATE DATABASE cyberrx;
CREATE USER cyberrx WITH PASSWORD 'cyberrx';
GRANT ALL PRIVILEGES ON DATABASE cyberrx TO cyberrx;
\q
```

### Database Schema

The database schema is automatically initialized when the API starts. Tables include:

- **orgs**: Organization information and configuration
- **users**: User accounts and roles
- **metrics**: Security metrics data
- **route_actions**: ITSM ticket routing history
- **tool_connections**: Security tool integration status

### Railway PostgreSQL

Railway provides managed PostgreSQL with automatic connection string:

```bash
# Railway automatically sets DATABASE_URL
# Format: postgresql://<user>:<password>@<host>:<port>/<database>
# The API will auto-connect using this variable
```

## Security Tool Integration

### Supported Tools

Nerion integrates with the following security tools:

#### ITSM Systems
- **ServiceNow**: Incident ticket creation and management
- **Jira**: Issue tracking and project management
- **Freshservice**: IT service management

#### Security Tools
- **Okta**: MFA metrics and user management
- **CrowdStrike Falcon**: EDR detection and response
- **Splunk**: SIEM log analysis
- **KnowBe4**: Phishing security awareness
- **Tenable.io**: Vulnerability management

### Integration Setup

For each tool, add environment variables to the API service:

#### ServiceNow Example

```bash
# Add to API environment variables
SNOW_INSTANCE=your-instance123
SNOW_USER=admin
SNOW_PASSWORD=your-secure-password
SNOW_ASSIGN_GROUP=IT Security
```

#### CrowdStrike Example

```bash
CROWDSTRIKE_CLIENT_ID=your-client-id
CROWDSTRIKE_CLIENT_SECRET=your-client-secret
```

#### Okta Example

```bash
OKTA_DOMAIN=your-org.okta.com
OKTA_APITOKEN=00your-api-token-here
```

### Testing Integrations

```bash
# Test ITSM integration
curl -X POST http://localhost:3001/api/itsm/ticket \
  -H "Content-Type: application/json" \
  -H "X-Org-ID: demo-org" \
  -d '{"title":"Test","description":"Test ticket"}'

# Test tool connections
curl http://localhost:3001/api/tools/status \
  -H "X-Org-ID: demo-org"
```

## Verification Steps

### Health Checks

#### API Health
```bash
curl https://your-api-url.railway.app/health
# Expected: {"status":"ok","version":"1.0.0","ts":"2025-..."}
```

#### Database Connection
```bash
# Check API logs for database initialization
# Should see: "Database schema initialized"
```

### Frontend Verification

1. **Load Frontend**
   - Navigate to your Railway frontend URL
   - Page should load without errors

2. **API Connectivity**
   - Open browser DevTools Console
   - Check for successful API calls
   - No CORS errors

3. **Test Dashboard**
   - Create a test organization
   - Verify metrics display
   - Check CMMI scoring

### Production Checklist

- [ ] GitHub repository pushed
- [ ] Railway project created
- [ ] PostgreSQL database deployed
- [ ] Backend API deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] Environment variables configured
- [ ] CORS properly configured
- [ ] SSL/HTTPS working
- [ ] Custom domain (optional)
- [ ] Monitoring enabled
- [ ] Database backups enabled

## Troubleshooting

### Common Issues

#### API won't start
```bash
# Check Node version
node --version  # Should be 20+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Database connection errors
```bash
# Verify DATABASE_URL is correct
# Check PostgreSQL is running
# Test connection manually
psql $DATABASE_URL
```

#### CORS errors in browser
```bash
# Verify FRONTEND_URL is set in API
# Check VITE_API_URL is set in frontend
# Ensure both use HTTPS in production
```

### Debug Mode

Enable detailed logging:

```bash
# API
NODE_ENV=development npm start

# Frontend
npm run dev -- --debug
```

### Getting Help

- Check logs: Railway Dashboard → Logs
- Review environment variables
- Verify service health endpoints
- Check database connectivity
- Review CORS configuration

## Next Steps

After setup:

1. Configure security tool credentials
2. Set up custom domain (optional)
3. Configure monitoring and alerts
4. Set up backup strategies
5. Configure CI/CD pipeline

For additional help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
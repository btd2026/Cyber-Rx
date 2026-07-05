# Environment Variables Reference

Complete reference for all environment variables used in Nerion.

## Table of Contents

1. [Backend API Variables](#backend-api-variables)
2. [Frontend Variables](#frontend-variables)
3. [Railway-Specific Variables](#railway-specific-variables)
4. [Security Tool Credentials](#security-tool-credentials)
5. [ITS System Credentials](#its-system-credentials)
6. [Configuration Examples](#configuration-examples)

## Backend API Variables

### Core Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | string | Yes | - | PostgreSQL connection string |
| `NODE_ENV` | string | Yes | development | Environment mode (development/production) |
| `PORT` | number | No | 3001 | API server port |
| `JWT_SECRET` | string | Yes | - | JWT token signing secret (min 32 chars) |
| `VAULT_MODE` | string | No | local | Credential vault mode (local/aws) |
| `FRONTEND_URL` | string | Yes | - | Frontend URL for CORS configuration |

### Database Configuration

```bash
# PostgreSQL Connection String Format
DATABASE_URL=postgresql://username:password@host:port/database

# Railway Example (auto-configured)
DATABASE_URL=postgresql://postgres:abc123@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Local Development Example
DATABASE_URL=postgresql://cyberrx:cyberrx@localhost:5432/cyberrx
```

### Security Configuration

```bash
# JWT Secret - Generate a secure random string
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# Vault Mode
VAULT_MODE=local    # Read from environment variables
VAULT_MODE=aws      # Read from AWS Secrets Manager (production)
```

### CORS Configuration

```bash
# Frontend URL - Must match your deployed frontend
FRONTEND_URL=https://your-frontend.railway.app

# Local Development
FRONTEND_URL=http://localhost:5173
```

## Frontend Variables

### Core Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `VITE_API_URL` | string | Yes | http://localhost:3001 | Backend API base URL |

### API Configuration

```bash
# Production - Point to Railway API service
VITE_API_URL=https://your-api.railway.app

# Local Development
VITE_API_URL=http://localhost:3001

# Custom Domain
VITE_API_URL=https://api.cyberrx.com
```

## Railway-Specific Variables

Railway automatically provides these variables:

### Built-in Variables

| Variable | Description | Usage |
|----------|-------------|-------|
| `RAILWAY_ENVIRONMENT` | Environment name | Conditional logic |
| `RAILWAY_SERVICE_NAME` | Service name | Logging/debugging |
| `RAILWAY_PROJECT_ID` | Project ID | API calls |
| `PORT` | Auto-assigned port | Server configuration |

### PostgreSQL Variables (Railway Database)

Railway automatically sets `DATABASE_URL` when you add a PostgreSQL service.

```bash
# Format (auto-configured)
DATABASE_URL=postgresql://postgres:password@host:port/dbname

# SSL Configuration (built-in)
# The API automatically handles SSL for Railway connections
```

## Security Tool Credentials

### Okta (MFA Metrics)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `OKTA_DOMAIN` | string | No | Okta domain (e.g., your-org.okta.com) |
| `OKTA_APITOKEN` | string | No | Okta API token |

```bash
OKTA_DOMAIN=your-org.okta.com
OKTA_APITOKEN=00abc123yourTokenHere
```

### CrowdStrike Falcon (EDR Metrics)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `CROWDSTRIKE_CLIENT_ID` | string | No | CrowdStrike OAuth client ID |
| `CROWDSTRIKE_CLIENT_SECRET` | string | No | CrowdStrike OAuth client secret |

```bash
CROWDSTRIKE_CLIENT_ID=your-client-id-here
CROWDSTRIKE_CLIENT_SECRET=your-client-secret-here
```

### Splunk (SIEM Metrics)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `SPLUNK_HOST` | string | No | Splunk instance hostname |
| `SPLUNK_USER` | string | No | Splunk username |
| `SPLUNK_PASSWORD` | string | No | Splunk password |
| `SPLUNK_PORT` | number | No | Splunk port (default: 8089) |

```bash
SPLUNK_HOST=splunk.yourorg.com
SPLUNK_USER=admin
SPLUNK_PASSWORD=your-secure-password
SPLUNK_PORT=8089
```

### KnowBe4 (Phishing Metrics)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `KNOWBE4_APIKEY` | string | No | KnowBe4 API key |

```bash
KNOWBE4_APIKEY=your-api-key-here
```

### Tenable.io (Vulnerability Metrics)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `TENABLE_ACCESS_KEY` | string | No | Tenable access key |
| `TENABLE_SECRET_KEY` | string | No | Tenable secret key |

```bash
TENABLE_ACCESS_KEY=your-access-key
TENABLE_SECRET_KEY=your-secret-key
```

## ITSM System Credentials

### ServiceNow

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `SNOW_INSTANCE` | string | No | ServiceNow instance name |
| `SNOW_USER` | string | No | ServiceNow username |
| `SNOW_PASSWORD` | string | No | ServiceNow password |
| `SNOW_ASSIGN_GROUP` | string | No | Default assignment group |

```bash
SNOW_INSTANCE=dev12345
SNOW_USER=admin
SNOW_PASSWORD=your-secure-password
SNOW_ASSIGN_GROUP=IT Security
```

### Jira

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `JIRA_INSTANCE` | string | No | Jira instance name |
| `JIRA_EMAIL` | string | No | Jira user email |
| `JIRA_TOKEN` | string | No | Jira API token |
| `JIRA_PROJECT` | string | No | Default project key |

```bash
JIRA_INSTANCE=yourorg
JIRA_EMAIL=you@yourorg.com
JIRA_TOKEN=your-api-token-here
JIRA_PROJECT=SEC
```

### Freshservice

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `FRESHSERVICE_DOMAIN` | string | No | Freshservice domain |
| `FRESHSERVICE_APIKEY` | string | No | Freshservice API key |

```bash
FRESHSERVICE_DOMAIN=yourorg
FRESHSERVICE_APIKEY=your-api-key-here
```

## Configuration Examples

### Minimum Production Setup

```bash
# Backend (API Service)
DATABASE_URL=<from-railway-postgresql>
NODE_ENV=production
PORT=3001
JWT_SECRET=<generate-secure-32-char-string>
VAULT_MODE=local
FRONTEND_URL=https://your-frontend.railway.app

# Frontend (Frontend Service)
VITE_API_URL=https://your-api.railway.app
```

### Full Security Tool Integration

```bash
# Core (Required)
DATABASE_URL=<from-railway-postgresql>
NODE_ENV=production
PORT=3001
JWT_SECRET=<secure-secret>
VAULT_MODE=local
FRONTEND_URL=https://your-frontend.railway.app

# ServiceNow (ITSM)
SNOW_INSTANCE=prod12345
SNOW_USER=cyberrx-bot
SNOW_PASSWORD=<secure-password>
SNOW_ASSIGN_GROUP=Information Security

# Okta (MFA)
OKTA_DOMAIN=yourhealthcare.okta.com
OKTA_APITOKEN=<api-token>

# CrowdStrike (EDR)
CROWDSTRIKE_CLIENT_ID=<client-id>
CROWDSTRIKE_CLIENT_SECRET=<client-secret>

# Splunk (SIEM)
SPLUNK_HOST=splunk.yourhealthcare.com
SPLUNK_USER=cyberrx-reader
SPLUNK_PASSWORD=<secure-password>
SPLUNK_PORT=8089

# KnowBe4 (Security Training)
KNOWBE4_APIKEY=<api-key>

# Tenable (Vulnerability Management)
TENABLE_ACCESS_KEY=<access-key>
TENABLE_SECRET_KEY=<secret-key>
```

### Local Development Setup

```bash
# Backend (cyberrx-api/.env)
DATABASE_URL=postgresql://cyberrx:cyberrx@localhost:5432/cyberrx
NODE_ENV=development
PORT=3001
JWT_SECRET=development-secret-min-32-chars
VAULT_MODE=local
FRONTEND_URL=http://localhost:5173

# Frontend (frontend/.env)
VITE_API_URL=http://localhost:3001
```

## Security Best Practices

### Secret Generation

Generate secure secrets using:

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate API token placeholder
openssl rand -hex 16
```

### Environment Variable Management

1. **Never commit `.env` files** to git
2. **Use Railway's Variables** for production
3. **Rotate secrets regularly**
4. **Use different secrets** for each environment
5. **Monitor for secret leaks** using git-secrets or similar

### Railway Variable Setup

1. Go to Railway Dashboard
2. Select your API service
3. Click "Variables" tab
4. Add each variable:
   - Key: `DATABASE_URL`
   - Value: `<from-postgres-service>`
5. Repeat for all variables

### Variable Priority

Variables are loaded in this order (later overrides earlier):

1. Railway service variables (highest priority)
2. `.env` files (not in production)
3. System environment variables
4. Default values in code

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Test DATABASE_URL
psql $DATABASE_URL

# Check SSL configuration
# Railway requires SSL, verify in logs
```

#### CORS Errors

```bash
# Verify FRONTEND_URL matches exactly
# Include protocol (https://)
# Check for trailing slashes
```

#### Missing Variables

```bash
# Check Railway variables are set
# Verify variable names match exactly
# Case-sensitive: DATABASE_URL != database_url
```

### Debug Mode

Enable variable debugging:

```bash
# Add to API variables
DEBUG=cyberrx:*
NODE_ENV=development
```

## Additional Resources

- [Railway Environment Variables](https://docs.railway.app/reference/variables/)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [ServiceNow API Docs](https://docs.servicenow.com/)
- [CrowdStrike API Docs](https://falcon.crowdstrike.com/support/documentation/)

For configuration issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
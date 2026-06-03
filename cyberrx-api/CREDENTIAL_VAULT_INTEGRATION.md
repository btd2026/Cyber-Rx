# Credential Vault Integration Guide

## Overview

This guide explains how to integrate CyberRx API with enterprise credential vaults for secure secret management in production environments. **Never store secrets in environment variables in production** - use a proper credential vault instead.

## Supported Vault Platforms

- **AWS Secrets Manager** (Recommended for AWS deployments)
- **HashiCorp Vault** (Enterprise-standard, platform-agnostic)
- **Azure Key Vault** (For Azure deployments)
- **Google Secret Manager** (For GCP deployments)

## Why Use a Credential Vault?

### Security Benefits
1. **Centralized secret management** - All secrets in one place with audit trails
2. **Automatic rotation** - Secrets can be rotated without application restarts
3. **Access control** - Fine-grained permissions with IAM roles
4. **Encryption at rest** - Secrets are encrypted with AWS KMS or equivalent
5. **Audit logging** - All secret accesses are logged for compliance
6. **No secrets in code** - Eliminates risk of accidental commits to Git

### Operational Benefits
1. **Single source of truth** - Same secrets across all environments
2. **Easy rotation** - Rotate secrets without code changes
3. **Disaster recovery** - Secrets backed up and versioned
4. **Compliance** - Meets HIPAA, SOC 2, and PCI-DSS requirements

## Option 1: AWS Secrets Manager (Recommended)

### Prerequisites

1. AWS account with appropriate IAM permissions
2. AWS CLI configured: `aws configure`
3. Node.js AWS SDK v3 installed (included in dependencies)

### Architecture

```
CyberRx API → AWS SDK → Secrets Manager → Retrieve Secrets → Start Application
```

### Setup Instructions

#### Step 1: Create IAM Policy for Secrets Manager Access

Create an IAM policy with minimal required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:cyberrx/*"
      ]
    }
  ]
}
```

#### Step 2: Store Secrets in AWS Secrets Manager

Use the AWS CLI or Console to store secrets. We recommend two approaches:

**Option A: Single Secret with JSON (Recommended)**

```bash
aws secretsmanager create-secret \
  --name "cyberrx/production" \
  --description "CyberRx Production Secrets" \
  --secret-string '{
    "DATABASE_URL": "postgresql://user:pass@host:5432/cyberrx",
    "JWT_SECRET": "your-production-jwt-secret-min-32-chars",
    "SESSION_SECRET": "your-production-session-secret-min-32-chars",
    "REDIS_URL": "redis://:password@redis.host:6379",
    "CORS_ALLOWLIST": "https://app.cyberrx.com,https://www.anthropic.com",
    "OKTA_DOMAIN": "your-org.okta.com",
    "OKTA_APITOKEN": "00your-okta-token-here",
    "SENTRY_DSN": "https://your-sentry-dsn@sentry.io/project-id",
    "DATADOG_API_KEY": "your-datadog-api-key"
  }'
```

**Option B: Individual Secrets (Granular Control)**

```bash
# Database connection
aws secretsmanager create-secret \
  --name "cyberrx/production/database-url" \
  --description "PostgreSQL connection string" \
  --secret-string "postgresql://user:pass@host:5432/cyberrx"

# JWT secret
aws secretsmanager create-secret \
  --name "cyberrx/production/jwt-secret" \
  --description "JWT signing secret" \
  --secret-string "your-production-jwt-secret-min-32-chars"

# Session secret
aws secretsmanager create-secret \
  --name "cyberrx/production/session-secret" \
  --description "Session encryption secret" \
  --secret-string "your-production-session-secret-min-32-chars"
```

#### Step 3: Configure Application to Use AWS Secrets Manager

Set the vault mode and secret name in your deployment environment:

```bash
# Set vault mode to AWS
export VAULT_MODE=aws

# Set secret name (or prefix for individual secrets)
export AWS_SECRET_ID=cyberrx/production

# Set AWS region
export AWS_REGION=us-east-1

# AWS credentials will be loaded from:
# 1. EC2 instance role (best for production)
# 2. ECS task role (best for container deployments)
# 3. Environment variables (for testing only)
# export AWS_ACCESS_KEY_ID=your-access-key
# export AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

#### Step 4: Application Startup Flow

When `VAULT_MODE=aws`, the application will:

1. **Skip local environment variable loading** for secrets
2. **Fetch secret from AWS Secrets Manager** using AWS SDK
3. **Load secret values into process.env** for application use
4. **Proceed with normal startup validation**

The startup validation script (`src/config/env-validation.js`) will:
- Verify critical secrets are present (DATABASE_URL, JWT_SECRET)
- Validate secret formats and minimum lengths
- Fail fast if any critical secret is missing

### Rotation Strategy

#### Automatic Rotation (Recommended)

Enable automatic secret rotation in AWS Secrets Manager:

```bash
aws secretsmanager rotate-secret \
  --secret-id "cyberrx/production" \
  --rotation-lambda-arn "arn:aws:lambda:us-east-1:123456789012:function:RotateCyberRxCreds" \
  --rotation-rules "AutomaticallyAfterDays=90"
```

Create a Lambda function to handle rotation logic:
1. Generate new secret
2. Test database/Redis connectivity with new secret
3. Update application configuration (if needed)
4. Mark old secret as deprecated

#### Manual Rotation

For manual rotation:

```bash
# 1. Generate new secrets
NEW_JWT_SECRET=$(openssl rand -base64 32)
NEW_SESSION_SECRET=$(openssl rand -base64 32)

# 2. Update secret in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id "cyberrx/production" \
  --secret-string '{
    "JWT_SECRET": "'"$NEW_JWT_SECRET"'",
    "SESSION_SECRET": "'"$NEW_SESSION_SECRET"'"
  }'

# 3. Restart application pods/deployments
kubectl rollout restart deployment/cyberrx-api

# 4. Verify application health
kubectl get pods -l app=cyberrx-api
```

### Environment-Specific Secrets

Create separate secrets for each environment:

```bash
# Development
aws secretsmanager create-secret --name "cyberrx/development" --secret-string '{...}'

# Staging
aws secretsmanager create-secret --name "cyberrx/staging" --secret-string '{...}'

# Production
aws secretsmanager create-secret --name "cyberrx/production" --secret-string '{...}'
```

Configure environment-specific secret ID:

```bash
# Development deployment
export AWS_SECRET_ID=cyberrx/development

# Production deployment
export AWS_SECRET_ID=cyberrx/production
```

### Cost Optimization

**AWS Secrets Manager Pricing:**
- $0.40 per secret per month
- $0.05 per 10,000 API calls

**Optimization Tips:**
1. Use single JSON secret instead of multiple individual secrets
2. Implement caching to reduce API calls (application-level cache)
3. Use environment-specific secrets only when necessary
4. Remove unused secrets

**Estimated Monthly Cost:**
- 3 environments × 1 secret = $1.20/month
- 10,000 API calls = $0.05
- **Total: ~$1.25/month** (negligible for production)

## Option 2: HashiCorp Vault

### Prerequisites

1. HashiCorp Vault Enterprise or Open Source running
2. Vault token or AWS IAM authentication configured
3. Vault CLI installed

### Setup Instructions

#### Step 1: Enable KV Secrets Engine

```bash
vault secrets enable -path=cyberrx kv-v2
```

#### Step 2: Store Secrets

```bash
# Production secrets
vault kv put cyberrx/production \
  database_url="postgresql://user:pass@host:5432/cyberrx" \
  jwt_secret="your-production-jwt-secret" \
  session_secret="your-production-session-secret" \
  redis_url="redis://:password@redis.host:6379" \
  cors_allowlist="https://app.cyberrx.com" \
  sentry_dsn="https://your-sentry-dsn@sentry.io/project-id"
```

#### Step 3: Configure Vault Authentication

**Option A: Vault Token (Testing)**

```bash
export VAULT_ADDR=https://vault.yourorg.com
export VAULT_TOKEN=hvs.YOUR_TOKEN_HERE
```

**Option B: AWS IAM Auth (Production)**

```bash
# Configure Vault AWS auth backend
vault auth enable aws
vault write auth/aws/config/client \
  access_key=YOUR_AWS_ACCESS_KEY \
  secret_key=YOUR_AWS_SECRET_KEY \
  iam_server_id_header_value=vault.yourorg.com

# Create role for EC2 instances
vault write auth/aws/role/cyberrx-api \
  auth_type=ec2 \
  bound_iam_role_arn=arn:aws:iam::123456789012:role/CyberRxAPI \
  policies=cyberrx-api \
  ttl=1h
```

#### Step 4: Create Vault Policy

```bash
vault policy write cyberrx-api - <<EOF
path "cyberrx/data/production" {
  capabilities = ["read"]
}
EOF
```

#### Step 5: Application Configuration

Set environment variables:

```bash
export VAULT_MODE=vault
export VAULT_ADDR=https://vault.yourorg.com
export VAULT_PATH=cyberrx/production
export VAULT_AUTH_METHOD=aws
```

## Option 3: Azure Key Vault

### Prerequisites

1. Azure subscription
2. Azure Key Vault instance created
3. Azure CLI installed

### Setup Instructions

#### Step 1: Create Key Vault

```bash
az keyvault create \
  --name "cyberrx-kv" \
  --resource-group "CyberRx-Production" \
  --location "eastus"
```

#### Step 2: Store Secrets

```bash
# Database URL
az keyvault secret set \
  --vault-name "cyberrx-kv" \
  --name "DatabaseUrl" \
  --value "postgresql://user:pass@host:5432/cyberrx"

# JWT Secret
az keyvault secret set \
  --vault-name "cyberrx-kv" \
  --name "JwtSecret" \
  --value "your-production-jwt-secret"
```

#### Step 3: Configure Managed Identity

```bash
# Enable managed identity for your app
az identity create \
  --resource-group "CyberRx-Production" \
  --name "cyberrx-api-identity"

# Grant access to Key Vault
az keyvault set-policy \
  --name "cyberrx-kv" \
  --object-id <identity-principal-id> \
  --secret-permissions get list
```

## Implementation Notes

### Application Code Changes

The credential vault integration is designed to be **non-breaking**. The application will:

1. Check `VAULT_MODE` environment variable
2. If `VAULT_MODE=local`: Read from environment variables (default behavior)
3. If `VAULT_MODE=aws`: Fetch from AWS Secrets Manager
4. If `VAULT_MODE=vault`: Fetch from HashiCorp Vault

No code changes required for existing `.env`-based deployments.

### Vault Loading Logic

```javascript
// Pseudocode for vault loading
if (process.env.VAULT_MODE === 'aws') {
  const secrets = await loadFromAWSSecretsManager();
  Object.assign(process.env, secrets);
} else if (process.env.VAULT_MODE === 'vault') {
  const secrets = await loadFromHashiCorpVault();
  Object.assign(process.env, secrets);
}
// Default: process.env already loaded from .env file

// Then validate
validateEnv();
```

### Error Handling

If vault integration fails:
- **Development**: Log error and exit with clear message
- **Production**: Retry with exponential backoff (3 retries)
- **All environments**: Fail fast if critical secrets missing

## Migration Path: From .env to Vault

### Phase 1: Prepare (Pre-Migration)

1. **Audit current secrets**: List all environment variables in use
2. **Choose vault platform**: AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault
3. **Create IAM policies**: Set up least-privilege access
4. **Test in development**: Verify vault integration works

### Phase 2: Migrate Secrets

1. **Export current secrets** from .env files (secure transfer)
2. **Store in vault** using appropriate format (JSON or individual)
3. **Verify vault access** with test application
4. **Document secret locations** for team reference

### Phase 3: Deploy

1. **Set VAULT_MODE** to vault platform (aws/vault/azure)
2. **Set AWS_SECRET_ID** or equivalent vault path
3. **Deploy to staging** and verify application starts correctly
4. **Deploy to production** after staging validation

### Phase 4: Cleanup

1. **Remove secrets from .env files** (replace with placeholders)
2. **Update deployment documentation** with vault instructions
3. **Audit old commits** for leaked secrets (use trufflehog)
4. **Rotate all secrets** (now that vault is in place)

## Security Best Practices

### 1. Principle of Least Privilege

Grant minimal permissions to applications:
- Read-only access to secrets (no write/delete)
- Access only to specific secret paths (not all secrets)
- Time-limited tokens with short TTLs

### 2. Secret Rotation Schedule

- **JWT_SECRET**: Rotate every 90 days
- **SESSION_SECRET**: Rotate every 90 days
- **Database passwords**: Rotate every 180 days
- **API keys**: Rotate per vendor requirements

### 3. Audit Trail

Enable audit logging for all vault access:
- Log every secret read operation
- Alert on suspicious access patterns
- Regularly review audit logs (quarterly)

### 4. Disaster Recovery

- Enable secret versioning in vault
- Test secret restore procedures
- Document secret recovery process
- Maintain offline backup of critical secrets

### 5. Compliance Requirements

- **HIPAA**: Audit logs + encryption at rest + access control
- **SOC 2**: Secret rotation + audit logs + access reviews
- **PCI-DSS**: Quarterly rotation + audit logs + encryption

## Troubleshooting

### Issue: Application fails to start with "FATAL: Environment validation failed"

**Possible Causes:**
1. VAULT_MODE set but vault unreachable
2. AWS credentials missing or invalid
3. Secret ID/path incorrect
4. Critical secret missing from vault

**Solutions:**
```bash
# Test vault access manually
aws secretsmanager get-secret-value --secret-id "cyberrx/production"

# Verify AWS credentials
aws sts get-caller-identity

# Check VAULT_MODE and AWS_SECRET_ID
echo $VAULT_MODE
echo $AWS_SECRET_ID

# Fallback to local mode for testing
export VAULT_MODE=local
# Ensure .env file has required variables
```

### Issue: "AccessDeniedException" from AWS Secrets Manager

**Solution:**
1. Verify IAM policy has `secretsmanager:GetSecretValue`
2. Check IAM role is attached to EC2/ECS task
3. Verify secret ARN in policy matches secret ID

### Issue: Secrets not loading from vault

**Debug Steps:**
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Check vault integration logs
# Logs will show:
# - Vault mode selected
# - Secret ID/path being accessed
# - Secrets retrieved (or error)

# Verify secret format
# If using JSON secret, ensure valid JSON structure
aws secretsmanager get-secret-value --secret-id "cyberrx/production" --query SecretString --output text
```

## Additional Resources

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [NIST Secret Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review CloudWatch logs (for AWS Secrets Manager)
3. Contact DevOps team with specific error messages
4. Create GitHub issue with redacted logs

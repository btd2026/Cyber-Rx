# SSO Setup Guide for Okta and Azure AD

**Task:** SAML and OIDC SSO Integration
**Last Updated:** 2026-06-11

---

## Table of Contents
1. [Okta SAML Setup](#okta-saml-setup)
2. [Azure AD OIDC Setup](#azure-ad-oidc-setup)
3. [Testing SSO Integration](#testing-sso-integration)
4. [Production Checklist](#production-checklist)

---

## Okta SAML Setup

### Step 1: Create Okta Application

1. Log in to your Okta Admin Console (https://admin.okta.com)
2. Navigate to **Applications** > **Applications**
3. Click **Create App Integration**
4. Select **SAML 2.0** and click **Next**

### Step 2: Configure General Settings

```
App Name: CyberRx
App logo: (upload CyberRx logo if available)
App type: Single Page App (SPA) or Web Application
```

### Step 3: Configure SAML Settings

**Single Sign-On URL:**
```
https://api.cyberrx.com/sso/saml/callback
```

**Recipient URL:**
```
https://api.cyberrx.com/sso/saml/callback
```

**Destination URL:**
```
https://api.cyberrx.com/sso/saml/callback
```

**Audience URI (SP Entity ID):**
```
https://api.cyberrx.com
```

**Attribute Statements (Application User Profile):**

| Name | Name Format | Value |
|------|-------------|-------|
| Email | Basic | user.email |
| FirstName | Basic | user.firstName |
| LastName | Basic | user.lastName |
| EmailDomain | Basic | user.email |

**Group Attribute Statements (Optional):**

| Name | Name Format | Filter | Value |
|------|-------------|--------|-------|
| Group | Basic | Matches regex | .* |

### Step 4: Configure Advanced Settings

```
Signature Algorithm: RSA-SHA256
Digest Algorithm: SHA256
Assertion Encryption: Unencrypted
SAML Version: 2.0
```

### Step 5: Download Certificate

1. Navigate to **Sign On** tab
2. Scroll to **SAML Signing Certificate**
3. Click **View Certificate** or download PEM file

### Step 6: Configure CyberRx Environment Variables

Add to your `.env` file:

```bash
# Okta SAML Configuration
SAML_ENTRY_POINT=https://dev-123456.okta.com/app/dev123456/sso/saml
SAML_ISSUER=https://dev-123456.okta.com
SAML_CERT="-----BEGIN CERTIFICATE-----
MIIDpDCCAoygAwIBAgIGAVB6hJ+PMA0GCSqGSIb3DQEBCwUAMB0xGzAZBgNVBAMT
Ek9rdGEgQ2VydGlmaWNhdGUgQXV0aG9yaXR5MB4XDTI2MDExMTAwMDAwMFoXDTM2
...
-----END CERTIFICATE-----"
SAML_CALLBACK_URL=https://api.cyberrx.com/sso/saml/callback
```

**Note:** Include the entire certificate including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines.

### Step 7: Assign Users to Application

1. Navigate to **Assignments** tab
2. Click **Assign** > **Assign to People**
3. Select users who should have access to CyberRx
4. Click **Confirm**

### Step 8: Test SAML Login

```bash
# Start your CyberRx API
npm run dev

# Visit SAML login URL
https://api.cyberrx.com/sso/saml

# Should redirect to Okta login page
```

---

## Azure AD OIDC Setup

### Step 1: Create Azure AD Application

1. Log in to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**

### Step 2: Configure Application

```
Name: CyberRx
Supported account types:
  - Accounts in this organizational directory only (Single tenant)
  - Accounts in any organizational directory (Any Azure AD directory - Multitenant)
  - Accounts in any organizational directory and personal Microsoft accounts

Redirect URI (optional):
  Type: Web
  Value: https://api.cyberrx.com/sso/azure/callback
```

Click **Register**.

### Step 3: Get Application Details

After registration, you'll see:

```
Application (client) ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Directory (tenant) ID: 12345678-1234-1234-1234-123456789012
Object ID: abcdef12-3456-7890-abcd-ef1234567890
```

Copy the **Application (client) ID** and **Directory (tenant) ID**.

### Step 4: Configure API Permissions

1. Navigate to **API permissions** > **Add a permission**
2. Select **Microsoft Graph**
3. Select **Delegated permissions**
4. Add the following permissions:
   - `email`
   - `profile`
   - `openid`

5. Click **Add permissions**
6. Click **Grant admin consent for [Your Organization]**

### Step 5: Generate Client Secret

1. Navigate to **Certificates & secrets** > **Client secrets**
2. Click **New client secret**
3. Add description:
   ```
   Description: CyberRx API Secret
   Expires: 24 months (or your preference)
   ```
4. Click **Add**
5. **Copy the secret immediately** (you won't be able to see it again!)

### Step 6: Configure Token Configuration (Optional)

1. Navigate to **Token configuration**
2. Click **Add optional claim**
3. Configure claims:
   - **ID tokens**: Email, Given Name, Family Name
   - **Access tokens**: (if needed)

### Step 7: Configure CyberRx Environment Variables

Add to your `.env` file:

```bash
# Azure AD OIDC Configuration
AZURE_AD_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
AZURE_AD_CLIENT_SECRET=abc123~xyz789ABC123_XYZ.789
AZURE_AD_TENANT_ID=12345678-1234-1234-1234-123456789012
AZURE_AD_CALLBACK_URL=https://api.cyberrx.com/sso/azure/callback
```

### Step 8: Configure Authentication

1. Navigate to **Authentication** blade
2. Add platform:
   - **Type**: Web
   - **Redirect URI**: `https://api.cyberrx.com/sso/azure/callback`
3. Set **Supported account types** to match your registration
4. Click **Configure**

### Step 9: Test OIDC Login

```bash
# Start your CyberRx API
npm run dev

# Visit Azure AD login URL
https://api.cyberrx.com/sso/azure

# Should redirect to Azure AD login page
```

---

## Testing SSO Integration

### Local Development Testing

#### 1. Test Okta SAML

```bash
# Ensure environment variables are set
echo $SAML_ENTRY_POINT
echo $SAML_ISSUER
echo $SAML_CERT

# Test SAML login flow
curl -L http://localhost:3001/sso/saml
```

Expected behavior:
- Redirects to Okta login page
- After login, redirects to `/sso/saml/callback`
- Callback generates JWT and redirects to frontend

#### 2. Test Azure AD OIDC

```bash
# Ensure environment variables are set
echo $AZURE_AD_CLIENT_ID
echo $AZURE_AD_CLIENT_SECRET
echo $AZURE_AD_TENANT_ID

# Test OIDC login flow
curl -L http://localhost:3001/sso/azure
```

Expected behavior:
- Redirects to Azure AD login page
- After login, redirects to `/sso/azure/callback`
- Callback generates JWT and redirects to frontend

#### 3. Test User Provisioning

```bash
# Connect to database
psql $DATABASE_URL

# Check if user was created
SELECT id, email, sso_provider, sso_id, org_id, mfa_enabled
FROM users
WHERE sso_provider IS NOT NULL;
```

#### 4. Test MFA Flow

```bash
# Enable MFA
curl -X POST http://localhost:3001/sso/mfa/enable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"userId": "user-123"}'

# Get QR code
curl http://localhost:3001/sso/mfa/qrcode \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verify MFA token
curl -X POST http://localhost:3001/sso/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "token": "123456"}'
```

---

## Production Checklist

### Okta Configuration

- [ ] Create production Okta application
- [ ] Configure production callback URLs (HTTPS only)
- [ ] Download production X.509 certificate
- [ ] Set up production environment variables
- [ ] Configure attribute statements for user data
- [ ] Set up group attribute statements (if needed)
- [ ] Assign users to production application
- [ ] Test SAML login with production Okta
- [ ] Verify user provisioning works correctly
- [ ] Test MFA enablement and verification

### Azure AD Configuration

- [ ] Create production Azure AD application
- [ ] Configure production redirect URIs (HTTPS only)
- [ ] Generate production client secret
- [ ] Copy Application ID and Tenant ID
- [ ] Configure API permissions (email, profile, openid)
- [ ] Grant admin consent for API permissions
- [ ] Configure optional claims (if needed)
- [ ] Set up production environment variables
- [ ] Test OIDC login with production Azure AD
- [ ] Verify user provisioning works correctly
- [ ] Test MFA enablement and verification

### Security Configuration

- [ ] Enable HTTPS for all endpoints
- [ ] Set strong `SESSION_SECRET` (min 32 chars)
- [ ] Set strong `JWT_SECRET` (min 32 chars)
- [ ] Configure Redis for session storage
- [ ] Enable secure cookies (httpOnly, secure)
- [ ] Configure CORS allowlist for production domains
- [ ] Set `NODE_ENV=production`
- [ ] Configure Sentry for error tracking
- [ ] Set up monitoring and alerting
- [ ] Review audit logs

### Database Configuration

- [ ] Run SSO database migration
- [ ] Verify SSO fields exist in users table
- [ ] Check indexes are created
- [ ] Verify constraints are in place
- [ ] Test user provisioning with real IdP
- [ ] Verify SSO ID uniqueness constraint

### Testing

- [ ] Run unit tests: `npm run test:unit`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Test Okta login flow end-to-end
- [ ] Test Azure AD login flow end-to-end
- [ ] Test MFA enablement flow
- [ ] Test MFA verification flow
- [ ] Test error handling (failed login, invalid token)
- [ ] Test user provisioning with new users
- [ ] Test session expiration
- [ ] Test concurrent SSO logins

### Documentation

- [ ] Update SSO documentation
- [ ] Document Okta application configuration
- [ ] Document Azure AD application configuration
- [ ] Create runbook for SSO troubleshooting
- [ ] Document custom user provisioning logic
- [ ] Create user guide for MFA setup
- [ ] Document SSO flow architecture

---

## Troubleshooting

### Okta Issues

#### Issue: "SAML signature validation failed"

**Solution:**
1. Verify X.509 certificate is correct (no extra whitespace)
2. Check certificate hasn't expired
3. Verify `SAML_ENTRY_POINT` and `SAML_ISSUER` match Okta settings
4. Ensure clock skew is within tolerance (5 minutes)

#### Issue: "User not auto-provisioned"

**Solution:**
1. Check database migration has been run
2. Verify `DEFAULT_SSO_ORG_ID` is set
3. Check logs for SAML assertion attributes
4. Ensure email attribute is being sent from Okta
5. Verify org mapping logic is working

### Azure AD Issues

#### Issue: "Token validation failed"

**Solution:**
1. Verify client ID and client secret are correct
2. Check tenant ID matches Azure AD tenant
3. Ensure callback URL matches Azure AD configuration
4. Verify application permissions are granted
5. Check admin consent has been granted

#### Issue: "Email not found in Azure AD profile"

**Solution:**
1. Verify `email` permission is granted
2. Check optional claims configuration
3. Ensure user has email address in Azure AD
4. Verify token contains email claim

### MFA Issues

#### Issue: "Invalid MFA token"

**Solution:**
1. Check device time is synchronized
2. Verify secret is stored correctly in database
3. Check time window tolerance (default: ±2 steps)
4. Ensure TOTP algorithm is SHA-1
5. Verify manual entry key matches QR code

---

## Support Resources

### Okta Documentation
- [Okta SAML Documentation](https://developer.okta.com/docs/guides/saml-application-setup/)
- [Okta Expression Language](https://developer.okta.com/docs/reference/okta-expression-language/)

### Azure AD Documentation
- [Azure AD OIDC Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc)
- [Azure AD Application Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

### CyberRx Documentation
- [SSO Integration Guide](./SSO_INTEGRATION.md)
- [API Documentation](https://api.cyberrx.com/docs)
- [Security Documentation](../security/)

---

**Document Version:** 1.0
**Last Updated:** 2026-06-11
**Maintainer:** CyberRx Security Team

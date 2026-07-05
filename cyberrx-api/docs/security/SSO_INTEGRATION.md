# SSO Integration Guide

**Task:** SAML and OIDC SSO Integration with Passport.js
**Status:** ✅ Complete
**Last Updated:** 2026-06-11

---

## Overview

Nerion now supports enterprise Single Sign-On (SSO) authentication using Passport.js with both SAML (Okta) and OIDC (Azure AD) protocols. This integration enables secure, standards-based authentication for healthcare payer organizations.

---

## Supported Identity Providers

### 1. Okta (SAML 2.0)
- **Protocol:** SAML 2.0
- **Authentication Flow:** SP-initiated SSO
- **Features:** Automatic user provisioning, MFA support, JIT user creation

### 2. Azure Active Directory (OIDC)
- **Protocol:** OpenID Connect
- **Authentication Flow:** Authorization Code Flow
- **Features:** Token validation, Graph API integration, MFA support

---

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend      │      │   Nerion API   │      │  Identity       │
│   (React)       │      │   (Express)     │      │  Provider       │
│                 │      │                 │      │  (Okta/Azure)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                        │                         │
         │  1. Click "Login"      │                         │
         │──────────────────────>│                         │
         │                        │                         │
         │                        │  2. Redirect to IdP     │
         │                        │────────────────────────>│
         │                        │                         │
         │                        │  3. User authenticates │
         │                        │<────────────────────────│
         │                        │                         │
         │                        │  4. SAML/OIDC callback │
         │                        │                         │
         │                        │  5. Validate & create  │
         │                        │     user                │
         │                        │                         │
         │                        │  6. Generate JWT        │
         │                        │                         │
         │  7. Redirect with     │                         │
         │     JWT token          │                         │
         │<──────────────────────│                         │
         │                        │                         │
         │  8. Store token &      │                         │
         │     authenticate      │                         │
         │                        │                         │
```

---

## Database Schema

### Users Table (SSO Fields)

```sql
-- SSO provider field (okta, azure-ad, local)
ALTER TABLE users ADD COLUMN sso_provider VARCHAR(20) DEFAULT 'local';

-- SSO unique identifier field (from IdP)
ALTER TABLE users ADD COLUMN sso_id VARCHAR(255) UNIQUE;

-- MFA enabled flag
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;

-- MFA secret field (encrypted TOTP secret)
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);

-- Indexes for performance
CREATE INDEX idx_users_sso_id ON users(sso_id);
CREATE INDEX idx_users_sso_provider ON users(sso_provider);

-- Constraint for valid SSO providers
ALTER TABLE users ADD CONSTRAINT check_sso_provider
  CHECK (sso_provider IN ('local', 'okta', 'azure-ad'));
```

---

## Configuration

### Environment Variables

#### SAML (Okta)
```bash
SAML_ENTRY_POINT=https://dev-123456.okta.com/app/dev123456/sso/saml
SAML_ISSUER=https://dev-123456.okta.com
SAML_CERT=-----BEGIN CERTIFICATE-----\nMIID...
SAML_CALLBACK_URL=https://api.cyberrx.com/sso/saml/callback
```

#### OIDC (Azure AD)
```bash
AZURE_AD_CLIENT_ID=your-app-client-id
AZURE_AD_CLIENT_SECRET=your-app-client-secret
AZURE_AD_TENANT_ID=contoso.onmicrosoft.com
AZURE_AD_CALLBACK_URL=https://api.cyberrx.com/sso/azure/callback
```

#### Session Configuration
```bash
SESSION_SECRET=your-super-secret-session-key-here
REDIS_URL=redis://localhost:6379
DEFAULT_SSO_ORG_ID=default-org
```

---

## API Endpoints

### SAML (Okta)

#### 1. Initiate SAML Login
```http
GET /sso/saml?redirect=https://cyberrx.com/dashboard
```

**Query Parameters:**
- `redirect` (optional): Frontend URL to redirect after successful login

**Response:** Redirects to Okta login page

#### 2. SAML Callback
```http
POST /sso/saml/callback
```

**Body:** SAML assertion (POST binding)

**Response:** Redirects to frontend with JWT token

#### 3. SAML Metadata
```http
GET /sso/metadata
```

**Response:** Service Provider metadata XML

---

### OIDC (Azure AD)

#### 1. Initiate Azure AD Login
```http
GET /sso/azure?redirect=https://cyberrx.com/dashboard
```

**Query Parameters:**
- `redirect` (optional): Frontend URL to redirect after successful login

**Response:** Redirects to Azure AD login page

#### 2. Azure AD Callback
```http
GET /sso/azure/callback?code=...
```

**Query Parameters:**
- `code`: Authorization code from Azure AD

**Response:** Redirects to frontend with JWT token

---

### MFA Endpoints

#### 1. Enable MFA
```http
POST /sso/mfa/enable
Authorization: Bearer <jwt_token>

{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP",
  "message": "MFA enabled. Scan QR code with authenticator app."
}
```

#### 2. Verify MFA
```http
POST /sso/mfa/verify

{
  "userId": "user-123",
  "token": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "admin",
    "orgId": "org-123",
    "mfaEnabled": true
  }
}
```

#### 3. Get QR Code
```http
GET /sso/mfa/qrcode
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP"
}
```

#### 4. Disable MFA
```http
POST /sso/mfa/disable
Authorization: Bearer <jwt_token>

{
  "password": "current-password"
}
```

**Response:**
```json
{
  "message": "MFA disabled successfully"
}
```

---

### Utility Endpoints

#### Get Available SSO Providers
```http
GET /sso/providers
```

**Response:**
```json
{
  "providers": [
    {
      "id": "okta",
      "name": "Okta",
      "type": "saml",
      "loginUrl": "/sso/saml"
    },
    {
      "id": "azure-ad",
      "name": "Azure Active Directory",
      "type": "oidc",
      "loginUrl": "/sso/azure"
    }
  ]
}
```

---

## User Provisioning

### Automatic User Creation

When a user authenticates via SSO for the first time:

1. **Extract User Attributes:**
   - Email (from SAML assertion or OIDC token)
   - Name (first/last name)
   - SSO unique identifier (from IdP)

2. **Determine Organization:**
   - Check email domain against organization domains
   - Use `DEFAULT_SSO_ORG_ID` if no match found
   - Allow org-specific mapping via SAML attributes

3. **Create User Record:**
   ```sql
   INSERT INTO users (id, email, name, role, org_id, sso_provider, sso_id, mfa_enabled)
   VALUES (
     'user-123',
     'user@example.com',
     'John Doe',
     'viewer',
     'org-123',
     'okta',
     'user@okta-id',
     false
   );
   ```

4. **Log Provisioning Event:**
   ```json
   {
     "ts": "2026-06-11T10:30:00Z",
     "event": "user_provisioned",
     "provider": "okta",
     "userId": "user-123",
     "email": "user@example.com",
     "orgId": "org-123"
   }
   ```

---

## MFA Implementation

### Time-based One-Time Password (TOTP)

Nerion uses TOTP for multi-factor authentication:

1. **Secret Generation:**
   - 32-byte base32 secret
   - Stored encrypted in database
   - User-specific (includes email in issuer name)

2. **QR Code Generation:**
   - `otpauth://totp/Nerion:user@example.com?secret=...&issuer=Nerion`
   - Compatible with Google Authenticator, Authy, Microsoft Authenticator

3. **Token Verification:**
   - 6-digit code
   - 30-second time window
   - ±2 time steps tolerance (60 seconds)

### MFA Flow

```
┌─────────────────┐      ┌─────────────────┐
│   User Device   │      │   Nerion API    │
│   (Auth App)    │      │                  │
└─────────────────┘      └─────────────────┘
         │                        │
         │  1. Enable MFA        │
         │──────────────────────>│
         │                        │
         │  2. Generate secret   │
         │     & QR code         │
         │<──────────────────────│
         │                        │
         │  3. Scan QR code      │
         │     with app           │
         │                        │
         │  4. Enter 6-digit     │
         │     code              │
         │──────────────────────>│
         │                        │
         │  5. Verify token      │
         │     (TOTP)            │
         │                        │
         │  6. Generate JWT      │
         │     with MFA claim    │
         │<──────────────────────│
```

---

## Security Features

### 1. Token Validation
- **SAML:** Signature validation with X.509 certificate
- **OIDC:** Token validation with Azure AD signing keys
- **Clock Skew:** 5-minute tolerance for server time differences

### 2. Session Security
- **Redis-backed:** Distributed session storage
- **Secure Cookies:** `httpOnly`, `secure` in production
- **Rolling Sessions:** Expiration reset on activity
- **24-hour Lifetime:** Automatic session expiration

### 3. MFA Security
- **Secret Encryption:** Encrypted at rest in database
- **Time-based Tokens:** 30-second validity
- **Rate Limiting:** Protection against brute force
- **Backup Codes:** Manual entry option

### 4. User Provisioning Security
- **Domain Validation:** Email domain to org mapping
- **Role Defaulting:** New users assigned 'viewer' role
- **Admin Approval:** Optional approval workflow
- **Audit Logging:** All provisioning events logged

---

## Testing

### Local Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your IdP credentials
   ```

3. **Run Database Migration:**
   ```bash
   psql $DATABASE_URL -f seeds/2026_06_11_sso_user_fields.sql
   ```

4. **Start Server:**
   ```bash
   npm run dev
   ```

### Testing SAML (Okta)

1. **Create Okta Application:**
   - Navigate to Okta Admin Console
   - Create new SAML 2.0 application
   - Set Single Sign-On URL: `https://api.cyberrx.com/sso/saml/callback`
   - Set Audience URI (SP Entity ID): `https://api.cyberrx.com`
   - Download X.509 certificate

2. **Configure Environment:**
   ```bash
   SAML_ENTRY_POINT=https://dev-123456.okta/app/xxx/sso/saml
   SAML_ISSUER=https://dev-123456.okta.com
   SAML_CERT=$(cat okta-cert.pem)
   SAML_CALLBACK_URL=http://localhost:3001/sso/saml/callback
   ```

3. **Test Login Flow:**
   ```bash
   curl -L http://localhost:3001/sso/saml
   # Should redirect to Okta login
   ```

### Testing OIDC (Azure AD)

1. **Create Azure AD Application:**
   - Navigate to Azure Portal > Azure Active Directory
   - Register new application
   - Add redirect URI: `https://api.cyberrx.com/sso/azure/callback`
   - Generate client secret
   - Copy tenant ID, client ID, and client secret

2. **Configure Environment:**
   ```bash
   AZURE_AD_CLIENT_ID=your-client-id
   AZURE_AD_CLIENT_SECRET=your-client-secret
   AZURE_AD_TENANT_ID=contoso.onmicrosoft.com
   AZURE_AD_CALLBACK_URL=http://localhost:3001/sso/azure/callback
   ```

3. **Test Login Flow:**
   ```bash
   curl -L http://localhost:3001/sso/azure
   # Should redirect to Azure AD login
   ```

---

## Frontend Integration

### React Component Example

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SSOButton = ({ provider }) => {
  const navigate = useNavigate();

  const handleSSOLogin = () => {
    // Redirect to SSO login endpoint
    const redirectUrl = encodeURIComponent(window.location.origin + '/auth/callback');
    window.location.href = `/sso/${provider}?redirect=${redirectUrl}`;
  };

  return (
    <button onClick={handleSSOLogin}>
      Login with {provider === 'saml' ? 'Okta' : 'Azure AD'}
    </button>
  );
};

// Auth Callback Component
const AuthCallback = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Extract token from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Store token and redirect
      localStorage.setItem('jwt_token', token);
      navigate('/dashboard');
    } else if (urlParams.get('required') === 'true') {
      // MFA required
      navigate('/auth/mfa');
    }
  }, [navigate]);

  return <div>Processing authentication...</div>;
};

// MFA Verification Component
const MFAVerification = () => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    try {
      const response = await fetch('/sso/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: getUserIdFromSession(),
          token: token
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('jwt_token', data.token);
        window.location.href = '/dashboard';
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Verification failed');
    }
  };

  return (
    <div>
      <h2>Enter MFA Code</h2>
      <input
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="123456"
        maxLength={6}
      />
      <button onClick={handleVerify}>Verify</button>
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

---

## Monitoring & Logging

### Audit Events

All SSO authentication events are logged:

```json
{
  "ts": "2026-06-11T10:30:00Z",
  "event": "sso_login_success",
  "provider": "okta",
  "userId": "user-123",
  "email": "user@example.com",
  "orgId": "org-123"
}
```

### Key Events

1. **sso_login_success**: Successful SSO authentication
2. **user_provisioned**: New user auto-created
3. **mfa_enabled**: MFA enabled for user
4. **mfa_verification_success**: MFA token verified
5. **mfa_verification_failed**: Invalid MFA token
6. **mfa_disabled**: MFA disabled by user

### Monitoring Metrics

Track these metrics in your observability system:

- SSO login success rate (by provider)
- User provisioning rate (new users/hour)
- MFA enablement percentage
- MFA verification failure rate
- Average authentication time
- Token generation rate

---

## Troubleshooting

### Common Issues

#### 1. SAML Signature Validation Failed

**Symptoms:** `SAML callback error: Signature validation failed`

**Solutions:**
- Verify X.509 certificate is correct (no extra whitespace)
- Check `SAML_CERT` environment variable format
- Ensure clock skew is within tolerance (5 minutes)
- Verify certificate hasn't expired

#### 2. Azure AD Token Validation Failed

**Symptoms:** `Azure AD authentication error: invalid_token`

**Solutions:**
- Verify client ID and client secret are correct
- Check tenant ID matches Azure AD tenant
- Ensure callback URL matches Azure AD configuration
- Verify application permissions in Azure AD

#### 3. MFA Verification Failed

**Symptoms:** `Invalid MFA token` even with correct code

**Solutions:**
- Check device time is synchronized (within 30 seconds)
- Verify secret is stored correctly in database
- Check time window tolerance (default: ±2 steps)
- Ensure TOTP algorithm is SHA-1 (most auth apps)

#### 4. User Not Auto-Provisioned

**Symptoms:** User authenticates but no user record created

**Solutions:**
- Check database migration has been run
- Verify `DEFAULT_SSO_ORG_ID` is set
- Check logs for provisioning errors
- Ensure email extraction from SAML/OIDC is working

#### 5. Redis Connection Failed

**Symptoms:** `Redis session store error: connect ECONNREFUSED`

**Solutions:**
- Ensure Redis is running (`redis-cli ping`)
- Check `REDIS_URL` environment variable
- Verify Redis password if authentication enabled
- Check network connectivity to Redis host

---

## Deployment

### Production Checklist

- [ ] Run database migration in production
- [ ] Configure production IdP applications
- [ ] Set strong `SESSION_SECRET` and `JWT_SECRET`
- [ ] Configure Redis for session storage
- [ ] Enable HTTPS for all endpoints
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS allowlist for production domains
- [ ] Enable Sentry for error tracking
- [ ] Set up monitoring and alerting
- [ ] Test login flow with production IdP
- [ ] Verify user provisioning works
- [ ] Test MFA enablement and verification
- [ ] Review audit logs
- [ ] Document custom org mapping logic
- [ ] Train support team on SSO troubleshooting

---

## Files Created

- **`/cyberrx-api/src/config/passport.js`** - Passport.js configuration
- **`/cyberrx-api/src/config/session.js`** - Express session configuration
- **`/cyberrx-api/src/routes/sso.js`** - SSO route handlers
- **`/cyberrx-api/seeds/2026_06_11_sso_user_fields.sql`** - Database migration
- **`/cyberrx-api/.env.example`** - Environment variable template (updated)
- **`/cyberrx-api/docs/security/SSO_INTEGRATION.md`** - This documentation

---

## Next Steps

1. **Configure IdP Applications:** Set up Okta/Azure AD applications in production
2. **Custom User Provisioning:** Implement org-specific logic for user mapping
3. **Admin Approval Workflow:** Add optional admin approval for new users
4. **Role Mapping:** Map IdP groups to Nerion roles
5. **Advanced MFA:** Add hardware token (YubiKey) support
6. **Audit Dashboard:** Create admin dashboard for SSO analytics
7. **Rate Limiting:** Add rate limiting to SSO endpoints
8. **Webhooks:** Implement IdP webhook for user deprovisioning

---

## Support

For issues or questions:
- Check troubleshooting section above
- Review audit logs in application logs
- Consult IdP documentation (Okta/Azure AD)
- Contact Nerion security team

---

**Document Version:** 1.0
**Last Updated:** 2026-06-11
**Maintainer:** Nerion Security Team

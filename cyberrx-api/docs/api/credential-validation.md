# Credential Validation API Documentation

## Overview

The Credential Validation API allows users to validate vendor connector credentials before saving them to the vault. This prevents saving invalid API keys and provides immediate feedback to users.

**Base URL:** `/api/credentials/:connectorType/validate`

**Authentication:** JWT required (Bearer token)

**Rate Limiting:** 10 validation attempts per minute per organization

## Endpoint

### POST /api/credentials/:connectorType/validate

Validate connector credentials by making a test API call to the vendor service.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| connectorType | string | Yes | Type of connector (securityscorecard, bitsight, riskrecon, recordedfuture, blackkite) |

#### Request Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Authorization | string | Yes | JWT token in format: `Bearer <token>` |
| Content-Type | string | Yes | Must be `application/json` |

#### Request Body

```json
{
  "credentials": {
    "apiKey": "string",
    "domain": "string (optional)"
  }
}
```

**Credentials Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| apiKey | string | Yes | API key or token for the vendor service |
| domain | string | No | Domain to test against (defaults to vendor's domain) |

#### Response Format

**Success Response (200 OK)**

```json
{
  "valid": true,
  "message": "Connection verified successfully",
  "data": {
    "testResult": {
      "score": 82,
      "grade": "A",
      "companyName": "Acme Corp"
    }
  }
}
```

**Failure Response (400 Bad Request)**

```json
{
  "valid": false,
  "message": "Invalid API key or unauthorized access",
  "errorCode": "ERR_INVALID_CREDENTIALS",
  "details": "401 Unauthorized from SecurityScorecard API"
}
```

**Rate Limit Response (429 Too Many Requests)**

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 60 seconds.",
  "retryAfter": "60 seconds"
}
```

**Timeout Response (408 Request Timeout)**

```json
{
  "valid": false,
  "message": "Validation request timed out",
  "errorCode": "ERR_TIMEOUT",
  "details": "The validation request took longer than 10 seconds and was aborted."
}
```

#### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| ERR_INVALID_CREDENTIALS | 400 | API key is invalid or expired |
| ERR_DOMAIN_NOT_FOUND | 400 | Domain not found in vendor database |
| ERR_UNEXPECTED_RESPONSE | 400 | Unexpected response from vendor API |
| ERR_UNSUPPORTED_CONNECTOR | 400 | Connector type not supported |
| ERR_TIMEOUT | 408 | Validation request timed out (10 seconds) |
| ERR_NETWORK_ERROR | 503 | Network error connecting to vendor API |
| ERR_SERVER_ERROR | 500 | Internal server error |

## Supported Connectors

### SecurityScorecard

**Connector Type:** `securityscorecard`

**API Endpoint:** `https://api.securityscorecard.com/companies/{domain}`

**Authentication:** Bearer token

**Default Domain:** `securityscorecard.com`

**Example Request:**

```bash
curl -X POST \
  http://localhost:3001/api/credentials/securityscorecard/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "apiKey": "your_securityscorecard_api_key",
      "domain": "example.com"
    }
  }'
```

**Success Response:**

```json
{
  "valid": true,
  "message": "Connection verified successfully",
  "data": {
    "testResult": {
      "score": 82,
      "grade": "A",
      "companyName": "Example Corp"
    }
  }
}
```

### BitSight

**Connector Type:** `bitsight`

**API Endpoint:** `https://api.bitsighttech.com/ratings/v1/companies/{domain}`

**Authentication:** Bearer token

**Default Domain:** `bitsighttech.com`

**Example Request:**

```bash
curl -X POST \
  http://localhost:3001/api/credentials/bitsight/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "apiKey": "your_bitsight_api_key",
      "domain": "example.com"
    }
  }'
```

### RiskRecon

**Connector Type:** `riskrecon`

**API Endpoint:** `https://api.riskrecon.com/api/v1/companies/{domain}`

**Authentication:** `token={apiKey}`

**Default Domain:** `riskrecon.com`

**Example Request:**

```bash
curl -X POST \
  http://localhost:3001/api/credentials/riskrecon/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "apiKey": "your_riskrecon_api_key",
      "domain": "example.com"
    }
  }'
```

### Recorded Future

**Connector Type:** `recordedfuture`

**API Endpoint:** `https://api.recordedfuture.com/v2/company/{domain}`

**Authentication:** `X-RFToken` header

**Default Domain:** `recordedfuture.com`

**Example Request:**

```bash
curl -X POST \
  http://localhost:3001/api/credentials/recordedfuture/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "apiKey": "your_recordedfuture_api_key",
      "domain": "example.com"
    }
  }'
```

### BlackKite

**Connector Type:** `blackkite`

**API Endpoint:** `https://api.blackkite.com/companies/{domain}`

**Authentication:** Bearer token

**Default Domain:** `blackkite.com`

**Example Request:**

```bash
curl -X POST \
  http://localhost:3001/api/credentials/blackkite/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "apiKey": "your_blackkite_api_key",
      "domain": "example.com"
    }
  }'
```

## Security Features

### 1. API Key Masking

All API keys are masked before logging. Example:

```
Input: sk_1234567890abcdefghij1234567890abcdefghij
Masked: sk_12345678••••cdef
```

### 2. Audit Logging

All validation attempts are logged to the `audit_logs` table with:

- User ID
- Organization ID
- Connector type
- Validation result (success/failed/error)
- Masked API key
- IP address
- Timestamp

### 3. Rate Limiting

- Maximum 10 validation attempts per minute per organization
- Rate limit resets after 60 seconds
- Returns 429 status when limit exceeded

### 4. Timeout Protection

- All validation requests timeout after 10 seconds
- Prevents hanging requests and resource exhaustion

### 5. Organization Scoping

- Users can only validate credentials for their own organization
- JWT token must contain valid `orgId` claim
- Cross-organization access is blocked with 403 Forbidden

## Rate Limiting

**Limits:**
- 10 validation attempts per minute per organization
- Block duration: 60 seconds after limit reached

**Rate Limit Headers:**

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Request limit per window |
| X-RateLimit-Remaining | Remaining requests in window |
| X-RateLimit-Reset | ISO timestamp when limit resets |
| Retry-After | Seconds until retry allowed (429 only) |

## Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  action_type     TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  details         JSONB DEFAULT '{}',
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Example Audit Log Entry:**

```json
{
  "user_id": "user_123",
  "organization_id": "org_abc",
  "action_type": "credential_validation",
  "resource_type": "connector",
  "details": {
    "connectorType": "securityscorecard",
    "result": "success",
    "maskedKey": "sk_12345678••••cdef",
    "error": null,
    "timestamp": "2026-05-31T12:34:56.789Z"
  },
  "ip_address": "192.168.1.100",
  "created_at": "2026-05-31T12:34:56.789Z"
}
```

## Error Handling

### Client Errors (4xx)

**400 Bad Request**

- Missing or invalid credentials
- Unsupported connector type
- Malformed request body

**401 Unauthorized**

- Missing or invalid JWT token
- Expired token

**403 Forbidden**

- Attempting to access another organization's data

**408 Request Timeout**

- Validation request took longer than 10 seconds

**429 Too Many Requests**

- Rate limit exceeded

### Server Errors (5xx)

**503 Service Unavailable**

- Network error connecting to vendor API
- DNS resolution failure

**500 Internal Server Error**

- Unexpected server error
- Database connection failure

## Testing

### Manual Testing with cURL

```bash
# Set your JWT token
export JWT_TOKEN="your_jwt_token_here"

# Test SecurityScorecard validation
curl -X POST \
  http://localhost:3001/api/credentials/securityscorecard/validate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "apiKey": "test_api_key",
      "domain": "example.com"
    }
  }' | jq
```

### Automated Testing

Run the test script:

```bash
cd cyberrx-api
chmod +x test-credential-validation.sh
./test-credential-validation.sh
```

### Unit Tests

Run unit tests:

```bash
cd cyberrx-api
npm test -- services/__tests__/CredentialValidationService.test.js
```

## Deployment Checklist

- [ ] Run database migration: `migrations/add_audit_logs_table.sql`
- [ ] Set `JWT_SECRET` environment variable
- [ ] Set `DATABASE_URL` environment variable
- [ ] Set `RATE_LIMIT_ENABLED=true` (default)
- [ ] Configure Redis for rate limiting (optional, uses in-memory fallback)
- [ ] Test with real API keys from each vendor
- [ ] Verify audit logs are written
- [ ] Verify rate limiting works
- [ ] Monitor for timeout errors

## Troubleshooting

### Issue: "JWT_SECRET environment variable not set"

**Solution:** Set the JWT_SECRET environment variable:

```bash
export JWT_SECRET="your-secret-key-here"
```

### Issue: "Rate limit exceeded"

**Solution:** Wait 60 seconds for rate limit to reset, or increase rate limit in code.

### Issue: "Connection timeout"

**Solution:**
- Check network connectivity to vendor API
- Verify DNS resolution
- Check if vendor API is down
- Increase timeout from 10 seconds if needed

### Issue: "Invalid API key"

**Solution:**
- Verify API key is correct
- Check API key hasn't expired
- Ensure API key has required permissions
- Check with vendor's API documentation

### Issue: "Audit logs not written"

**Solution:**
- Verify `audit_logs` table exists
- Check database connection
- Review database error logs

## Performance Considerations

- Each validation request takes up to 10 seconds (timeout)
- Rate limiting prevents excessive API calls to vendor services
- Audit logging is non-blocking (errors don't fail validation)
- Consider caching validation results for 5-10 minutes

## Future Enhancements

- [ ] Add validation for more connector types
- [ ] Implement validation result caching
- [ ] Add webhook support for async validation
- [ ] Provide validation usage analytics
- [ ] Add bulk validation for multiple connectors
- [ ] Implement validation retry logic
- [ ] Add validation history API endpoint

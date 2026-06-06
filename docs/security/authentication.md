# CyberRX Authentication Guide

**Version:** 0.1.0
**Last Updated:** 2025-01-31

---

## Overview

This guide explains how authentication works in the CyberRX Multi-Agent AI Platform, including user registration, login, MFA setup, and token management.

---

## Authentication Flow

### 1. User Registration

**Endpoint:** `POST /api/v1/auth/register`

**Request Body:**
```json
{
  "username": "john.doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!@#",
  "full_name": "John Doe",
  "role": "cfo",
  "customer_id": "customer-123"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "message": "User registered successfully. Please set up MFA using the QR code or backup codes.",
  "totp_setup": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code_url": "otpauth://totp/CyberRX:john.doe@example.com?secret=JBSWY3DPEHPK3PXP&issuer=CyberRX",
    "backup_codes": [
      "ABCD1234",
      "EFGH5678",
      "IJKL9012",
      "MNOP3456",
      "QRST7890",
      "UVWX2345",
      "YZAB8901",
      "CDEF3456",
      "GHIJ6789",
      "KLMN0123"
    ]
  }
}
```

**MFA Setup:**

1. Scan QR code with Google Authenticator, Authy, or similar app
2. Store backup codes securely (they're single-use)
3. MFA is now enabled

### 2. User Login

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "username": "john.doe",
  "password": "SecurePassword123!@#",
  "totp_code": "123456"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "role": "cfo"
}
```

**Authentication Steps:**

1. User submits username, password, and TOTP code
2. Server verifies password (bcrypt hash comparison)
3. Server verifies TOTP code (6-digit, 30-second window)
4. Server checks if account is locked (failed login attempts)
5. Server creates JWT access token (30-minute expiry)
6. Server creates JWT refresh token (7-day expiry)
7. Server creates session (logged in database)
8. Server returns tokens to client

### 3. Token Refresh

**Endpoint:** `POST /api/v1/auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "role": "cfo"
}
```

**Token Rotation:**

- Old refresh token is revoked
- New refresh token is issued
- Old access token is invalid after expiration

### 4. User Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Logout Actions:**

- Client discards tokens
- Session logged in database (logout_at timestamp)
- Tokens invalidated (client-side for MVP, server-side with Redis blacklist for production)

### 5. Get Current User

**Endpoint:** `GET /api/v1/auth/me`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "user_id": "uuid",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "full_name": "John Doe",
  "role": "cfo",
  "customer_id": "customer-123"
}
```

---

## Password Requirements

**Minimum Standards (NIST SP 800-63B):**

- Minimum 12 characters
- No complexity requirements (NIST guidance)
- Checked against common password lists
- No password hints
- Hashed with bcrypt (work factor 12)
- Expires every 90 days

**Common Passwords Rejected:**

- password123456
- 123456789012
- qwerty123456
- abc123456789
- letmein123456
- welcome12345
- monkey123456
- dragon123456

**Password Change:**

- Users can change password (endpoint to be implemented)
- Old password required for verification
- New password must meet requirements
- Password history prevents reuse

---

## MFA (Multi-Factor Authentication)

**TOTP Configuration:**

- Algorithm: SHA-256
- Code Length: 6 digits
- Time Step: 30 seconds
- Valid Window: ±30 seconds (1 time step)
- Issuer: CyberRX

**MFA Apps:**

- Google Authenticator
- Authy
- Microsoft Authenticator
- LastPass Authenticator
- YubiKey (if hardware support added)

**Backup Codes:**

- 10 single-use backup codes
- Store securely (password manager)
- Use if TOTP app unavailable
- Each code can only be used once
- Regenerate if compromised

**MFA Verification:**

```python
# TOTP verification
totp = pyotp.TOTP(secret)
valid = totp.verify(code, valid_window=1)

# Backup code verification
valid = code in backup_codes
if valid:
    backup_codes.remove(code)  # Single-use
```

---

## JWT Tokens

**Access Token:**

- Expiration: 30 minutes
- Type: "access"
- Contains: username, role, customer_id
- Used for: API authentication

**Refresh Token:**

- Expiration: 7 days
- Type: "refresh"
- Contains: username, role, customer_id
- Used for: Getting new access tokens

**Token Structure:**

```json
{
  "sub": "john.doe",
  "role": "cfo",
  "customer_id": "customer-123",
  "exp": 1706690400,
  "iat": 1706688600,
  "type": "access"
}
```

**Token Usage:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Rate Limiting

**Login Rate Limits:**

- 5 login attempts per minute
- 20 login attempts per hour
- Account lockout after 5 failed attempts
- Lockout duration: 15 minutes

**API Rate Limits:**

- 100 requests per minute (authenticated)
- 10 requests per minute (unauthenticated)

**Rate Limit Response:**

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60,
  "message": "Too many requests. Please try again in 60 seconds."
}
```

---

## Security Features

**Account Lockout:**

- Triggered after 5 failed login attempts
- Locks for 15 minutes
- Tracks by username and IP address
- Logged in audit log

**Password Security:**

- Bcrypt hashing (work factor 12)
- No plaintext storage
- Common password rejection
- Minimum 12 characters
- 90-day expiration

**Session Management:**

- Sessions tracked in database
- IP address and user agent logged
- Session timeout after inactivity
- Max 5 concurrent sessions per user

**Audit Logging:**

- All login attempts logged
- All token refreshes logged
- All logouts logged
- All failed attempts logged
- 7-year retention (HIPAA)

---

## Error Responses

**Invalid Credentials:**

```json
{
  "detail": "Invalid credentials"
}
```
Status: 401 Unauthorized

**Invalid MFA Code:**

```json
{
  "detail": "Invalid MFA code"
}
```
Status: 401 Unauthorized

**Account Locked:**

```json
{
  "detail": "Account is locked until 2025-01-31T12:15:00Z"
}
```
Status: 423 Locked

**Rate Limit Exceeded:**

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60,
  "message": "Too many requests. Please try again in 60 seconds."
}
```
Status: 429 Too Many Requests

**Token Expired:**

```json
{
  "detail": "Token has expired"
}
```
Status: 401 Unauthorized

**Invalid Token:**

```json
{
  "detail": "Invalid token"
}
```
Status: 401 Unauthorized

---

## Best Practices

**For Users:**

- Use strong, unique passwords
- Enable MFA immediately
- Store backup codes securely
- Don't share credentials
- Report suspicious activity
- Logout when done

**For Developers:**

- Always use HTTPS
- Store tokens securely (HTTP-only cookies)
- Implement token refresh before expiration
- Handle token expiration gracefully
- Log all authentication events
- Validate all inputs

---

## Troubleshooting

**Can't Login:**

1. Check username and password
2. Verify MFA code is correct
3. Check if account is locked
4. Try backup code if MFA unavailable
5. Contact admin if still locked

**MFA Code Not Working:**

1. Check device time is synchronized
2. Verify correct secret is configured
3. Try backup code instead
4. Regenerate MFA if needed

**Account Locked:**

1. Wait 15 minutes for lockout to expire
2. Contact admin for immediate unlock
3. Check audit log for lockout reason

**Token Expired:**

1. Use refresh token to get new access token
2. If refresh token also expired, re-login
3. Implement auto-refresh before expiration

---

## References

- [Security Baseline](./baseline.md)
- [Authorization Guide](./authorization.md)
- [Audit Logging Guide](./audit-logging.md)
- [MFA Setup Guide](./mfa-setup.md)

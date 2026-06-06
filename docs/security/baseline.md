# CyberRX Security Baseline

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Phase 0 Foundation

---

## Overview

This document defines the security baseline for the CyberRX Multi-Agent AI Platform. It establishes the minimum security requirements for authentication, authorization, audit logging, and data protection to meet HIPAA compliance and support future SOC 2 certification.

---

## Authentication

### Password Requirements

**Minimum Standards (NIST SP 800-63B):**

- **Minimum Length:** 12 characters
- **Maximum Length:** 128 characters
- **Complexity:** No complexity requirements (NIST guidance)
- **Common Passwords:** Checked against common password lists
- **Password Hints:** Not allowed
- **Password Hashing:** Bcrypt with work factor 12
- **Password Expiration:** 90 days
- **Password History:** Last 12 passwords not reusable

**Implementation:**
```python
# Password hashing
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

# Password validation
- Length >= 12 characters
- Not in common password list
- No dictionary words (optional)
```

### Multi-Factor Authentication (MFA)

**Requirements:**

- **Method:** TOTP (Time-based One-Time Password)
- **Code Length:** 6 digits
- **Time Window:** 30 seconds (valid window: ±30 seconds)
- **Backup Codes:** 10 single-use backup codes
- **Issuer:** "CyberRX"
- **Algorithm:** SHA-256
- **MFA Mandatory:** Cannot be bypassed

**Implementation:**
```python
import pyotp

# Generate TOTP secret
totp_secret = pyotp.randombase32()

# Generate QR code URI
qr_uri = pyotp.TOTP(totp_secret).provisioning_uri(
    name=email,
    issuer_name="CyberRX"
)

# Verify TOTP code
totp = pyotp.TOTP(totp_secret)
valid = totp.verify(code, valid_window=1)
```

### Session Management

**Token Lifecycle:**

- **Access Token Expiration:** 30 minutes
- **Refresh Token Expiration:** 7 days
- **Refresh Token Rotation:** On every refresh
- **Token Storage:** HTTP-only, secure cookies (frontend)
- **Token Invalidation:** On logout

**Session Tracking:**

- All sessions logged in database
- Session includes: user_id, customer_id, IP address, user agent, login/logout times
- Concurrent sessions allowed (max 5 per user)
- Session timeout after inactivity

**Implementation:**
```python
# Access token
expires_at = datetime.utcnow() + timedelta(minutes=30)
access_token = create_access_token(data)

# Refresh token
expires_at = datetime.utcnow() + timedelta(days=7)
refresh_token = create_refresh_token(data)

# Token rotation on refresh
old_refresh_token = revoke_token(old_token)
new_refresh_token = create_refresh_token(data)
```

### Rate Limiting

**Login Protection:**

- **Login Attempts:** 5 per minute
- **Login Attempts (Hourly):** 20 per hour
- **Failed Login Lockout:** 5 attempts
- **Account Lockout Duration:** 15 minutes
- **IP-based Tracking:** Yes

**API Rate Limits:**

- **Authenticated Requests:** 100 per minute per user
- **Unauthenticated Requests:** 10 per minute per IP
- **Burst Allowance:** 200 per minute

**Implementation:**
```python
from slowapi import Limiter

limiter = Limiter(key_func=get_user_id)

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")
async def login(...):
    # Login logic
```

---

## Authorization

### Role-Based Access Control (RBAC)

**Executive Roles:**

1. **CFO (Chief Financial Officer)**
   - Access: Financial data, CFO briefings, CFO agent
   - Permissions: `read_financial_data`, `read_cfo_briefings`, `query_cfo_agent`

2. **CRO (Chief Risk Officer)**
   - Access: Risk data, CRO briefings, CRO agent
   - Permissions: `read_risk_data`, `read_cro_briefings`, `query_cro_agent`

3. **CLO (Chief Legal Officer)**
   - Access: Compliance data, CLO briefings, CLO agent
   - Permissions: `read_compliance_data`, `read_clo_briefings`, `query_clo_agent`

4. **CIO (Chief Information Officer)**
   - Access: Operational data, CIO briefings, CIO agent
   - Permissions: `read_operational_data`, `read_cio_briefings`, `query_cio_agent`

5. **CISO (Chief Information Security Officer)**
   - Access: Security data, CISO briefings, CISO agent, **all agents** (coordination)
   - Permissions: `read_security_data`, `read_ciso_briefings`, `query_ciso_agent`, `read_all_agents`

6. **Board**
   - Access: All briefings, governance data, Board agent
   - Permissions: `read_all_briefings`, `read_governance_data`, `query_board_agent`, `synthesize_all_outputs`

**Admin Role:**

7. **ADMIN**
   - Access: User management, role management, customer management
   - Permissions: `manage_users`, `manage_roles`, `manage_customers`, `read_all_audit_logs`

**Role Hierarchy:**

- Level 1: CFO, CRO, CLO, CIO, CISO
- Level 2: Board
- Level 3: Admin

### Agent-to-Data Authorization

**Data Access Matrix:**

| Agent | Financial | Risk | Compliance | Operational | Security | Governance |
|-------|-----------|------|------------|-------------|----------|------------|
| CFO   | ✓         | ✗    | ✗          | ✗           | ✗        | ✗          |
| CRO   | ✗         | ✓    | ✗          | ✗           | ✗        | ✗          |
| CLO   | ✗         | ✗    | ✓          | ✗           | ✗        | ✗          |
| CIO   | ✗         | ✗    | ✗          | ✓           | ✗        | ✗          |
| CISO  | ✗         | ✗    | ✗          | ✗           | ✓        | ✗          |
| Board | ✗         | ✗    | ✗          | ✗           | ✗        | ✓          |

**Special Access:**

- **CISO:** Can read all agent outputs (coordination role)
- **Board:** Can access all executive briefings (synthesis role)

**Implementation:**
```python
# Agent data access check
def agent_can_access_data(agent_type: AgentType, data_type: str) -> bool:
    return data_type in AGENT_DATA_ACCESS.get(agent_type, set())

# Usage
if not agent_can_access_data(AgentType.CFO, "financial_exposure"):
    raise HTTPException(status_code=403, detail="Access denied")
```

### Least Privilege

**User Access:**

- Users have minimum required access
- No cross-role data access
- No cross-customer data access
- Database access isolated per customer

**Implementation:**

- Row-Level Security (RLS) on all customer-specific tables
- JWT tokens scoped to customer_id
- Database queries filtered by customer_id

---

## Audit Logging

### What Is Logged

**All Events Logged:**

- ✅ Login attempts (success/failure)
- ✅ Logout
- ✅ All API requests
- ✅ All data access attempts
- ✅ All permission denials
- ✅ All admin actions
- ✅ All agent actions
- ✅ Token refresh
- ✅ MFA verification
- ✅ Account lockouts
- ✅ Password changes
- ✅ Role changes

**Audit Event Fields:**

```json
{
  "event_id": "uuid",
  "timestamp": "2025-01-31T12:00:00Z",
  "event_type": "login_attempt",
  "user_id": "username",
  "customer_id": "customer-123",
  "role": "cfo",
  "action": "login",
  "resource_type": "auth",
  "resource_id": null,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "success": true,
  "details": {}
}
```

### Log Retention

**Retention Policy:**

- **HIPAA Requirement:** 7 years
- **Storage:** TimescaleDB hypertable (time-series optimized)
- **Immutability:** Audit logs cannot be deleted or modified
- **Backup:** Replicated to backup storage
- **Archive:** After 1 year, move to cold storage

### Log Security

**Access Controls:**

- Audit logs written before response returned
- Audit logs cannot be modified (immutable)
- Audit log access requires admin role
- Audit log exports require approval
- Audit log queries logged

**Implementation:**
```python
# Audit event
event = AuditEvent(
    event_type=AuditEventType.LOGIN_ATTEMPT,
    user_id="username",
    action="login",
    success=True,
    ip_address="192.168.1.1"
)
event.log()  # Written to database and file
```

---

## Encryption

### Data at Rest

**Database Encryption:**

- **Encryption Method:** Customer-managed keys (BYOK)
- **Key Storage:** Azure Key Vault / AWS Secrets Manager
- **Algorithm:** AES-256
- **Key Rotation:** 90 days

**File Storage Encryption:**

- **Encryption Method:** Customer-managed keys
- **Key Storage:** Azure Key Vault / AWS Secrets Manager
- **Algorithm:** AES-256

**Key Vault:**

- Azure Key Vault or AWS Secrets Manager
- Hardware Security Module (HSM) backing
- Key access logging
- Key backup and recovery

### Data in Transit

**TLS Requirements:**

- **Minimum Version:** TLS 1.3
- **Perfect Forward Secrecy (PFS):** Required
- **Cipher Suites:** Strong cipher suites only
- **Certificate Validation:** Required
- **HSTS:** Enabled

**Implementation:**

```nginx
ssl_protocols TLSv1.3;
ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
ssl_prefer_server_ciphers on;
```

### Key Management

**Key Lifecycle:**

- **Generation:** Cryptographically secure random generation
- **Storage:** Key Vault (Azure / AWS)
- **Rotation:** 90 days
- **Backup:** Encrypted backup
- **Escrow:** Customer-managed
- **Destruction:** Secure deletion after expiration

---

## Network Security

### Tenant Isolation

**Kubernetes Isolation:**

- Namespace isolation per customer
- Network policies deny cross-namespace traffic
- Database isolation per customer
- Private endpoints only

**Implementation:**

```yaml
# Network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector: {}
```

### Access Control

**Infrastructure:**

- Private AKS/EKS clusters
- Application Gateway / Ingress Controller
- IP whitelisting (if required)
- DDoS protection
- Web Application Firewall (WAF)

---

## Compliance

### HIPAA

**Security Requirements:**

- ✅ Encryption at rest (AES-256, BYOK)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Access control (RBAC, RLS)
- ✅ Audit logging (7-year retention)
- ✅ MFA required
- ✅ Session timeout (30 minutes)
- ✅ Unique user IDs
- ✅ Emergency access procedure
- ✅ Business associate agreement (BAA)

**Implementation Checklist:**

- [x] Password encryption (bcrypt)
- [x] MFA mandatory (TOTP)
- [x] JWT token security
- [x] RBAC enforcement
- [x] Audit logging comprehensive
- [x] Audit logs immutable
- [x] 7-year log retention
- [x] Multi-tenant isolation
- [x] Key management (Key Vault)

### SOC 2 (Future)

**Planned Controls:**

- Access controls (already implemented)
- Audit logging (already implemented)
- Change management (to be implemented)
- Incident response (to be implemented)
- Vendor management (to be implemented)
- Penetration testing (to be implemented)
- Vulnerability scanning (to be implemented)

---

## Security Testing

### Authentication Testing

**Unit Tests:**

- [ ] Password hashing (bcrypt work factor 12)
- [ ] Password verification
- [ ] Common password rejection
- [ ] TOTP generation
- [ ] TOTP verification
- [ ] JWT token creation
- [ ] JWT token validation
- [ ] JWT token expiration

**Integration Tests:**

- [ ] Register user
- [ ] Login with correct credentials
- [ ] Login with incorrect password
- [ ] Login with incorrect MFA
- [ ] Refresh token
- [ ] Logout
- [ ] Access protected endpoint

### Authorization Testing

**RBAC Tests:**

- [ ] Role permissions enforced
- [ ] Permission denial logged
- [ ] Role escalation (should fail)
- [ ] Admin actions logged

**Agent Authorization Tests:**

- [ ] CFO agent access to CFO data
- [ ] CISO agent access to all agents
- [ ] Cross-agent access (should fail)
- [ ] Board agent synthesis

### Security Testing

**Vulnerability Scans:**

- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF protection
- [ ] No hardcoded secrets
- [ ] Rate limiting enforced
- [ ] Account lockout enforced

---

## Common Security Pitfalls

**Avoid These:**

- ❌ Storing passwords in plaintext (hash them!)
- ❌ Skipping MFA (it's mandatory)
- ❌ Making JWT tokens indefinite (they must expire)
- ❌ Hardcoding secrets (use Key Vault)
- ❌ Forgetting rate limiting (brute force attacks)
- ❌ Ignoring audit logging (compliance requirement)
- ❌ Allowing cross-customer data access
- ❌ Skipping password validation
- ❌ Using weak encryption (AES-256 minimum)
- ❌ Exposing sensitive data in logs

---

## Security Checklist

**Before Production:**

- [ ] All passwords hashed with bcrypt (work factor 12)
- [ ] MFA required for all users
- [ ] JWT tokens expire after 30 minutes
- [ ] Refresh tokens expire after 7 days
- [ ] Rate limiting enforced (5 logins/minute)
- [ ] Account lockout after 5 failed attempts
- [ ] All access attempts logged
- [ ] Audit logs immutable
- [ ] TLS 1.3 enforced
- [ ] Keys stored in Key Vault
- [ ] Multi-tenant isolation enforced
- [ ] RBAC policies defined
- [ ] Agent authorization matrix defined
- [ ] Security baseline documented
- [ ] Penetration testing completed
- [ ] Vulnerability scanning completed

---

## References

**Standards:**

- NIST SP 800-63B: Digital Identity Guidelines
- HIPAA Security Rule: 45 CFR Part 164
- SOC 2 Trust Services Criteria
- ISO 27001: Information Security Management

**Tools:**

- Bcrypt: Password hashing
- PyOTP: TOTP MFA
- Python-JOSE: JWT tokens
- SlowAPI: Rate limiting
- TimescaleDB: Audit log storage
- Azure Key Vault: Key management

---

**Document Owner:** Security Engineer
**Review Date:** 2025-02-28
**Next Review:** 2025-05-31

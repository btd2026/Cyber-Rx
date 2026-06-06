# Task Assignment: T-FOUND-004
## Authentication & Authorization Foundation

---

**Task ID:** T-FOUND-004
**Title:** Authentication & Authorization Foundation
**Assigned To:** Security Engineer
**Phase:** Phase 0 - Foundation & Architecture Setup
**Weeks:** 1-2
**Estimated Hours:** 80 hours
**Priority:** 🔴 CRITICAL

---

## OBJECTIVE

Implement the authentication and authorization foundation for the CyberRX Multi-Agent AI Platform. This includes standalone credential authentication (username/password + MFA), RBAC for 6 executive roles, agent-to-data authorization, and comprehensive audit logging.

**What we're building:** A platform where 6 different executive roles (CFO, CRO, CLO, CIO, CISO, Board) access role-specific intelligence briefings. Each role sees different data, and all access must be logged for HIPAA compliance.

**Your mission:** Build a secure authentication service with MFA, role-based access control, agent-specific data isolation, and audit logging that meets HIPAA requirements and supports future SOC 2 certification.

---

## ARCHITECTURE CONTEXT

### Authentication Strategy

**Standalone Credentials (Not SSO):**
- Username/password authentication
- MFA required (TOTP - Time-based One-Time Password)
- JWT tokens for session management
- Password security per NIST standards

**Why Standalone?**
- Faster MVP deployment (no customer IT integration needed)
- Simpler architecture for Phase 0
- SSO can be added in Phase 3 if customers demand it
- Reduces external dependencies

**Future Path:** Upgrade to SSO federation (Azure AD/Okta) in Phase 3 if needed

### Authorization Strategy

**Role-Based Access Control (RBAC):**
- 6 executive roles: CFO, CRO, CLO, CIO, CISO, Board
- Each role has specific data access permissions
- Agent-specific data isolation (CFO Agent only accesses CFO data)

**Agent-to-Data Authorization:**
- Each agent (CFO, CISO, Board, etc.) has specific data access
- Agents cannot access other agents' data
- Cross-agent access only for Board Agent (synthesizes all outputs)
- CISO Agent has read access to all agents (coordination role)

### Security Principles

**NIST Password Guidelines:**
- Minimum 12 characters
- No complexity requirements (NIST SP 800-63B)
- Check against common password lists
- No password hints
- Password hashing with bcrypt or argon2

**Zero Trust Architecture:**
- Never trust, always verify
- Every request authenticated
- Every access authorized
- Every action logged

**Defense in Depth:**
- MFA required
- JWT token expiration
- Refresh token rotation
- Rate limiting
- Audit logging

---

## DELIVERABLES

### 1. Authentication Service (FastAPI)

**Location:** `/services/authentication/`

**1.1 Authentication Core**

```python
# /services/authentication/auth.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
import bcrypt
from datetime import datetime, timedelta
import pyotp

app = FastAPI(title="CyberRX Authentication Service")

# Configuration
SECRET_KEY = "YOUR_SECRET_KEY_HERE"  # From Key Vault
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Models
class UserLogin(BaseModel):
    username: str
    password: str
    totp_code: str  # 6-digit MFA code

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str

class TOTPSetupResponse(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: list[str]

# Password hashing
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# JWT Token creation
def create_access_token(data: dict):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# MFA (TOTP)
def generate_totp_secret() -> str:
    """Generate new TOTP secret"""
    return pyotp.randombase32()

def verify_totp(secret: str, code: str) -> bool:
    """Verify TOTP code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)

# API Endpoints
@app.post("/api/v1/auth/register", response_model=dict)
async def register(user: UserCreate):
    """Register new user (requires admin role in production)"""
    # Check if user exists
    # Hash password
    hashed_password = hash_password(user.password)
    # Generate TOTP secret
    totp_secret = generate_totp_secret()
    # Store in database
    # Return TOTP setup info
    return {
        "user_id": "uuid",
        "totp_secret": totp_secret,
        "qr_code_url": pyotp.totp.TOTP(totp_secret).provisioning_uri(
            name=user.email,
            issuer_name="CyberRX"
        ),
        "backup_codes": [pyotp.randombase32() for _ in range(10)]
    }

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(user_login: UserLogin):
    """Authenticate user with username/password + MFA"""
    # Look up user by username
    # Verify password
    if not verify_password(user_login.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify TOTP code
    if not verify_totp(user.totp_secret, user_login.totp_code):
        raise HTTPException(status_code=401, detail="Invalid MFA code")

    # Create tokens
    token_data = {
        "sub": user.username,
        "role": user.role,
        "customer_id": user.customer_id
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@app.post("/api/v1/auth/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token"""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        # Create new access token
        token_data = {
            "sub": payload["sub"],
            "role": payload["role"],
            "customer_id": payload["customer_id"]
        }
        access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@app.post("/api/v1/auth/logout")
async def logout():
    """Logout user (invalidate tokens - client-side only for MVP)"""
    # In production: implement token blacklist in Redis
    return {"message": "Logged out successfully"}

@app.get("/api/v1/auth/me")
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Get current user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")

        return {
            "username": payload["sub"],
            "role": payload["role"],
            "customer_id": payload["customer_id"],
            "exp": payload["exp"]
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Access token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid access token")
```

**1.2 Rate Limiting Middleware**

```python
# /services/authentication/rate_limiter.py
from fastapi import Request, HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # 5 login attempts per minute
async def login_with_rate_limit(user_login: UserLogin, request: Request):
    # ... login logic
    pass
```

### 2. Database Schema for Authentication

**Location:** `/infrastructure/database/migrations/002_add_authentication.sql`

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,

    -- MFA
    totp_secret VARCHAR(255) NOT NULL,
    backup_codes TEXT[] NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Account status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_role CHECK (role IN ('cfo', 'cro', 'clo', 'cio', 'ciso', 'board', 'admin'))
);

CREATE INDEX idx_users_customer_id ON users(customer_id);
CREATE INDEX idx_users_role ON users(role);

-- Refresh tokens table (for token rotation)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,

    CONSTRAINT valid_token CHECK (revoked_at IS NULL OR expires_at > revoked_at)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Sessions table (for audit logging)
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token VARCHAR(500) NOT NULL,
    refresh_token_id UUID NOT NULL REFERENCES refresh_tokens(id),
    customer_id VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT valid_session CHECK (logout_at IS NULL OR login_at < logout_at)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### 3. Role-Based Access Control (RBAC)

**Location:** `/services/authentication/rbac.py`

```python
# /services/authentication/rbac.py
from enum import Enum
from typing import List

class Role(str, Enum):
    CFO = "cfo"
    CRO = "cro"
    CLO = "clo"
    CIO = "cio"
    CISO = "ciso"
    BOARD = "board"
    ADMIN = "admin"

class Permission(str, Enum):
    # CFO permissions
    READ_FINANCIAL_DATA = "read_financial_data"
    READ_CFO_BRIEFINGS = "read_cfo_briefings"
    QUERY_CFO_AGENT = "query_cfo_agent"

    # CRO permissions
    READ_RISK_DATA = "read_risk_data"
    READ_CRO_BRIEFINGS = "read_cro_briefings"
    QUERY_CRO_AGENT = "query_cro_agent"

    # CLO permissions
    READ_COMPLIANCE_DATA = "read_compliance_data"
    READ_CLO_BRIEFINGS = "read_clo_briefings"
    QUERY_CLO_AGENT = "query_clo_agent"

    # CIO permissions
    READ_OPERATIONAL_DATA = "read_operational_data"
    READ_CIO_BRIEFINGS = "read_cio_briefings"
    QUERY_CIO_AGENT = "query_cio_agent"

    # CISO permissions
    READ_SECURITY_DATA = "read_security_data"
    READ_CISO_BRIEFINGS = "read_ciso_briefings"
    QUERY_CISO_AGENT = "query_ciso_agent"
    READ_ALL_AGENTS = "read_all_agents"  # CISO coordination role

    # Board permissions
    READ_ALL_BRIEFINGS = "read_all_briefings"
    READ_GOVERNANCE_DATA = "read_governance_data"
    QUERY_BOARD_AGENT = "query_board_agent"
    SYNTHESIZE_ALL_OUTPUTS = "synthesize_all_outputs"

    # Admin permissions
    MANAGE_USERS = "manage_users"
    MANAGE_ROLES = "manage_roles"
    MANAGE_CUSTOMERS = "manage_customers"

# Role-Permission Mapping
ROLE_PERMISSIONS = {
    Role.CFO: [
        Permission.READ_FINANCIAL_DATA,
        Permission.READ_CFO_BRIEFINGS,
        Permission.QUERY_CFO_AGENT,
    ],
    Role.CRO: [
        Permission.READ_RISK_DATA,
        Permission.READ_CRO_BRIEFINGS,
        Permission.QUERY_CRO_AGENT,
    ],
    Role.CLO: [
        Permission.READ_COMPLIANCE_DATA,
        Permission.READ_CLO_BRIEFINGS,
        Permission.QUERY_CLO_AGENT,
    ],
    Role.CIO: [
        Permission.READ_OPERATIONAL_DATA,
        Permission.READ_CIO_BRIEFINGS,
        Permission.QUERY_CIO_AGENT,
    ],
    Role.CISO: [
        Permission.READ_SECURITY_DATA,
        Permission.READ_CISO_BRIEFINGS,
        Permission.QUERY_CISO_AGENT,
        Permission.READ_ALL_AGENTS,  # CISO can read all agents
    ],
    Role.BOARD: [
        Permission.READ_ALL_BRIEFINGS,
        Permission.READ_GOVERNANCE_DATA,
        Permission.QUERY_BOARD_AGENT,
        Permission.SYNTHESIZE_ALL_OUTPUTS,
    ],
    Role.ADMIN: [
        Permission.MANAGE_USERS,
        Permission.MANAGE_ROLES,
        Permission.MANAGE_CUSTOMERS,
    ],
}

def has_permission(role: Role, permission: Permission) -> bool:
    """Check if role has permission"""
    return permission in ROLE_PERMISSIONS.get(role, [])

def require_permission(permission: Permission):
    """FastAPI dependency for permission checking"""
    def permission_checker(current_user = Depends(get_current_user)):
        user_role = Role(current_user["role"])
        if not has_permission(user_role, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission.value}"
            )
        return current_user
    return permission_checker

# Example usage in other services
from services.authentication.rbac import require_permission, Permission

@app.get("/api/v1/cfo/briefings")
@require_permission(Permission.READ_CFO_BRIEFINGS)
async def get_cfo_briefings(user = Depends(require_permission(Permission.READ_CFO_BRIEFINGS))):
    # ... get CFO briefings
    pass
```

### 4. Agent-to-Data Authorization

**Location:** `/services/authentication/agent_auth.py`

```python
# /services/authentication/agent_auth.py
from typing import List

class AgentType(str, Enum):
    CFO = "cfo"
    CRO = "cro"
    CLO = "clo"
    CIO = "cio"
    CISO = "ciso"
    BOARD = "board"

# Agent-to-Data Authorization Matrix
# Each agent can only access its designated data
AGENT_DATA_ACCESS = {
    AgentType.CFO: [
        "financial_exposure",
        "mlr_impact",
        "stop_loss_exposure",
        "reserve_at_risk",
        "premium_revenue",
        "cfo_briefings",
        "cfo_agent_state",
    ],
    AgentType.CRO: [
        "threshold_breaches",
        "risk_appetite",
        "cms_regulatory_limits",
        "residual_risk",
        "cro_briefings",
        "cro_agent_state",
    ],
    AgentType.CLO: [
        "regulatory_triggers",
        "obligation_status",
        "notification_timelines",
        "vendor_baa_status",
        "clo_briefings",
        "clo_agent_state",
    ],
    AgentType.CIO: [
        "business_process_graph",
        "operational_impact",
        "system_dependencies",
        "technology_risks",
        "cio_briefings",
        "cio_agent_state",
    ],
    AgentType.CISO: [
        "risk_objects",
        "attack_pathways",
        "blast_radius",
        "threat_intelligence",
        "ciso_briefings",
        "ciso_agent_state",
        "cfo_agent_state",      # CISO can read all agents
        "cro_agent_state",
        "clo_agent_state",
        "cio_agent_state",
        "board_agent_state",
    ],
    AgentType.BOARD: [
        "all_briefings",
        "governance_metrics",
        "roi_analysis",
        "trajectory_trends",
        "board_agent_state",
        "cfo_briefings",         # Board synthesizes all outputs
        "cro_briefings",
        "clo_briefings",
        "cio_briefings",
        "ciso_briefings",
    ],
}

def agent_can_access_data(agent_type: AgentType, data_type: str) -> bool:
    """Check if agent can access data type"""
    return data_type in AGENT_DATA_ACCESS.get(agent_type, [])

def require_agent_data_access(agent_type: AgentType):
    """Dependency for agent data access checking"""
    def agent_access_checker(data_type: str):
        if not agent_can_access_data(agent_type, data_type):
            raise HTTPException(
                status_code=403,
                detail=f"Agent {agent_type.value} cannot access {data_type}"
            )
    return agent_access_checker
```

### 5. Audit Logging Service

**Location:** `/services/authentication/audit.py`

```python
# /services/authentication/audit.py
from fastapi import Request
import logging
from datetime import datetime

audit_logger = logging.getLogger("audit")

class AuditEvent:
    def __init__(
        self,
        event_type: str,
        user_id: str,
        customer_id: str,
        role: str,
        action: str,
        resource_type: str,
        resource_id: str = None,
        ip_address: str = None,
        user_agent: str = None,
        success: bool = True,
        details: dict = None
    ):
        self.event_type = event_type
        self.user_id = user_id
        self.customer_id = customer_id
        self.role = role
        self.action = action
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.success = success
        self.details = details or {}
        self.timestamp = datetime.utcnow()

    def log(self):
        """Log audit event"""
        audit_log = {
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type,
            "user_id": self.user_id,
            "customer_id": self.customer_id,
            "role": self.role,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "success": self.success,
            "details": self.details
        }
        audit_logger.info(audit_log)

        # Also store in database for long-term retention
        # store_audit_event_in_db(audit_log)

# Middleware to log all requests
async def audit_middleware(request: Request, call_next):
    """Audit middleware for all requests"""
    start_time = datetime.utcnow()

    response = await call_next(request)

    # Extract user info from JWT if present
    user_info = None
    try:
        auth_header = request.headers.get("authorization")
        if auth_header:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_info = {
                "user_id": payload.get("sub"),
                "customer_id": payload.get("customer_id"),
                "role": payload.get("role")
            }
    except:
        pass

    # Log audit event
    if user_info:
        event = AuditEvent(
            event_type="api_request",
            user_id=user_info["user_id"],
            customer_id=user_info["customer_id"],
            role=user_info["role"],
            action=request.method,
            resource_type=request.url.path,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            success=response.status_code < 400,
            details={
                "status_code": response.status_code,
                "duration_ms": (datetime.utcnow() - start_time).total_seconds() * 1000
            }
        )
        event.log()

    return response

# Specific audit events
def log_login_attempt(username: str, success: bool, ip_address: str = None):
    """Log login attempt"""
    event = AuditEvent(
        event_type="login_attempt",
        user_id=username,
        customer_id=None,  # Not yet known
        role=None,
        action="login",
        resource_type="auth",
        ip_address=ip_address,
        success=success,
        details={"username": username}
    )
    event.log()

def log_data_access(user_id: str, customer_id: str, role: str, data_type: str, success: bool):
    """Log data access attempt"""
    event = AuditEvent(
        event_type="data_access",
        user_id=user_id,
        customer_id=customer_id,
        role=role,
        action="read",
        resource_type=data_type,
        success=success,
        details={"data_type": data_type}
    )
    event.log()

def log_agent_action(agent_type: str, customer_id: str, action: str, details: dict = None):
    """Log agent action"""
    event = AuditEvent(
        event_type="agent_action",
        user_id=f"agent_{agent_type}",
        customer_id=customer_id,
        role=agent_type,
        action=action,
        resource_type="agent",
        details=details or {}
    )
    event.log()
```

**Audit Log Database Table:**

```sql
-- Audit log table (TimescaleDB hypertable for time-series)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    customer_id VARCHAR(255),
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details JSONB,

    CONSTRAINT valid_event_type CHECK (event_type IN (
        'login_attempt', 'logout', 'api_request', 'data_access',
        'agent_action', 'permission_denied', 'admin_action'
    ))
);

SELECT create_hypertable('audit_log', 'timestamp', if_not_exists => TRUE);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_customer_id ON audit_log(customer_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_success ON audit_log(success);
```

### 6. Security Baseline Documentation

**Location:** `/docs/security/baseline.md`

```markdown
# CyberRX Security Baseline

## Authentication

### Password Requirements
- Minimum 12 characters
- Checked against common password lists
- No complexity requirements (NIST SP 800-63B)
- No password hints
- Password hashed with bcrypt (work factor 12)
- Password expiration: 90 days

### Multi-Factor Authentication (MFA)
- TOTP required (Time-based One-Time Password)
- 6-digit code
- 30-second window
- Backup codes provided (10 codes)
- Backup codes single-use

### Session Management
- Access tokens expire after 30 minutes
- Refresh tokens expire after 7 days
- Refresh token rotation on refresh
- Tokens invalidated on logout
- Sessions tracked in database

### Rate Limiting
- Login attempts: 5 per minute
- API requests: 100 per minute per user
- Failed login attempts: 5 before lockout
- Account lockout: 15 minutes

## Authorization

### Role-Based Access Control (RBAC)
- 6 executive roles: CFO, CRO, CLO, CIO, CISO, Board
- 1 admin role: ADMIN
- Role assigned at user creation
- Role change requires admin approval
- Role changes logged

### Agent-to-Data Authorization
- Each agent accesses only designated data
- CISO can read all agents (coordination role)
- Board can synthesize all outputs
- Cross-agent access prohibited
- Agent access logged

### Least Privilege
- Users have minimum required access
- Data access scoped to customer_id
- No cross-customer data access
- Database access isolated per customer

## Audit Logging

### What Is Logged
- All login attempts (success/failure)
- All API requests
- All data access attempts
- All permission denials
- All admin actions
- All agent actions

### Log Retention
- Audit logs stored for 7 years (HIPAA requirement)
- Audit logs immutable (cannot be deleted)
- Audit logs replicated to backup
- Audit logs accessible for investigations

### Log Security
- Audit logs written before response returned
- Audit logs cannot be modified
- Audit log access requires admin role
- Audit log exports require approval

## Encryption

### Data at Rest
- Database: Customer-managed keys (BYOK)
- File storage: Customer-managed keys
- Key Vault: Azure Key Vault / AWS Secrets Manager

### Data in Transit
- TLS 1.3 minimum
- Perfect Forward Secrecy (PFS)
- Strong cipher suites
- Certificate validation

### Key Management
- Keys stored in Key Vault
- Key rotation: 90 days
- Key escrow: Customer-managed
- Key backup: Encrypted backup

## Network Security

### Tenant Isolation
- Kubernetes namespace isolation
- Network policies deny cross-namespace traffic
- Database isolation per customer
- Private endpoints only

### Access Control
- Private AKS/EKS clusters
- Application Gateway / Ingress Controller
- IP whitelisting (if required)
- DDoS protection

## Compliance

### HIPAA
- Encryption at rest and in transit
- Access control and audit logging
- Business associate agreement
- Physical security of data centers

### SOC 2 (Future)
- Access controls
- Audit logging
- Change management
- Incident response
- Vendor management
```

---

## SUCCESS CRITERIA

**You are done when:**

- ✅ Users can authenticate with username/password + MFA
- ✅ JWT tokens issued and validated correctly
- ✅ Agents can only access their designated data
- ✅ All access attempts logged
- ✅ Password security meets NIST standards
- ✅ Security baseline passes initial review
- ✅ Rate limiting implemented
- ✅ Audit logging comprehensive
- ✅ RBAC working for all 6 roles
- ✅ Agent-to-data authorization enforced
- ✅ All passwords hashed with bcrypt
- ✅ MFA working (TOTP)
- ✅ Sessions tracked in database

---

## TECHNICAL CONTEXT

### Technology Stack

**Backend Framework:** FastAPI (Python 3.11+)
- Async/await support
- Type hints
- OpenAPI documentation
- Dependency injection

**Security Libraries:**
- `bcrypt` or `argon2` for password hashing
- `pyotp` for TOTP MFA
- `python-jose` for JWT tokens
- `slowapi` for rate limiting
- `passlib` for password validation

**Database:** PostgreSQL 16
- Users, sessions, refresh tokens
- Audit log (TimescaleDB hypertable)
- Per-customer isolation

### Dependencies

**Blocked by:**
- T-FOUND-001: Repository structure
- T-FOUND-002: Infrastructure (database, Key Vault)
- T-FOUND-003: Data models (user schemas)

**Blocks:**
- T-MVP-007: Agent Runtime (needs auth for agents)
- All Phase 1 frontend tasks (need auth for dashboards)

---

## VALIDATION REQUIREMENTS

### Acceptance Validator

**Deliverables:**
- ✅ Authentication service working
- ✅ MFA implemented (TOTP)
- ✅ RBAC policies defined
- ✅ Agent authorization matrix
- ✅ JWT token management
- ✅ Audit logging service
- ✅ Security baseline documentation

**Success Criteria:**
- ✅ Can register new user
- ✅ Can login with username/password + MFA
- ✅ Can refresh token
- ✅ Can logout
- ✅ Roles enforced correctly
- ✅ Agent access controlled
- ✅ All access logged

### Security Validator

**Critical Security Checks:**
- ✅ Passwords hashed with bcrypt (not plaintext)
- ✅ MFA required (cannot be bypassed)
- ✅ JWT tokens expire (cannot be indefinite)
- ✅ Rate limiting prevents brute force
- ✅ SQL injection prevented (parameterized queries)
- ✅ XSS prevented (input validation)
- ✅ CSRF protection (token verification)
- ✅ No hardcoded secrets
- ✅ TLS enforced
- ✅ Passwords meet NIST standards
- ✅ Common passwords rejected
- ✅ Account lockout after failures
- ✅ Audit logging comprehensive
- ✅ Audit logs immutable
- ✅ Keys stored in Key Vault (not in code)

**HIPAA Controls:**
- ✅ Encryption at rest (BYOK)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Access control (RBAC)
- ✅ Audit logging (7-year retention)
- ✅ MFA required
- ✅ Session timeout
- ✅ Unique user IDs
- ✅ Emergency access procedure

### No-Regression Validator

**If Existing Auth System:**
- ✅ Existing users can still login
- ✅ Session migration path exists
- ✅ Password migration safe
- ✅ Rollback procedures tested

**If Greenfield:**
- ✅ Migrations are idempotent
- ✅ Can rollback safely
- ✅ No breaking changes in APIs

### Integration Validator

**Integration Points:**
- ✅ Auth service connects to database
- ✅ JWT tokens validated by other services
- ✅ RBAC enforced by other services
- ✅ Agent authorization checked
- ✅ Audit logs written to database
- ✅ Key Vault accessible
- ✅ Rate limiting enforced
- ✅ MFA codes verify correctly

---

## OUTPUT REQUIREMENTS

### Code Outputs

**Authentication Service:**
```
/services/authentication/
  auth.py                    # Core authentication
  rbac.py                   # Role-based access control
  agent_auth.py             # Agent authorization
  audit.py                  # Audit logging
  rate_limiter.py           # Rate limiting
  models.py                 # Pydantic models
  dependencies.py           # FastAPI dependencies
```

**Database Migrations:**
```
/infrastructure/database/migrations/
  002_add_authentication.sql
  002_add_authentication_rollback.sql
```

**Documentation:**
```
/docs/security/
  baseline.md               # Security baseline
  authentication.md         # How auth works
  authorization.md          # How RBAC works
  audit-logging.md          # Audit logging guide
  mfa-setup.md              # MFA setup guide
```

### Artifact Output

**Location:** `/workspace/artifacts/T-FOUND-004.out`

**Contents:**
- Authentication service test results
- MFA verification results
- RBAC test results
- Agent authorization test results
- Audit log samples
- Rate limiting test results
- Security baseline validation
- Deviations from specification
- Recommendations for T-MVP-007 (Agent Runtime)

---

## EXECUTION INSTRUCTIONS

### Phase 1: Authentication Core (Days 1-2)

1. **Set up FastAPI project:**
   ```bash
   cd /services/authentication
   pip install fastapi uvicorn python-jose bcrypt pyotp passlib slowapi
   ```

2. **Create authentication service:**
   - Password hashing (bcrypt)
   - JWT token creation/validation
   - TOTP MFA implementation
   - Login endpoint
   - Refresh token endpoint
   - Logout endpoint
   - Get current user endpoint

3. **Test authentication:**
   - Register test user
   - Login with username/password + MFA
   - Verify JWT token
   - Test refresh token
   - Test logout

### Phase 2: Database Schema & RBAC (Days 3-4)

1. **Create database migration:**
   - Users table
   - Refresh tokens table
   - Sessions table
   - Audit log table
   - Test migration
   - Test rollback

2. **Implement RBAC:**
   - Define roles and permissions
   - Create permission mapping
   - Implement permission checking
   - Create require_permission dependency
   - Test RBAC

3. **Implement Agent Authorization:**
   - Define agent types
   - Create agent-to-data mapping
   - Implement access checking
   - Create agent access dependency
   - Test agent authorization

### Phase 3: Audit Logging & Rate Limiting (Days 5-6)

1. **Implement audit logging:**
   - Create audit event structure
   - Implement audit logger
   - Create audit middleware
   - Implement specific audit events
   - Test audit logging

2. **Implement rate limiting:**
   - Set up slowapi
   - Configure rate limits
   - Test rate limiting
   - Test account lockout

3. **Create security baseline:**
   - Document all security controls
   - Document password requirements
   - Document MFA setup
   - Document audit logging
   - Document encryption

### Phase 4: Integration Testing & Documentation (Days 7-8)

1. **Integration testing:**
   - Test auth with database
   - Test RBAC with mock APIs
   - Test agent authorization
   - Test audit logging
   - Test rate limiting
   - Test MFA end-to-end

2. **Documentation:**
   - Security baseline
   - Authentication guide
   - Authorization guide
   - Audit logging guide
   - MFA setup guide

3. **Create artifact:**
   - Write `/workspace/artifacts/T-FOUND-004.out`
   - Summarize all results
   - Document recommendations

---

## TIMING

**Estimated:** 80 hours (2 weeks)

**Suggested Breakdown:**
- **Days 1-2:** Authentication core (password hashing, JWT, MFA, login)
- **Days 3-4:** Database schema, RBAC, agent authorization
- **Days 5-6:** Audit logging, rate limiting
- **Days 7-8:** Integration testing, documentation, artifact

**Deadline:** End of Week 2 (unblocks T-MVP-007)

---

## CRITICAL SUCCESS FACTORS

### Most Important Requirements

1. **MFA is Mandatory**
   - Cannot be bypassed
   - Must be enforced at login
   - Backup codes required
   - TOTP implementation correct

2. **Password Security Per NIST**
   - Minimum 12 characters
   - Check against common passwords
   - Bcrypt hashing (work factor 12)
   - No complexity requirements

3. **RBAC Enforced Correctly**
   - Each role has specific permissions
   - Roles cannot be escalated
   - Cross-role access prohibited
   - Board Agent can synthesize all outputs
   - CISO Agent can read all agents

4. **Audit Logging Comprehensive**
   - All access logged
   - Logs immutable
   - 7-year retention
   - Logs reviewed regularly

### Common Pitfalls to Avoid

- ❌ Don't store passwords in plaintext (hash them!)
- ❌ Don't skip MFA (it's mandatory)
- ❌ Don't make JWT tokens indefinite (they must expire)
- ❌ Don't hardcode secrets (use Key Vault)
- ❌ Don't forget rate limiting (brute force attacks)
- ❌ Don't ignore audit logging (compliance requirement)
- ❌ Don't allow cross-customer data access
- ❌ Don't skip password validation

### Questions to Ask Yourself

1. Can a user bypass MFA?
2. Can a JWT token be used indefinitely?
3. Can a CFO access CISO data?
4. Can an attacker brute force passwords?
5. Is every access attempt logged?
6. Are passwords hashed securely?
7. Can the system pass a HIPAA audit?

---

## TESTING STRATEGY

### Unit Tests

**Password Hashing:**
- Test hashing algorithm
- Test verification
- Test common password rejection

**JWT Tokens:**
- Test token creation
- Test token validation
- Test token expiration
- Test refresh token

**MFA:**
- Test TOTP generation
- Test TOTP verification
- Test backup codes

### Integration Tests

**Authentication Flow:**
- Register user
- Login with correct credentials
- Login with incorrect password
- Login with incorrect MFA
- Refresh token
- Logout
- Access protected endpoint

**RBAC:**
- Test role permissions
- Test permission denial
- Test role escalation (should fail)
- Test admin actions

**Agent Authorization:**
- Test CFO agent access
- Test CISO agent access (should read all)
- Test cross-agent access (should fail)

**Audit Logging:**
- Test login logging
- Test data access logging
- Test permission denial logging
- Test audit log immutability

**Rate Limiting:**
- Test login rate limit
- Test API rate limit
- Test account lockout

---

## NEXT STEPS AFTER COMPLETION

**Unblocks:**
- T-MVP-007: Agent Runtime (agents need auth)
- All Phase 1 frontend tasks (dashboards need auth)
- T-MVP-011 through T-MVP-013 (dashboards)

**Recommendations for T-MVP-007 (Agent Runtime):**
- How agents authenticate to services
- Agent-to-service authorization
- Agent session management
- Agent audit logging

**Recommendations for Frontend:**
- Login page implementation
- MFA entry UI
- Token refresh handling
- Permission-based UI rendering
- Logout flow

---

**Ready to begin. Start with password hashing and JWT tokens, then build MFA, then RBAC, then audit logging. Security is critical - get it right.**

**Good luck! 🚀**

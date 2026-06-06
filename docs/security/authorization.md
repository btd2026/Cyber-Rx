# CyberRX Authorization Guide

**Version:** 0.1.0
**Last Updated:** 2025-01-31

---

## Overview

This guide explains how authorization works in the CyberRX Multi-Agent AI Platform, including role-based access control (RBAC), agent-to-data authorization, and permission management.

---

## Role-Based Access Control (RBAC)

### Executive Roles

**1. CFO (Chief Financial Officer)**

**Responsibilities:** Financial analysis and risk quantification

**Permissions:**
- `read_financial_data` - Access financial exposure and risk data
- `read_cfo_briefings` - Access CFO intelligence briefings
- `query_cfo_agent` - Query CFO Agent for analysis

**Accessible Data:**
- Financial exposure
- MLR impact
- Stop-loss exposure
- Reserve at risk
- Premium revenue
- CFO briefings
- CFO agent state

**2. CRO (Chief Risk Officer)**

**Responsibilities:** Risk management and threshold monitoring

**Permissions:**
- `read_risk_data` - Access risk threshold and appetite data
- `read_cro_briefings` - Access CRO intelligence briefings
- `query_cro_agent` - Query CRO Agent for analysis

**Accessible Data:**
- Threshold breaches
- Risk appetite
- CMS regulatory limits
- Residual risk
- Risk velocity
- CRO briefings
- CRO agent state

**3. CLO (Chief Legal Officer)**

**Responsibilities:** Compliance and regulatory management

**Permissions:**
- `read_compliance_data` - Access regulatory and compliance data
- `read_clo_briefings` - Access CLO intelligence briefings
- `query_clo_agent` - Query CLO Agent for analysis

**Accessible Data:**
- Regulatory triggers
- Obligation status
- Notification timelines
- Vendor BAA status
- Compliance gaps
- CLO briefings
- CLO agent state

**4. CIO (Chief Information Officer)**

**Responsibilities:** Operational risk and business continuity

**Permissions:**
- `read_operational_data` - Access business process and operational data
- `read_cio_briefings` - Access CIO intelligence briefings
- `query_cio_agent` - Query CIO Agent for analysis

**Accessible Data:**
- Business process graph
- Operational impact
- System dependencies
- Technology risks
- Business continuity
- CIO briefings
- CIO agent state

**5. CISO (Chief Information Security Officer)**

**Responsibilities:** Security management and coordination

**Permissions:**
- `read_security_data` - Access security and threat data
- `read_ciso_briefings` - Access CISO intelligence briefings
- `query_ciso_agent` - Query CISO Agent for analysis
- `read_all_agents` - **Read all agent outputs (coordination role)**

**Accessible Data:**
- Risk objects
- Attack pathways
- Blast radius
- Threat intelligence
- Security controls
- CISO briefings
- CISO agent state
- **All other agent outputs** (coordination privilege)

**6. Board**

**Responsibilities:** Governance and synthesis of all outputs

**Permissions:**
- `read_all_briefings` - Access all executive briefings
- `read_governance_data` - Access governance and board metrics
- `query_board_agent` - Query Board Agent for synthesis
- `synthesize_all_outputs` - Synthesize outputs from all agents

**Accessible Data:**
- Governance metrics
- ROI analysis
- Trajectory trends
- Executive summary
- Board KPIs
- Board briefings
- Board agent state
- **All executive briefings** (synthesis privilege)

### Admin Role

**ADMIN**

**Responsibilities:** System administration and user management

**Permissions:**
- `manage_users` - Create, update, and delete users
- `manage_roles` - Assign and modify user roles
- `manage_customers` - Manage customer accounts
- `read_all_audit_logs` - Read all audit logs

**Accessible Data:**
- All user data
- All customer data
- All audit logs
- System configuration

---

## Permission Enforcement

### Using FastAPI Dependencies

**Require Single Permission:**

```python
from services.authentication.rbac import require_permission, Permission

@app.get("/api/v1/cfo/briefings")
@require_permission(Permission.READ_CFO_BRIEFINGS)
async def get_cfo_briefings(user: CurrentUser = Depends(require_permission(...))):
    # Handler logic
    pass
```

**Require Any Permission:**

```python
from services.authentication.rbac import require_any_permission, Permission

@app.get("/api/v1/dashboard")
@require_any_permission(
    Permission.READ_CFO_BRIEFINGS,
    Permission.READ_CISO_BRIEFINGS
)
async def get_dashboard(user: CurrentUser = Depends(...)):
    # Handler logic
    pass
```

**Require Specific Role:**

```python
from services.authentication.rbac import require_role, Role

@app.post("/api/v1/admin/users")
@require_role(Role.ADMIN)
async def create_user(user: CurrentUser = Depends(...)):
    # Handler logic
    pass
```

**Require Admin:**

```python
from services.authentication.rbac import require_admin

@app.delete("/api/v1/admin/users/{user_id}")
@require_admin()
async def delete_user(user: CurrentUser = Depends(...)):
    # Handler logic
    pass
```

### Permission Checking in Code

**Check Single Permission:**

```python
from services.authentication.rbac import has_permission, Role, Permission

if has_permission(Role.CFO, Permission.READ_FINANCIAL_DATA):
    # Allow access
else:
    # Deny access
```

**Check Multiple Permissions:**

```python
from services.authentication.rbac import has_any_permission, Role, Permission

if has_any_permission(Role.CISO, [
    Permission.READ_SECURITY_DATA,
    Permission.READ_ALL_AGENTS
]):
    # Allow access
else:
    # Deny access
```

---

## Agent-to-Data Authorization

### Data Access Matrix

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

### Agent Authorization Usage

**Check Agent Data Access:**

```python
from services.authentication.agent_auth import agent_can_access_data, AgentType

if agent_can_access_data(AgentType.CFO, "financial_exposure"):
    # Allow access
else:
    # Deny access
    raise HTTPException(status_code=403, detail="Access denied")
```

**Require Agent Data Access:**

```python
from services.authentication.agent_auth import require_agent_data_access, AgentType

# Create access checker
access_checker = require_agent_data_access(AgentType.CFO)

# Use in code
try:
    access_checker("financial_exposure")  # OK
    access_checker("ciso_briefings")      # Raises HTTPException
except HTTPException as e:
    # Handle denial
    pass
```

**Check Cross-Agent Access:**

```python
from services.authentication.agent_auth import check_cross_agent_access, AgentType

# CISO can access all agents
if check_cross_agent_access(AgentType.CISO, AgentType.CFO):
    # Allow access

# CFO cannot access CISO data
if not check_cross_agent_access(AgentType.CFO, AgentType.CISO):
    # Deny access
    raise HTTPException(status_code=403, detail="Cross-agent access denied")
```

---

## Role Hierarchy

**Hierarchy Levels:**

- Level 1: CFO, CRO, CLO, CIO, CISO
- Level 2: Board
- Level 3: Admin

**Role Escalation:**

- Lower-level roles cannot escalate to higher-level roles
- Admin can change any user's role
- Role changes require admin approval
- Role changes are logged in audit log

**Example:**

```python
from services.authentication.rbac import is_role_higher_or_equal, Role

# Check if role is higher or equal
if is_role_higher_or_equal(Role.ADMIN, Role.CFO):
    # Admin can manage CFO users

if not is_role_higher_or_equal(Role.CFO, Role.BOARD):
    # CFO cannot access Board resources
```

---

## Customer Isolation

**Multi-Tenancy:**

- Each customer has unique `customer_id`
- All data scoped to `customer_id`
- Row-Level Security (RLS) enforces isolation
- JWT tokens include `customer_id`
- No cross-customer data access

**RLS Policies:**

```sql
-- Users can only see their own customer's data
CREATE POLICY users_isolate_customers ON users
    FOR ALL
    USING (customer_id = current_setting('app.customer_id', true));

-- Sessions isolated by customer
CREATE POLICY sessions_isolate_customers ON sessions
    FOR ALL
    USING (customer_id = current_setting('app.customer_id', true));

-- Audit logs isolated by customer
CREATE POLICY audit_log_isolate_customers ON audit_log
    FOR SELECT
    USING (customer_id = current_setting('app.customer_id', true));
```

**JWT Token Scoping:**

```python
# Token includes customer_id
token_data = {
    "sub": username,
    "role": role,
    "customer_id": customer_id  # Scoping
}
```

---

## Permission Denials

**Denial Logging:**

All permission denials are logged in audit log:

```python
from services.authentication.audit import log_permission_denied

log_permission_denied(
    user_id="john.doe",
    customer_id="customer-123",
    role="cfo",
    action="read",
    resource_type="ciso_briefings",
    denial_reason="Role 'cfo' does not have permission 'read_ciso_briefings'",
    ip_address="192.168.1.1"
)
```

**Denial Response:**

```json
{
  "detail": "Permission denied: read_ciso_briefings"
}
```
Status: 403 Forbidden

---

## Best Practices

**For Developers:**

1. **Always Use Permission Dependencies:**
   ```python
   @require_permission(Permission.READ_FINANCIAL_DATA)
   async def endpoint(user: CurrentUser = Depends(...)):
       pass
   ```

2. **Check Agent Access:**
   ```python
   if not agent_can_access_data(agent_type, data_type):
       raise HTTPException(status_code=403)
   ```

3. **Log All Denials:**
   ```python
   log_permission_denied(...)
   ```

4. **Use Customer Scoping:**
   ```python
   WHERE customer_id = :customer_id
   ```

5. **Never Hardcode Roles:**
   ```python
   # Bad
   if user.role == "cfo":

   # Good
   if has_permission(user.role, Permission.READ_FINANCIAL_DATA):
   ```

**For Users:**

1. **Know Your Role:** Understand what your role can access
2. **Don't Share Credentials:** Each user has their own role
3. **Report Issues:** If you can't access needed data, contact admin
4. **Check Permissions:** Use `/api/v1/auth/me` to verify your role

---

## Troubleshooting

**Access Denied:**

1. Check your role (`/api/v1/auth/me`)
2. Verify you have the required permission
3. Check if data is scoped to your customer
4. Contact admin if you believe it's an error

**Cross-Agent Access Denied:**

1. Verify you're using the correct agent
2. CISO can access all agents (coordination)
3. Board can access all briefings (synthesis)
4. Other agents cannot cross-access

**Customer Isolation Issues:**

1. Verify `customer_id` in JWT token
2. Check database queries include `customer_id`
3. Verify RLS policies are enabled
4. Contact admin if data is missing

---

## References

- [Security Baseline](./baseline.md)
- [Authentication Guide](./authentication.md)
- [Audit Logging Guide](./audit-logging.md)
- [RBAC Module](../../services/authentication/rbac.py)
- [Agent Auth Module](../../services/authentication/agent_auth.py)

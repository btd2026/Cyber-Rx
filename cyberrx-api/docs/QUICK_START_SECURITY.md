# CyberRx API Security Quick Start

## For Developers

This is a quick reference for implementing security in new routes or understanding the existing security implementation.

---

## Authentication Middleware

### Basic JWT Authentication

All routes must use `authenticateJWT` middleware:

```javascript
const { authenticateJWT } = require('../middleware/auth');

router.get('/api/example', authenticateJWT, async (req, res) => {
  // req.user - decoded JWT payload
  // req.userId - user ID from token
  // req.orgId - organization ID from token
  // req.user.role - user role (CIO, CISO, CFO, CLO, CRO, AUDIT_DIRECTOR)

  const { userId, orgId, role } = req;
  // Your handler code
});
```

---

## Authorization Middleware

### Single Permission Check

```javascript
const { requirePermission } = require('../middleware/rbac');

router.get('/api/findings', authenticateJWT, requirePermission('security.findings.view'), async (req, res) => {
  // Only users with 'security.findings.view' permission can access
});
```

### Multiple Permissions (OR logic)

```javascript
const { requireAnyPermission } = require('../middleware/rbac');

router.post('/api/risks', authenticateJWT, requireAnyPermission([
  'security.risks.create',
  'risk.register.create'
]), async (req, res) => {
  // Users with either permission can access
});
```

### Multiple Permissions (AND logic)

```javascript
const { requireAllPermissions } = require('../middleware/rbac');

router.delete('/api/findings/:id', authenticateJWT, requireAllPermissions([
  'security.findings.view',
  'security.findings.delete'
]), async (req, res) => {
  // Users must have both permissions
});
```

### Role-Based Check

```javascript
const { requireRole } = require('../middleware/rbac');

router.post('/api/correlation/run', authenticateJWT, requireRole('CISO'), async (req, res) => {
  // Only CISO can run correlation engine
});
```

### Admin Check

```javascript
const { requireAdmin } = require('../middleware/rbac');

router.post('/api/seeds/demo', authenticateJWT, requireAdmin(), async (req, res) => {
  // Only users with admin permissions can access
});
```

---

## Permission Reference

### Security Permissions
```javascript
// Findings
'security.findings.view'
'security.findings.create'
'security.findings.update'
'security.findings.delete'

// Risks
'security.risks.view'
'security.risks.create'
'security.risks.update'
'security.risks.delete'

// Threats
'security.threats.view'
'security.threats.create'
'security.threats.update'

// Controls
'security.controls.view'
'security.controls.create'
'security.controls.update'
'security.controls.delete'

// Vendor Monitoring
'security.vendor_monitoring.view'
'security.vendor_monitoring.manage'
```

### Legal Permissions
```javascript
// Obligations
'legal.obligations.view'
'legal.obligations.create'
'legal.obligations.update'
'legal.obligations.delete'

// Frameworks
'legal.frameworks.view'
'legal.frameworks.manage'

// Evidence
'legal.evidence.view'
'legal.evidence.upload'
'legal.evidence.delete'
```

### Financial Permissions
```javascript
// Exposure
'financial.exposure.view'
'financial.exposure.create'
'financial.exposure.update'

// Budget
'financial.budget.view'
'financial.budget.manage'

// Analytics
'financial.analytics.view'
```

### Operations Permissions
```javascript
// Assets
'operations.assets.view'
'operations.assets.create'
'operations.assets.update'
'operations.assets.delete'

// Business Processes
'operations.business_processes.view'
'operations.business_processes.create'
'operations.business_processes.update'

// Data Objects
'operations.data_objects.view'
'operations.data_objects.create'
'operations.data_objects.update'

// Tools
'operations.tools.view'
'operations.tools.manage'

// ITSM
'operations.itsm.view'
```

### Risk Management Permissions
```javascript
// Correlation
'risk.correlation.view'
'risk.correlation.run'

// Register
'risk.register.view'
'risk.register.create'
'risk.register.update'
'risk.register.delete'

// Reporting
'risk.reporting.view'
'risk.reporting.create'
```

### Audit Permissions
```javascript
// Findings
'audit.findings.view'
'audit.findings.create'
'audit.findings.update'

// Evidence
'audit.evidence.review'

// Tests
'audit.tests.view'
'audit.tests.create'
'audit.tests.execute'

// Reports
'audit.reports.view'
'audit.reports.generate'
```

### Admin Permissions
```javascript
// Organizations
'admin.organizations.view'
'admin.organizations.manage'

// Users
'admin.users.view'
'admin.users.create'
'admin.users.update'
'admin.users.delete'

// Seeds
'admin.seeds.run'

// System
'admin.system.health'
```

---

## Role Capabilities

### CIO (Chief Information Officer)
- IT operations full access
- Assets, business processes, data objects
- Security tools management
- Read-only security and risk access

### CISO (Chief Information Security Officer)
- Security domain full access
- Risk correlation engine
- Vendor monitoring
- Evidence upload
- Read-only financial access

### CFO (Chief Financial Officer)
- Financial domain full access
- Budget and analytics
- Read-only security, legal, risk access

### CLO (Chief Legal Officer)
- Legal domain full access
- Evidence management
- Audit read access
- Read-only risk and operations access

### CRO (Chief Risk Officer)
- Risk domain full access
- Correlation engine
- Reporting
- Read-only access to all other domains

### AUDIT_DIRECTOR (Audit Director)
- Audit domain full access
- Evidence review
- Testing and reports
- Read-only security, risk, legal access

---

## Common Patterns

### Standard CRUD with Permissions

```javascript
const { authenticateJWT } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// GET - Read access
router.get('/api/resources', authenticateJWT, requirePermission('domain.resources.view'), async (req, res) => {
  const resources = await Resource.findByOrganization(req.orgId);
  res.json({ data: resources });
});

// POST - Create access
router.post('/api/resources', authenticateJWT, requirePermission('domain.resources.create'), async (req, res) => {
  const resource = await Resource.create({ ...req.body, organizationId: req.orgId });
  res.status(201).json({ data: resource });
});

// PUT - Update access
router.put('/api/resources/:id', authenticateJWT, requirePermission('domain.resources.update'), async (req, res) => {
  const resource = await Resource.update(req.params.id, req.body);
  res.json({ data: resource });
});

// DELETE - Delete access
router.delete('/api/resources/:id', authenticateJWT, requirePermission('domain.resources.delete'), async (req, res) => {
  await Resource.delete(req.params.id);
  res.json({ message: 'Resource deleted' });
});
```

### Organization Access Check

```javascript
router.get('/api/resources/:id', authenticateJWT, requirePermission('domain.resources.view'), async (req, res) => {
  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Verify user can access this resource
  if (resource.organizationId !== req.orgId) {
    return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this resource' });
  }

  res.json({ data: resource });
});
```

### Public Endpoint (No Auth)

```javascript
// Health check - always public
router.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Signup - public but creates user
router.post('/api/auth/signup', async (req, res) => {
  // No authenticateJWT middleware
  // Creates user and issues JWT
});
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header. Expected format: Authorization: Bearer <token>"
}
```

**Causes**:
- No token provided
- Invalid token signature
- Expired token
- Token not yet valid

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions. Required permission: security.findings.create",
  "role": "CFO"
}
```

**Causes**:
- User role lacks required permission
- User attempting to access another organization's data
- Insufficient permissions for requested action

---

## Testing

### Test with Different Roles

```bash
# Login as different roles to get tokens
TOKEN_CISO=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ciso@example.com","password":"password"}' \
  | jq -r '.token')

TOKEN_CFO=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cfo@example.com","password":"password"}' \
  | jq -r '.token')

# Test CISO access (should succeed)
curl -H "Authorization: Bearer $TOKEN_CISO" \
  http://localhost:3001/api/findings

# Test CFO access (should return 403)
curl -X POST -H "Authorization: Bearer $TOKEN_CFO" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}' \
  http://localhost:3001/api/findings
```

---

## Security Checklist

When creating new routes:

- [ ] Add `authenticateJWT` middleware
- [ ] Add appropriate `requirePermission` middleware
- [ ] Use `req.orgId` from JWT (not headers)
- [ ] Add organization access checks for GET by ID
- [ ] Log security events (auth success, permission denied)
- [ ] Return appropriate error codes (401, 403, 404)
- [ ] Document required permissions in API docs
- [ ] Test with different user roles

---

## Getting Help

- **RBAC System Documentation**: `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/docs/RBAC_SYSTEM.md`
- **Security Hardening Guide**: `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/docs/SECURITY_HARDENING.md`
- **Implementation Summary**: `/Users/briandibassinga/Github/Cyber-Rx/SECURITY_IMPLEMENTATION_SUMMARY.md`
- **API Documentation**: http://localhost:3001/docs

---

## Quick Reference Files

- **RBAC Config**: `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/config/rbac.js`
- **Auth Middleware**: `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/middleware/auth.js`
- **RBAC Middleware**: `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/middleware/rbac.js`

---

**Remember**: Security is everyone's responsibility. Always follow the principle of least privilege when granting permissions.

# Nerion RBAC System Documentation

## Overview

The Nerion API implements a comprehensive Role-Based Access Control (RBAC) system with 6 executive roles and 40+ granular permissions across multiple domains.

## Executive Roles

### 1. CIO (Chief Information Officer)
**Focus**: IT operations, assets, tools, infrastructure

**Key Permissions**:
- Full access to operations & IT domain
- Manage assets, business processes, data objects
- Configure security tool integrations
- View security controls and findings (read-only)
- View risk register (read-only)

### 2. CISO (Chief Information Security Officer)
**Focus**: Security operations, threats, vulnerabilities, vendor risk

**Key Permissions**:
- Full access to security domain
- Manage findings, risks, threats, controls
- Run risk correlation engine
- Manage vendor monitoring
- Upload compliance evidence
- View financial exposure (read-only)

### 3. CFO (Chief Financial Officer)
**Focus**: Financial exposure, budget, risk quantification

**Key Permissions**:
- Full access to financial domain
- Manage financial exposure and budget
- View financial analytics
- View security findings and risks (read-only)
- View legal obligations (read-only)

### 4. CLO (Chief Legal Officer)
**Focus**: Legal obligations, compliance, evidence, frameworks

**Key Permissions**:
- Full access to legal & compliance domain
- Manage legal obligations and frameworks
- Upload and manage compliance evidence
- View audit findings and evidence
- View risk register (read-only)

### 5. CRO (Chief Risk Officer)
**Focus**: Enterprise risk, correlation, reporting

**Key Permissions**:
- Full access to risk management domain
- Run risk correlation engine
- Manage risk register
- Generate risk reports
- View security, legal, and financial data (read-only)

### 6. AUDIT_DIRECTOR (Audit Director)
**Focus**: Audit findings, evidence review, audit testing

**Key Permissions**:
- Full access to audit domain
- Create and manage audit findings
- Execute audit tests
- Generate audit reports
- Review compliance evidence
- Upload evidence

## Permission Domains

### Security Domain
- `security.findings.{view,create,update,delete}`
- `security.risks.{view,create,update,delete}`
- `security.threats.{view,create,update}`
- `security.controls.{view,create,update,delete}`
- `security.vendor_monitoring.{view,manage}`

### Legal & Compliance Domain
- `legal.obligations.{view,create,update,delete}`
- `legal.frameworks.{view,manage}`
- `legal.evidence.{view,upload,delete}`

### Financial Domain
- `financial.exposure.{view,create,update}`
- `financial.budget.{view,manage}`
- `financial.analytics.view`

### Operations & IT Domain
- `operations.assets.{view,create,update,delete}`
- `operations.business_processes.{view,create,update}`
- `operations.data_objects.{view,create,update}`
- `operations.tools.{view,manage}`
- `operations.itsm.view`

### Risk Management Domain
- `risk.correlation.{view,run}`
- `risk.register.{view,create,update,delete}`
- `risk.reporting.{view,create}`

### Audit & Compliance Domain
- `audit.findings.{view,create,update}`
- `audit.evidence.review`
- `audit.tests.{view,create,execute}`
- `audit.reports.{view,generate}`

### Administrative Permissions
- `admin.organizations.{view,manage}`
- `admin.users.{view,create,update,delete}`
- `admin.seeds.run`
- `admin.system.health`

## Usage Examples

### Basic Permission Check
```javascript
const { requirePermission } = require('../middleware/rbac');

// User must have security.findings.view permission
router.get('/api/findings', authenticateJWT, requirePermission('security.findings.view'), async (req, res) => {
  // Handler code
});
```

### Multiple Permission Options (OR logic)
```javascript
const { requireAnyPermission } = require('../middleware/rbac');

// User must have at least one of these permissions
router.post('/api/risks', authenticateJWT, requireAnyPermission([
  'security.risks.create',
  'risk.register.create'
]), async (req, res) => {
  // Handler code
});
```

### Required All Permissions (AND logic)
```javascript
const { requireAllPermissions } = require('../middleware/rbac');

// User must have all of these permissions
router.delete('/api/findings/:id', authenticateJWT, requireAllPermissions([
  'security.findings.view',
  'security.findings.delete'
]), async (req, res) => {
  // Handler code
});
```

### Role-Based Check
```javascript
const { requireRole } = require('../middleware/rbac');

// Only CISO can access
router.post('/api/correlation/run', authenticateJWT, requireRole('CISO'), async (req, res) => {
  // Handler code
});
```

### Admin Check
```javascript
const { requireAdmin } = require('../middleware/rbac');

// Only users with admin permissions can access
router.post('/api/seeds/demo', authenticateJWT, requireAdmin(), async (req, res) => {
  // Handler code
});
```

## Permission Matrix

| Permission | CIO | CISO | CFO | CLO | CRO | AUDIT |
|------------|-----|------|-----|-----|-----|-------|
| **Security** |
| findings.view | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| findings.create | - | ✓ | - | - | - | ✓ |
| findings.update | - | ✓ | - | - | - | ✓ |
| findings.delete | - | ✓ | - | - | - | - |
| risks.view | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| risks.create | - | ✓ | - | - | ✓ | - |
| risks.update | - | ✓ | - | - | ✓ | - |
| risks.delete | - | ✓ | - | - | - | - |
| threats.view | - | ✓ | - | - | ✓ | - |
| threats.create | - | ✓ | - | - | - | - |
| threats.update | - | ✓ | - | - | - | - |
| controls.view | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| controls.create | - | ✓ | - | - | - | - |
| controls.update | ✓ | ✓ | - | - | - | - |
| controls.delete | - | ✓ | - | - | - | - |
| vendor_monitoring.view | - | ✓ | - | - | - | - |
| vendor_monitoring.manage | - | ✓ | - | - | - | - |
| **Legal** |
| obligations.view | - | ✓ | ✓ | ✓ | ✓ | ✓ |
| obligations.create | - | - | - | ✓ | - | - |
| obligations.update | - | - | - | ✓ | - | - |
| obligations.delete | - | - | - | ✓ | - | - |
| frameworks.view | - | - | ✓ | ✓ | ✓ | ✓ |
| frameworks.manage | - | - | - | ✓ | - | - |
| evidence.view | - | ✓ | - | ✓ | - | ✓ |
| evidence.upload | - | ✓ | - | ✓ | - | ✓ |
| evidence.delete | - | - | - | ✓ | - | - |
| **Financial** |
| exposure.view | - | ✓ | ✓ | - | ✓ | - |
| exposure.create | - | - | ✓ | - | - | - |
| exposure.update | - | - | ✓ | - | - | - |
| budget.view | - | - | ✓ | - | - | - |
| budget.manage | - | - | ✓ | - | - | - |
| analytics.view | - | - | ✓ | - | - | - |
| **Operations** |
| assets.view | ✓ | ✓ | - | - | ✓ | ✓ |
| assets.create | ✓ | - | - | - | - | - |
| assets.update | ✓ | - | - | - | - | - |
| assets.delete | ✓ | - | - | - | - | - |
| business_processes.view | ✓ | ✓ | - | ✓ | ✓ | ✓ |
| business_processes.create | ✓ | - | - | - | - | - |
| business_processes.update | ✓ | - | - | - | - | - |
| data_objects.view | ✓ | ✓ | - | - | ✓ | - |
| data_objects.create | ✓ | - | - | - | - | - |
| data_objects.update | ✓ | - | - | - | - | - |
| tools.view | ✓ | ✓ | - | - | - | - |
| tools.manage | ✓ | - | - | - | - | - |
| itsm.view | ✓ | - | - | - | - | - |
| **Risk** |
| correlation.view | - | ✓ | - | - | ✓ | - |
| correlation.run | - | ✓ | - | - | ✓ | - |
| register.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| register.create | - | - | - | - | ✓ | - |
| register.update | - | - | - | - | ✓ | - |
| register.delete | - | - | - | - | ✓ | - |
| reporting.view | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| reporting.create | - | ✓ | - | - | ✓ | - |
| **Audit** |
| findings.view | - | - | - | ✓ | - | ✓ |
| findings.create | - | - | - | ✓ | - | ✓ |
| findings.update | - | - | - | ✓ | - | ✓ |
| evidence.review | - | - | - | ✓ | - | ✓ |
| tests.view | - | - | - | ✓ | - | ✓ |
| tests.create | - | - | - | - | - | ✓ |
| tests.execute | - | - | - | - | - | ✓ |
| reports.view | - | - | - | ✓ | - | ✓ |
| reports.generate | - | - | - | - | - | ✓ |
| **Admin** |
| organizations.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| organizations.manage | - | - | - | - | - | - |
| users.view | ✓ | - | - | - | - | - |
| users.create | - | - | - | - | - | - |
| users.update | - | - | - | - | - | - |
| users.delete | - | - | - | - | - | - |
| seeds.run | - | - | - | - | - | - |
| system.health | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Legend**: ✓ = Has permission, - = No permission

## API Response Codes

### 401 Unauthorized
- User not authenticated
- User role not found in JWT token

### 403 Forbidden
- User lacks required permission
- User lacks required role
- Insufficient permissions for requested action

## Security Best Practices

1. **Always chain after authentication**: RBAC middleware must be used after `authenticateJWT`
2. **Use granular permissions**: Prefer specific permissions over broad admin access
3. **Log permission checks**: All permission denials are logged with user context
4. **Principle of least privilege**: Users should have minimum required permissions
5. **Regular permission audits**: Review role-permission mappings quarterly

## Testing Permissions

Use the `/api/auth/me` endpoint to verify current user role:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/auth/me
```

## Adding New Permissions

1. Add permission to `PERMISSIONS` object in `src/config/rbac.js`
2. Add permission to appropriate roles in `ROLE_PERMISSIONS` object
3. Apply `requirePermission('new.permission')` to relevant routes
4. Update this documentation
5. Test with all roles

## Error Responses

### Missing Role
```json
{
  "error": "Unauthorized",
  "message": "User role not found in authentication token"
}
```

### Insufficient Permissions
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions. Required permission: security.findings.create",
  "role": "CFO"
}
```

### Wrong Role
```json
{
  "error": "Forbidden",
  "message": "This action requires role: CISO",
  "role": "CIO"
}
```

## Migration Notes

### For Existing Routes
1. Identify the appropriate permission for the endpoint
2. Add `requirePermission('permission')` middleware after `authenticateJWT`
3. Test with users of different roles to verify access control

### For New Routes
1. Determine which executive function the route serves
2. Identify the appropriate permission from the matrix
3. Apply RBAC middleware during route creation
4. Document the permission requirement in API docs

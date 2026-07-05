# Nerion Security Documentation Index

## Quick Navigation

### Implementation Files
- **RBAC Configuration**: `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/config/rbac.js`
- **RBAC Middleware**: `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/middleware/rbac.js`
- **Auth Middleware**: `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/middleware/auth.js`

### Documentation
- **Quick Start Guide**: [QUICK_START_SECURITY.md](QUICK_START_SECURITY.md)
- **RBAC System**: [RBAC_SYSTEM.md](RBAC_SYSTEM.md)
- **Security Hardening**: [SECURITY_HARDENING.md](SECURITY_HARDENING.md)
- **Implementation Summary**: `/Users/briandibassinga/Github/Cyber-Rx/SECURITY_IMPLEMENTATION_SUMMARY.md`

### Route Files (Security Applied)
- `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/routes/findings.js`
- `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/routes/risks.js`
- `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/routes/legal-obligations.js`
- `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/routes/seeds.js`
- `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/routes/controls.js`
- `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/routes/tasks.js`
- `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/routes/evidence.js`
- `/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/src/routes/vendor-monitoring.js`

## Overview

The Nerion API implements enterprise-grade security with:
- JWT authentication on all 19 endpoints
- RBAC with 6 executive roles and 40+ permissions
- CORS hardening with production allowlist
- Organization-level data isolation

## Quick Links

### For Developers
- [How to add authentication to new routes](QUICK_START_SECURITY.md)
- [Available permissions and roles](RBAC_SYSTEM.md#permission-domains)
- [Common security patterns](QUICK_START_SECURITY.md#common-patterns)

### For Security Auditors
- [Security implementation details](SECURITY_HARDENING.md)
- [Compliance alignment](SECURITY_HARDENING.md#compliance-alignment)
- [Testing checklist](SECURITY_HARDENING.md#testing-checklist)

### For System Administrators
- [Environment configuration](SECURITY_HARDENING.md#environment-variables)
- [Production deployment](SECURITY_HARDENING.md#production-deployment-checklist)
- [Security monitoring](SECURITY_HARDENING.md#security-monitoring)

## Security Architecture

```
Request → JWT Authentication → Organization Isolation → RBAC Authorization → Handler
           (authenticateJWT)    (requireOrgAccess)       (requirePermission)
```

## Key Features

1. **JWT Authentication**: 8-hour token expiry, includes userId, orgId, role
2. **RBAC**: 6 roles, 40+ permissions, granular access control
3. **CORS**: Environment-based allowlist, no wildcards
4. **Organization Isolation**: Users can only access their org's data
5. **Audit Logging**: All auth/permission attempts logged

## Testing

See [Security Hardening - Testing](SECURITY_HARDENING.md#testing-checklist) for complete test procedures.

## Support

For security questions or concerns, refer to:
- [RBAC System Documentation](RBAC_SYSTEM.md)
- [Security Hardening Guide](SECURITY_HARDENING.md)
- [Quick Start Guide](QUICK_START_SECURITY.md)

---

**Last Updated**: May 30, 2026
**Status**: Production-ready for authentication and authorization

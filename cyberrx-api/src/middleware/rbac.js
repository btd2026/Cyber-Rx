'use strict';

const { roleHasPermission } = require('../config/rbac');

/**
 * RBAC Authorization Middleware
 *
 * Checks if authenticated user has required permission
 * Must be used after authenticateJWT middleware
 *
 * Usage: router.get('/api/endpoint', requirePermission('security.findings.view'), handler)
 *
 * @param {string} permission - Required permission (e.g., 'security.findings.view')
 * @returns {Function} Express middleware function
 */
function requirePermission(permission) {
  return (req, res, next) => {
    // Get user role from JWT token (attached by authenticateJWT)
    const userRole = req.user?.role;

    // Check if user is authenticated
    if (!userRole) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'permission_denied_no_role',
        userId: req.userId,
        path: req.path,
        required: permission
      }));
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User role not found in authentication token'
      });
    }

    // Check if user has required permission
    if (!roleHasPermission(userRole, permission)) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'permission_denied',
        userId: req.userId,
        userRole,
        path: req.path,
        required: permission
      }));
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required permission: ${permission}`,
        role: userRole
      });
    }

    // User has permission - proceed
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'permission_granted',
      userId: req.userId,
      userRole,
      path: req.path,
      permission
    }));

    next();
  };
}

/**
 * Require Any Permission (OR logic)
 * User must have at least one of the specified permissions
 *
 * Usage: requireAnyPermission(['security.findings.view', 'security.risks.view'])
 *
 * @param {Array<string>} permissions - Array of permissions (any one required)
 * @returns {Function} Express middleware function
 */
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User role not found in authentication token'
      });
    }

    // Check if user has any of the required permissions
    const hasPermission = permissions.some(permission => roleHasPermission(userRole, permission));

    if (!hasPermission) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'permission_denied',
        userId: req.userId,
        userRole,
        path: req.path,
        requiredAny: permissions
      }));
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required one of: ${permissions.join(', ')}`,
        role: userRole
      });
    }

    next();
  };
}

/**
 * Require All Permissions (AND logic)
 * User must have all of the specified permissions
 *
 * Usage: requireAllPermissions(['security.findings.view', 'security.findings.update'])
 *
 * @param {Array<string>} permissions - Array of permissions (all required)
 * @returns {Function} Express middleware function
 */
function requireAllPermissions(permissions) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User role not found in authentication token'
      });
    }

    // Check if user has all required permissions
    const hasAllPermissions = permissions.every(permission => roleHasPermission(userRole, permission));

    if (!hasAllPermissions) {
      const missingPermissions = permissions.filter(
        permission => !roleHasPermission(userRole, permission)
      );

      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'permission_denied',
        userId: req.userId,
        userRole,
        path: req.path,
        missing: missingPermissions
      }));
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Missing: ${missingPermissions.join(', ')}`,
        role: userRole
      });
    }

    next();
  };
}

/**
 * Require Specific Role
 * User must have exactly the specified role
 *
 * Usage: requireRole('CISO')
 *
 * @param {string} role - Required role name
 * @returns {Function} Express middleware function
 */
function requireRole(role) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User role not found in authentication token'
      });
    }

    if (userRole !== role) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'role_denied',
        userId: req.userId,
        userRole,
        path: req.path,
        requiredRole: role
      }));
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires role: ${role}`,
        role: userRole
      });
    }

    next();
  };
}

/**
 * Require Admin Access
 * Checks if user has any admin permissions
 * (admin.* permissions are only granted to specific roles)
 *
 * Usage: requireAdmin()
 *
 * @returns {Function} Express middleware function
 */
function requireAdmin() {
  return requireAnyPermission([
    'admin.organizations.manage',
    'admin.users.create',
    'admin.users.delete',
    'admin.seeds.run'
  ]);
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAdmin
};

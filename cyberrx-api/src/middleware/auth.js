'use strict';
const jwt = require('jsonwebtoken');
const { isDemoOrg } = require('../config/demoOrgs');

// Tenant isolation enforcement. Default OFF (observe + log only) so the live demo
// and onboarding are never broken by surprise; flip STRICT_TENANT_ISOLATION=true to
// enforce once verified in a controlled environment.
const STRICT_TENANT_ISOLATION = process.env.STRICT_TENANT_ISOLATION === 'true';

/**
 * JWT Verification Middleware
 *
 * Validates JWT tokens from Authorization header and extracts user identity.
 * Attaches req.user with decoded token payload on success.
 *
 * Usage: Apply to protected routes
 * Expected header: Authorization: Bearer <token>
 */
function authenticateJWT(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected format: Authorization: Bearer <token>'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided'
    });
  }

  try {
    // Verify token using JWT secret from environment
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('JWT_SECRET environment variable not set');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Authentication not properly configured'
      });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, secret);

    // Attach decoded user info to request
    req.user = decoded;
    req.userId = decoded.userId || decoded.id;
    req.orgId = decoded.orgId;

    // Log successful authentication
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'auth_success',
      userId: req.userId,
      orgId: req.orgId,
      path: req.path
    }));

    next();
  } catch (err) {
    // Handle specific JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired'
      });
    } else if (err.name === 'NotBeforeError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token not yet valid'
      });
    }

    // Generic JWT error
    console.error('JWT verification error:', err.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token verification failed'
    });
  }
}

/**
 * Optional: JWT verification middleware that doesn't block if no token
 * Attaches req.user if valid token present, otherwise continues without it
 * Useful for endpoints that have enhanced functionality when authenticated
 */
function optionalJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    req.userId = decoded.userId || decoded.id;
    req.orgId = decoded.orgId;
  } catch (err) {
    // Silently fail - this is optional auth
    console.warn('Optional JWT verification failed:', err.message);
  }

  next();
}

/**
 * Organization Authorization Middleware
 *
 * Ensures the authenticated user can only access their own organization's data.
 * Compares req.orgId (from JWT) against the requested orgId parameter.
 * Returns 403 Forbidden if attempting to access another org's data.
 *
 * Usage: Apply after authenticateJWT on routes with :id parameters
 * Expected: req.orgId from JWT middleware, req.params.id from route
 */
function requireOrgAccess(req, res, next) {
  const userOrgId = req.orgId;
  const requestedOrgId = req.params.id || req.body.orgId;

  if (!userOrgId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Organization identity not found in authentication token'
    });
  }

  if (requestedOrgId && requestedOrgId !== userOrgId) {
    console.warn(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'org_access_blocked',
      userId: req.userId,
      userOrgId,
      requestedOrgId,
      path: req.path
    }));
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this organization\'s data'
    });
  }

  next();
}

/**
 * demoOrg — resolve the organization for read endpoints when no JWT is present
 * (the app's demo/localStorage posture). Sets req.orgId from the JWT if present,
 * otherwise from the X-Org-Id header or org_id query param. Apply AFTER optionalJWT.
 */
function demoOrg(req, res, next) {
  const headerOrg = req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

  // Authenticated: the token's org is authoritative. An authenticated caller must
  // never reach another org by passing a different header/param (IDOR / tenant spoof).
  if (req.orgId) {
    if (headerOrg && String(headerOrg) !== String(req.orgId) && !isAdmin(req)) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(), event: 'org_scope_violation',
        userId: req.userId, tokenOrg: req.orgId, requestedOrg: headerOrg, path: req.path, enforced: STRICT_TENANT_ISOLATION,
      }));
      if (STRICT_TENANT_ISOLATION) {
        return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to access this organization\'s data.' });
      }
    }
    return next();
  }

  // Unauthenticated: only the public demo orgs are explorable. Anything else needs a
  // signed-in, org-scoped token — we never trust an arbitrary X-Org-Id from anonymous.
  if (headerOrg && !isDemoOrg(headerOrg)) {
    console.warn(JSON.stringify({
      ts: new Date().toISOString(), event: 'unauth_nondemo_org_access',
      requestedOrg: headerOrg, path: req.path, enforced: STRICT_TENANT_ISOLATION,
    }));
    if (STRICT_TENANT_ISOLATION) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Sign in to access this organization.' });
    }
  }
  req.orgId = headerOrg;
  next();
}

/**
 * isAdmin — true when the request carries a JWT with role 'admin' or an
 * X-Admin-Key header matching the ADMIN_API_KEY env var.
 */
function isAdmin(req) {
  if (req.user && req.user.role === 'admin') return true;
  const key = process.env.ADMIN_API_KEY;
  return !!(key && req.headers['x-admin-key'] === key);
}

/** requireAdmin — 403 unless isAdmin. Apply after optionalJWT. */
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required.' });
  }
  next();
}

module.exports = { authenticateJWT, optionalJWT, requireOrgAccess, demoOrg, isAdmin, requireAdmin };

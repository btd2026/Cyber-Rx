'use strict';
const jwt = require('jsonwebtoken');

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

module.exports = { authenticateJWT, optionalJWT };

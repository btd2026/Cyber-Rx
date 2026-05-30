'use strict';

/**
 * Organization Isolation Middleware
 * Task: T-302
 *
 * Ensures X-Org-Id header matches the JWT orgId claim
 * Returns 403 if mismatch detected
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to bind X-Org-Id to JWT identity
 * Ensures request orgId matches the authenticated user's organization
 */
function orgIsolation(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);

    // Verify and decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberrx-dev-secret');

    // Get X-Org-Id from header
    const xOrgId = req.headers['x-org-id'];
    if (!xOrgId) {
      return res.status(400).json({ error: 'X-Org-Id header required' });
    }

    // Verify X-Org-Id matches JWT orgId
    if (decoded.orgId !== xOrgId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Organization ID mismatch'
      });
    }

    // Attach orgId to request for use in route handlers
    req.orgId = decoded.orgId;
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Org isolation middleware error:', err);
    res.status(500).json({ error: 'Authorization failed' });
  }
}

module.exports = { orgIsolation };

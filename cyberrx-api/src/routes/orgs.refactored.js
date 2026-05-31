'use strict';
const express = require('express');
const router = express.Router();
const { authenticateJWT, requireOrgAccess } = require('../middleware/auth');
const { PlatformService } = require('../domains');

/**
 * Organizations API Routes (Refactored with Service Layer)
 *
 * All business logic extracted to PlatformService
 * Routes only handle HTTP concerns (validation, response)
 */

/**
 * POST /api/orgs - Create/save org profile (bound to authenticated org)
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    // Use orgId from JWT - user can only create org for their authenticated identity
    const orgId = req.orgId;

    if (!orgId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization identity not found in authentication token'
      });
    }

    // Add orgId to request body for service
    const orgData = {
      ...req.body,
      id: orgId
    };

    const platformService = new PlatformService(req.models, req.logger, req.db);
    const result = await platformService.createOrg(orgData);

    res.status(201).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Failed to create organization profile'
    });
  }
});

/**
 * PUT /api/orgs/:id - Update existing org (org-isolated)
 */
router.put('/:id', authenticateJWT, requireOrgAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const platformService = new PlatformService(req.models, req.logger, req.db);
    const result = await platformService.updateOrg(id, req.body);

    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Failed to update organization profile'
    });
  }
});

/**
 * GET /api/orgs/:id - Retrieve org data (org-isolated)
 */
router.get('/:id', authenticateJWT, requireOrgAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const platformService = new PlatformService(req.models, req.logger, req.db);
    const result = await platformService.getOrgById(id);

    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Failed to retrieve organization profile'
    });
  }
});

/**
 * GET /api/orgs/:id/exists - Check if org exists (org-isolated)
 */
router.get('/:id/exists', authenticateJWT, requireOrgAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const platformService = new PlatformService(req.models, req.logger, req.db);
    const result = await platformService.checkOrgExists(id);

    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Failed to check organization existence'
    });
  }
});

module.exports = router;

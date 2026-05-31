'use strict';
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { LegalService } = require('../domains');

/**
 * Legal Obligations API Routes (Refactored with Service Layer)
 *
 * All business logic extracted to LegalService
 * Routes only handle HTTP concerns (validation, response)
 */

/**
 * POST /api/legal-obligations - Create a new legal obligation
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const legalService = new LegalService(req.models, req.logger);
    const obligation = await legalService.createObligation(req.orgId, req.body);
    res.status(201).json(obligation);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Failed to create legal obligation',
      ...(err.originalError && { message: err.originalError })
    });
  }
});

/**
 * GET /api/legal-obligations - List all legal obligations for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const legalService = new LegalService(req.models, req.logger);
    const obligations = await legalService.getObligations(req.orgId, req.query);
    res.json({
      organizationId: req.orgId,
      count: obligations.length,
      data: obligations
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to list legal obligations' });
  }
});

/**
 * GET /api/legal-obligations/urgent - Get obligations with urgent notification requirements
 */
router.get('/urgent', authenticateJWT, async (req, res) => {
  try {
    const legalService = new LegalService(req.models, req.logger);
    const urgent = await legalService.getUrgentObligations(req.orgId);
    res.json({
      organizationId: req.orgId,
      count: urgent.length,
      data: urgent
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to retrieve urgent obligations' });
  }
});

/**
 * GET /api/legal-obligations/hipaa - Get HIPAA obligations
 */
router.get('/hipaa', authenticateJWT, async (req, res) => {
  try {
    const legalService = new LegalService(req.models, req.logger);
    const hipaa = await legalService.getHIPAAObligations(req.orgId);
    res.json({
      organizationId: req.orgId,
      count: hipaa.length,
      data: hipaa
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to retrieve HIPAA obligations' });
  }
});

/**
 * GET /api/legal-obligations/:id - Get a specific legal obligation
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { LegalObligation } = req.models;

    const obligation = await LegalObligation.findById(id);

    if (!obligation) {
      return res.status(404).json({ error: 'Legal obligation not found', id });
    }

    // Verify org access
    if (obligation.organizationId !== req.orgId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this legal obligation'
      });
    }

    res.json(obligation);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to retrieve legal obligation' });
  }
});

/**
 * PUT /api/legal-obligations/:id - Update a legal obligation
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const legalService = new LegalService(req.models, req.logger);
    const updated = await legalService.updateObligation(id, req.orgId, req.body);
    res.json(updated);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to update legal obligation' });
  }
});

/**
 * DELETE /api/legal-obligations/:id - Delete a legal obligation
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const legalService = new LegalService(req.models, req.logger);
    const result = await legalService.deleteObligation(id, req.orgId);
    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to delete legal obligation' });
  }
});

module.exports = router;

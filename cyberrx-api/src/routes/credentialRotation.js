'use strict';

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const CredentialRotationService = require('../services/CredentialRotationService');
const logger = require('../utils/logger');

/**
 * GET /api/credentials/rotation-status
 *
 * Get rotation status for all credentials in an organization
 *
 * Query Params:
 * - orgId: Organization ID (from JWT)
 *
 * Response:
 * {
 *   "credentials": [
 *     {
 *       "id": 123,
 *       "connectorType": "securityscorecard",
 *       "connectorName": "SecurityScorecard",
 *       "currentVersion": "v2",
 *       "credentialAge": 95,
 *       "rotationPeriod": 90,
 *       "daysUntilRotation": -5,
 *       "status": "overdue",
 *       "lastRotated": "2025-01-01T00:00:00Z",
 *       "rotationHistory": [...]
 *     }
 *   ]
 * }
 */
router.get('/rotation-status', authenticateJWT, async (req, res) => {
  try {
    const orgId = req.orgId || 'demo';

    const rotationService = new CredentialRotationService();
    const status = await rotationService.getRotationStatus(orgId);

    res.json({
      organizationId: orgId,
      credentials: status,
      total: status.length,
      overdue: status.filter(c => c.status === 'overdue' || c.status === 'critical_overdue').length,
      dueSoon: status.filter(c => c.status === 'due_soon').length
    });
  } catch (error) {
    logger.error('Failed to get rotation status', {
      error: error.message,
      userId: req.userId
    });
    res.status(500).json({
      error: 'Failed to get rotation status',
      message: error.message
    });
  }
});

/**
 * GET /api/credentials/:connectionId/rotation-history
 *
 * Get rotation history for a specific credential
 *
 * Response:
 * {
 *   "connectionId": 123,
 *   "connectorType": "securityscorecard",
 *   "connectorName": "SecurityScorecard",
 *   "createdAt": "2025-01-01T00:00:00Z",
 *   "rotations": [
 *     {
 *       "version": "v1",
 *       "rotatedAt": "2025-04-01T00:00:00Z",
 *       "rotatedBy": "user@example.com",
 *       "previousCreatedAt": "2025-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 */
router.get('/:connectionId/rotation-history', authenticateJWT, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const orgId = req.orgId || 'demo';

    const rotationService = new CredentialRotationService();
    const history = await rotationService.getRotationHistory(connectionId);

    res.json(history);
  } catch (error) {
    logger.error('Failed to get rotation history', {
      error: error.message,
      connectionId: req.params.connectionId,
      userId: req.userId
    });

    if (error.message === 'Connection not found') {
      return res.status(404).json({
        error: 'Connection not found',
        message: `Tool connection ${req.params.connectionId} not found`
      });
    }

    res.status(500).json({
      error: 'Failed to get rotation history',
      message: error.message
    });
  }
});

/**
 * POST /api/credentials/:connectionId/rotate
 *
 * Rotate a credential to a new version
 *
 * Request Body:
 * {
 *   "credentials": {
 *     "apiKey": "new-api-key",
 *     "domain": "example.com"
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "version": "v2",
 *   "rotatedAt": "2025-04-01T00:00:00Z",
 *   "message": "Credentials rotated to v2. Previous version saved to history."
 * }
 */
router.post('/:connectionId/rotate', authenticateJWT, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { credentials } = req.body;
    const userId = req.userId || 'unknown';
    const orgId = req.orgId || 'demo';

    // Validate input
    if (!credentials || typeof credentials !== 'object') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Credentials object is required in request body'
      });
    }

    if (!credentials.apiKey) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'API key is required in credentials object'
      });
    }

    const rotationService = new CredentialRotationService();
    const result = await rotationService.rotateCredential(connectionId, credentials, userId);

    logger.info('Credential rotated', {
      connectionId,
      orgId,
      userId,
      newVersion: result.version
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to rotate credential', {
      error: error.message,
      connectionId: req.params.connectionId,
      userId: req.userId
    });

    if (error.message === 'Connection not found') {
      return res.status(404).json({
        error: 'Connection not found',
        message: `Tool connection ${req.params.connectionId} not found`
      });
    }

    if (error.message === 'Current credentials not found in vault') {
      return res.status(404).json({
        error: 'Credentials not found',
        message: 'Current credentials not found in vault'
      });
    }

    res.status(500).json({
      error: 'Failed to rotate credential',
      message: error.message
    });
  }
});

module.exports = router;

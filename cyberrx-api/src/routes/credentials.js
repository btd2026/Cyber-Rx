'use strict';
const express = require('express');
const router = express.Router();
const vault = require('../utils/vault');
const db = require('../utils/db');
const { authenticateJWT } = require('../middleware/auth');
const {
  validateCredentials,
  validationLimiter,
  maskApiKey,
  logValidationAttempt,
  getClientIp
} = require('../services/CredentialValidationService');

// POST /api/credentials/:tool — store encrypted credentials for org
router.post('/:tool', authenticateJWT, async (req, res) => {
  try {
    const { tool } = req.params;
    // Use orgId from JWT instead of client-supplied header
    const orgId = req.orgId || 'demo';
    const creds = req.body;
    if (!creds || !Object.keys(creds).length) {
      return res.status(400).json({ error: 'No credentials provided' });
    }
    await vault.set(orgId, tool, creds);
    // Record connection in DB
    await db.query(
      `INSERT INTO tool_connections (org_id, tool_key, status, last_synced, vault_key_ref)
       VALUES ($1, $2, 'saved', NOW(), $3)
       ON CONFLICT (org_id, tool_key) DO UPDATE SET status='saved', last_synced=NOW(), vault_key_ref=$3`,
      [orgId, tool, `cyberrx/${orgId}/${tool}`]
    ).catch(() => {}); // non-fatal if DB not set up
    res.json({ status: 'saved', tool, orgId });
  } catch (err) {
    console.error('Credentials error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/credentials/:tool/status — check if credentials exist (never return creds)
router.get('/:tool/status', authenticateJWT, async (req, res) => {
  try {
    const { tool } = req.params;
    // Use orgId from JWT instead of client-supplied header
    const orgId = req.orgId || 'demo';
    const creds = await vault.get(orgId, tool);
    res.json({ tool, orgId, connected: !!creds, ts: new Date().toISOString() });
  } catch (err) {
    res.json({ tool, orgId, connected: false, error: err.message });
  }
});

// DELETE /api/credentials/:tool — remove credentials
router.delete('/:tool', authenticateJWT, async (req, res) => {
  try {
    const { tool } = req.params;
    // Use orgId from JWT instead of client-supplied header
    const orgId = req.orgId || 'demo';
    await vault.delete(orgId, tool);
    await db.query(
      `UPDATE tool_connections SET status='disconnected' WHERE org_id=$1 AND tool_key=$2`,
      [orgId, tool]
    ).catch(() => {});
    res.json({ status: 'deleted', tool });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/credentials/:connectorType/validate
 *
 * Validate connector credentials before saving to vault.
 * Makes test API call to vendor service to verify credentials work.
 *
 * Request Body:
 * {
 *   "credentials": {
 *     "apiKey": "string",
 *     "domain": "string (optional)"
 *   }
 * }
 *
 * Response:
 * {
 *   "valid": true,
 *   "message": "Connection verified successfully",
 *   "data": {
 *     "testResult": {
 *       "score": 82,
 *       "grade": "A",
 *       "companyName": "Acme Corp"
 *     }
 *   }
 * }
 *
 * Security Features:
 * - JWT authentication required
 * - Rate limited: 10 attempts per minute per organization
 * - Audit logging: All validation attempts logged to audit_logs table
 * - Key masking: API keys never logged (only masked versions)
 * - 10-second timeout: Prevents hanging requests
 * - Organization scoping: Users can only validate for their org
 */
router.post('/:connectorType/validate', authenticateJWT, validationLimiter, async (req, res) => {
  const startTime = Date.now();
  const { connectorType } = req.params;
  const { credentials } = req.body;

  // Get organization and user context from JWT
  const orgId = req.orgId || 'demo';
  const userId = req.userId || 'unknown';
  const ipAddress = getClientIp(req);

  // Validation result placeholder
  let validationResult = null;
  let validationError = null;

  try {
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

    // Mask API key for logging (NEVER log actual keys)
    const maskedKey = maskApiKey(credentials.apiKey);

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'credential_validation_started',
      userId,
      orgId,
      connectorType,
      maskedKey,
      ipAddress
    }));

    // Perform validation with 10-second timeout
    validationResult = await validateCredentials(connectorType, credentials, {
      timeout: 10000
    });

    const duration = Date.now() - startTime;

    // Log successful validation attempt
    await logValidationAttempt({
      userId,
      orgId,
      connectorType,
      result: validationResult.valid ? 'success' : 'failed',
      ipAddress,
      maskedKey
    });

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'credential_validation_complete',
      userId,
      orgId,
      connectorType,
      valid: validationResult.valid,
      duration: `${duration}ms`
    }));

    // Return validation result
    if (validationResult.valid) {
      return res.status(200).json(validationResult);
    } else {
      return res.status(400).json(validationResult);
    }

  } catch (error) {
    validationError = error;
    const duration = Date.now() - startTime;

    console.error('Credential validation error:', {
      ts: new Date().toISOString(),
      userId,
      orgId,
      connectorType,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    // Log failed validation attempt
    const maskedKey = credentials?.apiKey ? maskApiKey(credentials.apiKey) : 'missing';
    await logValidationAttempt({
      userId,
      orgId,
      connectorType,
      result: 'error',
      ipAddress,
      maskedKey,
      error
    });

    // Handle timeout errors specifically
    if (error.message && error.message.includes('timeout')) {
      return res.status(408).json({
        valid: false,
        message: 'Validation request timed out',
        errorCode: 'ERR_TIMEOUT',
        details: 'The validation request took longer than 10 seconds and was aborted. Please try again.'
      });
    }

    // Handle network errors
    if (error.message && error.message.includes('fetch')) {
      return res.status(503).json({
        valid: false,
        message: 'Unable to reach validation service',
        errorCode: 'ERR_NETWORK_ERROR',
        details: 'Could not connect to the vendor API. Please check your network connection.'
      });
    }

    // Generic error response
    return res.status(500).json({
      valid: false,
      message: 'Validation failed due to server error',
      errorCode: 'ERR_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An internal error occurred during validation'
    });
  }
});

module.exports = router;

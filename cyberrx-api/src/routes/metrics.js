'use strict';

/**
 * Metrics API
 * -----------
 * Exposes the editable mock-number store and the computed, formula-driven
 * dashboard figures.
 *
 *   GET  /api/metrics/inputs            - list editable inputs (_defaults + org)
 *   PUT  /api/metrics/inputs/:key       - edit one input value (body: { value })
 *   GET  /api/metrics/:role             - computed numbers for cfo|ciso|cro|board
 *
 * Demo posture: optional JWT; org resolved from JWT -> X-Org-Id -> org_id.
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const { optionalJWT } = require('../middleware/auth');
const MetricsEngine = require('../services/MetricsEngine');

const ROLES = ['cfo', 'ciso', 'cro', 'board'];

function resolveOrg(req, res) {
  const orgId = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;
  if (!orgId) {
    res.status(400).json({ error: 'Organization not specified', message: 'Provide a JWT, X-Org-Id header, or org_id query parameter.' });
    return null;
  }
  return orgId;
}

// List the editable inputs driving this org's dashboards.
router.get('/inputs', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const rows = await db.query(
      `SELECT org_id, key, value, category, label, unit FROM metric_inputs
        WHERE org_id IN ('_defaults', $1) ORDER BY category, key`, [orgId]);
    res.json({ orgId, inputs: rows, merged: await MetricsEngine.loadInputs(orgId) });
  } catch (err) {
    logger.error('List metric inputs error', { error: err.message });
    res.status(500).json({ error: 'Failed to load metric inputs', message: err.message });
  }
});

// Edit one input value (org-scoped; falls back to creating an org-specific
// override of a _defaults coefficient).
router.put('/inputs/:key', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  const { key } = req.params;
  const value = Number(req.body && req.body.value);
  const scope = req.body && req.body.scope === '_defaults' ? '_defaults' : orgId;
  if (!Number.isFinite(value)) {
    return res.status(400).json({ error: 'value must be a number' });
  }
  try {
    const rows = await db.query(
      `INSERT INTO metric_inputs (org_id, key, value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (org_id, key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
       RETURNING org_id, key, value, category, label, unit`, [scope, key, value]);
    res.json({ updated: rows[0] });
  } catch (err) {
    logger.error('Update metric input error', { error: err.message });
    res.status(500).json({ error: 'Failed to update metric input', message: err.message });
  }
});

// Computed, formula-driven numbers for a role.
router.get('/:role', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  const role = String(req.params.role).toLowerCase();
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role', validRoles: ROLES });
  }
  try {
    const data = await MetricsEngine.computeRole(role, orgId);
    res.json({ role, orgId, generatedAt: new Date().toISOString(), metrics: data });
  } catch (err) {
    logger.error('Compute role metrics error', { role, error: err.message });
    res.status(500).json({ error: 'Failed to compute metrics', message: err.message });
  }
});

module.exports = router;

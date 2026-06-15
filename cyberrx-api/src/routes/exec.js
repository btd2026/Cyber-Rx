'use strict';

/**
 * routes/exec — role-specific executive dashboards (CFO/CIO/CRO/CLO/Board).
 * The CISO keeps its dedicated /api/ciso/dashboard; every other seat gets its
 * own role-specific payload here so no two leaders share the same content.
 *
 *   GET /api/exec/dashboard?role=CFO   role hero + KPI strip + 5 key questions + role tabs
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');
const ExecDashboardService = require('../services/ExecDashboardService');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}

router.get('/dashboard', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const role = String(req.query.role || '').trim();
  if (!role) return res.status(400).json({ error: 'role is required' });
  try {
    res.json(await ExecDashboardService.getDashboard(orgId, role));
  } catch (err) {
    logger.error('Exec dashboard error', { role, error: err.message });
    res.status(500).json({ error: 'Failed to build executive dashboard', message: err.message });
  }
});

module.exports = router;

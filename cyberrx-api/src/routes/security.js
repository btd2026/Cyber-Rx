'use strict';

/**
 * routes/security — admin-only read access to the security audit trail.
 *   GET /api/security/audit-logs   recent tenant-isolation / auth events
 *
 * Gated by requireAdmin: the security trail records cross-tenant attempts, so it
 * must never be readable by an ordinary (or anonymous) caller.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, requireAdmin } = require('../middleware/auth');
const SecurityAudit = require('../services/SecurityAuditService');

router.get('/audit-logs', optionalJWT, requireAdmin, async (req, res) => {
  try {
    const rows = await SecurityAudit.list({
      eventType: req.query.event_type,
      requestedOrgId: req.query.requested_org_id || req.query.org_id,
      limit: req.query.limit,
    });
    res.json({ events: rows, count: rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

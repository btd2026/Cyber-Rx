'use strict';
const express = require('express');
const router = express.Router();
const vault = require('../utils/vault');
const db = require('../utils/db');
const { authenticateJWT } = require('../middleware/auth');

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

module.exports = router;

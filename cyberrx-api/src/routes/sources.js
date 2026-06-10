'use strict';

/**
 * Simulated Live-Source API
 * -------------------------
 * Browse and sync the per-tool simulated source databases.
 *
 *   GET  /api/sources                 - per-tool summary + computed metrics (your org)
 *   GET  /api/sources/:tool           - raw source rows for a tool (your org)
 *   POST /api/sources/sync            - recompute metrics from sources -> metric_inputs
 *
 * Org isolation: an org can only see its own source rows (org resolved from
 * JWT -> X-Org-Id -> org_id). Admins can see everything:
 *   - JWT with role 'admin', OR
 *   - X-Admin-Key header matching the ADMIN_API_KEY env var
 * Admins may pass ?org_id=<other-org> to inspect a specific org, or ?all=1
 * to see every org's data (and sync all orgs).
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const { optionalJWT, demoOrg } = require('../middleware/auth');
const Sim = require('../services/SimulatedToolService');

function isAdmin(req) {
  if (req.user && req.user.role === 'admin') return true;
  const key = process.env.ADMIN_API_KEY;
  return !!(key && req.headers['x-admin-key'] === key);
}

// Resolve which org's data the caller may see. Non-admins are locked to their
// own org; admins may target any org or all orgs.
function resolveScope(req, res) {
  const admin = isAdmin(req);
  const requested = req.query.org_id || req.query.orgId;
  const own = req.orgId;

  if (req.query.all === '1' || req.query.all === 'true') {
    if (!admin) {
      res.status(403).json({ error: 'Forbidden', message: 'Only admins can view all organizations.' });
      return null;
    }
    return { admin, all: true, orgId: null };
  }
  if (requested && requested !== own) {
    if (!admin) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only view your own organization\'s source data.' });
      return null;
    }
    return { admin, all: false, orgId: requested };
  }
  if (!own) {
    res.status(400).json({ error: 'Organization not specified', message: 'Provide a JWT, X-Org-Id header, or org_id query parameter.' });
    return null;
  }
  return { admin, all: false, orgId: own };
}

// Per-tool summary + the metric each tool currently computes.
router.get('/', optionalJWT, demoOrg, async (req, res) => {
  const scope = resolveScope(req, res);
  if (!scope) return;
  try {
    const orgs = scope.all ? await Sim.orgsWithSourceData() : [scope.orgId];
    const out = {};
    for (const org of orgs) {
      const tools = [];
      for (const tool of Sim.TOOLS) {
        const tables = Sim.TOOL_TABLES[tool];
        const counts = {};
        for (const t of tables) {
          const r = await db.query(`SELECT COUNT(*) n FROM ${t} WHERE org_id = $1`, [org]);
          counts[t] = Number(r[0].n);
        }
        const metrics = await Sim.computeTool(tool, org);
        tools.push({ tool, tables: counts, metrics: metrics || [] });
      }
      out[org] = tools;
    }
    res.json({ admin: scope.admin, scope: scope.all ? 'all' : scope.orgId, sources: out });
  } catch (err) {
    logger.error('Sources summary error', { error: err.message });
    res.status(500).json({ error: 'Failed to load sources', message: err.message });
  }
});

// Recompute metrics from the source tables into metric_inputs.
router.post('/sync', optionalJWT, demoOrg, async (req, res) => {
  const scope = resolveScope(req, res);
  if (!scope) return;
  try {
    if (scope.all) {
      const results = await Sim.syncAll();
      return res.json({ synced: Object.keys(results), results });
    }
    const computed = await Sim.syncOrg(scope.orgId);
    res.json({ synced: [scope.orgId], results: { [scope.orgId]: computed } });
  } catch (err) {
    logger.error('Sources sync error', { error: err.message });
    res.status(500).json({ error: 'Failed to sync sources', message: err.message });
  }
});

// Raw rows for one tool's source tables.
router.get('/:tool', optionalJWT, demoOrg, async (req, res) => {
  const scope = resolveScope(req, res);
  if (!scope) return;
  const tool = String(req.params.tool).toLowerCase();
  const tables = Sim.TOOL_TABLES[tool];
  if (!tables) {
    return res.status(400).json({ error: 'Unknown tool', validTools: Sim.TOOLS });
  }
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const out = {};
    for (const t of tables) {
      out[t] = scope.all
        ? await db.query(`SELECT * FROM ${t} ORDER BY org_id LIMIT $1`, [limit])
        : await db.query(`SELECT * FROM ${t} WHERE org_id = $1 LIMIT $2`, [scope.orgId, limit]);
    }
    const metrics = scope.all ? null : await Sim.computeTool(tool, scope.orgId);
    res.json({ tool, scope: scope.all ? 'all' : scope.orgId, admin: scope.admin, metrics, rows: out });
  } catch (err) {
    logger.error('Sources rows error', { error: err.message });
    res.status(500).json({ error: 'Failed to load source rows', message: err.message });
  }
});

module.exports = router;

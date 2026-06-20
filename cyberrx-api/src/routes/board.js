'use strict';

/**
 * routes/board — the Board oversight lens over the shared spine.
 *   GET /api/board/oversight       enterprise oversight (current state)
 *   GET /api/board/decisions       top decisions for the board
 *   GET /api/board/accountability  oversight & accountability (Caremark/SEC)
 *   GET /api/board/investment      investment & ROI (capital oversight)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Board = require('../services/BoardService');
const { prov } = require('../utils/provenance');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;

const PROV_LABEL = { oversight: 'Enterprise oversight', decisions: 'Top decisions', accountability: 'Oversight & accountability', investment: 'Investment & ROI' };
async function viewProv(orgId, method) {
  try { const c = await require('../services/ExecDashboardService').loadCtx(orgId); return prov(c.isDemo ? 'demo' : 'derived', PROV_LABEL[method] || 'Board'); }
  catch (_) { return prov('modeled', PROV_LABEL[method] || 'Board'); }
}

function handler(method) {
  return async (req, res) => {
    const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
    try { const d = await Board[method](orgId); if (d && typeof d === 'object') d.provenance = await viewProv(orgId, method); res.json(d); }
    catch (e) { logger.warn(`board ${method} failed`, { error: e.message }); res.status(500).json({ error: `Unable to build board ${method}.` }); }
  };
}

router.get('/oversight', handler('oversight'));
router.get('/decisions', handler('decisions'));
router.get('/accountability', handler('accountability'));
router.get('/investment', handler('investment'));

module.exports = router;

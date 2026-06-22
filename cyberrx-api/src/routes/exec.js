'use strict';

/**
 * routes/exec — role-specific executive dashboards (CFO/CIO/CRO/CLO/Board).
 * The CISO keeps its dedicated /api/ciso/dashboard; every other seat gets its
 * own role-specific payload here so no two leaders share the same content.
 *
 *   GET  /api/exec/dashboard?role=CFO   role hero + KPI strip + 5 key questions + role tabs
 *   POST /api/exec/draft                polish a grounded executive draft into prose
 *   GET  /api/exec/signals              live platform signals behind brief evidence
 *   GET  /api/exec/incident             the single executive incident (current phase)
 *   POST /api/exec/incident/advance     demo: step the incident timeline forward
 *   POST /api/exec/incident/reset       demo: restart at "detected" (or ?clear=1 → default)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');
const ExecDashboardService = require('../services/ExecDashboardService');
const ExecDraftService = require('../services/ExecDraftService');
const ExecEvidenceService = require('../services/ExecEvidenceService');
const IncidentService = require('../services/IncidentService');

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

// Rewrite a client-composed, grounded draft into audience-ready prose. The draft
// is the sole source of truth; the service adds no facts. If the LLM isn't
// configured/available, return 503 so the client keeps its deterministic draft.
router.post('/draft', optionalJWT, async (req, res) => {
  const b = req.body || {};
  if (!b.draft) return res.status(400).json({ error: 'draft is required' });
  try {
    res.json(await ExecDraftService.polish({ draft: b.draft, audience: b.audience, subject: b.subject, privileged: !!b.privileged }));
  } catch (err) {
    const noLlm = err.code === 'NO_API_KEY';
    logger.debug('exec draft polish unavailable', { code: err.code, error: err.message });
    res.status(noLlm ? 503 : 500).json({ error: err.message, fallback: true });
  }
});

// Live platform signals behind the briefs' evidence layer (data coverage, ledger
// integrity, security-audit trail) — each with a real timestamp + source.
router.get('/signals', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    res.json(await ExecEvidenceService.signals(orgId));
  } catch (err) {
    logger.error('Exec signals error', { error: err.message });
    res.status(500).json({ error: 'Failed to load live signals', message: err.message });
  }
});

// The single executive incident — one source of truth every seat re-frames.
router.get('/incident', optionalJWT, (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  res.json(IncidentService.get(orgId));
});

// Demo controls: step the scripted timeline (detected → compensating → verified →
// materiality) so a live room can watch every seat update from one event.
router.post('/incident/advance', optionalJWT, (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  res.json(IncidentService.advance(orgId));
});
router.post('/incident/reset', optionalJWT, (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  res.json(req.query.clear ? IncidentService.clear(orgId) : IncidentService.reset(orgId));
});

module.exports = router;

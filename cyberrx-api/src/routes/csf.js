'use strict';

/**
 * NIST CSF 2.0 Assessment API
 * ---------------------------
 *   GET  /api/csf/assessment  - live 6-function / 22-category maturity scorecard
 *   GET  /api/csf/questions   - the CSF evidence interview (manual-control intake)
 *   POST /api/csf/evidence    - save intake answers: { items: [{key, answer, docName?}] }
 *
 * Org scoping follows the platform's demo posture: JWT org when present,
 * otherwise X-Org-Id header or org_id query param.
 */

const express = require('express');
const router = express.Router();
const NistCsfService = require('../services/NistCsfService');
const FrameworkScoreService = require('../services/FrameworkScoreService');
const CsfControlLibraryService = require('../services/CsfControlLibraryService');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

function resolveOrg(req, res) {
  const orgId = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId
    || (req.body && req.body.org_id);
  if (!orgId) {
    res.status(400).json({ error: 'Organization not specified', message: 'Provide a JWT, X-Org-Id header, or org_id query parameter.' });
    return null;
  }
  return orgId;
}

router.get('/assessment', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    res.json(await NistCsfService.getAssessment(orgId));
  } catch (err) {
    logger.error('CSF assessment error', { error: err.message });
    res.status(500).json({ error: 'Failed to compute CSF assessment', message: err.message });
  }
});

router.get('/questions', optionalJWT, async (req, res) => {
  res.json({ questions: NistCsfService.getQuestions() });
});

// Systemwide rankings — every organization's latest scorecard (the
// association/board view; not org-scoped). ?refresh=1 recomputes all.
router.get('/rankings', optionalJWT, async (req, res) => {
  try {
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const rankings = await NistCsfService.getRankings({ refresh });
    res.json({ rankings, count: rankings.length, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error('CSF rankings error', { error: err.message });
    res.status(500).json({ error: 'Failed to load CSF rankings', message: err.message });
  }
});

// Control library — every NIST CSF 2.0 subcategory, whether it is testable
// automatically (tool API) or manually (evidence at setup), the tools that can
// evidence each control, and the specific JSON API call per tool.
router.get('/control-library', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    res.json(await CsfControlLibraryService.getLibrary(orgId));
  } catch (err) {
    logger.error('CSF control library error', { error: err.message });
    res.status(500).json({ error: 'Failed to load control library', message: err.message });
  }
});

// Other-framework live scorecards (HIPAA, 800-53, CIS, NAIC, ISO, SOC 2,
// CMS, PCI, GDPR) — same live signals, mapped to each framework's controls.
router.get('/frameworks', optionalJWT, async (req, res) => {
  res.json({ frameworks: FrameworkScoreService.listFrameworks() });
});

router.get('/frameworks/:id', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  if (!FrameworkScoreService.FRAMEWORK_IDS.includes(req.params.id)) {
    return res.status(400).json({ error: 'Unknown framework', valid: FrameworkScoreService.FRAMEWORK_IDS });
  }
  try {
    res.json(await FrameworkScoreService.getFrameworkAssessment(orgId, req.params.id));
  } catch (err) {
    logger.error('Framework assessment error', { framework: req.params.id, error: err.message });
    res.status(500).json({ error: 'Failed to compute framework assessment', message: err.message });
  }
});

// Zadkiel — post-intake NIST CSF document review: score, findings, and
// recommendations for every evidence item and uploaded document.
router.get('/document-review', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    res.json(await NistCsfService.reviewDocuments(orgId));
  } catch (err) {
    logger.error('CSF document review error', { error: err.message });
    res.status(500).json({ error: 'Failed to review documents', message: err.message });
  }
});

router.post('/evidence', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const items = (req.body && req.body.items) || [];
    const saved = await NistCsfService.saveEvidence(orgId, items);
    res.json({ saved, count: saved.length });
  } catch (err) {
    logger.error('CSF evidence save error', { error: err.message });
    res.status(500).json({ error: 'Failed to save CSF evidence', message: err.message });
  }
});

module.exports = router;

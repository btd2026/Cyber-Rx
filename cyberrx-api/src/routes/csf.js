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

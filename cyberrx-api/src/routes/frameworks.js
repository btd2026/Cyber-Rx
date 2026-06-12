'use strict';

/**
 * Generalized framework engine API (STEP A/B/C/D surface)
 * -------------------------------------------------------
 *   GET  /api/frameworks/catalog                 - frameworks + requirement counts
 *   GET  /api/frameworks/:id/requirements        - requirements (+family filter)
 *   GET  /api/frameworks/:id/mappings            - requirement<->check mappings
 *   GET  /api/frameworks/crosswalks?from=&to=    - framework crosswalks
 *   POST /api/frameworks/validate                - run validation for the org
 *   GET  /api/frameworks/validation/latest       - latest run + results + scores
 *   GET  /api/frameworks/trend/:id?scope=        - score history
 *   GET  /api/frameworks/attack/coverage         - per-technique coverage (STEP C)
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const ValidationRunService = require('../services/ValidationRunService');
const ExecReportService = require('../services/ExecReportService');
const { optionalJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

function org(req, res) {
  const id = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);
  if (!id) { res.status(400).json({ error: 'Organization not specified' }); return null; }
  return id;
}
const fail = (res, tag) => (err) => { logger.error(tag, { error: err.message }); res.status(500).json({ error: tag, message: err.message }); };

router.get('/catalog', optionalJWT, async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT f.id, f.name, f.version, f.provenance, f.ingested_at,
             COUNT(r.requirement_id)::int AS requirements,
             COUNT(r.requirement_id) FILTER (WHERE COALESCE(r.withdrawn,false)=false)::int AS active_requirements
      FROM frameworks f LEFT JOIN framework_requirements r ON r.framework_id=f.id
      GROUP BY f.id ORDER BY f.id`);
    res.json({ frameworks: rows });
  } catch (err) { fail(res, 'catalog failed')(err); }
});

router.get('/crosswalks', optionalJWT, async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await db.query(`
      SELECT * FROM requirement_crosswalks
      WHERE ($1::text IS NULL OR from_framework=$1) AND ($2::text IS NULL OR to_framework=$2)
      ORDER BY from_id LIMIT 5000`, [from || null, to || null]);
    res.json({ crosswalks: rows, count: rows.length });
  } catch (err) { fail(res, 'crosswalks failed')(err); }
});

router.post('/validate', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await ValidationRunService.run(orgId, { trigger: (req.body && req.body.trigger) || 'manual' })); }
  catch (err) { fail(res, 'validation failed')(err); }
});

router.get('/validation/latest', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await ValidationRunService.latestRun(orgId) || { run: null, results: [], scores: [] }); }
  catch (err) { fail(res, 'latest run failed')(err); }
});

router.get('/attack/coverage', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try {
    const rows = await db.query(`
      SELECT c.technique_id, c.status, c.confidence, c.source_check, c.supporting, c.run_id, c.computed_at,
             t.name, t.tactics, t.is_subtechnique, t.parent_id
      FROM technique_coverage c JOIN attack_techniques t ON t.id=c.technique_id
      WHERE c.org_id=$1 AND COALESCE(t.deprecated,false)=false AND COALESCE(t.revoked,false)=false
      ORDER BY c.technique_id`, [orgId]);
    const tactics = await db.query(`SELECT * FROM attack_tactics ORDER BY ordinal NULLS LAST, name`);
    res.json({ coverage: rows, tactics, count: rows.length });
  } catch (err) { fail(res, 'attack coverage failed')(err); }
});

router.get('/trend/:id', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json({ trend: await ValidationRunService.scoreTrend(orgId, req.params.id, req.query.scope || 'overall') }); }
  catch (err) { fail(res, 'trend failed')(err); }
});

// Executive reporting (STEP D): CISO (operational) and CRO (business) packs,
// both computed from the latest validation run.
router.get('/exec/ciso', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await ExecReportService.cisoPack(orgId, { baseline: req.query.baseline })); }
  catch (err) { fail(res, 'ciso pack failed')(err); }
});
router.get('/exec/cro', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  try { res.json(await ExecReportService.croPack(orgId)); }
  catch (err) { fail(res, 'cro pack failed')(err); }
});
// One-click PDF exports (D3): every number traces to the run id in the appendix.
router.get('/exec/:audience/export.pdf', optionalJWT, async (req, res) => {
  const orgId = org(req, res); if (!orgId) return;
  const audience = req.params.audience === 'cro' ? 'cro' : 'ciso';
  try {
    const pack = audience === 'cro' ? await ExecReportService.croPack(orgId) : await ExecReportService.cisoPack(orgId, { baseline: req.query.baseline });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cyberrx-${audience}-pack.pdf"`);
    require('../services/ExecReportPdf').stream(res, audience, orgId, pack);
  } catch (err) { fail(res, 'export failed')(err); }
});

router.get('/:id/requirements', optionalJWT, async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT requirement_id, parent_id, family, title, text, baselines, withdrawn, assessment IS NOT NULL AS has_assessment, meta
      FROM framework_requirements WHERE framework_id=$1 AND ($2::text IS NULL OR family=$2)
      ORDER BY requirement_id LIMIT 5000`, [req.params.id, req.query.family || null]);
    res.json({ framework: req.params.id, requirements: rows, count: rows.length });
  } catch (err) { fail(res, 'requirements failed')(err); }
});

router.get('/:id/mappings', optionalJWT, async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT m.*, c.tool_id, c.name AS check_name, c.signal
      FROM requirement_mappings m LEFT JOIN checks c ON c.id=m.check_id
      WHERE m.framework_id=$1 ORDER BY m.requirement_id LIMIT 5000`, [req.params.id]);
    res.json({ framework: req.params.id, mappings: rows, count: rows.length });
  } catch (err) { fail(res, 'mappings failed')(err); }
});

module.exports = router;

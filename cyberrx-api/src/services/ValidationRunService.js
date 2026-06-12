'use strict';

/**
 * ValidationRunService — STEP A
 * -----------------------------
 * Executes the check catalog for an org, persists per-check results under a
 * validation_run (so every reported number is traceable to a run id), wires
 * the evidence agent's reviews into evidence_reviews, and rolls scores up
 * requirement -> family/function -> framework into score_history.
 *
 * Execution model (honest by construction):
 *   - A check with a `signal` is evaluated against the org's live metric
 *     inputs (MetricsEngine.loadInputs — fed by real connectors when
 *     credentials exist, by the sim_* fixtures otherwise). Threshold comes
 *     from check_parameters (org override) else checks.default_params.
 *     status: pass / partial (>=80% of target) / fail; source 'simulated'
 *     unless a live tool connection exists for the tool.
 *   - A check without a signal is 'skipped' (needs live API credentials) —
 *     never fabricated.
 *
 * Rollup: requirement score = coverage-weighted mean of its check scores
 * (pass=100, partial=50, fail=0; full=1.0, partial=0.5 weights; skipped
 * checks excluded). Family score = mean of scored requirements. Overall =
 * mean of family scores. All grains persisted to score_history with run_id.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const MetricsEngine = require('./MetricsEngine');

const STATUS_SCORE = { pass: 100, partial: 50, fail: 0 };

function evalSignal(value, params) {
  const t = Number(params.threshold), dir = params.direction || 'gte';
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (dir === 'lte') {
    if (v <= t) return 'pass';
    if (v <= t * 1.5) return 'partial';
    return 'fail';
  }
  if (v >= t) return 'pass';
  if (v >= t * 0.8) return 'partial';
  return 'fail';
}

async function liveToolIds(orgId) {
  try {
    const rows = await db.query(
      `SELECT DISTINCT tool FROM tool_connections WHERE org_id=$1 AND status='connected'`, [orgId]);
    return new Set(rows.map((r) => r.tool));
  } catch (_) { return new Set(); }
}

async function run(orgId, { trigger = 'manual' } = {}) {
  const [runRow] = await db.query(
    `INSERT INTO validation_runs (org_id, trigger) VALUES ($1,$2) RETURNING id`, [orgId, trigger]);
  const runId = runRow.id;

  const inputs = await MetricsEngine.loadInputs(orgId).catch(() => ({}));
  const checks = await db.query(`SELECT * FROM checks ORDER BY id`);
  const overrides = {};
  (await db.query(`SELECT check_id, params FROM check_parameters WHERE org_id=$1`, [orgId]))
    .forEach((r) => { overrides[r.check_id] = r.params; });
  const live = await liveToolIds(orgId);

  let passed = 0, failed = 0, skipped = 0;
  for (const c of checks) {
    const params = overrides[c.id] || c.default_params || null;
    let status = 'skipped', observed = null, expected = null;
    if (c.signal && params && inputs[c.signal] != null && inputs[c.signal] !== '') {
      observed = Number(inputs[c.signal]);
      expected = `${params.direction === 'lte' ? '<=' : '>='}${params.threshold}`;
      status = evalSignal(observed, params) || 'skipped';
    }
    if (status === 'pass' || status === 'partial') passed++;
    else if (status === 'fail') failed++;
    else skipped++;
    await db.query(`
      INSERT INTO check_results (run_id, org_id, check_id, status, observed, expected, params, source, evidence)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [runId, orgId, c.id, status, observed, expected, params ? JSON.stringify(params) : null,
        live.has(c.tool_id) ? 'live' : 'simulated',
        JSON.stringify({ tool: c.tool_id, api: `${c.method || ''} ${c.path || ''}`.trim(), signal: c.signal, extract: c.extract })]);
  }

  // Evidence agent wiring: persist the latest Zadkiel review under this run.
  try {
    const NistCsfService = require('./NistCsfService');
    const review = await NistCsfService.reviewDocuments(orgId);
    for (const item of (review && review.items) || (review && review.findings) || []) {
      await db.query(`
        INSERT INTO evidence_reviews (org_id, run_id, question_key, score, finding, recommendation)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [orgId, runId, item.key || item.question_key || null,
          item.score != null ? item.score : null,
          item.finding || item.assessment || null, item.recommendation || null]);
    }
  } catch (e) { logger.debug('evidence review skipped', { error: e.message }); }

  await rollup(orgId, runId);

  // STEP C hook: recompute ATT&CK technique coverage inside the runner.
  try { await require('./AttackCoverageService').recompute(orgId, runId); }
  catch (e) { logger.debug('attack coverage skipped', { error: e.message }); }

  await db.query(`
    UPDATE validation_runs SET finished_at=NOW(), checks_total=$2, checks_passed=$3, checks_failed=$4, checks_skipped=$5
    WHERE id=$1`, [runId, checks.length, passed, failed, skipped]);
  return getRun(orgId, runId);
}

async function rollup(orgId, runId) {
  // Latest result per check within this run
  const results = await db.query(
    `SELECT check_id, status FROM check_results WHERE run_id=$1`, [runId]);
  const statusBy = {}; results.forEach((r) => { statusBy[r.check_id] = r.status; });

  const frameworks = await db.query(`SELECT id FROM frameworks`);
  for (const fw of frameworks) {
    const maps = await db.query(`
      SELECT m.requirement_id, m.check_id, m.coverage, r.family
      FROM requirement_mappings m
      JOIN framework_requirements r ON r.framework_id=m.framework_id AND r.requirement_id=m.requirement_id
      WHERE m.framework_id=$1 AND COALESCE(r.withdrawn,false)=false`, [fw.id]);
    if (!maps.length) continue;

    const byReq = {};
    maps.forEach((m) => { (byReq[m.requirement_id] = byReq[m.requirement_id] || { family: m.family, checks: [] }).checks.push(m); });

    const famScores = {};
    for (const [reqId, r] of Object.entries(byReq)) {
      let wsum = 0, w = 0;
      r.checks.forEach((m) => {
        const st = statusBy[m.check_id];
        if (!st || st === 'skipped') return;
        const weight = m.coverage === 'full' ? 1 : 0.5;
        wsum += STATUS_SCORE[st] * weight; w += weight;
      });
      if (!w) continue;
      const score = Math.round(wsum / w);
      (famScores[r.family] = famScores[r.family] || []).push(score);
      await db.query(`INSERT INTO score_history (org_id, framework_id, scope, score, run_id) VALUES ($1,$2,$3,$4,$5)`,
        [orgId, fw.id, reqId, score, runId]);
    }
    const fams = Object.entries(famScores);
    if (!fams.length) continue;
    let total = 0;
    for (const [fam, scores] of fams) {
      const s = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      total += s;
      await db.query(`INSERT INTO score_history (org_id, framework_id, scope, score, run_id) VALUES ($1,$2,$3,$4,$5)`,
        [orgId, fw.id, fam, s, runId]);
    }
    await db.query(`INSERT INTO score_history (org_id, framework_id, scope, score, run_id) VALUES ($1,$2,'overall',$3,$4)`,
      [orgId, fw.id, Math.round(total / fams.length), runId]);
  }
}

async function getRun(orgId, runId) {
  const [run] = await db.query(`SELECT * FROM validation_runs WHERE id=$1 AND org_id=$2`, [runId, orgId]);
  if (!run) return null;
  const results = await db.query(`SELECT check_id, status, observed, expected, source, evidence FROM check_results WHERE run_id=$1 ORDER BY check_id`, [runId]);
  const scores = await db.query(`SELECT framework_id, scope, score FROM score_history WHERE run_id=$1 ORDER BY framework_id, scope`, [runId]);
  return { run, results, scores };
}

async function latestRun(orgId) {
  const [run] = await db.query(
    `SELECT * FROM validation_runs WHERE org_id=$1 AND finished_at IS NOT NULL ORDER BY id DESC LIMIT 1`, [orgId]);
  return run ? getRun(orgId, run.id) : null;
}

async function scoreTrend(orgId, frameworkId, scope = 'overall', limit = 24) {
  return db.query(`
    SELECT score, run_id, computed_at FROM score_history
    WHERE org_id=$1 AND framework_id=$2 AND scope=$3 ORDER BY computed_at DESC LIMIT $4`,
    [orgId, frameworkId, scope, limit]);
}

module.exports = { run, getRun, latestRun, scoreTrend, rollup };

'use strict';

/**
 * cae/assessmentService — Milestone 6. Ties the engine together and exposes the
 * user-facing, per-framework results.
 *
 * runAssessment: create a run, collect evidence (M4), score (M5), finalize.
 * getResults / getSummary: projected, per-framework, INDEPENDENT views — no
 * cross-framework relationships, no internal logic.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const { collectForRun } = require('./evidenceCollection');
const { scoreRun } = require('./scoringEngine');
const { projectResult } = require('./projection');

const SUPPORTED = {
  'nist_csf_2_0': 'NIST CSF 2.0',
  'nist_800_53': 'NIST SP 800-53 Rev. 5',
  'mitre_attck': 'MITRE ATT&CK Enterprise',
};

// Accept framework ids or display names; return canonical display names.
function resolveFrameworks(input) {
  const arr = Array.isArray(input) ? input : (input ? [input] : []);
  const names = Object.values(SUPPORTED);
  const out = [];
  for (const f of arr) {
    if (SUPPORTED[f]) out.push(SUPPORTED[f]);
    else if (names.includes(f)) out.push(f);
  }
  return out.length ? Array.from(new Set(out)) : names; // default: all
}

async function runAssessment(orgId, frameworksInput) {
  if (!orgId) throw new Error('org required');
  const frameworks = resolveFrameworks(frameworksInput);
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.query(
    `INSERT INTO cae_run (id, org_id, frameworks, status) VALUES ($1,$2,$3,'running')`,
    [runId, orgId, JSON.stringify(frameworks)]);

  let collect, scored;
  try {
    collect = await collectForRun(orgId, runId, frameworks);
    scored = await scoreRun(orgId, runId, frameworks);
  } catch (e) {
    await db.query(`UPDATE cae_run SET status='failed', finished_at=NOW() WHERE id=$1`, [runId]);
    logger.warn('cae run failed', { orgId, runId });
    throw e;
  }

  await db.query(
    `UPDATE cae_run SET status='complete', finished_at=NOW(),
       controls_total=$2, controls_tested=$3, controls_manual=$4 WHERE id=$1`,
    [runId, collect.total, collect.tested, collect.manual]);

  return {
    run_id: runId, frameworks,
    controls: collect.total, tested: collect.tested, manual: collect.manual,
    results: scored.tally,                              // counts by status (user-safe)
  };
}

// Per-framework executive results (projected).
async function getResults(orgId, framework) {
  if (!orgId) return { results: [] };
  const fw = resolveFrameworks(framework);
  const rows = await db.query(
    `SELECT * FROM cae_result WHERE org_id=$1 AND framework = ANY($2)
      ORDER BY framework, score_pct ASC NULLS FIRST, control_id`, [orgId, fw]);
  return { frameworks: fw, results: rows.map(projectResult) };
}

// Per-framework rollup: status counts + average band. User-safe.
async function getSummary(orgId) {
  if (!orgId) return { frameworks: [] };
  const rows = await db.query(
    `SELECT framework,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status='passed')::int AS passed,
            COUNT(*) FILTER (WHERE status='partial')::int AS partial,
            COUNT(*) FILTER (WHERE status='failed')::int AS failed,
            COUNT(*) FILTER (WHERE status='needs_manual_evidence')::int AS manual,
            ROUND(AVG(score) FILTER (WHERE status IN ('passed','partial','failed')), 1) AS avg_score
       FROM cae_result WHERE org_id=$1 GROUP BY framework ORDER BY framework`, [orgId]);
  return { frameworks: rows };
}

module.exports = { runAssessment, getResults, getSummary, resolveFrameworks, SUPPORTED };

'use strict';

/**
 * OutcomeNetworkService — the cross-tenant outcome data network.
 *
 * Framework content is static and commoditized; OUTCOME-labeled data compounds
 * with every tenant and can't be copied. With consent, each org contributes
 * ANONYMIZED outcomes derived from its own resolved forecasts and actuations —
 * "in a cohort like yours, this scenario occurred X% of the time, and the control
 * that actually worked was Y." No org identity is stored on a signal row; rows
 * are keyed only by an opaque cohort (industry + size band).
 *
 * Consent-gated via benchmark_consent. The base rates feed back into the
 * decision spine as event.peerSignal.
 */

const crypto = require('crypto');
const db = require('../utils/db');
const logger = require('../utils/logger');

async function ensure() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS outcome_signals (
      id TEXT PRIMARY KEY, cohort_key TEXT NOT NULL, scenario_type TEXT,
      occurred BOOLEAN, control_applied TEXT, control_worked BOOLEAN,
      contributed_at TIMESTAMPTZ DEFAULT now())`);
    await db.query('CREATE INDEX IF NOT EXISTS outcome_signals_cohort ON outcome_signals(cohort_key)');
  } catch (e) { logger.debug('outcome ensure failed', { error: e.message }); }
}

async function consented(orgId) {
  try { const r = await db.query('SELECT consented FROM benchmark_consent WHERE org_id=$1', [orgId]); return !!(r[0] && r[0].consented); }
  catch (_) { return false; }
}

// Opaque cohort so peers are comparable but never identifiable: industry + a
// coarse revenue band. Revenue read from metric_inputs, else setup_json.
async function cohortKey(orgId) {
  let industry = 'generic', revenue = null;
  try { const r = await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]); if (r[0] && r[0].setup_json) { industry = r[0].setup_json.industry || industry; revenue = r[0].setup_json.revenue || null; } } catch (_) {}
  try { const r = await db.query("SELECT value FROM metric_inputs WHERE org_id=$1 AND key='revenue'", [orgId]); if (r[0] && r[0].value != null) revenue = Number(r[0].value); } catch (_) {}
  const band = revenue == null ? 'unknown' : revenue >= 10e9 ? 'large' : revenue >= 1e9 ? 'mid' : 'small';
  return `${industry}:${band}`;
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

// Derive anonymized outcome rows from this org's resolved forecasts + actuations.
async function contribute(orgId, opts = {}) {
  await ensure();
  if (!opts.assumeConsent && !(await consented(orgId))) return { contributed: 0, reason: 'no benchmark consent' };
  const cohort = await cohortKey(orgId);
  let preds = [];
  try { preds = await db.query("SELECT card_id, scenario_type, outcome FROM forecast_predictions WHERE org_id=$1 AND resolved=true", [orgId]); } catch (_) {}
  let acts = [];
  try { acts = await db.query('SELECT card_id, action, status FROM actuations WHERE org_id=$1', [orgId]); } catch (_) {}
  const actByCard = {}; acts.forEach((a) => { actByCard[a.card_id] = a; });
  let contributed = 0;
  for (const p of preds) {
    const a = actByCard[p.card_id];
    const id = `os_${sha(orgId + '|' + p.card_id).slice(0, 24)}`; // opaque; org not stored
    try {
      const r = await db.query(
        `INSERT INTO outcome_signals (id, cohort_key, scenario_type, occurred, control_applied, control_worked, contributed_at)
         VALUES ($1,$2,$3,$4,$5,$6,now()) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [id, cohort, p.scenario_type || null, p.outcome === 'occurred', a ? a.action : null, a ? a.status === 'verified' : null]);
      if (r[0]) contributed += 1;
    } catch (_) {}
  }
  return { contributed, cohort };
}

// ---- pure cohort aggregation (exported for tests) --------------------------
function summarize(rows) {
  const n = rows.length;
  const occurred = rows.filter((r) => r.occurred).length;
  // Most-effective control: highest "worked" rate among applied controls.
  const byControl = {};
  rows.forEach((r) => { if (r.control_applied) { const c = (byControl[r.control_applied] = byControl[r.control_applied] || { applied: 0, worked: 0 }); c.applied += 1; if (r.control_worked) c.worked += 1; } });
  const controls = Object.entries(byControl).map(([control, v]) => ({ control, applied: v.applied, worked: v.worked, workedPct: Math.round((v.worked / v.applied) * 100) })).sort((a, b) => b.workedPct - a.workedPct || b.applied - a.applied);
  return { n, occurred, baseRate: n ? Math.round((occurred / n) * 100) : null, topControl: controls[0] || null, controls };
}

async function insightsFor(orgId, { scenarioType } = {}) {
  await ensure();
  const cohort = await cohortKey(orgId);
  let rows = [];
  try {
    rows = await db.query('SELECT occurred, control_applied, control_worked FROM outcome_signals WHERE cohort_key=$1 AND ($2::text IS NULL OR scenario_type=$2)', [cohort, scenarioType || null]);
  } catch (_) {}
  const s = summarize(rows);
  return {
    organizationId: orgId, cohort, scenarioType: scenarioType || 'all', ...s,
    caveat: s.n < 10 ? `Only ${s.n} cohort observations — peer signal is indicative, not yet robust.` : `Based on ${s.n} anonymized outcomes in the ${cohort} cohort.`,
  };
}

// Base rate per scenario type for this cohort — attached to the decision spine.
async function cohortDigest(orgId) {
  await ensure();
  const cohort = await cohortKey(orgId);
  let rows = [];
  try { rows = await db.query('SELECT scenario_type, occurred, control_applied, control_worked FROM outcome_signals WHERE cohort_key=$1', [cohort]); } catch (_) { return { cohort, byScenario: {} }; }
  const groups = {};
  rows.forEach((r) => { (groups[r.scenario_type || 'unknown'] = groups[r.scenario_type || 'unknown'] || []).push(r); });
  const byScenario = {};
  Object.entries(groups).forEach(([k, v]) => { const s = summarize(v); byScenario[k] = { baseRate: s.baseRate, n: s.n, topControl: s.topControl ? s.topControl.control : null }; });
  return { cohort, byScenario };
}

module.exports = { contribute, insightsFor, cohortDigest, cohortKey, summarize };

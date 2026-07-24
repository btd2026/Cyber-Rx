'use strict';

/**
 * ForecastService — the self-scoring forecast ledger.
 *
 * The decision spine already emits dated probabilities (timing.p7/p30/p90) and a
 * loss distribution per event. This records those predictions when they are made,
 * reconciles them against what ACTUALLY happened (recorded incidents), and scores
 * the engine against reality — a Brier score and a calibration curve. That track
 * record is the thing no GRC tool has: a forecaster that grades itself.
 *
 *   snapshot(org)   — capture today's decision cards as dated predictions.
 *   recordIncident  — log a real outcome (from an integration or manually).
 *   reconcile(org)  — resolve elapsed predictions to occurred / no_event.
 *   accuracy(org)   — Brier score + calibration bins over resolved predictions.
 *
 * Honest by construction: only resolved predictions count toward accuracy, and an
 * unreconciled prediction is 'unknown', never assumed correct.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

async function ensure() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS forecast_predictions (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, card_id TEXT NOT NULL, event_id TEXT,
      scenario_type TEXT, severity TEXT, title TEXT,
      p7 INT, p30 INT, p90 INT, annual_pct INT,
      loss_expected NUMERIC, loss_p90 NUMERIC,
      source TEXT, cve TEXT, horizon_days INT DEFAULT 30,
      snapshot_day TEXT NOT NULL, predicted_at TIMESTAMPTZ DEFAULT now(),
      resolved BOOLEAN DEFAULT false, outcome TEXT, resolved_at TIMESTAMPTZ,
      UNIQUE (org_id, card_id, snapshot_day))`);
    await db.query(`CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, scenario_type TEXT, asset_id TEXT,
      severity TEXT, description TEXT, source TEXT DEFAULT 'manual',
      occurred_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now())`);
    await db.query('CREATE INDEX IF NOT EXISTS forecast_pred_org ON forecast_predictions(org_id)');
    await db.query('CREATE INDEX IF NOT EXISTS incidents_org ON incidents(org_id)');
  } catch (e) { logger.debug('forecast ensure failed', { error: e.message }); }
}

const dayOf = (d) => new Date(d).toISOString().slice(0, 10);

// Capture the current decision cards as dated predictions (one row per card per
// day; re-running the same day is idempotent).
async function snapshot(orgId, opts = {}) {
  await ensure();
  const Engine = require('./DecisionEngineService');
  const g = await Engine.generate(orgId);
  const day = opts.day || dayOf(Date.now());
  let recorded = 0;
  for (const card of g.cards) {
    const e = card.event, t = e.timing || {}, loss = e.loss || {};
    const live = (t.cves && t.cves.length) || t.kev;
    const id = `fp_${orgId}_${card.id}_${day}`;
    try {
      const r = await db.query(
        `INSERT INTO forecast_predictions
          (id, org_id, card_id, event_id, scenario_type, severity, title, p7, p30, p90,
           annual_pct, loss_expected, loss_p90, source, cve, horizon_days, snapshot_day, predicted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (org_id, card_id, snapshot_day) DO NOTHING RETURNING id`,
        [id, orgId, card.id, e.id || null, e.scenarioType || null, e.severity || null,
         e.title || null, t.p7 || null, t.p30 || null, t.p90 || null, t.annualPct || null,
         Math.round(loss.expected || 0), Math.round(loss.p90 || 0),
         live ? 'live' : 'modeled', (t.cves && t.cves[0]) || null, opts.horizonDays || 30,
         day, opts.at || new Date().toISOString()]);
      if (r[0]) recorded += 1;
    } catch (e2) { logger.debug('snapshot insert degraded', { error: e2.message }); }
  }
  return { snapshotDay: day, cards: g.cards.length, recorded };
}

async function recordIncident(orgId, inc) {
  await ensure();
  const id = inc.id || `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.query(
    `INSERT INTO incidents (id, org_id, scenario_type, asset_id, severity, description, source, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
    [id, orgId, inc.scenarioType || null, inc.assetId || null, inc.severity || null,
     inc.description || null, inc.source || 'manual', inc.occurredAt || new Date().toISOString()]);
  return { id, recorded: true };
}

// Resolve predictions whose horizon has elapsed: occurred if a matching incident
// (same scenario type) landed inside the prediction window, else no_event.
async function reconcile(orgId, opts = {}) {
  await ensure();
  const now = opts.now ? new Date(opts.now) : new Date();
  let due = [];
  try {
    due = await db.query(
      `SELECT * FROM forecast_predictions
        WHERE org_id=$1 AND resolved=false
          AND predicted_at + (horizon_days || ' days')::interval <= $2`, [orgId, now.toISOString()]);
  } catch (e) { logger.debug('reconcile query degraded', { error: e.message }); return { resolved: 0 }; }
  let incidents = [];
  try { incidents = await db.query('SELECT scenario_type, occurred_at FROM incidents WHERE org_id=$1', [orgId]); } catch (_) {}
  let resolved = 0;
  for (const p of due) {
    const start = new Date(p.predicted_at).getTime();
    const end = start + (Number(p.horizon_days) || 30) * 864e5;
    const occurred = incidents.some((i) =>
      (i.scenario_type || null) === (p.scenario_type || null) &&
      new Date(i.occurred_at).getTime() >= start && new Date(i.occurred_at).getTime() <= end);
    try {
      await db.query('UPDATE forecast_predictions SET resolved=true, outcome=$2, resolved_at=$3 WHERE id=$1',
        [p.id, occurred ? 'occurred' : 'no_event', now.toISOString()]);
      resolved += 1;
    } catch (_) {}
  }
  return { resolved };
}

// ---- pure scoring (exported for tests) -------------------------------------
// Brier score: mean squared error between predicted probability and outcome.
// Lower is better; 0 = perfect, 0.25 = a coin flip, 1 = confidently wrong.
function brier(pairs) {
  if (!pairs.length) return null;
  const s = pairs.reduce((acc, [p, o]) => acc + Math.pow(p - o, 2), 0);
  return Math.round((s / pairs.length) * 1000) / 1000;
}

// Calibration curve: bucket predicted probability into bins and compare the
// mean prediction to the observed frequency in each bin. A well-calibrated
// forecaster sits on the diagonal (predicted ≈ observed).
function calibration(pairs, bins = 10) {
  const buckets = Array.from({ length: bins }, (_, i) => ({
    bin: i, lo: i / bins, hi: (i + 1) / bins, n: 0, sumP: 0, occurred: 0,
  }));
  for (const [p, o] of pairs) {
    const idx = Math.min(bins - 1, Math.floor(p * bins));
    const b = buckets[idx]; b.n += 1; b.sumP += p; b.occurred += o;
  }
  return buckets.filter((b) => b.n > 0).map((b) => ({
    range: `${Math.round(b.lo * 100)}-${Math.round(b.hi * 100)}%`,
    n: b.n,
    predicted: Math.round((b.sumP / b.n) * 100),
    observed: Math.round((b.occurred / b.n) * 100),
  }));
}

async function accuracy(orgId) {
  await ensure();
  let rows = [];
  try { rows = await db.query("SELECT p30, source, horizon_days, outcome FROM forecast_predictions WHERE org_id=$1 AND resolved=true AND p30 IS NOT NULL", [orgId]); } catch (_) {}
  const pairs = rows.map((r) => [Math.max(0, Math.min(1, (Number(r.p30) || 0) / 100)), r.outcome === 'occurred' ? 1 : 0]);
  const forSource = (src) => rows.filter((r) => r.source === src).map((r) => [(Number(r.p30) || 0) / 100, r.outcome === 'occurred' ? 1 : 0]);
  const occurred = pairs.filter(([, o]) => o === 1).length;
  let pending = 0;
  try { pending = Number((await db.query('SELECT COUNT(*) n FROM forecast_predictions WHERE org_id=$1 AND resolved=false', [orgId]))[0].n) || 0; } catch (_) {}
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    resolved: pairs.length, pending, occurred, baseRate: pairs.length ? Math.round((occurred / pairs.length) * 100) : null,
    brier: brier(pairs),
    brierBySource: { live: brier(forSource('live')), modeled: brier(forSource('modeled')) },
    calibration: calibration(pairs),
    interpretation: pairs.length < 20
      ? `Only ${pairs.length} resolved predictions — track record is still forming (need ~20+ for a stable Brier score).`
      : `Brier ${brier(pairs)} over ${pairs.length} resolved predictions (base rate ${Math.round((occurred / pairs.length) * 100)}%). Lower is better; 0.25 is a coin flip.`,
  };
}

async function predictions(orgId, limit = 100) {
  await ensure();
  try { return await db.query('SELECT * FROM forecast_predictions WHERE org_id=$1 ORDER BY predicted_at DESC LIMIT $2', [orgId, limit]); }
  catch (_) { return []; }
}

module.exports = { snapshot, recordIncident, reconcile, accuracy, predictions, brier, calibration };

'use strict';

/**
 * AgentOperatorService — standing autonomous role-operators.
 *
 * "An operating system runs processes." This makes that literal: one persistent
 * operator per role that ticks over its own decision queue, drafts the
 * recommended decision, ACTS within a mandate's guardrails (auto-actuating the
 * fix), and ESCALATES anything above the guardrail to the human. Every action
 * lands in the tamper-evident ledger with a named, accountable agent — so
 * autonomy is auditable, not opaque.
 *
 * Guardrails live in a per-role mandate (autonomy level + spend cap). Default is
 * 'draft' (propose only) — a tenant opts into 'act' deliberately.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const ROLES = ['CISO', 'CFO', 'CIO', 'CRO', 'CLO', 'Board'];
const DEFAULT_MANDATE = { autonomy: 'draft', costCap: 250000, enabled: true };

async function ensure() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS agent_mandates (
      org_id TEXT NOT NULL, role TEXT NOT NULL, autonomy TEXT DEFAULT 'draft',
      cost_cap NUMERIC DEFAULT 250000, enabled BOOLEAN DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (org_id, role))`);
    await db.query(`CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, role TEXT, ran_at TIMESTAMPTZ DEFAULT now(),
      considered INT DEFAULT 0, drafted INT DEFAULT 0, acted INT DEFAULT 0, escalated INT DEFAULT 0,
      summary JSONB DEFAULT '{}')`);
    await db.query('CREATE INDEX IF NOT EXISTS agent_runs_org ON agent_runs(org_id)');
  } catch (e) { logger.debug('operator ensure failed', { error: e.message }); }
}

async function getMandate(orgId, role) {
  await ensure();
  try {
    const r = await db.query('SELECT autonomy, cost_cap, enabled FROM agent_mandates WHERE org_id=$1 AND role=$2', [orgId, role]);
    if (r[0]) return { autonomy: r[0].autonomy, costCap: Number(r[0].cost_cap), enabled: r[0].enabled };
  } catch (_) {}
  return { ...DEFAULT_MANDATE };
}

async function setMandate(orgId, role, m) {
  await ensure();
  await db.query(
    `INSERT INTO agent_mandates (org_id, role, autonomy, cost_cap, enabled, updated_at)
     VALUES ($1,$2,$3,$4,$5,now())
     ON CONFLICT (org_id, role) DO UPDATE SET autonomy=EXCLUDED.autonomy, cost_cap=EXCLUDED.cost_cap, enabled=EXCLUDED.enabled, updated_at=now()`,
    [orgId, role, m.autonomy || 'draft', m.costCap != null ? Number(m.costCap) : 250000, m.enabled !== false]);
  return { saved: true, role, mandate: await getMandate(orgId, role) };
}

// ---- pure guardrail decision (exported for tests) --------------------------
// Given a card and a mandate, what should the operator do? This is the whole
// autonomy policy in one testable function.
function decideAction(card, mandate) {
  if (!mandate.enabled) return { mode: 'skip', reason: 'operator disabled' };
  if (card.decision) return { mode: 'skip', reason: 'already decided' };
  const rec = (card.options || []).find((o) => o.id === card.recommended) || (card.options || [])[0];
  if (!rec) return { mode: 'skip', reason: 'no option' };
  if (mandate.autonomy === 'observe') return { mode: 'note', reason: 'observe-only mandate', option: rec.id };
  if (mandate.autonomy === 'draft') return { mode: 'draft', reason: 'draft mandate', option: rec.id };
  // autonomy === 'act': act only within the spend cap and never auto-accept risk.
  if (rec.id === 'accept' || rec.acceptsRationale) return { mode: 'escalate', reason: 'accept requires a human rationale', option: rec.id };
  if ((rec.cost || 0) > mandate.costCap) return { mode: 'escalate', reason: `cost ${rec.cost} over cap ${mandate.costCap}`, option: rec.id };
  if (card.type === 'compound' || card.event.severity === 'Critical') {
    // High-stakes: act only if clearly within cap, else escalate for a human sign-off.
    if ((rec.cost || 0) > mandate.costCap * 0.5) return { mode: 'escalate', reason: 'high-stakes card near cap — human sign-off', option: rec.id };
  }
  return { mode: 'act', reason: `within mandate (cost ${rec.cost} ≤ cap ${mandate.costCap})`, option: rec.id };
}

async function tick(orgId, role, opts = {}) {
  await ensure();
  const Engine = require('./DecisionEngineService');
  const mandate = await getMandate(orgId, role);
  const q = await Engine.list(orgId, role);
  const mine = (q.cards || []).filter((c) => c.relevant);
  const actions = [];
  let drafted = 0, acted = 0, escalated = 0;
  for (const card of mine) {
    const decision = decideAction(card, mandate);
    if (decision.mode === 'skip' || decision.mode === 'note') { if (decision.mode === 'note') actions.push({ card: card.id, mode: 'note', option: decision.option }); continue; }
    if (decision.mode === 'act' && !opts.dryRun) {
      try {
        const r = await require('./ActuationService').actuate(orgId, card.id, decision.option, { actor: `agent:${role}`, role });
        acted += 1; actions.push({ card: card.id, mode: 'act', option: decision.option, externalRef: r.actuation.externalRef, simulated: r.actuation.simulated });
      } catch (e) { escalated += 1; actions.push({ card: card.id, mode: 'escalate', option: decision.option, reason: `actuation failed: ${e.message}` }); }
    } else if (decision.mode === 'act' && opts.dryRun) {
      acted += 1; actions.push({ card: card.id, mode: 'act(dry)', option: decision.option });
    } else if (decision.mode === 'draft') {
      drafted += 1; actions.push({ card: card.id, mode: 'draft', option: decision.option, headline: card.lens && card.lens.headline });
    } else if (decision.mode === 'escalate') {
      escalated += 1; actions.push({ card: card.id, mode: 'escalate', option: decision.option, reason: decision.reason });
    }
  }
  const id = `run_${Date.now()}_${role}_${Math.random().toString(36).slice(2, 6)}`;
  const summary = { mandate, actions };
  try {
    await db.query(
      `INSERT INTO agent_runs (id, org_id, role, considered, drafted, acted, escalated, summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, orgId, role, mine.length, drafted, acted, escalated, JSON.stringify(summary)]);
  } catch (e) { logger.debug('agent_run insert degraded', { error: e.message }); }
  return { runId: id, role, considered: mine.length, drafted, acted, escalated, mandate, actions };
}

// Run all six operators, plus the forecast snapshot/reconcile — one heartbeat of
// the whole autonomous layer.
async function tickAll(orgId, opts = {}) {
  const Forecast = require('./ForecastService');
  let snapshot = null, reconcile = null;
  try { snapshot = await Forecast.snapshot(orgId); } catch (_) {}
  try { reconcile = await Forecast.reconcile(orgId); } catch (_) {}
  const runs = [];
  for (const role of ROLES) { runs.push(await tick(orgId, role, opts)); }
  const totals = runs.reduce((a, r) => ({ drafted: a.drafted + r.drafted, acted: a.acted + r.acted, escalated: a.escalated + r.escalated }), { drafted: 0, acted: 0, escalated: 0 });
  return { organizationId: orgId, ranAt: new Date().toISOString(), forecast: { snapshot, reconcile }, totals, runs };
}

async function runs(orgId, limit = 50) {
  await ensure();
  try { return await db.query('SELECT id, role, ran_at, considered, drafted, acted, escalated FROM agent_runs WHERE org_id=$1 ORDER BY ran_at DESC LIMIT $2', [orgId, limit]); }
  catch (_) { return []; }
}

module.exports = { tick, tickAll, runs, getMandate, setMandate, decideAction, ROLES };

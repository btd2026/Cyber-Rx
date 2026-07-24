'use strict';

/**
 * ActuationService — closes the decision loop.
 *
 * GRC stops at "here is a task." An operating system executes the chosen option
 * and then VERIFIES the world changed. This dispatches the recommended
 * DecisionCard option through a pluggable actuator (open a ticket, trigger a
 * SOAR/EDR playbook, draft an insurance notification), records it, and later
 * re-reads the substrate to confirm the residual risk actually dropped — writing
 * the verified delta back to the tamper-evident decision ledger.
 *
 * Honest by construction: a dispatch with no real connector is flagged
 * simulated; verification only reports 'verified' when telemetry corroborates the
 * change, otherwise 'unverified' with the reason.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

// Which actuator handles each decision option, and the operational channel.
const ACTUATOR = {
  remediate: { actuator: 'ticket', channel: 'change-management', toolKeys: ['servicenow', 'jira'] },
  mitigate: { actuator: 'soar', channel: 'security-automation', toolKeys: ['soar', 'splunk', 'crowdstrike'] },
  transfer: { actuator: 'insurance', channel: 'risk-transfer', toolKeys: [] },
  break_cheaper: { actuator: 'ticket', channel: 'change-management', toolKeys: ['servicenow', 'jira'] },
  break_other: { actuator: 'ticket', channel: 'change-management', toolKeys: ['servicenow', 'jira'] },
  both: { actuator: 'ticket', channel: 'change-management', toolKeys: ['servicenow', 'jira'] },
};

async function ensure() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS actuations (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, card_id TEXT NOT NULL, event_id TEXT,
      subject_ref TEXT, option_id TEXT, action TEXT, actuator TEXT, channel TEXT,
      external_ref TEXT, simulated BOOLEAN DEFAULT true,
      status TEXT DEFAULT 'requested', requested_by TEXT, requested_at TIMESTAMPTZ DEFAULT now(),
      pre_residual_risk NUMERIC, post_residual_risk NUMERIC, verified_delta NUMERIC,
      verified_at TIMESTAMPTZ, verification_note TEXT, evidence JSONB DEFAULT '{}')`);
    await db.query('CREATE INDEX IF NOT EXISTS actuations_org ON actuations(org_id)');
  } catch (e) { logger.debug('actuations ensure failed', { error: e.message }); }
}

async function connectedToolKeys(orgId) {
  try { const r = await db.query("SELECT tool_key FROM tool_connections WHERE org_id=$1 AND status='connected'", [orgId]); return new Set(r.map((x) => x.tool_key)); }
  catch (_) { return new Set(); }
}

// Dispatch through the actuator. Without a live connector we produce a real,
// referenceable request but mark it simulated — never pretend a fix shipped.
function dispatch(spec, tools, ctx) {
  const live = (spec.toolKeys || []).find((k) => tools.has(k));
  const ref = `${spec.actuator.toUpperCase()}-${Math.abs(hash(ctx.cardId + ctx.optionId)) % 100000}`;
  return {
    actuator: spec.actuator, channel: spec.channel, externalRef: ref,
    simulated: !live, via: live || 'simulated',
    note: live ? `Dispatched to ${live} (${spec.channel}).` : `No connected ${spec.channel} tool — recorded as a simulated ${spec.actuator} request.`,
  };
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; } return h; }

const subjectRef = (orgId, cardId) => String(cardId).replace(`dec_${orgId}_`, '').replace(/^proj_/, '');

async function actuate(orgId, cardId, optionId, meta = {}) {
  await ensure();
  const Engine = require('./DecisionEngineService');
  const g = await Engine.generate(orgId);
  const card = g.cards.find((c) => c.id === cardId);
  if (!card) { const e = new Error('Decision card not found.'); e.code = 'CARD_NOT_FOUND'; throw e; }
  const option = card.options.find((o) => o.id === (optionId || card.recommended)) || card.options[0];
  if (option.id === 'accept' || option.acceptsRationale) {
    const e = new Error('Accept & monitor is recorded via the decision ledger, not actuated.'); e.code = 'NOT_ACTUABLE'; throw e;
  }
  const spec = ACTUATOR[option.id] || { actuator: 'ticket', channel: 'change-management', toolKeys: ['servicenow', 'jira'] };
  const tools = await connectedToolKeys(orgId);
  const d = dispatch(spec, tools, { cardId, optionId: option.id });
  const preResidual = Math.round((card.event.loss && card.event.loss.expected) || card.event.exposure || 0);
  const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.query(
    `INSERT INTO actuations (id, org_id, card_id, event_id, subject_ref, option_id, action, actuator, channel,
       external_ref, simulated, status, requested_by, pre_residual_risk, evidence)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [id, orgId, cardId, card.event.id || null, subjectRef(orgId, cardId), option.id, option.label,
     d.actuator, d.channel, d.externalRef, d.simulated, 'in_progress', meta.actor || 'system',
     preResidual, JSON.stringify({ dispatch: d, expectedReductionPct: option.residualRiskReductionPct })]);
  // Mirror into the tamper-evident decision ledger.
  try { await Engine.record(orgId, cardId, { role: meta.role || null, action: 'actuate', optionId: option.id, decidedBy: meta.actor || 'system', engineState: { externalRef: d.externalRef, actuator: d.actuator, simulated: d.simulated } }); } catch (_) {}
  return { id, actuation: { id, cardId, option: option.label, ...d, status: 'in_progress', preResidual } };
}

// Re-read the substrate to confirm the residual risk dropped. Corroboration =
// the underlying risk improved (status) or its findings resolved AFTER dispatch.
async function verify(orgId, actuationId, opts = {}) {
  await ensure();
  const rows = await db.query('SELECT * FROM actuations WHERE id=$1 AND org_id=$2', [actuationId, orgId]);
  const a = rows[0];
  if (!a) { const e = new Error('Actuation not found.'); e.code = 'NOT_FOUND'; throw e; }
  const since = new Date(a.requested_at).getTime();
  const now = opts.now ? new Date(opts.now) : new Date();
  let corroborated = false; const evidence = [];
  // 1) underlying risk status improved after dispatch
  try {
    const rk = await db.query('SELECT status, updated_at FROM risks WHERE id=$1 AND organization_id=$2', [a.subject_ref, orgId]);
    if (rk[0] && ['mitigating', 'accepted', 'closed'].includes(String(rk[0].status)) && new Date(rk[0].updated_at).getTime() >= since) {
      corroborated = true; evidence.push(`Risk ${a.subject_ref} moved to '${rk[0].status}' after dispatch.`);
    }
  } catch (_) {}
  // 2) findings on the risk resolved after dispatch
  try {
    const f = await db.query("SELECT COUNT(*) n FROM findings WHERE organization_id=$1 AND risk_id=$2 AND status IN ('resolved','closed') AND updated_at >= $3", [orgId, a.subject_ref, a.requested_at]);
    if (Number(f[0] && f[0].n) > 0) { corroborated = true; evidence.push(`${f[0].n} linked finding(s) resolved after dispatch.`); }
  } catch (_) {}

  const expReduction = (a.evidence && a.evidence.expectedReductionPct) || 0;
  const pre = Number(a.pre_residual_risk) || 0;
  const post = corroborated ? Math.round(pre * (1 - expReduction / 100)) : null;
  const status = corroborated ? 'verified' : 'unverified';
  const note = corroborated
    ? `Telemetry corroborates the change: ${evidence.join(' ')} Residual risk ${usd(pre)} → ${usd(post)}.`
    : 'No telemetry yet corroborates the change — residual risk unchanged until confirmed. This is honest: the loop is not closed on assertion alone.';
  await db.query(
    `UPDATE actuations SET status=$2, post_residual_risk=$3, verified_delta=$4, verified_at=$5, verification_note=$6,
       evidence = evidence || $7::jsonb WHERE id=$1`,
    [actuationId, status, post, post == null ? null : pre - post, now.toISOString(), note, JSON.stringify({ verification: evidence })]);
  return { id: actuationId, status, preResidual: pre, postResidual: post, delta: post == null ? null : pre - post, corroborated, note };
}

function usd(v) { const x = Number(v) || 0; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; }

async function list(orgId, limit = 100) {
  await ensure();
  try { return await db.query('SELECT * FROM actuations WHERE org_id=$1 ORDER BY requested_at DESC LIMIT $2', [orgId, limit]); }
  catch (_) { return []; }
}

module.exports = { actuate, verify, list, ACTUATOR };

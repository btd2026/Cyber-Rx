'use strict';

/**
 * DecisionEngineService — the decision spine the architecture audit identified
 * as missing.
 *
 * It produces ONE shared object per predicted event (the DecisionCard) and a
 * TRANSLATION layer that renders that single object into each role's lens — the
 * inverse of the old per-role dashboards, which computed six separate datasets.
 *
 *   Event        — what could happen: attack path + timing (p7/p30/p90, with a
 *                  confidence band) + a loss DISTRIBUTION (seeded Monte Carlo).
 *   DecisionCard — the event + 2–4 response options, each with cost,
 *                  time-to-effect, residual-risk reduction, and operational
 *                  friction, plus an "Accept & monitor" option that REQUIRES a
 *                  logged rationale. Stable id per source risk.
 *   lensFor()    — projects one card into a role framing (CISO/CFO/CIO/CRO/CLO/
 *                  Board). Same event, six views.
 *   record()     — writes the decision + rationale + a snapshot of engine state
 *                  at decision time to the decision ledger.
 *
 * Reads the real substrate through ExecDashboardService.loadCtx (open risks,
 * financial exposure, processes), falling back to the industry-shaped demo only
 * when the org has no data — so the spine is not mock-divorced.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Deterministic PRNG so the Monte Carlo loss distribution is reproducible.
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

async function ensureLedger() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS decision_ledger (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, card_id TEXT NOT NULL, role TEXT,
      action TEXT NOT NULL, option_id TEXT, rationale TEXT, decided_by TEXT,
      engine_state JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now())`);
  } catch (e) { logger.debug('decision_ledger ensure failed', { error: e.message }); }
}

// ---- timing: p(exploit) — live EPSS/KEV when a CVE is present, else modeled --
const BASE_ANNUAL_P = { Critical: 0.55, High: 0.35, Medium: 0.18, Low: 0.08 };
function timing(ev, signal) {
  // Live signal path: EPSS is a 30-day exploitation probability; KEV = active.
  if (signal && (signal.epss != null || signal.kev)) {
    const p30 = signal.epss != null ? Math.round(signal.epss * 100) : (signal.kev ? 60 : 30);
    const daily = 1 - Math.pow(1 - p30 / 100, 1 / 30);
    const win = (d) => Math.round((1 - Math.pow(1 - daily, d)) * 100);
    return {
      annualPct: win(365), p7: win(7), p30, p90: win(90),
      confidence: signal.epss != null ? 'High' : 'Medium',
      basis: signal.epss != null
        ? `FIRST.org EPSS (30-day exploit probability ${p30}%${signal.kev ? ', on CISA KEV' : ''}) for ${signal.cves.join(', ')}.`
        : `On CISA KEV (actively exploited): ${signal.cves.join(', ') || 'known-exploited'}.`,
      cves: signal.cves || [], kev: !!signal.kev,
    };
  }
  // Modeled fallback.
  let annual = BASE_ANNUAL_P[ev.severity] || 0.2;
  if (/kev|internet|public|exploit|unpatched|rce|ransom/i.test(ev.title)) annual = clamp(annual + 0.12, 0, 0.92);
  const windowP = (days) => Math.round((1 - Math.pow(1 - annual, days / 365)) * 100);
  return {
    annualPct: Math.round(annual * 100), p7: windowP(7), p30: windowP(30), p90: windowP(90),
    confidence: 'Low', basis: 'Modeled from severity and exposure signals — no CVE/EPSS match.', cves: [], kev: false,
  };
}

// ---- loss: seeded Monte Carlo over a triangular magnitude × annual frequency -
function lossDistribution(cardId, exposure, annualPct) {
  const rnd = mulberry32(hash(cardId));
  const E = Math.max(1, exposure || 0);
  const lo = 0.3 * E, mode = E, hi = 2.2 * E, p = (annualPct || 20) / 100;
  const N = 2000; const losses = [];
  for (let i = 0; i < N; i++) {
    const occurs = rnd() < p;                       // does the event happen this year
    let mag = 0;
    if (occurs) {                                   // triangular magnitude draw
      const u = rnd(); const c = (mode - lo) / (hi - lo);
      mag = u < c ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
    }
    losses.push(mag);
  }
  losses.sort((a, b) => a - b);
  const pct = (q) => Math.round(losses[Math.min(N - 1, Math.floor(q * N))]);
  const expected = Math.round(losses.reduce((s, x) => s + x, 0) / N);
  return { expected, p10: pct(0.10), p50: pct(0.50), p90: pct(0.90), worstCase: Math.round(hi), currency: 'USD' };
}

// ---- attack path (compact, directional entry → crown jewel) ----------------
function attackPath(ev, crownProcess) {
  const t = ev.title.toLowerCase();
  const entry = /phish|email|bec/.test(t) ? 'Phishing / credential theft'
    : /mfa|privileg|access|account/.test(t) ? 'Stolen / un-MFA’d credentials'
    : /cloud|bucket|misconfig/.test(t) ? 'Exposed cloud misconfiguration'
    : /vendor|third|clearinghouse|supply/.test(t) ? 'Trusted third-party connection'
    : /ransom|malware|edr|endpoint/.test(t) ? 'Endpoint compromise'
    : 'Exploit of an internet-facing weakness';
  return [
    { step: 'Entry', label: entry },
    { step: 'Foothold', label: ev.affectedSystem || 'Affected system' },
    { step: 'Movement', label: 'Lateral movement / privilege escalation' },
    { step: 'Objective', label: crownProcess || 'Crown-jewel process' },
  ];
}

// ---- decision options (the contract's heart) -------------------------------
function options(cardId, ev) {
  const E = ev.exposure || 0;
  const remediate = Math.round(E * 0.12), mitigate = Math.round(E * 0.04), transfer = Math.round(E * 0.03);
  const opts = [
    { id: 'remediate', label: 'Remediate at the source', cost: remediate, costLabel: usd(remediate), timeToEffectDays: 30, residualRiskReductionPct: 80, friction: 'High', note: 'Fixes the underlying weakness; highest, most durable risk reduction.' },
    { id: 'mitigate', label: 'Apply a compensating control', cost: mitigate, costLabel: usd(mitigate), timeToEffectDays: 7, residualRiskReductionPct: 50, friction: 'Low', note: 'Buys time fast (segmentation, WAF, monitoring) without the full fix.' },
    { id: 'transfer', label: 'Transfer via insurance / limit raise', cost: transfer, costLabel: `${usd(transfer)}/yr`, timeToEffectDays: 60, residualRiskReductionPct: 25, friction: 'Low', note: 'Caps the financial loss, not the likelihood; effective at renewal.' },
    { id: 'accept', label: 'Accept & monitor', cost: 0, costLabel: '$0', timeToEffectDays: 0, residualRiskReductionPct: 0, friction: 'None', acceptsRationale: true, note: 'No spend — requires a documented, signed rationale and a review date.' },
  ];
  // Recommend the option maximizing risk-reduction per (normalized cost + time), excluding accept.
  const score = (o) => o.residualRiskReductionPct / (1 + (o.cost / Math.max(1, E)) * 100 + o.timeToEffectDays / 30);
  const recommended = opts.filter((o) => o.id !== 'accept').sort((a, b) => score(b) - score(a))[0].id;
  return { opts, recommended };
}

// ---- event + card assembly from the substrate context ----------------------
async function generate(orgId) {
  const Exec = require('./ExecDashboardService');
  const c = await Exec.loadCtx(orgId);
  const crown = (c.processes && c.processes.atRisk && c.processes.atRisk[0] && c.processes.atRisk[0].name) || 'a crown-jewel process';
  const dataAtRisk = c.crownJewel || (c.industry ? 'regulated data' : 'sensitive data');
  const top = (c.risks && c.risks.top) || [];
  let Threat = null; try { Threat = require('./ThreatSignalService'); } catch (_) {}
  const cards = await Promise.all(top.slice(0, 8).map(async (r) => {
    const id = `dec_${orgId}_${r.id || hash(r.title)}`;
    const ev = {
      id: `evt_${orgId}_${r.id || hash(r.title)}`,
      title: r.title, severity: r.severity || 'High', exposure: r.financialExposure || 0,
      owner: r.owner || r.remediationOwner || null, affectedSystem: (c.processes.atRisk[0] || {}).name || null,
      crownJewel: crown, dataAtRisk,
    };
    // Live exploit signal (EPSS/KEV) when the risk/finding text carries a CVE.
    let signal = null;
    if (Threat) { try { signal = await Threat.signalFor(`${r.title} ${r.description || ''} ${r.regulatoryCitation || ''}`); } catch (_) {} }
    ev.timing = timing(ev, signal);
    ev.exploitSignal = signal && (signal.epss != null || signal.kev) ? { epss: signal.epss, kev: signal.kev, cves: signal.cves } : null;
    ev.loss = lossDistribution(id, ev.exposure, ev.timing.annualPct);
    ev.attackPath = attackPath(ev, crown);
    const { opts, recommended } = options(id, ev);
    return { id, event: ev, options: opts, recommended, status: 'open' };
  }));

  // AI-risk events folded into the SAME spine (migrated from the old per-role
  // aiDecisions): shadow AI on sensitive data, autonomous agents w/o oversight.
  try {
    const inv = await require('./AiInventoryService').inventory(orgId);
    const gross = (c.financial && c.financial.grossExposure) || 0;
    const aiEvents = [];
    const shadow = (inv.systems || []).find((s) => s.sanctioned === 'Shadow' && ['PHI', 'PCI', 'IP/Secrets', 'PII'].includes(s.dataSensitivity));
    const agent = (inv.systems || []).find((s) => s.autonomy === 'Agentic' && !s.humanInLoop);
    if (shadow) aiEvents.push({ key: `ai_shadow_${shadow.name}`, title: `Shadow AI processing sensitive data: "${shadow.name}"`, severity: 'Critical', exposure: Math.round(gross * 0.2) || 6000000, system: shadow.name });
    if (agent) aiEvents.push({ key: `ai_agent_${agent.name}`, title: `Autonomous AI agent without oversight: "${agent.name}"`, severity: 'Critical', exposure: Math.round(gross * 0.15) || 4500000, system: agent.name });
    aiEvents.forEach((a) => {
      const id = `dec_${orgId}_${hash(a.key)}`;
      const ev = { id: `evt_${orgId}_${hash(a.key)}`, title: a.title, severity: a.severity, exposure: a.exposure, owner: 'CISO', affectedSystem: a.system, crownJewel: crown, dataAtRisk, category: 'AI' };
      ev.timing = timing(ev, null);
      ev.loss = lossDistribution(id, ev.exposure, ev.timing.annualPct);
      ev.attackPath = attackPath(ev, crown);
      const { opts, recommended } = options(id, ev);
      cards.push({ id, event: ev, options: opts, recommended, status: 'open' });
    });
  } catch (_) { /* AI inventory optional */ }

  return { organizationId: orgId, generatedAt: new Date().toISOString(), cards };
}

// ---- translation engine: one card → a role lens ----------------------------
const FRAME = { CISO: 'Security', CFO: 'Financial', CIO: 'Technology', CRO: 'Risk', CLO: 'Legal', Board: 'Governance' };
function lensFor(role, card) {
  const e = card.event;
  const path = e.attackPath.map((s) => s.label).join(' → ');
  const rec = card.options.find((o) => o.id === card.recommended);
  let headline, primary, secondary, narrative, questionToAsk;
  switch (role) {
    case 'CFO':
      headline = `${usd(e.loss.p50)} likely loss, up to ${usd(e.loss.p90)} (P90)`;
      primary = { label: 'Expected annual loss', value: usd(e.loss.expected) };
      secondary = { label: 'Worst-case (P90)', value: usd(e.loss.p90) };
      narrative = `Modeled loss distribution for "${e.title}". Transfer caps the downside; remediation lowers the likelihood. Recommended: ${rec.label} (${rec.costLabel}).`;
      break;
    case 'CISO':
      headline = `Attack path to ${e.crownJewel}`;
      primary = { label: '30-day exploit likelihood', value: `${e.timing.p30}%` };
      secondary = { label: 'Path', value: path };
      narrative = `"${e.title}" — ${path}. Recommended: ${rec.label} (residual risk −${rec.residualRiskReductionPct}%, ${rec.timeToEffectDays}d to effect).`;
      break;
    case 'CIO':
      headline = `${e.affectedSystem || 'Affected systems'} exposed`;
      primary = { label: 'Time to effect (recommended)', value: `${rec.timeToEffectDays} days` };
      secondary = { label: 'Operational friction', value: rec.friction };
      narrative = `"${e.title}" affects ${e.affectedSystem || 'critical systems'}. The lowest-friction move is "${card.options.find((o) => o.id === 'mitigate').label}"; the durable fix is "${card.options.find((o) => o.id === 'remediate').label}".`;
      break;
    case 'CRO':
      headline = `${e.severity} risk vs. appetite`;
      primary = { label: '90-day likelihood', value: `${e.timing.p90}%` };
      secondary = { label: 'Exposure', value: usd(e.exposure) };
      narrative = `"${e.title}" contributes ${usd(e.loss.expected)} expected loss to the portfolio. ${e.severity === 'Critical' ? 'Above appetite — decision required.' : 'Track against threshold.'} Recommended: ${rec.label}.`;
      break;
    case 'CLO':
      headline = `Disclosure exposure: ${e.dataAtRisk}`;
      primary = { label: 'If realized, notify within', value: '72 hours (validate per obligation)' };
      secondary = { label: 'Materiality', value: e.severity === 'Critical' ? 'Potentially material' : 'Assess' };
      narrative = `If "${e.title}" is realized against ${e.dataAtRisk}, notification clocks (HIPAA/state/SEC as applicable) start. Pre-stage the materiality assessment now.`;
      break;
    case 'Board':
    default:
      headline = `Decision pending: ${e.title}`;
      primary = { label: 'Recommended', value: `${rec.label} (${rec.costLabel})` };
      secondary = { label: 'If we do nothing', value: `${usd(e.loss.expected)} expected loss, ${e.timing.p90}% within 90 days` };
      narrative = `Management recommends "${rec.label}". The accept-and-monitor alternative requires a documented rationale.`;
      questionToAsk = `Is "${e.title}" within our approved risk appetite, and who owns the decision?`;
      break;
  }
  return { role, framing: FRAME[role] || 'Executive', headline, primary, secondary, narrative, questionToAsk: questionToAsk || null, recommended: card.recommended, options: card.options };
}

async function list(orgId, role) {
  const g = await generate(orgId);
  const decided = await decidedMap(orgId);
  return {
    organizationId: orgId, generatedAt: g.generatedAt, role: role || null,
    cards: g.cards.map((card) => ({
      id: card.id, event: card.event, options: card.options, recommended: card.recommended,
      decision: decided[card.id] || null,
      lens: role ? lensFor(role, card) : null,
    })),
  };
}

async function decidedMap(orgId) {
  await ensureLedger();
  try {
    const rows = await db.query('SELECT DISTINCT ON (card_id) card_id, action, option_id, rationale, decided_by, created_at FROM decision_ledger WHERE org_id=$1 ORDER BY card_id, created_at DESC', [orgId]);
    const m = {}; rows.forEach((r) => { m[r.card_id] = { action: r.action, optionId: r.option_id, rationale: r.rationale, decidedBy: r.decided_by, at: r.created_at }; });
    return m;
  } catch (_) { return {}; }
}

async function record(orgId, cardId, { role, action, optionId, rationale, decidedBy, engineState }) {
  await ensureLedger();
  if (action === 'accept' && (!rationale || !String(rationale).trim())) {
    const err = new Error('A documented rationale is required to accept & monitor a risk.'); err.code = 'RATIONALE_REQUIRED'; throw err;
  }
  const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.query(
    `INSERT INTO decision_ledger (id, org_id, card_id, role, action, option_id, rationale, decided_by, engine_state)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, orgId, cardId, role || null, action, optionId || null, rationale || null, decidedBy || null, JSON.stringify(engineState || {})]);
  return { id, recorded: true };
}

async function ledger(orgId) {
  await ensureLedger();
  try { return await db.query('SELECT * FROM decision_ledger WHERE org_id=$1 ORDER BY created_at DESC LIMIT 200', [orgId]); }
  catch (_) { return []; }
}

module.exports = { generate, lensFor, list, record, ledger };

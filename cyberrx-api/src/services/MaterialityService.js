'use strict';

/**
 * MaterialityService — SEC cyber-incident materiality determination & 8-K Item
 * 1.05 workflow for the CLO lens.
 *
 * Builds on the existing materiality SCREENING (CloTriggerService) by adding the
 * formal DETERMINATION workflow a US public company needs: record a material /
 * not-material determination with rationale, start the 4-business-day Item 1.05
 * clock on an affirmative determination, write every step to the tamper-evident
 * decision ledger, draft the 8-K (human review before filing), and export a
 * defensible disclosure package.
 *
 * Decision-support only — not legal advice. Counsel makes the determination and
 * approves any filing; nothing is auto-filed.
 */

const crypto = require('crypto');
const db = require('../utils/db');
const logger = require('../utils/logger');
const Engine = require('./DecisionEngineService');
const { prov } = require('../utils/provenance');

const DEFAULT_THRESHOLD = 1000000; // entity-specific; override via tenant config.
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 12);
async function safeRows(sql, p = []) { try { return await db.query(sql, p); } catch (e) { logger.debug('materiality query degraded', { error: e.message }); return []; } }

// SEC qualitative materiality factors (TSC Industries "total mix" + 1.05 intent).
const QUAL_FACTORS = [
  { id: 'financial', label: 'Financial impact — direct loss, remediation, lost revenue' },
  { id: 'operational', label: 'Operational disruption to critical systems or processes' },
  { id: 'data', label: 'Sensitive data compromised (PII / PHI / IP / trade secrets)' },
  { id: 'reputational', label: 'Reputational or customer-trust harm' },
  { id: 'legalreg', label: 'Legal or regulatory exposure (litigation, enforcement)' },
  { id: 'strategic', label: 'Strategic / competitive harm' },
];

async function ensureTable() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS materiality_assessments (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, event_ref TEXT NOT NULL, title TEXT,
      status TEXT, determination TEXT, factors JSONB DEFAULT '{}', quant JSONB DEFAULT '{}',
      rationale TEXT, determined_by TEXT, determined_at TIMESTAMPTZ, filing_deadline TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now())`);
  } catch (e) { logger.debug('materiality ensureTable failed', { error: e.message }); }
}

async function thresholdUSD(orgId) {
  try { const cfg = await require('./TenantConfigService').get(orgId); const t = Number(cfg.config && cfg.config.materialityThresholdUSD); return Number.isFinite(t) && t > 0 ? t : DEFAULT_THRESHOLD; }
  catch (_) { return DEFAULT_THRESHOLD; }
}

// Add N business days (skip Sat/Sun) — the SEC Item 1.05 four-business-day clock.
function businessDayDeadline(startISO, days) {
  const d = new Date(startISO); let added = 0;
  while (added < days) { d.setUTCDate(d.getUTCDate() + 1); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6) added++; }
  return d.toISOString();
}

function hydrate(r) {
  return {
    id: r.id, eventRef: r.event_ref, title: r.title, status: r.status, determination: r.determination,
    factors: typeof r.factors === 'string' ? JSON.parse(r.factors) : r.factors,
    quant: typeof r.quant === 'string' ? JSON.parse(r.quant) : r.quant,
    rationale: r.rationale, determinedBy: r.determined_by, determinedAt: r.determined_at, filingDeadline: r.filing_deadline,
  };
}

// Candidate incidents (the screened scenarios) + any existing determinations.
async function list(orgId) {
  await ensureTable();
  const t = await thresholdUSD(orgId);
  let scenarios = [];
  try { const tr = await require('./CloTriggerService').getTriggers(orgId); scenarios = tr.scenarios || []; } catch (_) {}
  const rows = await safeRows('SELECT * FROM materiality_assessments WHERE org_id=$1 ORDER BY created_at DESC', [orgId]);
  const byRef = {}; rows.forEach((r) => { byRef[r.event_ref] = r; });
  const candidates = scenarios.map((s) => ({
    eventRef: s.id, title: s.title, severity: s.severity, scenarioType: s.scenarioType,
    lossExpected: (s.loss && s.loss.expected) || 0, lossP90: (s.loss && s.loss.p90) || 0,
    screenedMaterial: !!(s.materiality && s.materiality.material),
    quantExceeds: ((s.loss && s.loss.expected) || 0) >= t,
    dataAtRisk: s.dataAtRisk || null,
    assessment: byRef[s.id] ? hydrate(byRef[s.id]) : null,
  }));
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(), thresholdUSD: t, factors: QUAL_FACTORS,
    candidates, assessments: rows.map(hydrate),
    counts: { determined: rows.length, material: rows.filter((r) => r.determination === 'material').length },
    provenance: prov('derived', 'SEC materiality workflow'),
    disclaimer: 'Decision-support only — not legal advice. Counsel determines materiality and approves any filing; nothing is filed automatically.',
  };
}

// Record a determination (material / not_material / pending) and start the clock.
async function determine(orgId, body = {}) {
  await ensureTable();
  const { eventRef, title, factors, determination, rationale, decidedBy, quant } = body;
  if (!eventRef || !determination) throw new Error('eventRef and determination are required.');
  if (!['material', 'not_material', 'pending'].includes(determination)) throw new Error('determination must be material, not_material, or pending.');
  if (!rationale || !String(rationale).trim()) { const e = new Error('A documented rationale is required for a materiality determination.'); e.code = 'RATIONALE_REQUIRED'; throw e; }
  const material = determination === 'material';
  const determinedAt = new Date().toISOString();
  const filingDeadline = material ? businessDayDeadline(determinedAt, 4) : null;
  const id = `mat_${orgId}_${hash(eventRef)}`;
  await db.query(
    `INSERT INTO materiality_assessments (id, org_id, event_ref, title, status, determination, factors, quant, rationale, determined_by, determined_at, filing_deadline)
     VALUES ($1,$2,$3,$4,'determined',$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, status='determined', determination=EXCLUDED.determination,
       factors=EXCLUDED.factors, quant=EXCLUDED.quant, rationale=EXCLUDED.rationale, determined_by=EXCLUDED.determined_by,
       determined_at=EXCLUDED.determined_at, filing_deadline=EXCLUDED.filing_deadline`,
    [id, orgId, eventRef, title || eventRef, determination, JSON.stringify(factors || {}), JSON.stringify(quant || {}), rationale, decidedBy || 'CLO', determinedAt, filingDeadline]);
  // Defensible record → the tamper-evident decision ledger.
  try { await Engine.record(orgId, `materiality:${eventRef}`, { role: 'CLO', action: 'select', optionId: `materiality:${determination}`, rationale, decidedBy: decidedBy || 'CLO', engineState: { title, factors, quant, filingDeadline } }); }
  catch (e) { logger.debug('materiality ledger write failed', { error: e.message }); }
  return { id, determination, material, determinedAt, filingDeadline };
}

async function getOne(orgId, id) {
  await ensureTable();
  const rows = await safeRows('SELECT * FROM materiality_assessments WHERE org_id=$1 AND id=$2', [orgId, id]);
  return rows[0] ? hydrate(rows[0]) : null;
}

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try { const Anthropic = require('@anthropic-ai/sdk'); return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); } catch (_) { return null; }
}

function deterministic8k(a) {
  const q = a.quant || {};
  const yes = Object.entries(a.factors || {}).filter(([, v]) => v === 'yes').map(([k]) => k);
  const date = a.determinedAt ? new Date(a.determinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[determination date]';
  return [
    'Item 1.05 Material Cybersecurity Incidents.',
    '',
    `On ${date}, the Company determined that a cybersecurity incident is material. The Company is providing this disclosure pursuant to Item 1.05 of Form 8-K.`,
    '',
    `Nature and scope. The incident relates to ${a.title || 'a cybersecurity event affecting Company systems'}${q.scenarioType ? ` (${q.scenarioType})` : ''}. The Company has initiated its incident-response process, is investigating, and where appropriate has engaged third-party experts and notified law enforcement.`,
    '',
    `Material impact / reasonably likely impact. Based on information available as of the date of this report, the Company's assessment indicates ${q.lossExpected ? `an estimated financial impact in the range of ${usd(q.lossExpected)} (with a reasonably-possible severe case of ${usd(q.lossP90 || q.lossExpected)})` : 'a potentially material financial impact'}${yes.length ? `, together with ${yes.join(', ')} considerations` : ''}. The Company continues to assess the full scope, and the impact may change as the investigation progresses.`,
    '',
    'The Company has not, as of the date of this report, determined that the incident has had or is reasonably likely to have a material impact beyond what is described above, and will amend this filing as required.',
    '',
    '[DRAFT — for counsel review. Omit technical details that would impede response or remediation. Not legal advice; nothing is filed automatically.]',
  ].join('\n');
}

async function draft8k(orgId, id) {
  const a = await getOne(orgId, id);
  if (!a) throw new Error('Assessment not found.');
  const fallback = deterministic8k(a);
  const client = getAnthropic();
  if (!client) return { draft: fallback, model: 'deterministic', isDraft: true };
  try {
    const resp = await client.messages.create({
      model: process.env.ANTHROPIC_SUMMARY_MODEL || 'claude-opus-4-8', max_tokens: 900, temperature: 0.2,
      messages: [{ role: 'user', content:
        'Draft a factual SEC Form 8-K Item 1.05 (Material Cybersecurity Incidents) disclosure from this determination. Be concise and factual; describe the material impact or reasonably likely material impact; do NOT include technical details that would impede remediation. Mark it clearly as a draft for counsel review. Determination JSON:\n\n' + JSON.stringify(a) }],
    });
    const t = (resp.content && resp.content[0] && resp.content[0].text) || '';
    return { draft: t.trim() || fallback, model: resp.model || 'llm', isDraft: true };
  } catch (e) { logger.warn('8-K draft LLM failed', { error: e.message }); return { draft: fallback, model: 'deterministic', isDraft: true }; }
}

// Defensible disclosure package: assessment + the hash-chained ledger entries for
// this event + an integrity proof.
async function evidencePackage(orgId, id) {
  const a = await getOne(orgId, id);
  if (!a) throw new Error('Assessment not found.');
  let ledger = [];
  try { ledger = (await Engine.ledger(orgId)).filter((r) => r.card_id === `materiality:${a.eventRef}`); } catch (_) {}
  let integrity = null; try { integrity = await Engine.verifyLedger(orgId); } catch (_) {}
  const draft = await draft8k(orgId, id).catch(() => null);
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    assessment: a, draft8k: draft, ledger, integrity,
    manifest: { entries: ledger.length, chainValid: integrity ? integrity.valid : null, rootHash: integrity ? integrity.rootHash : null },
    disclaimer: 'Decision-support artifact for counsel. Not legal advice; nothing is filed automatically.',
  };
}

module.exports = { list, determine, draft8k, evidencePackage, getOne, QUAL_FACTORS, businessDayDeadline };

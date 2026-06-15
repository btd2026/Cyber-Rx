'use strict';

/**
 * VendorRiskSynthesisService — a single, defensible vendor risk that is
 * INCLUSIVE of (a) monitoring scores/signals pulled from connected services
 * (SecurityScorecard, BitSight, etc.) and (b) review of the vendor's assurance
 * documents (SOC 2 Type II, HITRUST, ISO 27001, pen test, BAA …).
 *
 * Uses the LLM to synthesize a clear assessment when ANTHROPIC_API_KEY is set,
 * with a deterministic fallback. The result is persisted (vendor_risk_assessment)
 * and is intended to feed all downstream risk calculations.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const ContinuousMonitoring = require('./ContinuousMonitoringService');

// Assurance documents that materially reduce vendor risk when current + reviewed.
const KEY_DOCS = [
  { keys: ['soc2', 'soc 2', 'soc2_type2', 'soc 2 type ii'], label: 'SOC 2 Type II', weight: 6 },
  { keys: ['hitrust'], label: 'HITRUST CSF', weight: 6 },
  { keys: ['iso27001', 'iso 27001'], label: 'ISO 27001', weight: 4 },
  { keys: ['pentest', 'penetration'], label: 'Penetration test', weight: 3 },
  { keys: ['baa'], label: 'HIPAA BAA', weight: 3 },
  { keys: ['vulnscan', 'vulnerability'], label: 'Vulnerability scan', weight: 2 },
  { keys: ['bcdr', 'bc/dr', 'continuity'], label: 'BC/DR plan', weight: 2 },
];

function classifyDocs(documents = []) {
  const present = []; const have = new Set();
  for (const d of documents) {
    const t = String(d.docType || d.type || d.docLabel || d || '').toLowerCase();
    for (const kd of KEY_DOCS) {
      if (kd.keys.some((k) => t.includes(k)) && !have.has(kd.label)) { present.push(kd); have.add(kd.label); }
    }
  }
  const missing = KEY_DOCS.filter((kd) => !have.has(kd.label) && kd.weight >= 3).map((kd) => kd.label);
  const assuranceBonus = Math.min(18, present.reduce((s, kd) => s + kd.weight, 0));
  return { present: present.map((kd) => kd.label), missing, assuranceBonus };
}

const ratingFor = (risk) => (risk >= 70 ? 'Critical' : risk >= 45 ? 'High' : risk >= 25 ? 'Moderate' : 'Low');

async function signalSummary(orgId, vendorId) {
  try {
    const rows = await db.query(
      `SELECT severity, COUNT(*)::int n FROM vendor_risk_signals
        WHERE organization_id=$1 AND vendor_id=$2 AND status='active' GROUP BY severity`, [orgId, vendorId]);
    const by = {}; rows.forEach((r) => { by[r.severity] = r.n; });
    return by;
  } catch (_) { return {}; }
}

async function llmSynthesize(ctx) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = `You are a third-party risk analyst for a health-insurance payer. Produce ONE defensible vendor risk
assessment that combines the monitoring posture with the assurance documents on file.

VENDOR: ${ctx.vendorName}
MONITORING POSTURE (0-100, higher = better): ${ctx.monitoringScore}
ACTIVE SIGNALS BY SEVERITY: ${JSON.stringify(ctx.signals)}
ASSURANCE DOCS ON FILE: ${ctx.present.join(', ') || 'none'}
KEY DOCS MISSING: ${ctx.missing.join(', ') || 'none'}

Return ONLY JSON:
{"overall_risk":<0-100 higher=worse>,"rating":"Low|Moderate|High|Critical","summary":"<2 sentences>","factors":["..."],"recommended_actions":["..."]}`;
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 700, temperature: 0, messages: [{ role: 'user', content: prompt }],
  });
  const raw = (resp.content || []).map((c) => c.text || '').join('');
  return JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
}

function deterministic(ctx) {
  // Posture (higher=better) adjusted by document assurance, then inverted to risk.
  const posture = Math.max(0, Math.min(100, ctx.monitoringScore + ctx.assuranceBonus - (ctx.missing.length * 4)));
  const overall = 100 - posture;
  const factors = [];
  factors.push(`Monitoring posture ${ctx.monitoringScore}/100`);
  if (ctx.signals.Critical) factors.push(`${ctx.signals.Critical} active critical signal(s)`);
  if (ctx.signals.High) factors.push(`${ctx.signals.High} active high signal(s)`);
  if (ctx.present.length) factors.push(`Assurance on file: ${ctx.present.join(', ')}`);
  if (ctx.missing.length) factors.push(`Missing key assurance: ${ctx.missing.join(', ')}`);
  const actions = [];
  if (ctx.missing.includes('SOC 2 Type II')) actions.push('Request a current SOC 2 Type II report.');
  if (ctx.missing.includes('HITRUST CSF')) actions.push('Request HITRUST CSF certification or compensating evidence.');
  if (ctx.signals.Critical || ctx.signals.High) actions.push('Triage active critical/high monitoring signals with the vendor.');
  if (!actions.length) actions.push('Maintain monitoring and re-review assurance annually.');
  return {
    overall_risk: overall, rating: ratingFor(overall),
    summary: `Combined view of ${ctx.vendorName}: monitoring posture ${ctx.monitoringScore}/100 with ${ctx.present.length} assurance document(s) on file${ctx.missing.length ? ` and ${ctx.missing.length} key document(s) missing` : ''}. Overall third-party risk is ${ratingFor(overall)}.`,
    factors, recommended_actions: actions,
  };
}

async function synthesize(orgId, vendorId, { vendorName, documents = [] } = {}) {
  const mon = await ContinuousMonitoring.calculateVendorRiskScore(vendorId, orgId).catch(() => ({ overallScore: 50 }));
  const signals = await signalSummary(orgId, vendorId);
  const docs = classifyDocs(documents);
  const ctx = { vendorName: vendorName || vendorId, monitoringScore: mon.overallScore != null ? mon.overallScore : 50, signals, ...docs };

  let result; let engine = 'deterministic';
  if (process.env.ANTHROPIC_API_KEY) {
    try { result = await llmSynthesize(ctx); engine = 'llm'; } catch (e) { logger.debug('vendor synth fell back', { error: e.message }); }
  }
  if (!result) result = deterministic(ctx);
  const overall = Math.max(0, Math.min(100, Math.round(result.overall_risk)));
  const rating = result.rating || ratingFor(overall);

  await db.query(
    `INSERT INTO vendor_risk_assessment
       (id, organization_id, vendor_id, vendor_name, overall_risk, rating, monitoring_score, summary,
        factors, recommended_actions, document_assurance, inputs, engine, computed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
     ON CONFLICT (organization_id, vendor_id) DO UPDATE SET
       vendor_name=EXCLUDED.vendor_name, overall_risk=EXCLUDED.overall_risk, rating=EXCLUDED.rating,
       monitoring_score=EXCLUDED.monitoring_score, summary=EXCLUDED.summary, factors=EXCLUDED.factors,
       recommended_actions=EXCLUDED.recommended_actions, document_assurance=EXCLUDED.document_assurance,
       inputs=EXCLUDED.inputs, engine=EXCLUDED.engine, computed_at=NOW()`,
    [`vra_${orgId}_${vendorId}`, orgId, vendorId, ctx.vendorName, overall, rating, ctx.monitoringScore,
      result.summary, JSON.stringify(result.factors || []), JSON.stringify(result.recommended_actions || []),
      JSON.stringify({ present: docs.present, missing: docs.missing }), JSON.stringify({ signals, documents: documents.length }), engine]);

  return { vendorId, vendorName: ctx.vendorName, overall_risk: overall, rating, monitoring_score: ctx.monitoringScore, summary: result.summary, factors: result.factors || [], recommended_actions: result.recommended_actions || [], document_assurance: { present: docs.present, missing: docs.missing }, engine };
}

async function getLatest(orgId, vendorId) {
  const rows = await db.query('SELECT * FROM vendor_risk_assessment WHERE organization_id=$1 AND vendor_id=$2', [orgId, vendorId]);
  return rows[0] || null;
}

module.exports = { synthesize, getLatest, classifyDocs };

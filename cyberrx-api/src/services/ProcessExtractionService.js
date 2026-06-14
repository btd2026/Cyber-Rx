'use strict';

/**
 * ProcessExtractionService — extract the business-function → process hierarchy
 * (with RTO-based criticality) from an uploaded process / BIA document.
 *
 * The Organization Intake no longer preloads a fixed process taxonomy. Instead
 * the user uploads their own process inventory or business-impact analysis, and
 * this service uses the LLM (Anthropic, with a deterministic fallback) to extract
 * and group processes, categorize them by RTO priority, and return a structure
 * the wizard renders as a validation checklist (the user unchecks out-of-scope
 * items). Nothing is fabricated: with no usable text we return an empty result.
 */

const logger = require('../utils/logger');

// RTO string -> minutes, for priority sorting (lower RTO = higher priority).
function rtoMinutes(rto) {
  if (rto == null) return null;
  const s = String(rto).trim().toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(m|min|minute|h|hr|hour|d|day|w|week)/);
  if (!m) { const n = parseFloat(s); return Number.isFinite(n) ? n * 60 : null; }
  const n = parseFloat(m[1]); const u = m[2];
  if (u.startsWith('m')) return n;
  if (u.startsWith('h')) return n * 60;
  if (u.startsWith('d')) return n * 60 * 24;
  if (u.startsWith('w')) return n * 60 * 24 * 7;
  return null;
}

// Tier from RTO when the document doesn't state one explicitly.
function tierFromRto(mins) {
  if (mins == null) return null;
  if (mins <= 4 * 60) return 1;       // <= 4h
  if (mins <= 24 * 60) return 2;      // <= 1d
  if (mins <= 72 * 60) return 3;      // <= 3d
  return 4;
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'process';

// Normalize an extracted record into the wizard's shape.
function shape(rec, i) {
  const name = String(rec.process || rec.name || '').trim();
  if (!name) return null;
  const fn = String(rec.function || rec.business_function || 'General').trim() || 'General';
  const rto = rec.rto != null && String(rec.rto).trim() ? String(rec.rto).trim() : null;
  const mins = rtoMinutes(rto);
  let tier = rec.tier != null ? parseInt(rec.tier, 10) : null;
  if (!(tier >= 1 && tier <= 4)) tier = tierFromRto(mins);
  return {
    id: `${slug(fn)}__${slug(name)}__${i}`,
    function: fn,
    name,
    rto,
    rtoMinutes: mins,
    tier: tier || null,
    criticality: rec.criticality ? String(rec.criticality).trim() : (tier === 1 ? 'Critical' : tier === 2 ? 'High' : tier ? 'Moderate' : null),
  };
}

// Group by business function; sort functions and processes by RTO priority.
function group(records) {
  const flat = records.map(shape).filter(Boolean);
  const byFn = new Map();
  for (const p of flat) {
    if (!byFn.has(p.function)) byFn.set(p.function, []);
    byFn.get(p.function).push(p);
  }
  const rank = (m) => (m == null ? Number.POSITIVE_INFINITY : m);
  const functions = Array.from(byFn.entries()).map(([fn, procs]) => {
    procs.sort((a, b) => rank(a.rtoMinutes) - rank(b.rtoMinutes));
    const top = procs.length ? rank(procs[0].rtoMinutes) : Number.POSITIVE_INFINITY;
    return { function: fn, topRto: top, processes: procs };
  });
  functions.sort((a, b) => a.topRto - b.topRto);
  functions.forEach((f) => { delete f.topRto; });
  return { functions, flat };
}

async function llmExtract(text) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = `You are a business-continuity analyst for a health-insurance payer.
From the DOCUMENT below, extract the organization's business functions and the
processes under each, with the recovery time objective (RTO) when stated.

Return ONLY JSON of the form:
{"processes":[{"function":"<business function>","process":"<process name>","rto":"<e.g. 4h, 24h, 3d, or empty>","tier":<1-4 or null>,"criticality":"<Critical|High|Moderate|Low or empty>"}]}

Rules:
- Use ONLY processes evidenced in the document. Do not invent processes.
- "function" groups related processes (e.g. Claims, Enrollment, Care Management, Finance).
- Lower RTO means higher priority. If tier is not stated, leave it null.

DOCUMENT (may be truncated):
"""${String(text || '').slice(0, 16000)}"""`;
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 2000, temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = (resp.content || []).map((c) => c.text || '').join('');
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const arr = Array.isArray(json.processes) ? json.processes : [];
  return { records: arr, engine: 'llm' };
}

// Deterministic fallback: scan the document for known payer processes and any
// nearby RTO. Never fabricates — only emits processes whose name appears in text.
const PAYER_PROCESSES = [
  ['Claims', 'Claims Adjudication'], ['Claims', 'Claims Processing'], ['Claims', 'Claims Payment'],
  ['Enrollment', 'Enrollment'], ['Enrollment', 'Eligibility'], ['Enrollment', 'Membership'],
  ['Provider', 'Provider Network Management'], ['Provider', 'Credentialing'], ['Provider', 'Provider Data Management'],
  ['Care Management', 'Care Management'], ['Care Management', 'Utilization Management'], ['Care Management', 'Prior Authorization'],
  ['Member Services', 'Member Services'], ['Member Services', 'Member Portal'], ['Member Services', 'Contact Center'],
  ['Pharmacy', 'Pharmacy Benefit Management'], ['Pharmacy', 'Formulary Management'],
  ['Finance', 'Premium Billing'], ['Finance', 'Finance / Accounting'], ['Finance', 'Actuarial / Underwriting'],
  ['Compliance', 'Compliance & Regulatory Reporting'], ['Compliance', 'Fraud, Waste & Abuse'],
  ['EDI', 'EDI / Clearinghouse'], ['Analytics', 'Data & Analytics'], ['IT & Security', 'IT Operations'],
];

function heuristicExtract(text) {
  const hay = String(text || '').toLowerCase();
  if (!hay.trim()) return { records: [], engine: 'none' };
  const records = [];
  for (const [fn, name] of PAYER_PROCESSES) {
    const idx = hay.indexOf(name.toLowerCase());
    if (idx === -1) continue;
    // Look for an RTO within ~120 chars of the mention.
    const window = hay.slice(idx, idx + 120);
    const m = window.match(/rto[^0-9]{0,12}(\d+(?:\.\d+)?\s*(?:m|min|minute|h|hr|hour|d|day|w|week))/);
    records.push({ function: fn, process: name, rto: m ? m[1].replace(/\s+/g, '') : null });
  }
  return { records, engine: records.length ? 'heuristic' : 'none' };
}

async function extract(text) {
  if (!String(text || '').trim()) return { functions: [], flat: [], engine: 'none', count: 0 };
  let res;
  if (process.env.ANTHROPIC_API_KEY) {
    try { res = await llmExtract(text); }
    catch (e) { logger.debug('process extract fell back to heuristic', { error: e.message }); }
  }
  if (!res || !res.records.length) res = heuristicExtract(text);
  const grouped = group(res.records);
  return { ...grouped, engine: res.engine, count: grouped.flat.length };
}

module.exports = { extract, group, rtoMinutes, tierFromRto, _heuristicExtract: heuristicExtract };

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

// Normalize an extracted record into a flat shape (one row may carry a subprocess).
function shape(rec, i) {
  const name = String(rec.process || rec.name || '').trim();
  if (!name) return null;
  const fn = String(rec.function || rec.business_function || 'General').trim() || 'General';
  const sub = String(rec.subprocess || rec.sub_process || '').trim() || null;
  const rto = rec.rto != null && String(rec.rto).trim() ? String(rec.rto).trim() : null;
  const mins = rtoMinutes(rto);
  let tier = rec.tier != null ? parseInt(rec.tier, 10) : null;
  if (!(tier >= 1 && tier <= 4)) tier = tierFromRto(mins);
  return {
    id: `${slug(fn)}__${slug(name)}__${i}`,
    function: fn,
    name,
    subprocess: sub,
    rto,
    rtoMinutes: mins,
    tier: tier || null,
    criticality: rec.criticality ? String(rec.criticality).trim() : (tier === 1 ? 'Critical' : tier === 2 ? 'High' : tier ? 'Moderate' : null),
  };
}

const rank = (m) => (m == null ? Number.POSITIVE_INFINITY : m);

// Group into function → process → sub-process, sorted by RTO priority.
function group(records) {
  const rows = records.map(shape).filter(Boolean);
  const byFn = new Map();                      // fn -> Map(processName -> processObj)
  let i = 0;
  for (const r of rows) {
    if (!byFn.has(r.function)) byFn.set(r.function, new Map());
    const procs = byFn.get(r.function);
    if (!procs.has(r.name)) {
      procs.set(r.name, {
        id: `${slug(r.function)}__${slug(r.name)}`,
        name: r.name, rto: null, rtoMinutes: null, tier: null, criticality: null, subprocesses: [],
      });
    }
    const proc = procs.get(r.name);
    if (r.subprocess) {
      proc.subprocesses.push({
        id: `${proc.id}__${slug(r.subprocess)}__${i++}`,
        name: r.subprocess, rto: r.rto, rtoMinutes: r.rtoMinutes, tier: r.tier, criticality: r.criticality,
      });
    } else if (proc.rto == null && proc.tier == null) {
      // process-level attributes come from the row without a subprocess
      proc.rto = r.rto; proc.rtoMinutes = r.rtoMinutes; proc.tier = r.tier; proc.criticality = r.criticality;
    }
  }

  const functions = Array.from(byFn.entries()).map(([fn, procMap]) => {
    const processes = Array.from(procMap.values()).map((p) => {
      // If a process has no own RTO/tier, inherit the tightest of its sub-processes.
      if (p.rtoMinutes == null && p.subprocesses.length) {
        const best = p.subprocesses.reduce((a, s) => (rank(s.rtoMinutes) < rank(a.rtoMinutes) ? s : a), p.subprocesses[0]);
        p.rto = p.rto || best.rto; p.rtoMinutes = best.rtoMinutes; p.tier = p.tier || best.tier;
      }
      p.subprocesses.sort((a, b) => rank(a.rtoMinutes) - rank(b.rtoMinutes));
      return p;
    });
    processes.sort((a, b) => rank(a.rtoMinutes) - rank(b.rtoMinutes));
    const top = processes.length ? rank(processes[0].rtoMinutes) : Number.POSITIVE_INFINITY;
    return { function: fn, topRto: top, processes };
  });
  functions.sort((a, b) => a.topRto - b.topRto);
  functions.forEach((f) => { delete f.topRto; });

  // flat = top-level processes (for selection / canonical mapping in the wizard)
  const flat = [];
  functions.forEach((f) => f.processes.forEach((p) => flat.push({
    id: p.id, function: f.function, name: p.name, rto: p.rto, rtoMinutes: p.rtoMinutes, tier: p.tier, criticality: p.criticality,
  })));
  return { functions, flat };
}

async function llmExtract(text) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = `You are a business-continuity analyst for a health-insurance payer.
From the DOCUMENT below, extract the organization's business functions, the
processes under each, and any sub-processes, with the recovery time objective
(RTO) and criticality tier when stated.

Return ONLY JSON of the form:
{"processes":[{"function":"<business function>","process":"<process name>","subprocess":"<sub-process name or empty>","rto":"<e.g. 4h, 24h, 3d, or empty>","tier":<1-4 or null>,"criticality":"<Critical|High|Moderate|Low or empty>"}]}

Rules:
- Use ONLY items evidenced in the document. Do not invent processes.
- "function" groups related processes (e.g. Claims, Enrollment, Care Management, Finance).
- Emit one row per process, and an additional row per sub-process (same function+process, with "subprocess" filled).
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

// ---- tree extraction for the intake validation tree ------------------------
// Returns a FLAT node list (function -> process -> subprocess) with parent refs,
// per-node confidence + source — the strict JSON the validation tree renders.
// Nothing is auto-accepted; the user validates before anything persists.
const CONF = { llm: 0.8, heuristic: 0.55, none: 0.5 };

async function extractTree(text) {
  if (!String(text || '').trim()) return { nodes: [], engine: 'none', count: 0 };
  // Reuse the grouped extraction, then flatten into provenance-carrying nodes.
  let res;
  if (process.env.ANTHROPIC_API_KEY) {
    try { res = await llmExtract(text); } catch (e) { logger.debug('tree extract fell back', { error: e.message }); }
  }
  if (!res || !res.records.length) res = heuristicExtract(text);
  const engine = res.engine || 'none';
  const baseConf = CONF[engine] != null ? CONF[engine] : 0.5;
  const { functions } = group(res.records);
  const nodes = [];
  functions.forEach((f) => {
    const fid = `fn__${slug(f.function)}`;
    nodes.push({ id: fid, name: f.function, level: 'function', parent: null, confidence: round2(baseConf + 0.1), source: engine, rationale: 'Business function grouping inferred from the document.' });
    f.processes.forEach((p) => {
      nodes.push({ id: p.id, name: p.name, level: 'process', parent: fid, rto: p.rto || '', tier: p.tier || null, criticality: p.criticality || '', confidence: round2(baseConf), source: engine, rationale: p.rto ? `Process with stated RTO ${p.rto}.` : 'Process identified in the document.' });
      (p.subprocesses || []).forEach((s) => {
        nodes.push({ id: s.id, name: s.name, level: 'subprocess', parent: p.id, rto: s.rto || '', tier: s.tier || null, criticality: s.criticality || '', confidence: round2(baseConf - 0.05), source: engine, rationale: 'Sub-process under the parent process.' });
      });
    });
  });
  return { nodes, engine, count: nodes.length };
}
const round2 = (n) => Math.max(0.1, Math.min(0.99, Math.round(n * 100) / 100));

module.exports = { extract, extractTree, group, rtoMinutes, tierFromRto, _heuristicExtract: heuristicExtract };

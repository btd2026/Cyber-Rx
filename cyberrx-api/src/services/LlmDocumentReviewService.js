'use strict';

/**
 * LlmDocumentReviewService — analyst-grade document review.
 *
 * Where the keyword analyzer in routes/documents.js decides an attribute is
 * "present" from a regex hit, this reads the policy the way a senior GRC
 * assessor would: for every expected control attribute it makes a semantic
 * judgment (does the language actually satisfy the control's intent?), pulls a
 * verbatim evidence quote when satisfied, and writes a one-line reasoning /
 * gap note when not. It returns the SAME shape the keyword analyzer returns
 * (so the cockpit and stored doc-scores need no format change), enriched with
 * `evidence` + `reasoning` per attribute, a per-control `narrative`, and
 * `engine:'llm'`.
 *
 * Grounding rules baked into the prompt: quote only text that appears verbatim
 * in the document; never infer a control from an unrelated mention; a control
 * with no supporting language scores its attributes not-found. If the model is
 * unavailable (no API key), errors, or times out, this returns null and the
 * caller falls back to the deterministic keyword analyzer — so the endpoint
 * never fails because the LLM is down.
 */

const logger = require('../utils/logger');

// Model + limits (env-overridable). Opus is the flagship judge; the request
// omits sampling params (rejected on Opus 4.8) and uses adaptive thinking.
const MODEL = (process.env.DOC_REVIEW_MODEL || 'claude-opus-4-8').trim();
const MAX_TOKENS = Number(process.env.DOC_REVIEW_MAX_TOKENS) || 12000;
const TIMEOUT_MS = Number(process.env.DOC_REVIEW_TIMEOUT_MS) || 90000;
const MAX_CHARS = Number(process.env.DOC_REVIEW_MAX_CHARS) || 90000; // ~22K tokens of policy text

let _client;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (_client) return _client;
  try {
    const A = require('@anthropic-ai/sdk');
    const Anthropic = A.default || A;
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS });
    return _client;
  } catch (e) { logger.warn(`Anthropic SDK unavailable for doc review: ${e.message}`); return null; }
}

const textOf = (resp) => ((resp && resp.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

// Per-model list price, USD per 1M tokens [input, output]. Cache reads bill at
// ~0.1x input, cache writes at ~1.25x input. Keep in sync with Anthropic pricing.
const PRICING = {
  'claude-opus-4-8': [5, 25], 'claude-opus-4-7': [5, 25], 'claude-opus-4-6': [5, 25],
  'claude-sonnet-5': [3, 15], 'claude-sonnet-4-6': [3, 15], 'claude-haiku-4-5': [1, 5],
  'claude-haiku-4-5-20251001': [1, 5], 'claude-fable-5': [10, 50],
};
function estimateCostUsd(model, usage) {
  const rate = PRICING[model] || PRICING[Object.keys(PRICING).find((k) => model.indexOf(k) === 0)] || [5, 25];
  const inTok = Number(usage.input_tokens) || 0;
  const outTok = Number(usage.output_tokens) || 0;
  const cacheRead = Number(usage.cache_read_input_tokens) || 0;
  const cacheWrite = Number(usage.cache_creation_input_tokens) || 0;
  const cost = (inTok * rate[0] + outTok * rate[1] + cacheRead * rate[0] * 0.1 + cacheWrite * rate[0] * 1.25) / 1e6;
  return Math.round(cost * 1e4) / 1e4; // 4dp (fractions of a cent)
}

function scoreCMMI(matched, total) {
  if (total === 0) return 1;
  const pct = matched / total;
  if (pct >= 0.9) return 5;
  if (pct >= 0.75) return 4;
  if (pct >= 0.55) return 3;
  if (pct >= 0.35) return 2;
  return 1;
}
const CMMI_LABEL = { 1: 'Initial', 2: 'Managed', 3: 'Defined', 4: 'Quantitatively Managed', 5: 'Optimizing' };

const SYSTEM_PROMPT = [
  'You are a senior cybersecurity GRC assessor performing a control-by-control',
  'document review against the NIST CSF 2.0 and NIST SP 800-53 Rev 5 catalogs, to',
  'a standard at or above an experienced human auditor. You read a single policy',
  'document and, for each control and each expected attribute, judge whether the',
  "document's language actually satisfies the control's intent — semantically, not",
  'by keyword. Rules you must never break:',
  '1. Quote ONLY text that appears verbatim in the document. If you cannot quote it,',
  '   the attribute is not satisfied. Never fabricate or paraphrase a quote.',
  '2. Judge intent, not vocabulary: a policy can satisfy "review cadence" by saying',
  '   "revisited each fiscal year" even without the word "review"; and a passing',
  '   keyword in an unrelated sentence does NOT satisfy the attribute.',
  '3. A control the document does not address scores every attribute not-found with',
  '   a short reason; do not infer coverage from adjacent topics.',
  '4. CMMI 1 Initial (ad hoc) · 2 Managed (documented, inconsistent) · 3 Defined',
  '   (standardized) · 4 Quantitatively Managed (measured) · 5 Optimizing (continuously',
  '   improving). Base it on how completely and maturely the attributes are evidenced.',
  'Return ONLY the JSON object described — no prose, no code fences.',
].join('\n');

function buildUserPrompt(text, mapping) {
  const controls = mapping.controls.map((c) => ({
    id: c.id,
    name: c.name,
    attrs: c.attrs.map((a) => ({ key: a.key, requirement: a.label })),
  }));
  return [
    'CONTROL CATALOG for this document type (' + (mapping.framework || 'NIST') + '):',
    JSON.stringify(controls, null, 2),
    '',
    'DOCUMENT TEXT (the only evidence you may quote):',
    '"""',
    text,
    '"""',
    '',
    'For every control and every attribute, return JSON with this exact shape:',
    '{"controls":[{"id":"<control id>","cmmi":<1-5>,"narrative":"<2-3 sentence assessor',
    'finding: what the policy does and does not establish for this control>","gap":"<what',
    'to add to raise maturity, or empty string if none>","attrs":[{"key":"<attribute key>",',
    '"found":<true|false>,"evidence":"<verbatim quote from the document, or empty string if',
    'not found>","reasoning":"<one line: why this attribute is or is not satisfied>"}]}]}',
    'Include every control and every attribute from the catalog. Return the JSON now.',
  ].join('\n');
}

function parseJson(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // Strip accidental code fences.
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (_) { return null; }
}

/**
 * Review a document. Returns the enriched, keyword-compatible result, or null
 * if the model is unavailable / the response can't be trusted (→ caller falls back).
 */
async function reviewDocument(text, mapping, deps = {}) {
  const anthropic = deps.anthropic || client();
  if (!anthropic || !mapping || !Array.isArray(mapping.controls) || !mapping.controls.length) return null;
  const clipped = String(text || '').slice(0, MAX_CHARS);
  if (clipped.trim().length < 20) return null;

  let parsed = null; let usage = {}; let costUsd = 0;
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildUserPrompt(clipped, mapping) }],
    });
    usage = (resp && resp.usage) || {};
    costUsd = estimateCostUsd(MODEL, usage);
    // Per-document spend, so actual token cost is visible in the API logs.
    logger.info('document review · llm spend', {
      label: deps.label || '', model: MODEL,
      input_tokens: Number(usage.input_tokens) || 0,
      output_tokens: Number(usage.output_tokens) || 0,
      cache_read_tokens: Number(usage.cache_read_input_tokens) || 0,
      cost_usd: costUsd,
    });
    parsed = parseJson(textOf(resp));
  } catch (e) {
    logger.warn(`LLM doc review failed (${MODEL}): ${e.message}`);
    return null;
  }
  if (!parsed || !Array.isArray(parsed.controls)) return null;
  return reconcile(parsed, mapping, clipped, { engine: 'llm', model: MODEL, usage, costUsd });
}

/**
 * Reconcile a model's JSON verdict against the authoritative control catalog.
 * The control/attribute set and coverage math stay ours; the semantic judgment,
 * verbatim evidence and narrative come from the model. Returns null when the
 * model grounded no evidence at all (→ caller falls back). Shared by the cloud
 * and local engines so both apply the identical grounding guardrail — which is
 * exactly what keeps a smaller local model from inventing quotes.
 */
function reconcile(parsed, mapping, clipped, meta) {
  meta = meta || {};
  const byId = {}; parsed.controls.forEach((c) => { if (c && c.id) byId[String(c.id)] = c; });
  const controls = []; const familyScores = {};
  let totalAttrs = 0; let totalMatched = 0; let grounded = 0;

  for (const ctrl of mapping.controls) {
    const v = byId[ctrl.id] || {};
    const vAttrs = {}; (Array.isArray(v.attrs) ? v.attrs : []).forEach((a) => { if (a && a.key) vAttrs[String(a.key)] = a; });
    const attrResults = []; let ctrlMatched = 0;
    for (const attr of ctrl.attrs) {
      const va = vAttrs[attr.key] || {};
      const found = va.found === true;
      // A "found" attribute must carry a verbatim quote that is actually in the text.
      const ev = typeof va.evidence === 'string' ? va.evidence.trim() : '';
      const quoteOk = !found || (ev.length >= 4 && clipped.toLowerCase().includes(ev.slice(0, 120).toLowerCase()));
      if (found && quoteOk) grounded += 1;
      attrResults.push({
        tag: attr.tag, key: attr.key, label: attr.label,
        found, evidence: found && quoteOk ? ev : '',
        reasoning: typeof va.reasoning === 'string' ? va.reasoning.trim().slice(0, 240) : '',
      });
      if (found && quoteOk) ctrlMatched += 1;
      totalAttrs += 1; if (found && quoteOk) totalMatched += 1;
    }
    // Coverage-grounded CMMI (matches the keyword engine's scale); use the model's
    // number only when it agrees within one band, so a control can't outscore its evidence.
    const covCmmi = scoreCMMI(ctrlMatched, ctrl.attrs.length);
    let cmmi = covCmmi;
    const mc = Number(v.cmmi);
    if (Number.isFinite(mc) && mc >= 1 && mc <= 5 && Math.abs(mc - covCmmi) <= 1) cmmi = Math.round(mc);
    controls.push({
      id: ctrl.id, family: ctrl.family, name: ctrl.name,
      cmmi, cmmiLabel: CMMI_LABEL[cmmi], matched: ctrlMatched, total: ctrl.attrs.length,
      attrs: attrResults,
      narrative: typeof v.narrative === 'string' ? v.narrative.trim().slice(0, 600) : '',
      gap: typeof v.gap === 'string' ? v.gap.trim().slice(0, 400) : '',
    });
    if (!familyScores[ctrl.family]) familyScores[ctrl.family] = { sum: 0, count: 0, controls: [] };
    familyScores[ctrl.family].sum += cmmi; familyScores[ctrl.family].count += 1; familyScores[ctrl.family].controls.push(ctrl.id);
  }

  // If the model grounded nothing at all, it likely didn't read the doc — fall back.
  if (grounded === 0 && totalAttrs > 0) return null;

  const families = {};
  for (const [fam, d] of Object.entries(familyScores)) {
    const avg = d.sum / d.count;
    families[fam] = { cmmi: Math.round(avg * 10) / 10, cmmiLabel: CMMI_LABEL[Math.round(avg)], controlCount: d.count, controls: d.controls };
  }
  const overall = scoreCMMI(totalMatched, totalAttrs);
  const coverage = totalAttrs > 0 ? Math.round((totalMatched / totalAttrs) * 100) : 0;

  const recommendations = [];
  for (const c of controls) {
    const missing = c.attrs.filter((a) => !a.found);
    if (!missing.length) continue;
    recommendations.push({
      controlId: c.id, controlName: c.name, currentCMMI: c.cmmi,
      missingAttrs: missing.map((m) => m.label),
      priority: missing.length >= 3 ? 'high' : missing.length >= 2 ? 'medium' : 'low',
      suggestion: c.gap || ('Add language covering: ' + missing.map((m) => m.label).join(', ')),
    });
  }
  recommendations.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));

  const usage = meta.usage || {};
  return {
    cmmi: overall, cmmiLabel: CMMI_LABEL[overall], coverage, matched: totalMatched, total: totalAttrs,
    controls, families, recommendations,
    framework: mapping.framework, engine: meta.engine || 'llm', model: meta.model || null,
    words: clipped.split(/\s+/).filter(Boolean).length,
    usage: {
      input_tokens: Number(usage.input_tokens) || 0,
      output_tokens: Number(usage.output_tokens) || 0,
      cache_read_tokens: Number(usage.cache_read_input_tokens) || 0,
    },
    cost_usd: meta.costUsd || 0,
  };
}

// Local, in-VM engine config (OpenAI-compatible: Ollama / llama.cpp / vLLM).
const LOCAL_DEFAULT_URL = 'http://localhost:11434/v1/chat/completions';
const LOCAL_MODEL = (process.env.LOCAL_LLM_MODEL || 'llama3.1:8b').trim();

/**
 * Local engine: the same prompt + grounding guardrail, run against an
 * OpenAI-compatible model server inside the VM. No data leaves the host and
 * there is no per-token cost — engine 'local', cost_usd 0. Configure
 * LOCAL_LLM_URL (+ LOCAL_LLM_MODEL). Returns null (→ keyword fallback) if the
 * server isn't configured / reachable or the output can't be trusted.
 */
async function reviewLocal(text, mapping, deps = {}) {
  const url = deps.localUrl || process.env.LOCAL_LLM_URL || (deps.forceLocal ? LOCAL_DEFAULT_URL : null);
  if (!url || !mapping || !Array.isArray(mapping.controls) || !mapping.controls.length) return null;
  const clipped = String(text || '').slice(0, MAX_CHARS);
  if (clipped.trim().length < 20) return null;
  const doFetch = deps.fetch || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) return null;

  let parsed = null;
  try {
    const ac = (typeof AbortController === 'function') ? new AbortController() : null;
    const to = ac ? setTimeout(() => ac.abort(), TIMEOUT_MS) : null;
    let resp;
    try {
      resp = await doFetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        signal: ac ? ac.signal : undefined,
        body: JSON.stringify({
          model: LOCAL_MODEL, temperature: 0.1, stream: false, max_tokens: MAX_TOKENS,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(clipped, mapping) + '\n\nReturn ONLY the JSON object — no markdown, no code fences, no commentary.' },
          ],
        }),
      });
    } finally { if (to) clearTimeout(to); }
    if (!resp || !resp.ok) { logger.warn(`local doc review HTTP ${resp && resp.status} (${LOCAL_MODEL})`); return null; }
    const j = await resp.json();
    const out = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    parsed = parseJson(out);
    logger.info('document review · local (no per-token cost)', { label: deps.label || '', model: LOCAL_MODEL });
  } catch (e) { logger.warn(`local doc review failed (${LOCAL_MODEL}): ${e.message}`); return null; }
  if (!parsed || !Array.isArray(parsed.controls)) return null;
  return reconcile(parsed, mapping, clipped, { engine: 'local', model: LOCAL_MODEL });
}

/**
 * Engine dispatcher used by the route.
 * DOC_REVIEW_ENGINE = cloud | local | keyword | auto (default).
 *   auto → cloud (if ANTHROPIC_API_KEY) then local (if LOCAL_LLM_URL), else null.
 * Any engine that returns null lets the route fall back to the keyword analyzer.
 */
async function review(text, mapping, deps = {}) {
  const mode = (process.env.DOC_REVIEW_ENGINE || 'auto').toLowerCase();
  if (mode === 'keyword') return null;
  if (mode === 'local') return reviewLocal(text, mapping, { ...deps, forceLocal: true });
  if (mode === 'cloud') return reviewDocument(text, mapping, deps);
  // auto — prefer cloud quality, fall back to the local model, then keyword.
  if (process.env.ANTHROPIC_API_KEY || deps.anthropic) {
    const r = await reviewDocument(text, mapping, deps); if (r) return r;
  }
  if (process.env.LOCAL_LLM_URL || deps.localUrl) {
    const r = await reviewLocal(text, mapping, deps); if (r) return r;
  }
  return null;
}

module.exports = { reviewDocument, reviewLocal, review, reconcile };

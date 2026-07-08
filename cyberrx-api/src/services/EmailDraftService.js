'use strict';

/**
 * EmailDraftService — drafts a professional reminder email from the CISO to
 * another executive about the decisions/attestations that leader still owes.
 *
 * Three engines, tried in order (same philosophy as LlmDocumentReviewService):
 *   1. cloud  — Anthropic (when ANTHROPIC_API_KEY is set)
 *   2. local  — an internal OpenAI-compatible endpoint (LOCAL_LLM_URL, e.g. Ollama)
 *   3. template — deterministic, always-available fallback (no model needed)
 * The route always gets a usable {subject, body, engine}. NOTIFY_DRAFT_ENGINE =
 * cloud | local | template | auto (default) selects/forces an engine.
 */

const logger = require('../utils/logger');

const MODEL = (process.env.NOTIFY_DRAFT_MODEL || process.env.DOC_REVIEW_MODEL || 'claude-opus-4-8').trim();
const LOCAL_URL = process.env.LOCAL_LLM_URL || null;
const LOCAL_MODEL = (process.env.LOCAL_LLM_MODEL || 'llama3.1').trim();
const MAX_TOKENS = Number(process.env.NOTIFY_DRAFT_MAX_TOKENS) || 900;
const TIMEOUT_MS = Number(process.env.NOTIFY_DRAFT_TIMEOUT_MS) || 45000;

let _client;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (_client) return _client;
  try {
    const A = require('@anthropic-ai/sdk');
    const Anthropic = A.default || A;
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS });
    return _client;
  } catch (e) { logger.warn(`Anthropic SDK unavailable for email draft: ${e.message}`); return null; }
}
const textOf = (resp) => ((resp && resp.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

// ---- prompt construction -------------------------------------------------
function normalize(payload) {
  const p = payload || {};
  const items = Array.isArray(p.items) ? p.items.filter((i) => i && i.title).slice(0, 12) : [];
  return {
    fromName: String(p.fromName || 'the CISO').slice(0, 80),
    fromRole: String(p.fromRole || 'CISO').slice(0, 40),
    toName: String(p.toName || 'colleague').slice(0, 80),
    toRole: String(p.toRole || '').slice(0, 40),
    org: String(p.org || 'the organization').slice(0, 120),
    tone: ['friendly', 'formal', 'urgent'].includes(String(p.tone || '').toLowerCase()) ? p.tone.toLowerCase() : 'professional',
    items: items.map((i) => ({
      title: String(i.title).slice(0, 160),
      ask: String(i.ask || '').slice(0, 300),
      why: String(i.why || '').slice(0, 400),
      status: String(i.status || 'pending').slice(0, 40),
    })),
  };
}

function buildPrompt(d) {
  const list = d.items.map((i, n) => `${n + 1}. ${i.title}${i.ask ? ` — ${i.ask}` : ''}${i.why ? ` (context: ${i.why})` : ''} [status: ${i.status}]`).join('\n');
  return [
    `Write a short, ${d.tone} reminder email from ${d.fromName} (${d.fromRole}) at ${d.org} to ${d.toName}${d.toRole ? ` (${d.toRole})` : ''}.`,
    'The email politely reminds them of the cyber-risk decisions/attestations they still owe, so the CISO can close them out.',
    'Requirements: a concise subject line; a warm but businesslike greeting; one short framing sentence; a clean bulleted list of the outstanding items (title + what is being asked); a one-line note that each takes only a moment in the cockpit; a courteous close signed by the sender. Do not invent facts, deadlines, or dollar figures beyond what is given. Keep it under 180 words.',
    '',
    'Outstanding items:',
    list || '(none specified — write a brief general nudge to review their pending cockpit decisions)',
    '',
    'Return ONLY a JSON object: {"subject":"...","body":"..."} with \\n newlines in body. No code fences, no commentary.',
  ].join('\n');
}

function parseJson(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { const o = JSON.parse(s); if (o && o.subject && o.body) return { subject: String(o.subject).slice(0, 200), body: String(o.body).slice(0, 4000) }; } catch (_) { /* fall through */ }
  return null;
}

// ---- deterministic template (always works, no model) ---------------------
function template(d) {
  const items = d.items.length ? d.items : [{ title: 'Your pending cockpit decisions', ask: 'Review and record your sign-off.' }];
  const bullets = items.map((i) => `  • ${i.title}${i.ask ? ` — ${i.ask}` : ''}`).join('\n');
  const subject = items.length === 1
    ? `Quick sign-off needed: ${items[0].title}`
    : `Reminder: ${items.length} cyber decisions awaiting your sign-off`;
  const body = [
    `Hi ${d.toName.split(' ')[0] || d.toName},`,
    '',
    `A quick reminder on the cyber-risk ${items.length === 1 ? 'item' : 'items'} in your area that ${items.length === 1 ? 'is' : 'are'} waiting on your decision:`,
    '',
    bullets,
    '',
    `Each takes only a moment to record in the cockpit — it keeps our posture current and every above-appetite risk owned. Happy to walk through any of them.`,
    '',
    'Thanks,',
    `${d.fromName}`,
    d.fromRole,
  ].join('\n');
  return { subject, body, engine: 'template' };
}

async function draftCloud(d) {
  const anthropic = client();
  if (!anthropic) return null;
  try {
    const resp = await anthropic.messages.create({
      model: MODEL, max_tokens: MAX_TOKENS,
      system: 'You are an executive communications assistant. You write concise, warm, businesslike internal emails. Return only the requested JSON.',
      messages: [{ role: 'user', content: buildPrompt(d) }],
    });
    const parsed = parseJson(textOf(resp));
    if (!parsed) return null;
    logger.info('email draft · cloud', { model: MODEL, to: d.toRole });
    return { ...parsed, engine: 'llm', model: MODEL };
  } catch (e) { logger.warn(`cloud email draft failed: ${e.message}`); return null; }
}

async function draftLocal(d, deps = {}) {
  const url = deps.localUrl || LOCAL_URL;
  if (!url) return null;
  const doFetch = deps.fetch || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) return null;
  try {
    const ac = (typeof AbortController === 'function') ? new AbortController() : null;
    const to = ac ? setTimeout(() => ac.abort(), TIMEOUT_MS) : null;
    let resp;
    try {
      resp = await doFetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ac ? ac.signal : undefined,
        body: JSON.stringify({
          model: LOCAL_MODEL, temperature: 0.3, stream: false, max_tokens: MAX_TOKENS,
          messages: [
            { role: 'system', content: 'You write concise, warm, businesslike internal emails. Return ONLY the requested JSON — no markdown.' },
            { role: 'user', content: buildPrompt(d) },
          ],
        }),
      });
    } finally { if (to) clearTimeout(to); }
    if (!resp || !resp.ok) { logger.warn(`local email draft HTTP ${resp && resp.status}`); return null; }
    const j = await resp.json();
    const out = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    const parsed = parseJson(out);
    if (!parsed) return null;
    logger.info('email draft · local', { model: LOCAL_MODEL });
    return { ...parsed, engine: 'local', model: LOCAL_MODEL };
  } catch (e) { logger.warn(`local email draft failed: ${e.message}`); return null; }
}

/**
 * Draft a reminder email. Always resolves to {subject, body, engine}.
 */
async function draft(payload, deps = {}) {
  const d = normalize(payload);
  const mode = (process.env.NOTIFY_DRAFT_ENGINE || 'auto').toLowerCase();
  if (mode === 'template') return template(d);
  if (mode === 'cloud') return (await draftCloud(d)) || template(d);
  if (mode === 'local') return (await draftLocal(d, deps)) || template(d);
  // auto: cloud → local → template
  return (await draftCloud(d)) || (await draftLocal(d, deps)) || template(d);
}

module.exports = { draft, normalize, template, buildPrompt };

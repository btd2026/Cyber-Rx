'use strict';

/**
 * ExecDraftService — polish a grounded executive draft into audience-ready prose.
 *
 * The executive briefs already compose a fully grounded draft on the client (every
 * line traces to on-screen facts). This service does ONE thing: rewrite that draft
 * as cleaner prose for the named audience — without adding, removing, or changing
 * any fact, number, name, or claim. It is a rewrite, not a research step.
 *
 * Guardrails:
 *   - Grounded: the draft is the sole source of truth; the prompt forbids new facts.
 *   - Prompt-injection fenced (OWASP LLM01): the draft is passed as fenced data.
 *   - No `temperature` (rejected on claude-opus-4-8 / the 4.7+ family).
 *   - No API key → throws; the caller (route) returns 503 and the client keeps its
 *     deterministic draft. No silent fabrication, ever.
 */

const logger = require('../utils/logger');
const { fence, GUIDANCE } = require('./llmSafety');

async function polish({ draft, audience, subject, privileged }) {
  const text = String(draft || '').trim();
  if (!text) { const e = new Error('draft is required'); e.code = 'NO_DRAFT'; throw e; }
  if (!process.env.ANTHROPIC_API_KEY) { const e = new Error('LLM not configured'); e.code = 'NO_API_KEY'; throw e; }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_DRAFT_MODEL || process.env.ANTHROPIC_REPORT_MODEL || 'claude-opus-4-8';

  const system = [
    `You are a senior advisor finalizing a short incident summary for: ${audience || 'executive leadership'}.`,
    'You are given a DRAFT that is already factually complete and grounded.',
    'Rewrite it as clean, professional, decision-first prose for that audience.',
    'HARD RULES — do not add, remove, or change any fact, number, name, date, status, clock, or claim that is in the DRAFT.',
    'Invent nothing. If the DRAFT does not state something, neither do you. Do not soften or overstate severity.',
    'Keep it concise (a short memo). Preserve a "PRIVILEGED & CONFIDENTIAL" line at the very top if present.',
    GUIDANCE,
    'Return ONLY the finished memo text — no preamble, no commentary, no code fences.',
  ].join('\n');

  const fenced = fence(text, 'DRAFT');
  const resp = await client.messages.create({
    model, max_tokens: 1800,
    system, messages: [{ role: 'user', content: `${privileged ? 'This memo is privileged — keep the header.\n\n' : ''}${fenced.block}` }],
  });
  const out = (resp.content || []).map((c) => c.text || '').join('').trim();
  if (!out) { const e = new Error('empty completion'); e.code = 'EMPTY'; throw e; }
  logger.debug('exec draft polished', { audience, model: resp.model || model, chars: out.length });
  return { text: out, model: resp.model || model, generatedBy: 'llm' };
}

module.exports = { polish };

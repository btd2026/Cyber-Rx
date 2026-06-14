'use strict';

/**
 * PublicEnrichmentService — best-effort prefill of intake firmographics (revenue,
 * employees, members, HQ) from PUBLIC information about the named organization,
 * so users type less. Every value is clearly an estimate the user can overwrite.
 *
 * Guardrails: only returns figures the model is reasonably confident are public;
 * uses null otherwise; NEVER fabricates; low temperature; structured JSON. With
 * no ANTHROPIC_API_KEY it returns nothing (no prefill) — never a made-up number.
 */

const logger = require('../utils/logger');

const num = (v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return isFinite(n) && n > 0 ? Math.round(n) : null;
};

async function enrich(name, domain) {
  const clean = String(name || '').trim();
  if (!clean) return { fields: {}, meta: {}, source: 'none', disclaimer: 'Provide an organization name to prefill.' };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { fields: {}, meta: {}, source: 'none', disclaimer: 'Public-data prefill is unavailable (no AI key configured).' };
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_ENRICH_MODEL || process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
    const system = [
      'You are a research assistant. For the named US health-insurance organization, return ONLY firmographic facts that are publicly documented and that you are reasonably confident about.',
      'Use null for anything you are not confident is public. NEVER fabricate or guess a number.',
      'Return ONLY JSON: {industry, sub_sector, employees, revenue_usd, members, hq, confidence:"high|medium|low", notes}.',
      'employees/revenue_usd/members must be integers (USD for revenue) or null.',
    ].join('\n');
    const resp = await client.messages.create({
      model, max_tokens: 500, temperature: 0,
      system, messages: [{ role: 'user', content: `Organization: ${clean}${domain ? ` (${domain})` : ''}` }],
    });
    const raw = (resp.content || []).map((c) => c.text || '').join('');
    const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    // Map to intake field ids; only include values the model actually returned.
    const fields = {};
    if (num(j.revenue_usd) != null) fields.revenue = num(j.revenue_usd);
    if (num(j.employees) != null) fields.employees = num(j.employees);
    if (num(j.members) != null) fields.memberCount = num(j.members);
    return {
      fields,
      meta: { industry: j.industry || null, sub_sector: j.sub_sector || null, hq: j.hq || null, notes: j.notes || null },
      confidence: j.confidence || 'low',
      source: 'public-estimate',
      disclaimer: 'Estimated from public sources — please verify and edit before continuing.',
    };
  } catch (e) {
    logger.debug('public enrichment failed', { error: e.message });
    return { fields: {}, meta: {}, source: 'none', disclaimer: 'Could not retrieve public data — enter values manually.' };
  }
}

module.exports = { enrich, num };

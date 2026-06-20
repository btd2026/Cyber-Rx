'use strict';

/**
 * LangSmith connector (read-only, x-api-key). Confirms agent/LLM run tracing is
 * in place — a governed-observability signal for AI guardrail posture. Built to
 * the documented API; validate against a real workspace before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

function base(creds) { return (creds.endpoint || 'https://api.smith.langchain.com').replace(/\/$/, ''); }

async function test(creds) {
  if (!creds.apiKey) throw new Error('A LangSmith API key is required.');
  await jsonOrThrow(await http(`${base(creds)}/runs?limit=1`, { headers: { 'x-api-key': creds.apiKey, Accept: 'application/json' } }), 'LangSmith');
  return { ok: true, detail: 'Authenticated to LangSmith.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(`${base(creds)}/runs?limit=1`, { headers: { 'x-api-key': creds.apiKey, Accept: 'application/json' } }), 'LangSmith');
  const traced = Array.isArray(j) ? j.length : (j.runs ? j.runs.length : 0);
  return {
    signals: [{ key: 'ai_monitored', value: 1, asOf: nowIso(), raw: { tracedSample: traced } }],
    meta: { vendor: 'LangSmith' },
  };
}

module.exports = {
  key: 'langsmith', label: 'LangSmith', vendor: 'LangChain', category: 'AI Gateway',
  signals: ['ai_monitored'],
  scopes: ['Read-only API key'],
  fields: [
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'endpoint', label: 'API base URL (default https://api.smith.langchain.com)', optional: true },
  ],
  test, fetchSignals,
};

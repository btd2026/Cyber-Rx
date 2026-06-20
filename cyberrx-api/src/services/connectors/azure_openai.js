'use strict';

/**
 * Azure OpenAI connector (read-only, api-key). Confirms a governed AI gateway is
 * in place and reports the deployment count — enough to flip AI guardrail
 * posture from modeled to live. Built to the documented data-plane API; validate
 * against a real resource before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const API_VERSION = '2023-05-15';
function base(creds) { return (creds.endpoint || '').replace(/\/$/, ''); }

async function test(creds) {
  if (!creds.endpoint || !creds.apiKey) throw new Error('Azure OpenAI endpoint and API key are required.');
  await jsonOrThrow(await http(`${base(creds)}/openai/deployments?api-version=${API_VERSION}`, { headers: { 'api-key': creds.apiKey } }), 'Azure OpenAI');
  return { ok: true, detail: 'Authenticated to Azure OpenAI.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(`${base(creds)}/openai/deployments?api-version=${API_VERSION}`, { headers: { 'api-key': creds.apiKey } }), 'Azure OpenAI');
  const deployments = (j.data || j.value || []).length;
  return {
    signals: [
      { key: 'ai_monitored', value: 1, asOf: nowIso(), raw: {} },
      { key: 'ai_deployments', value: deployments, asOf: nowIso(), raw: {} },
    ],
    meta: { vendor: 'Azure OpenAI', deployments },
  };
}

module.exports = {
  key: 'azure_openai', label: 'Azure OpenAI', vendor: 'Microsoft', category: 'AI Gateway',
  signals: ['ai_monitored', 'ai_deployments'],
  scopes: ['Cognitive Services OpenAI User (read)'],
  fields: [
    { key: 'endpoint', label: 'Resource endpoint (https://NAME.openai.azure.com)' },
    { key: 'apiKey', label: 'API key', secret: true },
  ],
  test, fetchSignals,
};

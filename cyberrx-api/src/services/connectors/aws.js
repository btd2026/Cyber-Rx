'use strict';

/**
 * AWS Security Hub connector (read-only, SigV4-signed Security Hub REST API).
 *
 * Fills cspm_pct — cloud-posture compliance: the share of ACTIVE Security Hub
 * control findings whose Compliance.Status is PASSED vs FAILED. Uses the
 * GetFindings REST action (POST /findings), SigV4-signed with a read-only IAM
 * access key (securityhub:GetFindings). Tallies across a bounded number of
 * pages; if more remain it reports the sampled ratio and annotates it. Built to
 * the documented Security Hub contract; validate against a real account with a
 * read-only key before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');
const { signRequest } = require('./awssig');

const endpoint = (creds) => `https://securityhub.${creds.region}.amazonaws.com`;

async function getFindings(creds, nextToken) {
  const body = JSON.stringify({
    Filters: { RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }] },
    MaxResults: 100, ...(nextToken ? { NextToken: nextToken } : {}),
  });
  const url = `${endpoint(creds)}/findings`;
  const { headers } = signRequest({
    method: 'POST', url, service: 'securityhub', region: creds.region,
    accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, sessionToken: creds.sessionToken,
    body, extraHeaders: { 'content-type': 'application/json' },
  });
  return jsonOrThrow(await http(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body }), 'AWS Security Hub');
}

async function test(creds) {
  if (!creds.accessKeyId || !creds.secretAccessKey || !creds.region) {
    throw new Error('AWS access key ID, secret access key and region are required.');
  }
  await getFindings(creds);
  return { ok: true, detail: 'Authenticated to the AWS Security Hub API (SigV4).' };
}

async function fetchSignals(creds) {
  let passed = 0; let failed = 0; let token = null; let pages = 0;
  do {
    const j = await getFindings(creds, token);
    for (const f of (j.Findings || [])) {
      const s = f.Compliance && f.Compliance.Status;
      if (s === 'PASSED') passed += 1; else if (s === 'FAILED') failed += 1;
    }
    token = j.NextToken; pages += 1;
  } while (token && pages < 5);
  const total = passed + failed;
  if (total === 0) throw new Error('Authenticated, but no compliance findings were readable — confirm Security Hub standards are enabled and the key can GetFindings.');
  return { signals: [{ key: 'cspm_pct', value: Math.round((passed / total) * 100), asOf: nowIso(), raw: { passed, failed, total, sampledPages: pages, truncated: !!token } }], meta: { vendor: 'AWS Security Hub' } };
}

module.exports = {
  key: 'aws', label: 'AWS Security Hub', vendor: 'AWS', category: 'Cloud Security Posture (CSPM)',
  signals: ['cspm_pct'],
  scopes: ['securityhub:GetFindings (read-only)'],
  fields: [
    { key: 'accessKeyId', label: 'Access key ID' },
    { key: 'secretAccessKey', label: 'Secret access key', secret: true },
    { key: 'region', label: 'Region (e.g. us-east-1)' },
    { key: 'sessionToken', label: 'Session token (optional, for STS creds)', secret: true, optional: true },
  ],
  test, fetchSignals,
};

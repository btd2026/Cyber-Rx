'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// TrustArc Individual Rights Manager — pulls dsar_request_records / dsar_fulfilled /
// dsar_overdue / identity_verification_on_dsar (P5.1 data-subject access). OAuth2
// client-credentials (HTTP Basic) → /oauth/token, then GET /irm/v1/requests.
// Documented TrustArc IRM contract; validate against a live tenant before the
// results are trusted.
const isDone = (s) => ['closed', 'completed', 'complete', 'fulfilled'].includes(String(s || '').toLowerCase());

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || 'https://api.trustarc.com').replace(/\/+$/, '');
  const clientId = c.clientId || c.client_id;
  const clientSecret = c.clientSecret || c.client_secret;
  if (!clientId || !clientSecret) return {};
  const since = Date.parse(sinceOf(ctx.period));
  const end = (ctx.period && ctx.period.end) ? Date.parse(ctx.period.end) : Date.now();
  const now = Date.now();
  const out = {};
  let tk;
  try {
    const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64');
    const j = await jsonOrThrow(await H(base + '/oauth/token', { method: 'POST', headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials' }) }), 'TrustArc');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authorization: 'Bearer ' + tk, Accept: 'application/json' };

  let requests = [];
  try {
    const j = await jsonOrThrow(await H(base + '/irm/v1/requests?limit=500', { headers }), 'TrustArc');
    requests = j.requests || j.data || j.items || [];
  } catch (_) { return out; }

  const created = (r) => Date.parse(r.createdDate || r.submittedDate || r.dateCreated || r.createdAt || '');
  const inPeriod = requests.filter((r) => { const d = created(r); return !Number.isFinite(d) || (d >= since && d <= end); });
  out.dsar_request_records = inPeriod.length;
  out.dsar_fulfilled = inPeriod.filter((r) => isDone(r.status || r.state)).length;
  // Overdue = statutory response clock passed and not yet fulfilled.
  out.dsar_overdue = inPeriod.filter((r) => {
    if (isDone(r.status || r.state)) return false;
    const due = Date.parse(r.dueDate || r.deadline || '');
    return Number.isFinite(due) && due < now;
  }).length;
  // Identity verification step present on the request workflow.
  const verified = inPeriod.some((r) => r.identityVerified === true || r.verified === true || String(r.verificationStatus || r.identityVerificationStatus || '').toLowerCase() === 'verified');
  if (inPeriod.length) out.identity_verification_on_dsar = verified;
  return out;
}
module.exports = { key: 'trustarc', collect };

'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();

// OneTrust Privacy Rights Automation — pulls dsar_request_records / dsar_fulfilled /
// dsar_overdue / identity_verification_on_dsar (P5.1 data-subject access). OAuth2
// client-credentials → /api/access/v1/oauth/token, then page the subject-request
// queue at /api/datasubject/v2/requests. Documented OneTrust contract; validate
// against a live tenant before the results are trusted.
const isDone = (s) => ['closed', 'completed', 'complete', 'fulfilled'].includes(String(s || '').toLowerCase());

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  const clientId = c.clientId || c.client_id;
  const clientSecret = c.clientSecret || c.client_secret;
  if (!base || !clientId || !clientSecret) return {};
  const since = Date.parse(sinceOf(ctx.period));
  const end = (ctx.period && ctx.period.end) ? Date.parse(ctx.period.end) : Date.now();
  const now = Date.now();
  const out = {};
  let tk;
  try {
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
    const j = await jsonOrThrow(await H(base + '/api/access/v1/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'OneTrust');
    tk = j.access_token; if (!tk) return {};
  } catch (_) { return {}; }
  const headers = { Authorization: 'Bearer ' + tk, Accept: 'application/json' };

  // Page the subject-request queue (bounded), then filter to the review period.
  const requests = [];
  try {
    for (let page = 0; page < 20; page += 1) {
      const j = await jsonOrThrow(await H(base + '/api/datasubject/v2/requests?page=' + page + '&size=200', { headers }), 'OneTrust');
      const rows = (j && (j.content || j.data || j.requests)) || [];
      requests.push(...rows);
      const totalPages = j && (j.totalPages != null ? j.totalPages : (rows.length < 200 ? page + 1 : page + 2));
      if (!rows.length || page + 1 >= totalPages) break;
    }
  } catch (_) { return out; }

  const created = (r) => Date.parse(r.createdDate || r.submittedDate || r.dateCreated || r.createDate || '');
  const inPeriod = requests.filter((r) => { const d = created(r); return !Number.isFinite(d) || (d >= since && d <= end); });
  out.dsar_request_records = inPeriod.length;
  out.dsar_fulfilled = inPeriod.filter((r) => isDone(r.status || r.stage || r.workflowStatus)).length;
  // Overdue = statutory response clock passed and not yet fulfilled.
  out.dsar_overdue = inPeriod.filter((r) => {
    if (isDone(r.status || r.stage || r.workflowStatus)) return false;
    const due = Date.parse(r.dueDate || r.responseDueDate || r.deadline || '');
    return Number.isFinite(due) && due < now;
  }).length;
  // Identity verification step present on the workflow (subject-verification config).
  const verified = inPeriod.some((r) => r.identityVerified === true || r.subjectVerified === true || String(r.verificationStatus || r.identityVerificationStatus || '').toLowerCase() === 'verified');
  if (inPeriod.length) out.identity_verification_on_dsar = verified;
  return out;
}
module.exports = { key: 'onetrust', collect };

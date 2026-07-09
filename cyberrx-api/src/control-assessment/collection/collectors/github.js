'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');
const sinceOf = (p) => (p && p.start) ? p.start : new Date(Date.now() - 90 * 864e5).toISOString();
const arr = (j) => Array.isArray(j) ? j : (j && Array.isArray(j.value) ? j.value : (j && Array.isArray(j.data) ? j.data : []));

// GitHub — pulls change_records / change_approvals / change_testing_evidence /
// unauthorized_changes (SOC 2 CC8.1) from merged pull requests + branch
// protection. PAT or GitHub App token (repo / security_events read) via
// `Authorization: Bearer`. Documented REST API v2022-11-28 (Search + branch
// protection + commits/{sha}/pulls); validate against a live org before trusted.
async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const org = c.org || c.organization;
  const token = c.token || c.apiToken || c.api_token;
  if (!org || !token) return {};
  const api = String(c.apiUrl || c.api_url || 'https://api.github.com').replace(/\/+$/, '');
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const since = sinceOf(ctx.period);
  const day = since.slice(0, 10);
  const out = {};
  const get = async (path) => jsonOrThrow(await H(api + path, { headers }), 'GitHub');
  const searchCount = async (q) => { const j = await get('/search/issues?per_page=1&q=' + encodeURIComponent(q)); const n = Number(j && j.total_count); return Number.isFinite(n) ? n : 0; };

  // Merged PRs in the period = change records; those with an approving review = approvals.
  try { out.change_records = await searchCount('org:' + org + ' type:pr is:merged merged:>=' + day); } catch (_) {}
  try { out.change_approvals = await searchCount('org:' + org + ' type:pr is:merged merged:>=' + day + ' review:approved'); } catch (_) {}

  // Testing evidence: required status checks (CI) enforced on a protected branch.
  // Unauthorized: single-parent commits on a protected default branch with no PR
  // (merge commits and squash/rebase merges resolve to a PR via commits/{sha}/pulls).
  let checksEnforced = false, unauth = 0, scanned = false;
  try {
    const repos = arr(await get('/orgs/' + encodeURIComponent(org) + '/repos?per_page=100&sort=pushed&direction=desc')).slice(0, 20);
    for (const r of repos) {
      const owner = (r.owner && r.owner.login) || org;
      const branch = r.default_branch || 'main';
      const stem = '/repos/' + owner + '/' + r.name;
      let prot;
      try { prot = await get(stem + '/branches/' + encodeURIComponent(branch) + '/protection'); }
      catch (_) { continue; } // 404 = branch not protected → out of CC8.1 push-control scope
      scanned = true;
      if (prot && prot.required_status_checks) checksEnforced = true;
      try {
        const commits = arr(await get(stem + '/commits?sha=' + encodeURIComponent(branch) + '&since=' + encodeURIComponent(since) + '&per_page=100')).slice(0, 50);
        for (const cm of commits) {
          if (((cm.parents || []).length) > 1) continue; // merge commit = authorized PR merge
          try { if (!arr(await get(stem + '/commits/' + cm.sha + '/pulls')).length) unauth += 1; } catch (_) {}
        }
      } catch (_) {}
    }
  } catch (_) {}
  if (scanned) { out.change_testing_evidence = checksEnforced; out.unauthorized_changes = unauth; }
  return out;
}
module.exports = { key: 'github', collect };

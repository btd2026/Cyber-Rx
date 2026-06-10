'use strict';
const express = require('express');
const router = express.Router();
const vault = require('../utils/vault');
const { optionalJWT, demoOrg } = require('../middleware/auth');
const SimulatedToolService = require('../services/SimulatedToolService');

const DEMO_VALUES = {
  okta: 78, crowdstrike: 71, splunk: 14, knowbe4: 9.2,
  tenable: 63, qualys: 63, servicenow: 6.8,
  cyberark: 43, beyondtrust: 43, workday: 71,
};
const METRIC_KEYS = {
  okta: 'mfaPct', crowdstrike: 'edrPct', splunk: 'siemDays',
  knowbe4: 'phishingPct', tenable: 'patchPct', qualys: 'patchPct',
  servicenow: 'mttrHrs', cyberark: 'pamPct', beyondtrust: 'pamPct',
  workday: 'trainingPct',
};

router.post('/:tool/sync', optionalJWT, demoOrg, async (req, res) => {
  const { tool } = req.params;
  const orgId = req.orgId || 'demo';
  const metricKey = METRIC_KEYS[tool];

  // Fallback chain when no live credentials are configured:
  //   1. the org's simulated source database (per-org realistic data)
  //   2. static demo constants (last resort)
  const demoResp = async (reason) => {
    try {
      const sim = await SimulatedToolService.computeTool(tool, orgId);
      if (sim && sim.length) {
        return {
          metric_key: sim[0].metricKey,
          value: sim[0].value,
          source: tool,
          ts: new Date().toISOString(),
          demo: false,
          simulated: true,
          basis: sim[0].basis,
        };
      }
    } catch (_) {}
    return {
      metric_key: metricKey || tool,
      value: DEMO_VALUES[tool] || 0,
      source: tool,
      ts: new Date().toISOString(),
      demo: true,
      reason,
    };
  };

  try {
    const creds = await vault.get(orgId, tool);
    if (!creds) return res.json(await demoResp('no_credentials'));

    let value;

    if (tool === 'okta') {
      // Paginate all active users then check MFA factors
      let allUsers = [];
      let url = `https://${creds.domain}/api/v1/users?filter=status+eq+"ACTIVE"&limit=200`;
      while (url && allUsers.length < 2000) {
        const r = await fetch(url, { headers: { 'Authorization': 'SSWS ' + creds.apiToken } });
        const batch = await r.json();
        if (!Array.isArray(batch)) break;
        allUsers = allUsers.concat(batch);
        const link = r.headers.get('Link') || '';
        const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
        url = nextMatch ? nextMatch[1] : null;
      }
      if (!allUsers.length) return res.json(await demoResp('no_users'));
      let mfaCount = 0;
      const sample = allUsers.slice(0, 200); // cap at 200 for performance
      await Promise.all(sample.map(async (u) => {
        try {
          const fr = await fetch(
            `https://${creds.domain}/api/v1/users/${u.id}/factors`,
            { headers: { 'Authorization': 'SSWS ' + creds.apiToken } }
          );
          const factors = await fr.json();
          if (Array.isArray(factors) && factors.some(f => f.status === 'ACTIVE')) mfaCount++;
        } catch (_) {}
      }));
      value = Math.round(mfaCount / sample.length * 100);

    } else if (tool === 'crowdstrike') {
      const tokenRes = await fetch('https://api.crowdstrike.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${creds.clientId}&client_secret=${creds.clientSecret}`,
      });
      const { access_token } = await tokenRes.json();
      const authH = { 'Authorization': 'Bearer ' + access_token };
      const [allRes, onlineRes] = await Promise.all([
        fetch('https://api.crowdstrike.com/devices/queries/devices/v1?limit=5000', { headers: authH }),
        fetch('https://api.crowdstrike.com/devices/queries/devices/v1?limit=5000&filter=status%3A%22normal%22', { headers: authH }),
      ]);
      const allD = await allRes.json();
      const onlineD = await onlineRes.json();
      const total = allD.resources?.length || 1;
      const online = onlineD.resources?.length || 0;
      value = Math.round(online / total * 100);

    } else if (tool === 'splunk') {
      const auth = Buffer.from(`${creds.user}:${creds.password}`).toString('base64');
      const r = await fetch(
        `https://${creds.host}:${creds.port || 8089}/services/data/indexes?output_mode=json&count=100`,
        { headers: { 'Authorization': 'Basic ' + auth } }
      );
      const data = await r.json();
      const keyIndexes = ['main', 'audittrail', 'wineventlog', 'syslog'];
      const retentions = (data.entry || [])
        .filter(e => keyIndexes.some(k => e.name.toLowerCase().includes(k)))
        .map(e => e.content?.frozenTimePeriodInSecs
          ? Math.floor(e.content.frozenTimePeriodInSecs / 86400)
          : 90);
      value = retentions.length ? Math.min(...retentions) : 90;

    } else if (tool === 'knowbe4') {
      const r = await fetch(
        'https://us.api.knowbe4.com/v1/phishing/campaigns?status=closed&per_page=1&page=1',
        { headers: { 'Authorization': 'Bearer ' + creds.apiKey } }
      );
      const campaigns = await r.json();
      if (!Array.isArray(campaigns) || !campaigns.length) return res.json(await demoResp('no_campaigns'));
      const cr = await fetch(
        `https://us.api.knowbe4.com/v1/phishing/campaigns/${campaigns[0].campaign_id}/results/all_clicks_by_date`,
        { headers: { 'Authorization': 'Bearer ' + creds.apiKey } }
      );
      const results = await cr.json();
      const clicked = results.reduce((s, r) => s + (r.clicked_count || 0), 0);
      const total = results.reduce((s, r) => s + (r.recipient_count || 0), 0);
      value = total ? parseFloat((clicked / total * 100).toFixed(1)) : 0;

    } else if (tool === 'tenable') {
      const r = await fetch(
        'https://cloud.tenable.com/workbenches/assets/vulnerabilities/info?severity=critical&state=open',
        { headers: { 'X-ApiKeys': `accessKey=${creds.accessKey};secretKey=${creds.secretKey}` } }
      );
      const data = await r.json();
      const total = data.total_asset_count || 1;
      const overSLA = data.vuln_count || 0;
      value = Math.round(Math.max(0, 100 - (overSLA / total * 100)));

    } else if (tool === 'servicenow') {
      // MTTR: avg hours to resolve P1/P2 incidents this month
      const sinceDate = new Date(); sinceDate.setDate(1);
      const auth = Buffer.from(`${creds.user}:${creds.password}`).toString('base64');
      const r = await fetch(
        `https://${creds.instance}.service-now.com/api/now/table/incident?sysparm_query=resolved_at!=NULL^priority<=2^sys_updated_on>${sinceDate.toISOString().slice(0,10)}&sysparm_fields=sys_created_on,resolved_at&sysparm_limit=200`,
        { headers: { 'Authorization': 'Basic ' + auth, 'Accept': 'application/json' } }
      );
      const data = await r.json();
      const records = data.result || [];
      if (!records.length) return res.json(await demoResp('no_incidents'));
      const hrs = records.map(inc => {
        const created = new Date(inc.sys_created_on);
        const resolved = new Date(inc.resolved_at);
        return (resolved - created) / 3600000;
      }).filter(h => h > 0 && h < 8760);
      value = hrs.length ? parseFloat((hrs.reduce((a,b)=>a+b,0)/hrs.length).toFixed(1)) : DEMO_VALUES.servicenow;

    } else {
      return res.json(await demoResp('unsupported_tool'));
    }

    res.json({ metric_key: metricKey, value, source: tool, ts: new Date().toISOString(), demo: false });
  } catch (err) {
    console.error(`Tool sync error [${tool}]:`, err.message);
    res.json(await demoResp('error:' + err.message));
  }
});

module.exports = router;

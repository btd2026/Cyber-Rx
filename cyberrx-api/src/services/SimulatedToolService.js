'use strict';

/**
 * SimulatedToolService
 * --------------------
 * Computes security-posture metrics from the simulated live-source tool tables
 * (sim_okta_users, sim_crowdstrike_devices, ...) using the SAME aggregation
 * logic the real connectors apply to each vendor API (see routes/tools.js):
 *
 *   okta        mfa_pct       % of ACTIVE users with >= 1 ACTIVE MFA factor
 *   crowdstrike edr_pct       % of devices with sensor status 'normal'
 *   splunk      siem_days     MIN retention days across key indexes
 *   knowbe4     phishing_pct  clicked/recipients of latest closed campaign
 *   tenable     patch_pct     100 - (critical open past-SLA vulns / assets * 100)
 *               vuln_sla_pct  % of open critical vulns NOT past SLA
 *   servicenow  mttr_hrs      avg(resolved - created) on P1/P2 incidents
 *               mttd_hrs      avg(created - occurred) on P1/P2 incidents
 *   cyberark    pam_pct       vaulted / total privileged accounts
 *   workday     training_pct  workers with security training completed
 *
 * syncOrg(orgId) upserts the computed values into metric_inputs, which is what
 * the metrics engine and dashboards read — so editing rows in the sim tables
 * changes the dashboards on the next sync.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

async function rows(sql, params = []) {
  try { return await db.query(sql, params); } catch (err) {
    logger.debug('SimulatedToolService query degraded', { error: err.message });
    return [];
  }
}
const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : null; };

// Per-tool aggregations -------------------------------------------------------

async function okta(orgId) {
  const r = await rows(
    `SELECT COUNT(*) total,
            COUNT(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM sim_okta_factors f
               WHERE f.org_id = u.org_id AND f.user_id = u.user_id AND f.status = 'ACTIVE'
            )) enrolled
       FROM sim_okta_users u
      WHERE u.org_id = $1 AND u.status = 'ACTIVE'`, [orgId]);
  const t = n(r[0] && r[0].total), e = n(r[0] && r[0].enrolled);
  if (!t) return null;
  return { metric: 'mfa_pct', metricKey: 'mfaPct', value: Math.round((e / t) * 100), basis: `${e}/${t} active users with an ACTIVE factor` };
}

async function crowdstrike(orgId) {
  const r = await rows(
    `SELECT COUNT(*) total, COUNT(*) FILTER (WHERE status = 'normal') normal
       FROM sim_crowdstrike_devices WHERE org_id = $1`, [orgId]);
  const t = n(r[0] && r[0].total), ok = n(r[0] && r[0].normal);
  if (!t) return null;
  return { metric: 'edr_pct', metricKey: 'edrPct', value: Math.round((ok / t) * 100), basis: `${ok}/${t} devices with sensor status 'normal'` };
}

async function splunk(orgId) {
  const r = await rows(
    `SELECT MIN(frozen_time_period_in_secs) / 86400 AS days
       FROM sim_splunk_indexes
      WHERE org_id = $1
        AND (index_name ILIKE '%main%' OR index_name ILIKE '%audittrail%'
          OR index_name ILIKE '%wineventlog%' OR index_name ILIKE '%syslog%')`, [orgId]);
  const d = n(r[0] && r[0].days);
  if (d == null) return null;
  return { metric: 'siem_days', metricKey: 'siemDays', value: Math.floor(d), basis: 'min retention across key indexes' };
}

async function knowbe4(orgId) {
  const r = await rows(
    `SELECT recipient_count, clicked_count FROM sim_knowbe4_campaigns
      WHERE org_id = $1 AND status = 'Closed'
      ORDER BY started_at DESC LIMIT 1`, [orgId]);
  if (!r.length || !n(r[0].recipient_count)) return null;
  const value = parseFloat(((n(r[0].clicked_count) / n(r[0].recipient_count)) * 100).toFixed(1));
  return { metric: 'phishing_pct', metricKey: 'phishingPct', value, basis: `${r[0].clicked_count}/${r[0].recipient_count} clicked in latest closed campaign` };
}

async function tenable(orgId) {
  const [a, v] = await Promise.all([
    rows(`SELECT COUNT(*) total FROM sim_tenable_assets WHERE org_id = $1`, [orgId]),
    rows(`SELECT COUNT(*) FILTER (WHERE state='open') open,
                 COUNT(*) FILTER (WHERE state='open' AND past_sla) past
            FROM sim_tenable_vulns WHERE org_id = $1 AND severity = 'critical'`, [orgId]),
  ]);
  const assets = n(a[0] && a[0].total), open = n(v[0] && v[0].open), past = n(v[0] && v[0].past);
  if (!assets) return null;
  return [
    { metric: 'patch_pct', metricKey: 'patchPct', value: Math.round(Math.max(0, 100 - (past / assets) * 100)), basis: `${past} past-SLA critical vulns across ${assets} assets` },
    open ? { metric: 'vuln_sla_pct', metricKey: 'vulnSLApct', value: Math.round(((open - past) / open) * 100), basis: `${open - past}/${open} open critical vulns within SLA` } : null,
  ].filter(Boolean);
}

async function servicenow(orgId) {
  const r = await rows(
    `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - sys_created_on)) / 3600) mttr,
            AVG(EXTRACT(EPOCH FROM (sys_created_on - occurred_at)) / 3600) mttd
       FROM sim_servicenow_incidents
      WHERE org_id = $1 AND priority <= 2 AND resolved_at IS NOT NULL`, [orgId]);
  const mttr = n(r[0] && r[0].mttr), mttd = n(r[0] && r[0].mttd);
  if (mttr == null) return null;
  const out = [{ metric: 'mttr_hrs', metricKey: 'mttrHrs', value: parseFloat(mttr.toFixed(1)), basis: 'avg resolve time on resolved P1/P2 incidents' }];
  if (mttd != null) out.push({ metric: 'mttd_hrs', metricKey: 'mttdHrs', value: parseFloat(mttd.toFixed(1)), basis: 'avg detect time (logged - occurred) on P1/P2 incidents' });
  return out;
}

async function cyberark(orgId) {
  const r = await rows(
    `SELECT COUNT(*) total, COUNT(*) FILTER (WHERE vaulted) vaulted
       FROM sim_cyberark_accounts WHERE org_id = $1 AND privileged`, [orgId]);
  const t = n(r[0] && r[0].total), v = n(r[0] && r[0].vaulted);
  if (!t) return null;
  return { metric: 'pam_pct', metricKey: 'pamPct', value: Math.round((v / t) * 100), basis: `${v}/${t} privileged accounts vaulted` };
}

async function workday(orgId) {
  const r = await rows(
    `SELECT COUNT(*) total, COUNT(*) FILTER (WHERE training_completed) done
       FROM sim_workday_workers WHERE org_id = $1`, [orgId]);
  const t = n(r[0] && r[0].total), d = n(r[0] && r[0].done);
  if (!t) return null;
  return { metric: 'training_pct', metricKey: 'trainingPct', value: Math.round((d / t) * 100), basis: `${d}/${t} workers completed security training` };
}

const TOOLS = { okta, crowdstrike, splunk, knowbe4, tenable, servicenow, cyberark, workday };
const TOOL_TABLES = {
  okta: ['sim_okta_users', 'sim_okta_factors'],
  crowdstrike: ['sim_crowdstrike_devices'],
  splunk: ['sim_splunk_indexes'],
  knowbe4: ['sim_knowbe4_campaigns'],
  tenable: ['sim_tenable_assets', 'sim_tenable_vulns'],
  servicenow: ['sim_servicenow_incidents'],
  cyberark: ['sim_cyberark_accounts'],
  workday: ['sim_workday_workers'],
};

/** Compute the metric(s) a tool would report for an org. Null if no data. */
async function computeTool(tool, orgId) {
  const fn = TOOLS[tool];
  if (!fn) return null;
  const out = await fn(orgId);
  if (!out) return null;
  return Array.isArray(out) ? out : [out];
}

/** Compute every tool's metrics for an org. */
async function computeAll(orgId) {
  const results = [];
  for (const tool of Object.keys(TOOLS)) {
    const metrics = await computeTool(tool, orgId);
    if (metrics) metrics.forEach((m) => results.push({ tool, ...m }));
  }
  return results;
}

/** Compute and persist into metric_inputs (what the dashboards read) + metrics history. */
async function syncOrg(orgId) {
  const computed = await computeAll(orgId);
  for (const m of computed) {
    try {
      await db.query(
        `INSERT INTO metric_inputs (org_id, key, value, category, label, unit, updated_at)
         VALUES ($1, $2, $3, 'posture', $4, $5, NOW())
         ON CONFLICT (org_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [orgId, m.metric, m.value, `${m.tool}: ${m.basis}`, m.metric.endsWith('_pct') ? '%' : m.metric.endsWith('_hrs') ? 'hours' : 'days']
      );
      await db.query(
        `INSERT INTO metrics (org_id, metric_key, value, source, demo) VALUES ($1, $2, $3, $4, true)`,
        [orgId, m.metricKey, m.value, `sim:${m.tool}`]
      );
    } catch (err) {
      logger.warn('Simulated sync persist failed', { orgId, metric: m.metric, error: err.message });
    }
  }
  logger.info('[sim-sync] Metrics synced from simulated sources', { orgId, count: computed.length });
  return computed;
}

/** All orgs that have any simulated source data. */
async function orgsWithSourceData() {
  const r = await rows(`
    SELECT DISTINCT org_id FROM (
      SELECT org_id FROM sim_okta_users
      UNION SELECT org_id FROM sim_crowdstrike_devices
      UNION SELECT org_id FROM sim_servicenow_incidents
    ) s`);
  return r.map((x) => x.org_id);
}

async function syncAll() {
  const orgs = await orgsWithSourceData();
  const out = {};
  for (const org of orgs) out[org] = await syncOrg(org);
  return out;
}

module.exports = { TOOLS: Object.keys(TOOLS), TOOL_TABLES, computeTool, computeAll, syncOrg, syncAll, orgsWithSourceData };

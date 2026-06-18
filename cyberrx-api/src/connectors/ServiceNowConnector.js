'use strict';

/**
 * ServiceNowConnector — first concrete CMDB connector. Reads the application
 * inventory and the structured business-service / application-service linkage
 * from a ServiceNow CMDB via the Table API (read-only).
 *
 * Tables used:
 *   cmdb_ci_appl              — application CIs (name, owner, vendor, environment)
 *   cmdb_ci_business_app      — business applications (alt source)
 *   cmdb_rel_ci               — CI relationships (app -> business service "Depends on::Used by")
 *
 * The relationship + "supported capability"/business-service fields are returned
 * as `businessServices[]` so the Step-3 cascade can use them as high-confidence
 * tier-(a) "inventory" evidence before any LLM matching.
 *
 * config: { instance (https://acme.service-now.com), username, password|token, query (optional sysparm_query) }
 */

const logger = require('../utils/logger');

function authHeader(config) {
  if (config.token) return `Bearer ${config.token}`;
  const basic = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  return `Basic ${basic}`;
}
function baseUrl(config) {
  if (!config || !config.instance) { const e = new Error('ServiceNow instance URL is required (https://yourco.service-now.com).'); e.code = 'CONFIG'; throw e; }
  return String(config.instance).replace(/\/$/, '');
}

async function test(config) {
  try {
    const url = `${baseUrl(config)}/api/now/table/cmdb_ci_appl?sysparm_limit=1`;
    const r = await fetch(url, { headers: { Authorization: authHeader(config), Accept: 'application/json' } });
    if (!r.ok) return { ok: false, message: `ServiceNow returned HTTP ${r.status}. Check the instance URL and credentials (read access to cmdb_ci_appl).` };
    return { ok: true, message: 'Connected to ServiceNow CMDB.' };
  } catch (e) { return { ok: false, message: `Could not reach ServiceNow: ${e.message}` }; }
}

async function pullApplications(config) {
  const base = baseUrl(config);
  const fields = 'sys_id,name,short_description,owned_by,vendor,environment,used_for,u_business_capability';
  const q = config.query ? `&sysparm_query=${encodeURIComponent(config.query)}` : '';
  const url = `${base}/api/now/table/cmdb_ci_appl?sysparm_display_value=true&sysparm_limit=200&sysparm_fields=${encodeURIComponent(fields)}${q}`;
  const r = await fetch(url, { headers: { Authorization: authHeader(config), Accept: 'application/json' } });
  if (!r.ok) { const e = new Error(`ServiceNow returned HTTP ${r.status}. Check the URL, credentials, and read access.`); e.code = 'HTTP'; throw e; }
  const data = await r.json();
  const records = (data && data.result) || [];

  // Best-effort: pull app -> business-service relationships for structured linkage.
  let relByApp = {};
  try { relByApp = await businessServiceLinks(base, config, records.map((x) => x.sys_id)); } catch (e) { logger.debug('servicenow rel pull degraded', { error: e.message }); }

  return records.map((c) => ({
    name: dv(c.name), owner: dv(c.owned_by), vendor: dv(c.vendor),
    hosting: dv(c.environment), description: dv(c.short_description),
    dataClassification: [],
    // structured linkage for the Step-3 confidence cascade (tier-a, "inventory")
    businessServices: relByApp[c.sys_id] || [],
    supportedCapability: dv(c.u_business_capability) || dv(c.used_for) || '',
    externalRef: c.sys_id, source: 'inventory',
  })).filter((a) => a.name);
}

// Resolve app -> business service names via cmdb_rel_ci (best-effort).
async function businessServiceLinks(base, config, sysIds) {
  if (!sysIds.length) return {};
  const url = `${base}/api/now/table/cmdb_rel_ci?sysparm_display_value=true&sysparm_limit=1000&sysparm_fields=parent,child,type`;
  const r = await fetch(url, { headers: { Authorization: authHeader(config), Accept: 'application/json' } });
  if (!r.ok) return {};
  const data = await r.json();
  const out = {};
  (data && data.result || []).forEach((rel) => {
    const parent = rel.parent && (rel.parent.value || rel.parent); // app CI
    const childName = rel.child && (rel.child.display_value || '');
    if (parent && childName) (out[parent] = out[parent] || []).push(childName);
  });
  return out;
}

function dv(v) { return v && typeof v === 'object' ? (v.display_value || v.value || '') : (v || ''); }

module.exports = { test, pullApplications };

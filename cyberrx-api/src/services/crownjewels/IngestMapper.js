'use strict';

/**
 * IngestMapper — maps onboarding uploads (process list + app/CMDB inventory) to
 * the canonical org / business_processes / assets rows the Crown-Jewels engine
 * scores. Pure + deterministic (no DB), so the mapping is unit-tested.
 *
 * Onboarding rows are loose: processes {name,data,rev}; apps {name,host,data}.
 * We normalize them into the existing schema (assets.type enum, process
 * tier/criticality enums) and link apps -> processes by shared data class.
 */

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'org';

function critFromRevData(rev, data) {
  const r = String(rev || ''); const d = String(data || '').toUpperCase();
  if (/\$/.test(r) || /PHI|PCI|CLASSIFIED|CUI|SECRET/.test(d)) return 'Critical';
  if (/FINANCIAL|PII|CARDHOLDER/.test(d)) return 'High';
  if (/INTERNAL|PUBLIC|DOC/.test(d)) return 'Low';
  return 'Medium';
}
function typeFromHost(host) {
  const h = String(host || '').toLowerCase();
  if (/\bdb\b|database|sql|postgres|oracle|mysql/.test(h)) return 'database';
  if (/\bapi\b|gateway/.test(h)) return 'API';
  if (/cloud|aws|azure|gcp|saas/.test(h)) return 'cloud';
  if (/on-?prem|server|\bvm\b|host|legacy/.test(h)) return 'server';
  return 'app';
}
function expoFromHost(host) {
  const h = String(host || '').toLowerCase();
  if (/internet|public|saas|cloud|aws|azure|gcp/.test(h)) return 'internet_facing';
  if (/on-?prem|internal|datacenter/.test(h)) return 'internal_only';
  return 'unknown';
}
const KNOWN_DATA = ['PHI', 'PII', 'PCI', 'Financial', 'Cardholder', 'CUI', 'Classified', 'Confidential', 'IP', 'Internal', 'Public'];
function dataClasses(data) {
  const u = String(data || '').toUpperCase();
  const out = KNOWN_DATA.filter((k) => u.includes(k.toUpperCase()));
  return out.length ? out : (String(data || '').trim() ? [String(data).trim()] : []);
}

/**
 * @param {{org_id?, org_name, processes:Array, apps:Array}} input
 * @returns {{org:{id,name}, processes:Array, assets:Array}}
 */
function mapOnboarding(input = {}) {
  const orgId = input.org_id || `org_${slug(input.org_name)}`;
  const procRows = (input.processes || []).filter((p) => p && p.name).map((p, i) => ({
    id: `${orgId}_P${i + 1}`, name: String(p.name).trim(), tier: 'Primary',
    criticality: critFromRevData(p.rev, p.data), owner: p.owner || '—',
    _dataTokens: String(p.data || '').toUpperCase().split(/[^A-Z]+/).filter((t) => t.length > 1),
  }));
  const assetRows = (input.apps || []).filter((a) => a && a.name).map((a, i) => {
    const dtoks = String(a.data || '').toUpperCase().split(/[^A-Z]+/).filter((t) => t.length > 1);
    let linked = procRows.filter((p) => dtoks.some((t) => p._dataTokens.includes(t))).map((p) => p.id);
    if (!linked.length && procRows.length) {
      // fall back to the most critical process
      const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      linked = [procRows.slice().sort((x, y) => rank[x.criticality] - rank[y.criticality])[0].id];
    }
    return {
      id: `${orgId}_A${i + 1}`, name: String(a.name).trim(), type: typeFromHost(a.host),
      organizationId: orgId, dataClassification: dataClasses(a.data), exposure: expoFromHost(a.host),
      businessProcessIds: linked, description: a.host || null,
    };
  });
  // strip helper field
  procRows.forEach((p) => { delete p._dataTokens; p.organizationId = orgId; });
  return { org: { id: orgId, name: String(input.org_name || orgId).trim() }, processes: procRows, assets: assetRows };
}

module.exports = { mapOnboarding, critFromRevData, typeFromHost, expoFromHost, dataClasses, slug };

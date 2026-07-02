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
  const procIdByName = {}; procRows.forEach((p) => { procIdByName[norm(p.name)] = p.id; });
  const assetRows = (input.apps || []).filter((a) => a && a.name).map((a, i) => {
    // Explicit process→app mapping from onboarding wins (the user drew the chain);
    // fall back to the shared-data-class heuristic, then to the most critical process.
    let linked = (Array.isArray(a.processes) ? a.processes : [])
      .map((n) => procIdByName[norm(n)]).filter(Boolean);
    if (!linked.length) {
      const dtoks = String(a.data || '').toUpperCase().split(/[^A-Z]+/).filter((t) => t.length > 1);
      linked = procRows.filter((p) => dtoks.some((t) => p._dataTokens.includes(t))).map((p) => p.id);
    }
    if (!linked.length && procRows.length) {
      // fall back to the most critical process
      const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      linked = [procRows.slice().sort((x, y) => rank[x.criticality] - rank[y.criticality])[0].id];
    }
    linked = Array.from(new Set(linked));
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

const SEV = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
const STAT = { open: 'open', mitigating: 'mitigating', accepted: 'accepted', closed: 'closed' };
const norm = (s) => String(s || '').trim().toLowerCase();
// Parse a money value, honoring magnitude suffixes ("$52M", "8000000", "2.1B",
// "750k", "12 million"). Returns a positive number or null.
function money(v) {
  const s = String(v == null ? '' : v);
  const n = Number(s.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = s.toLowerCase();
  let mult = 1;
  if (/billion|[0-9.]\s*b\b/.test(u)) mult = 1e9;
  else if (/million|mm\b|[0-9.]\s*m\b/.test(u)) mult = 1e6;
  else if (/thousand|[0-9.]\s*k\b/.test(u)) mult = 1e3;
  return n * mult;
}

/**
 * Map a loose risk-register upload to canonical Risk.create rows. Pure + no DB.
 * Links each risk to an asset/process BY NAME (callers don't know generated ids).
 * @param {Array} risks  onboarding rows {title|name, severity, status, asset, processes|process, financial_exposure|exposure, cost_to_remediate, likelihood, description}
 * @param {{org:{id}, assets:Array, processes:Array}} mapped  output of mapOnboarding
 * @returns {Array} Risk.create-ready rows
 */
function mapRisks(risks, mapped) {
  const orgId = mapped.org.id;
  const assetByName = {}; (mapped.assets || []).forEach((a) => { assetByName[norm(a.name)] = a.id; });
  const procByName = {}; (mapped.processes || []).forEach((p) => { procByName[norm(p.name)] = p.id; });
  const out = [];
  (risks || []).forEach((r, i) => {
    if (!r) return;
    const title = String(r.title || r.name || '').trim();
    if (!title) return;
    const procNames = r.processes || (r.process ? [r.process] : []);
    out.push({
      id: `${orgId}_R${i + 1}`,
      title,
      severity: SEV[norm(r.severity)] || 'High',
      status: STAT[norm(r.status)] || 'open',
      organizationId: orgId,
      assetId: r.asset ? (assetByName[norm(r.asset)] || null) : null,
      businessProcessIds: (Array.isArray(procNames) ? procNames : []).map((n) => procByName[norm(n)]).filter(Boolean),
      financialExposure: money(r.financial_exposure != null ? r.financial_exposure : r.exposure),
      costToRemediate: money(r.cost_to_remediate),
      likelihood: r.likelihood || null,
      description: r.description || null,
    });
  });
  return out;
}

module.exports = { mapOnboarding, mapRisks, critFromRevData, typeFromHost, expoFromHost, dataClasses, slug, money };

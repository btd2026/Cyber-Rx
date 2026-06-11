'use strict';

/**
 * AttackPathService
 * -----------------
 * Builds the CISO attack-path graph from real org data, across five layers:
 *
 *   Business Process → Application → Device → Network → Threat
 *
 * Crown-jewel processes sit on the left (what an attacker is ultimately after);
 * threats on the right. Every node is tagged with the set of business processes
 * it participates in, so the UI can trace a full path by highlighting every node
 * that shares a process with the one clicked — documents are connected, not
 * islands.
 *
 * Sources: business_processes, assets (apps vs devices by type), risks
 * (process↔threat and exposure), threat_scenarios. Network zones are derived
 * from each device's location / cloud provider / IP block, since there is no
 * dedicated network table. Degrades gracefully when a layer is sparse.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
async function rows(sql, params = []) {
  try { return await db.query(sql, params); } catch (err) { logger.debug('AttackPath query degraded', { error: err.message }); return []; }
}
function arr(v) { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } } return []; }
const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const APP_TYPES = new Set(['app', 'API']);

// Derive a network zone label for a device.
function networkZone(a) {
  if (a.cloud_provider) return `${a.cloud_provider}${a.location ? ` · ${a.location}` : ''}`;
  if (a.type === 'cloud') return a.location ? `Cloud · ${a.location}` : 'Cloud';
  if (a.ip_address) {
    const m = String(a.ip_address).match(/^(\d+)\.(\d+)\./);
    if (m) return `Network ${m[1]}.${m[2]}.0.0/16`;
  }
  if (a.location) return `On-prem · ${a.location}`;
  return 'Unsegmented network';
}

async function buildGraph(orgId) {
  const [procRows, assetRows, riskRows, threatRows] = await Promise.all([
    rows(`SELECT id, name, tier, criticality, supported_by_systems FROM business_processes WHERE organization_id=$1`, [orgId]),
    rows(`SELECT id, name, type, business_process_ids, criticality, tier, ip_address, location, cloud_provider,
                 vuln_critical, vuln_high, patch_pct, supported, end_of_support_date, data_classification
            FROM assets WHERE organization_id=$1`, [orgId]),
    rows(`SELECT id, title, severity, financial_exposure, business_process_ids, threat_scenario_id
            FROM risks WHERE organization_id=$1 AND status IN ('open','mitigating')`, [orgId]),
    rows(`SELECT id, name, type, probability, impact_level, mitre_tactic, exploited_risks
            FROM threat_scenarios WHERE organization_id=$1`, [orgId]),
  ]);

  // ── Process layer ─────────────────────────────────────────────────────────
  // Fall back to processes referenced by open risks if the table is sparse.
  const procExposure = {}; // procId -> $ exposure
  riskRows.forEach((r) => arr(r.business_process_ids).forEach((pid) => { procExposure[pid] = (procExposure[pid] || 0) + n(r.financial_exposure); }));
  const procById = {};
  procRows.forEach((p) => { procById[p.id] = p; });
  const referencedProcIds = new Set([...Object.keys(procExposure), ...procRows.map((p) => p.id)]);
  const processes = [...referencedProcIds].map((pid) => {
    const p = procById[pid] || {};
    return { id: pid, layer: 'process', label: p.name || pid, criticality: p.criticality || 'Medium',
      exposure: Math.round(procExposure[pid] || 0), procs: [pid] };
  }).sort((a, b) => (b.exposure - a.exposure) || (sevRank[a.criticality] - sevRank[b.criticality]));

  // ── App & Device layers (from assets, split by type) ──────────────────────
  const apps = [], devices = [];
  assetRows.forEach((a) => {
    const procs = arr(a.business_process_ids);
    const nameStr = String(a.name || '').toLowerCase();
    const dc = arr(a.data_classification).map((x) => String(x).toLowerCase());
    const node = { id: a.id, label: a.name, procs, criticality: a.criticality || 'Medium',
      vulnCritical: n(a.vuln_critical), vulnHigh: n(a.vuln_high), patchPct: a.patch_pct == null ? null : n(a.patch_pct),
      supported: a.supported !== false, eol: a.end_of_support_date || null,
      // Papa #10 — threat-graph callout flags
      internetExposed: a.type === 'API' || /portal|gateway|edge|remote|public|sftp|vpn|web|exchange|clearinghouse/.test(nameStr),
      sensitiveData: dc.some((x) => /phi|pii|pci|sensitive|ssn/.test(x)) || /phi|claims|member|warehouse|database/.test(nameStr) };
    if (APP_TYPES.has(a.type)) { node.layer = 'app'; apps.push(node); }
    else { node.layer = 'device'; node.assetType = a.type; node.zone = networkZone(a); devices.push(node); }
  });

  // ── Network layer (derived zones from devices) ────────────────────────────
  const zoneMap = {};
  devices.forEach((d) => {
    const z = d.zone || 'Unsegmented network';
    if (!zoneMap[z]) zoneMap[z] = { id: `net_${z.replace(/[^a-z0-9]+/gi, '_')}`, layer: 'network', label: z, procs: new Set(), deviceIds: [] };
    d.procs.forEach((p) => zoneMap[z].procs.add(p));
    zoneMap[z].deviceIds.push(d.id);
    d.zoneId = zoneMap[z].id;
  });
  const networks = Object.values(zoneMap).map((z) => ({ ...z, procs: [...z.procs] }));

  // ── Threat layer ──────────────────────────────────────────────────────────
  const riskById = {}; riskRows.forEach((r) => { riskById[r.id] = r; });
  const threats = threatRows.map((t) => {
    const procs = new Set();
    // via risks that name this threat
    riskRows.filter((r) => r.threat_scenario_id === t.id).forEach((r) => arr(r.business_process_ids).forEach((p) => procs.add(p)));
    // via exploited_risks
    arr(t.exploited_risks).forEach((rid) => { const r = riskById[rid]; if (r) arr(r.business_process_ids).forEach((p) => procs.add(p)); });
    return { id: t.id, layer: 'threat', label: t.name, threatType: t.type, probability: n(t.probability),
      impact: t.impact_level || 'Medium', tactic: t.mitre_tactic || null, procs: [...procs] };
  }).sort((a, b) => (sevRank[a.impact] - sevRank[b.impact]) || (b.probability - a.probability));

  // ── Edges between adjacent layers, by shared business process ─────────────
  const edges = [];
  const link = (from, to) => { if (from.procs.some((p) => to.procs.includes(p))) edges.push({ from: from.id, to: to.id }); };
  processes.forEach((p) => apps.forEach((a) => link(p, a)));
  apps.forEach((a) => devices.forEach((d) => link(a, d)));
  devices.forEach((d) => { if (d.zoneId) edges.push({ from: d.id, to: d.zoneId }); });
  networks.forEach((nw) => threats.forEach((t) => link(nw, t)));
  // If a layer is empty, bridge the gap so the path stays connected.
  if (!apps.length) processes.forEach((p) => devices.forEach((d) => link(p, d)));
  if (!devices.length) apps.forEach((a) => networks.forEach((nw) => link(a, nw)));
  if (!networks.length) (devices.length ? devices : apps).forEach((s) => threats.forEach((t) => link(s, t)));

  const layers = [
    { id: 'process', label: 'Business Process', nodes: processes },
    { id: 'app', label: 'Application', nodes: apps },
    { id: 'device', label: 'Device', nodes: devices },
    { id: 'network', label: 'Network', nodes: networks },
    { id: 'threat', label: 'Threat', nodes: threats },
  ];

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    layers, edges,
    counts: { processes: processes.length, apps: apps.length, devices: devices.length, networks: networks.length, threats: threats.length, edges: edges.length },
    totalExposure: Math.round(Object.values(procExposure).reduce((s, v) => s + v, 0)),
  };
}

module.exports = { buildGraph };

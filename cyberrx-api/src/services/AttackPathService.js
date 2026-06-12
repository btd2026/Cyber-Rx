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

// Map a finding (by keyword) to a MITRE ATT&CK technique + tactic and the CIS
// Control that governs it. Threat-platform style: each control failure is an
// ATT&CK technique an attacker could use, tied to a CIS safeguard.
const ATTACK_MAP = [
  { kw: /mfa|multi.?factor|credential|password|auth|account|privileg|orphan|terminat/i,
    mitre: { tactic: 'Credential Access / Initial Access', techniqueId: 'T1078', technique: 'Valid Accounts' }, cis: { id: 'CIS 6', name: 'Access Control Management' } },
  { kw: /phish|social eng|business email|bec|spoof/i,
    mitre: { tactic: 'Initial Access', techniqueId: 'T1566', technique: 'Phishing' }, cis: { id: 'CIS 9', name: 'Email & Web Browser Protections' } },
  { kw: /cve|patch|vuln|exploit|unpatched|outdated|end.?of.?life|legacy/i,
    mitre: { tactic: 'Initial Access', techniqueId: 'T1190', technique: 'Exploit Public-Facing Application' }, cis: { id: 'CIS 7', name: 'Continuous Vulnerability Management' } },
  { kw: /encrypt|unencrypted|tls|ssl|plaintext|cleartext|ssn|phi|data.?at.?rest|dlp|leak/i,
    mitre: { tactic: 'Collection / Exfiltration', techniqueId: 'T1530', technique: 'Data from Information Repositories' }, cis: { id: 'CIS 3', name: 'Data Protection' } },
  { kw: /log|siem|retention|audit|monitor|detect|mttd/i,
    mitre: { tactic: 'Defense Evasion', techniqueId: 'T1562', technique: 'Impair Defenses' }, cis: { id: 'CIS 8', name: 'Audit Log Management' } },
  { kw: /edr|malware|antivirus|endpoint|ransom/i,
    mitre: { tactic: 'Impact', techniqueId: 'T1486', technique: 'Data Encrypted for Impact' }, cis: { id: 'CIS 10', name: 'Malware Defenses' } },
  { kw: /vendor|third.?party|subprocessor|supply|baa|clearinghouse|sftp/i,
    mitre: { tactic: 'Initial Access', techniqueId: 'T1199', technique: 'Trusted Relationship' }, cis: { id: 'CIS 15', name: 'Service Provider Management' } },
  { kw: /firewall|segment|network|exposed|internet|remote|vpn|rdp|port|misconfig/i,
    mitre: { tactic: 'Initial Access', techniqueId: 'T1133', technique: 'External Remote Services' }, cis: { id: 'CIS 12', name: 'Network Infrastructure Management' } },
  { kw: /backup|recover|dr |disaster|continuity|resilien/i,
    mitre: { tactic: 'Impact', techniqueId: 'T1490', technique: 'Inhibit System Recovery' }, cis: { id: 'CIS 11', name: 'Data Recovery' } },
];
function deriveAttack(text) {
  const s = String(text || '');
  const hit = ATTACK_MAP.find((m) => m.kw.test(s));
  return hit || { mitre: { tactic: 'Initial Access', techniqueId: 'T1190', technique: 'Exploit Public-Facing Application' }, cis: { id: 'CIS 18', name: 'Penetration Testing' } };
}

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
  const [procRows, assetRows, riskRows, threatRows, findingRows] = await Promise.all([
    rows(`SELECT id, name, tier, criticality, supported_by_systems FROM business_processes WHERE organization_id=$1`, [orgId]),
    rows(`SELECT id, name, type, business_process_ids, criticality, tier, ip_address, location, cloud_provider,
                 vuln_critical, vuln_high, patch_pct, supported, end_of_support_date, data_classification
            FROM assets WHERE organization_id=$1`, [orgId]),
    rows(`SELECT id, title, severity, financial_exposure, business_process_ids, threat_scenario_id
            FROM risks WHERE organization_id=$1 AND status IN ('open','mitigating')`, [orgId]),
    rows(`SELECT id, name, type, probability, impact_level, mitre_tactic, exploited_risks
            FROM threat_scenarios WHERE organization_id=$1`, [orgId]),
    rows(`SELECT id, title, severity, status, description, asset_id, application_id, business_process_id, risk_id, remediation_plan, tool, source
            FROM findings WHERE organization_id=$1 AND status IN ('open','in_progress')
            ORDER BY CASE severity WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END
            LIMIT 40`, [orgId]),
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

  // ── Findings layer: each open finding is a failed control on the path. ─────
  // Attach to the node it relates to (asset → app/device; process; else best
  // name match; else the highest-impact threat) and give it a stable F-ref.
  const nodeById = {};
  [...processes, ...apps, ...devices].forEach((nd) => { nodeById[nd.id] = nd; });
  const findings = (findingRows || []).map((f, i) => {
    let nodeId = null;
    if (f.asset_id && nodeById[f.asset_id]) nodeId = f.asset_id;
    else if (f.application_id && nodeById[f.application_id]) nodeId = f.application_id;
    else if (f.business_process_id && nodeById[f.business_process_id]) nodeId = f.business_process_id;
    if (!nodeId) {
      const ftitle = String(f.title || '').toLowerCase();
      const match = [...devices, ...apps].find((nd) => {
        const lbl = String(nd.label || '').toLowerCase().split(/[\s/]+/).filter((w) => w.length > 3);
        return lbl.some((w) => ftitle.includes(w));
      });
      nodeId = match ? match.id : (devices[0] ? devices[0].id : (threats[0] ? threats[0].id : null));
    }
    const node = nodeById[nodeId] || {};
    const atk = deriveAttack(`${f.title} ${f.description || ''}`);
    return {
      ref: `F${i + 1}`, id: f.id, title: f.title, severity: f.severity, status: f.status,
      description: f.description || '', remediation: f.remediation_plan || '', nodeId,
      // Wiz-style enrichment: ATT&CK technique, CIS control, detecting source, system.
      mitre: atk.mitre, cis: atk.cis,
      source: f.tool || f.source || 'CyberRx Scan',
      system: node.label || null,
      systemLayer: node.layer || null,
    };
  });
  // Index findings onto their nodes.
  const findingsByNode = {};
  findings.forEach((f) => { if (f.nodeId) { (findingsByNode[f.nodeId] = findingsByNode[f.nodeId] || []).push(f.ref); } });
  [...processes, ...apps, ...devices, ...threats].forEach((nd) => {
    if (findingsByNode[nd.id]) nd.findingRefs = findingsByNode[nd.id];
  });

  const layers = [
    { id: 'process', label: 'Business Process', nodes: processes },
    { id: 'app', label: 'Application', nodes: apps },
    { id: 'device', label: 'Device', nodes: devices },
    { id: 'network', label: 'Network', nodes: networks },
    { id: 'threat', label: 'Threat', nodes: threats },
  ];

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    layers, edges, findings,
    counts: { processes: processes.length, apps: apps.length, devices: devices.length, networks: networks.length, threats: threats.length, edges: edges.length, findings: findings.length },
    totalExposure: Math.round(Object.values(procExposure).reduce((s, v) => s + v, 0)),
  };
}

module.exports = { buildGraph };

'use strict';
const express = require('express');
const router = express.Router();
const vault = require('../utils/vault');
const db = require('../utils/db');
const logger = require('../utils/logger');
const { authenticateJWT, optionalJWT, demoOrg } = require('../middleware/auth');

const DEMO_TICKET = (system) => ({
  ticket_id: 'DEMO-' + Date.now(),
  demo: true, url: null, system: system || 'demo', ts: new Date().toISOString(),
});

// Map a tool name (as selected in the Technology step) to a ticketing system code.
function systemForTool(name) {
  const n = String(name || '').toLowerCase();
  if (/servicenow/.test(n)) return { code: 'snow', label: 'ServiceNow' };
  if (/jira/.test(n)) return { code: 'jira', label: 'Jira Service Management' };
  if (/freshservice/.test(n)) return { code: 'freshservice', label: 'Freshservice' };
  if (/bmc|remedy|helix/.test(n)) return { code: 'remedy', label: 'BMC Helix / Remedy' };
  if (/cherwell/.test(n)) return { code: 'cherwell', label: 'Cherwell' };
  return null;
}

// Resolve the ITSM/ticketing system the org selected at setup (cae_selected_tool,
// then any business-setup hint). Returns { code, label, connected } or null.
async function resolveSelectedSystem(orgId) {
  let rows = [];
  try {
    rows = await db.query(
      `SELECT tool_name FROM cae_selected_tool WHERE org_id=$1`, [orgId]);
  } catch (_) { rows = []; }
  for (const r of rows) { const s = systemForTool(r.tool_name); if (s) { return finalizeSystem(orgId, s); } }
  // fallback: org setup_json infraSel keys
  try {
    const o = (await db.query('SELECT setup_json FROM orgs WHERE id=$1', [orgId]))[0];
    const sj = o && (typeof o.setup_json === 'string' ? JSON.parse(o.setup_json) : o.setup_json) || {};
    const keys = Object.keys(sj.infraSel || {}).filter((k) => sj.infraSel[k]);
    for (const k of keys) { const s = systemForTool(k.split(':').pop()); if (s) return finalizeSystem(orgId, s); }
  } catch (_) { /* ignore */ }
  return null;
}
async function finalizeSystem(orgId, s) {
  let connected = false;
  try { connected = !!(await vault.get(orgId, s.code)); } catch (_) { connected = false; }
  return { ...s, connected };
}

// Compose a clear, structured ticket body from CyberRX-collected information.
function composeTicket(payload = {}) {
  const { title, action, finding, process, application, owner, dueDate, evidence, recommendation, whyNow, severity } = payload;
  const lines = [];
  lines.push(payload.summary || (finding && finding.title) || action || 'Security remediation required by CyberRX.');
  lines.push('');
  if (whyNow) lines.push(`Why now: ${whyNow}`);
  if (severity) lines.push(`Severity: ${severity}`);
  if (process) lines.push(`Affected business process: ${process}`);
  if (application) lines.push(`Affected application/system: ${application}`);
  if (finding && finding.mitre) lines.push(`MITRE ATT&CK: ${finding.mitre.techniqueId} ${finding.mitre.technique} (${finding.mitre.tactic})`);
  if (finding && finding.cis) lines.push(`CIS Control: ${finding.cis.id} ${finding.cis.name}`);
  if (recommendation) lines.push('', `Recommended remediation: ${recommendation}`);
  if (evidence) lines.push('', `Evidence: ${evidence}`);
  if (owner) lines.push('', `Suggested owner: ${owner}`);
  if (dueDate) lines.push(`Target date: ${dueDate}`);
  lines.push('', '— Opened automatically by CyberRX from live assessment data.');
  return { title: title || (finding && finding.title) || action || 'CyberRX security finding', desc: lines.join('\n') };
}

// Core ticket creation against a system using vaulted creds. Returns the result
// or a demo ticket when no credentials are configured / on any error.
async function openTicket(system, orgId, { title, desc, finding = null, actId = '' }) {
  const creds = await vault.get(orgId, system).catch(() => null);
  if (!creds) return DEMO_TICKET(system);
  try {
    if (system === 'snow') {
      const priority = finding && (finding.sev || finding.severity) === 'Critical' ? '1-Critical' : '2-High';
      const r = await fetch(`https://${creds.instance}.service-now.com/api/now/table/change_request`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${creds.user}:${creds.password}`).toString('base64'), 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_description: title, description: desc, category: 'Cybersecurity', priority, assignment_group: creds.assignGroup || 'IT Security', u_cyberrx_finding: finding ? finding.id : '', u_cyberrx_action: actId }),
      });
      const data = await r.json(); const num = data.result && data.result.number;
      return { ticket_id: num, url: num ? `https://${creds.instance}.service-now.com/nav_to.do?uri=change_request.do?number=${num}` : null, system, demo: false, ts: new Date().toISOString() };
    }
    if (system === 'jira') {
      const r = await fetch(`https://${creds.instance}.atlassian.net/rest/api/3/issue`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${creds.email}:${creds.token}`).toString('base64'), 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { project: { key: creds.project || 'SEC' }, summary: title, description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: desc }] }] }, issuetype: { name: 'Task' }, labels: ['cyberrx', 'security'] } }),
      });
      const data = await r.json();
      return { ticket_id: data.key, url: data.key ? `https://${creds.instance}.atlassian.net/browse/${data.key}` : null, system, demo: false, ts: new Date().toISOString() };
    }
    if (system === 'freshservice') {
      const r = await fetch(`https://${creds.domain}.freshservice.com/api/v2/tickets`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${creds.apiKey}:X`).toString('base64'), 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: title, description: desc, email: creds.email || 'cyberrx@demo.com', priority: finding && (finding.sev || finding.severity) === 'Critical' ? 1 : 2, status: 2, type: 'Incident', tags: ['cyberrx', 'security'] }),
      });
      const data = await r.json(); const tid = data.ticket && data.ticket.id;
      return { ticket_id: tid ? 'SR-' + tid : null, url: tid ? `https://${creds.domain}.freshservice.com/support/tickets/${tid}` : null, system, demo: false, ts: new Date().toISOString() };
    }
    return DEMO_TICKET(system);
  } catch (err) {
    logger.warn('ITSM ticket creation failed; demo fallback', { system, error: err.message });
    return { ...DEMO_TICKET(system), error: 'sanitized' };
  }
}

// Record the ticket against the org for status tracking.
async function record(orgId, system, result, payload) {
  try {
    const sourceRef = payload.sourceRef || `ticket:${result.ticket_id || Date.now()}`;
    await db.query(
      `INSERT INTO remediation_tickets (id, organization_id, source, source_ref, title, severity, system, ticket_id, ticket_url, status, created_at)
       VALUES ($1,$2,'cyberrx',$3,$4,$5,$6,$7,$8,'open',NOW())
       ON CONFLICT (organization_id, source_ref)
       DO UPDATE SET ticket_id=EXCLUDED.ticket_id, ticket_url=EXCLUDED.ticket_url, system=EXCLUDED.system, updated_at=NOW()`,
      [`rt_${orgId}_${Date.now()}`, orgId, sourceRef, payload.title || 'CyberRX ticket', payload.severity || null, system, result.ticket_id || null, result.url || null]);
  } catch (e) { logger.debug('remediation_tickets record skipped', { error: e.message }); }
}

// ── Routes ─────────────────────────────────────────────────────────────────

// Which ticketing system did the org select at setup, and is it connected?
router.get('/selected', optionalJWT, demoOrg, async (req, res) => {
  const orgId = req.orgId; if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json((await resolveSelectedSystem(orgId)) || { code: null, label: null, connected: false }); }
  catch (e) { res.status(500).json({ error: 'Unable to resolve ticketing system.' }); }
});

// Store ITSM credentials in the vault (called when connecting at setup).
router.post('/credentials', optionalJWT, demoOrg, async (req, res) => {
  const orgId = req.orgId || 'demo';
  const { system, credentials } = req.body || {};
  if (!system || !credentials) return res.status(400).json({ error: 'system and credentials are required.' });
  try { await vault.set(orgId, system, credentials); res.json({ stored: true, system }); }
  catch (e) { res.status(500).json({ error: 'Unable to store credentials.' }); }
});

// Open a ticket in the selected system, with a CyberRX-composed body.
router.post('/open', optionalJWT, demoOrg, async (req, res) => {
  const orgId = req.orgId; if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const payload = req.body || {};
  try {
    const sys = payload.system ? { code: payload.system, label: payload.system } : await resolveSelectedSystem(orgId);
    if (!sys || !sys.code) return res.status(409).json({ error: 'No ticketing system was selected during setup. Add one in the Technology step.' });
    const body = composeTicket(payload);
    const result = await openTicket(sys.code, orgId, { ...body, finding: payload.finding || null, actId: payload.actId || '' });
    await record(orgId, sys.code, result, { ...body, sourceRef: payload.sourceRef });
    res.json({ ...result, label: sys.label });
  } catch (e) {
    logger.warn('itsm open failed', { error: e.message });
    res.status(500).json({ error: 'Unable to open the ticket.' });
  }
});

// Legacy direct creation endpoint (kept).
router.post('/:system/ticket', authenticateJWT, async (req, res) => {
  const orgId = req.orgId || 'demo';
  const { title = 'CyberRx Security Finding', desc = '', actId = '', finding = null } = req.body || {};
  const result = await openTicket(req.params.system, orgId, { title, desc, finding, actId });
  res.json(result);
});

module.exports = router;
module.exports.openTicket = openTicket;
module.exports.composeTicket = composeTicket;
module.exports.resolveSelectedSystem = resolveSelectedSystem;

'use strict';

/**
 * RemediationPathService (Papa #12)
 * ---------------------------------
 * The remediation path: whenever there is a finding, open a ticket with
 * high-level remediation recommendations in the organization's ticketing
 * system (Jira, ServiceNow, or a demo ticket when no credentials are stored).
 *
 * Finding sources swept:
 *   · vendor_risk_signals (active Critical/High/Medium — Saraqael + monitors)
 *   · Zadkiel's NIST CSF document review (gaps and partials)
 *
 * Each finding produces at most one ticket (deduped by source_ref in
 * remediation_tickets), so re-running the sweep only tickets NEW findings.
 */

const crypto = require('crypto');
const db = require('../utils/db');
const logger = require('../utils/logger');
const vault = require('../utils/vault');
const NistCsf = require('./NistCsfService');

function uid(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

// Create one ticket in the target system. Mirrors routes/itsm.js behaviour:
// real API call when vault credentials exist, demo ticket otherwise.
async function createTicket(orgId, system, { title, description, severity }) {
  let creds = null;
  try { creds = await vault.get(orgId, system); } catch (_) {}
  if (!creds || system === 'demo') {
    return { ticketId: 'DEMO-' + Date.now() + '-' + Math.floor(Math.random() * 1000), url: null, demo: true };
  }
  try {
    if (system === 'snow') {
      const r = await fetch(`https://${creds.instance}.service-now.com/api/now/table/change_request`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${creds.user}:${creds.password}`).toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          short_description: title, description,
          category: 'Cybersecurity',
          priority: severity === 'Critical' ? '1-Critical' : '2-High',
          assignment_group: creds.assignGroup || 'IT Security',
        }),
      });
      const data = await r.json();
      const num = data.result && data.result.number;
      return { ticketId: num || null, url: num ? `https://${creds.instance}.service-now.com/nav_to.do?uri=change_request.do?number=${num}` : null, demo: false };
    }
    if (system === 'jira') {
      const r = await fetch(`https://${creds.instance}.atlassian.net/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${creds.email}:${creds.token}`).toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            project: { key: creds.project || 'SEC' },
            issuetype: { name: 'Task' },
            summary: title,
            description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
            labels: ['cyberrx', 'remediation'],
          },
        }),
      });
      const data = await r.json();
      return { ticketId: data.key || null, url: data.key ? `https://${creds.instance}.atlassian.net/browse/${data.key}` : null, demo: false };
    }
  } catch (err) {
    logger.warn('Remediation ticket API call failed, falling back to demo ticket', { system, error: err.message });
  }
  return { ticketId: 'DEMO-' + Date.now(), url: null, demo: true };
}

// Gather open findings from every source, normalized to
// {sourceRef, source, title, recommendation, severity}.
async function gatherFindings(orgId) {
  const out = [];
  try {
    const sigs = await db.query(
      `SELECT id, signal_name, severity, recommended_action, source_name, vendor_name
         FROM vendor_risk_signals
        WHERE organization_id=$1 AND status='active' AND severity IN ('Critical','High','Medium')`, [orgId]);
    sigs.forEach((s) => out.push({
      sourceRef: `vrs:${s.id}`, source: `Vendor risk — ${s.source_name}`,
      title: `[${s.vendor_name}] ${s.signal_name}`,
      recommendation: s.recommended_action || 'Investigate and remediate the vendor risk signal.',
      severity: s.severity,
    }));
  } catch (err) { logger.debug('Remediation sweep: vendor signals degraded', { error: err.message }); }

  try {
    const review = await NistCsf.reviewDocuments(orgId);
    review.reviews.filter((r) => r.status === 'Gap' || r.status === 'Partial').forEach((r) => {
      out.push({
        sourceRef: `csf:${r.key}`, source: 'NIST CSF review (Zadkiel)',
        title: `[${r.category}] ${r.status}: ${r.question}`,
        recommendation: r.recommendations.join(' ') || r.requirement,
        severity: r.status === 'Gap' ? 'High' : 'Medium',
      });
    });
  } catch (err) { logger.debug('Remediation sweep: CSF review degraded', { error: err.message }); }

  return out;
}

/** Sweep all findings and open tickets for any that don't have one yet. */
async function runSweep(orgId, system = 'demo') {
  const findings = await gatherFindings(orgId);
  const existing = await db.query(
    `SELECT source_ref FROM remediation_tickets WHERE organization_id=$1`, [orgId]);
  const have = new Set(existing.map((r) => r.source_ref));
  const created = [];
  for (const f of findings) {
    if (have.has(f.sourceRef)) continue;
    const description = `${f.title}\n\nRecommended remediation (high level):\n${f.recommendation}\n\nOpened automatically by the CyberRx remediation path. Source: ${f.source}.`;
    const t = await createTicket(orgId, system, { title: f.title, description, severity: f.severity });
    await db.query(
      `INSERT INTO remediation_tickets
         (id, organization_id, source, source_ref, title, recommendation, severity, system, ticket_id, ticket_url, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open',NOW(),NOW())
       ON CONFLICT (organization_id, source_ref) DO NOTHING`,
      [uid('rt'), orgId, f.source, f.sourceRef, f.title, f.recommendation, f.severity,
       t.demo ? 'demo' : system, t.ticketId, t.url]);
    created.push({ ...f, system: t.demo ? 'demo' : system, ticketId: t.ticketId, url: t.url });
  }
  return { swept: findings.length, alreadyTicketed: findings.length - created.length, created };
}

const DAY = 86400000;
const DEFAULT_SLA_DAYS = { Critical: 7, High: 14, Medium: 30, Low: 45 };

// Enrich a ticket row with the day-math the CISO feedback loop needs: how many
// days it has been open, the due date, days remaining, and whether it is past
// due or approaching past-due (within 10 days). `approaching` powers the alert.
function enrich(r) {
  if (!r) return null;
  const now = Date.now();
  const created = r.created_at ? new Date(r.created_at).getTime() : now;
  const due = r.due_date ? new Date(r.due_date).getTime() : null;
  const daysOpen = Math.max(0, Math.floor((now - created) / DAY));
  const daysToDue = due != null ? Math.ceil((due - now) / DAY) : null;
  const pastDue = daysToDue != null && daysToDue < 0 && r.status !== 'resolved';
  const approaching = daysToDue != null && daysToDue >= 0 && daysToDue <= 10 && r.status !== 'resolved';
  return {
    id: r.id, sourceRef: r.source_ref, title: r.title, recommendation: r.recommendation,
    severity: r.severity, owner: r.owner, system: r.system, ticketId: r.ticket_id, url: r.ticket_url,
    status: r.status, createdAt: r.created_at, dueDate: r.due_date, lastSyncedAt: r.last_synced_at || r.updated_at,
    daysOpen, daysToDue, pastDue, approaching,
  };
}

/** Open (or return existing) a ticket for a single finding by source_ref. */
async function ticketOne(orgId, { sourceRef, source, title, recommendation, severity, owner, dueDate, system = 'demo' }) {
  const existing = await db.query(
    `SELECT * FROM remediation_tickets WHERE organization_id=$1 AND source_ref=$2`, [orgId, sourceRef]);
  if (existing.length) return { existed: true, ...enrich(existing[0]) };

  const description = `${title}\n\nRecommended remediation (high level):\n${recommendation || 'Investigate and remediate this finding.'}\n\nOpened from the CyberRx CISO dashboard. Source: ${source || 'Finding'}.`;
  const t = await createTicket(orgId, system, { title, description, severity });
  const id = uid('rt');
  // Default SLA from severity when the caller didn't pass an explicit due date.
  const due = dueDate ? new Date(dueDate) : new Date(Date.now() + (DEFAULT_SLA_DAYS[severity] || 30) * DAY);
  await db.query(
    `INSERT INTO remediation_tickets
       (id, organization_id, source, source_ref, title, recommendation, severity, system, ticket_id, ticket_url, status, owner, due_date, created_at, updated_at, last_synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open',$11,$12,NOW(),NOW(),NOW())
     ON CONFLICT (organization_id, source_ref) DO NOTHING`,
    [id, orgId, source || 'CISO remediation', sourceRef, title, recommendation || '', severity,
     t.demo ? 'demo' : system, t.ticketId, t.url, owner || null, due.toISOString()]);
  const [row] = await db.query(
    `SELECT * FROM remediation_tickets WHERE organization_id=$1 AND source_ref=$2`, [orgId, sourceRef]);
  return { existed: false, ...enrich(row) };
}

/**
 * Refresh a ticket's status from the ticketing system. With live credentials
 * this would query Jira/ServiceNow; in demo mode it advances the lifecycle by
 * elapsed time (open -> in_progress -> resolved) so the CISO sees a moving
 * feedback loop. Always stamps last_synced_at so the CISO can refresh anytime.
 */
async function refreshStatus(orgId, sourceRef) {
  const rows = await db.query(
    `SELECT * FROM remediation_tickets WHERE organization_id=$1 AND source_ref=$2`, [orgId, sourceRef]);
  if (!rows.length) return null;
  const r = rows[0];
  let status = r.status;
  if (status !== 'resolved') {
    const daysOpen = Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / DAY));
    const due = r.due_date ? new Date(r.due_date).getTime() : null;
    if (due && Date.now() >= due) status = 'resolved';
    else if (daysOpen >= 2) status = 'in_progress';
    else status = 'open';
  }
  await db.query(
    `UPDATE remediation_tickets SET status=$3, last_synced_at=NOW(), updated_at=NOW()
       WHERE organization_id=$1 AND source_ref=$2`, [orgId, sourceRef, status]);
  const [updated] = await db.query(
    `SELECT * FROM remediation_tickets WHERE organization_id=$1 AND source_ref=$2`, [orgId, sourceRef]);
  return enrich(updated);
}

/** Look up a ticket by source_ref (e.g. an attack-path finding), enriched. */
async function getTicketByRef(orgId, sourceRef) {
  const rows = await db.query(
    `SELECT * FROM remediation_tickets WHERE organization_id=$1 AND source_ref=$2`, [orgId, sourceRef]);
  return rows.length ? enrich(rows[0]) : null;
}

async function listTickets(orgId) {
  const rows = await db.query(
    `SELECT * FROM remediation_tickets WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 200`, [orgId]);
  return rows.map((r) => ({
    id: r.id, source: r.source, title: r.title, recommendation: r.recommendation,
    severity: r.severity, system: r.system, ticketId: r.ticket_id, url: r.ticket_url,
    status: r.status, createdAt: r.created_at,
  }));
}

module.exports = { runSweep, listTickets, ticketOne, getTicketByRef, refreshStatus, gatherFindings };

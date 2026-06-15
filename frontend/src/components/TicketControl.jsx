/**
 * TicketControl — CISO remediation ticket + status feedback loop
 * -------------------------------------------------------------
 * Drop-in control used wherever the CISO sees a remediation (Executive Q&A
 * evidence, the issue drawer, the Action-Now queue). It:
 *   - opens a ticket in the org's chosen ticketing system (Jira / ServiceNow,
 *     or a demo ticket when no credentials are connected),
 *   - shows a live status with a day counter (Day N · due {date}),
 *   - warns when a ticket is past due or approaching past-due within 10 days,
 *   - lets the CISO refresh the status as many times as they want.
 *
 * Backend: GET/POST /api/remediation/ticket, POST /api/remediation/ticket/refresh.
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc';
const SYS_LABEL = { demo: 'ticketing system', jira: 'Jira', snow: 'ServiceNow', servicenow: 'ServiceNow' };
const STATUS = {
  open: { label: 'Open', color: '#A85B2E' },
  in_progress: { label: 'In progress', color: '#B07C2E' },
  resolved: { label: 'Resolved', color: '#1f8a4c' },
};

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  const system = props.system || ls('cyberrx_itsm_system') || 'demo';
  return { token, orgId, api, system };
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function TicketControl(props) {
  const { sourceRef, title, recommendation, severity, owner, whyNow, process, application } = props;
  const { token, orgId, api, system } = ctx(props);
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [ownerInput, setOwnerInput] = useState(owner || '');
  const [selSys, setSelSys] = useState(null);   // ticketing system chosen at setup

  const headers = useCallback(() => {
    const h = { 'X-Org-Id': orgId, 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token, orgId]);

  // Look up an existing ticket for this finding + the org's selected ticketing system.
  useEffect(() => {
    let live = true;
    fetch(`${api}/api/remediation/ticket?sourceRef=${encodeURIComponent(sourceRef)}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => r.json()).then((j) => { if (live) setTicket(j.ticket || null); }).catch(() => {});
    fetch(`${api}/api/itsm/selected?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => r.json()).then((s) => { if (live) setSelSys(s); }).catch(() => {});
    return () => { live = false; };
  }, [api, orgId, sourceRef]); // eslint-disable-line

  // Open a real ticket in the system selected during the Technology setup phase,
  // with a CyberRX-composed body (falls back to a demo ticket if not connected).
  const open = () => {
    setBusy(true); setError(null);
    fetch(`${api}/api/itsm/open`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ org_id: orgId, sourceRef, title, summary: title, recommendation, severity, owner: ownerInput || owner, whyNow, process, application, system: (selSys && selSys.code) || undefined }),
    }).then((r) => r.json()).then((t) => {
      if (t && t.error) { setError(t.error); return; }
      setTicket({ ticketId: t.ticket_id, url: t.url, system: t.system, status: 'open', demo: t.demo });
    }).catch((e) => setError(e.message)).finally(() => setBusy(false));
  };

  const refresh = () => {
    setBusy(true); setError(null);
    fetch(`${api}/api/remediation/ticket/refresh`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, sourceRef }),
    }).then((r) => r.json()).then((j) => setTicket(j.ticket)).catch((e) => setError(e.message)).finally(() => setBusy(false));
  };

  const sysLabel = (selSys && selSys.label) || SYS_LABEL[system] || 'ticketing system';

  if (!ticket) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: INK2 }}>
          Assign owner
          <input value={ownerInput} onChange={(e) => setOwnerInput(e.target.value)} placeholder="e.g. IAM Lead"
            style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 9px', fontSize: 12, color: INK, minWidth: 140 }} />
        </label>
        <button onClick={open} disabled={busy}
          style={{ background: '#0f1b2d', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Opening…' : `＋ Open ticket in ${sysLabel}`}
        </button>
        <span style={{ fontSize: 11, color: INK3 }}>
          {selSys && selSys.code
            ? (selSys.connected ? `Creates a real ticket in ${sysLabel} (connected at setup) and starts the SLA clock.` : `${sysLabel} selected at setup but not yet connected — opens a demo ticket until credentials are added.`)
            : 'No ticketing system selected during setup — add one in the Technology step.'}
        </span>
        {error && <span style={{ fontSize: 11, color: '#C0392B' }}>{error}</span>}
      </div>
    );
  }

  const st = STATUS[ticket.status] || STATUS.open;
  const alert = ticket.pastDue
    ? { bg: '#fdecea', bd: '#f3c9bf', fg: '#C0392B', text: `Past due by ${Math.abs(ticket.daysToDue)} day${Math.abs(ticket.daysToDue) === 1 ? '' : 's'}` }
    : ticket.approaching
      ? { bg: '#fdf6e9', bd: '#f0dcae', fg: '#B07C2E', text: `Approaching past-due — ${ticket.daysToDue} day${ticket.daysToDue === 1 ? '' : 's'} left` }
      : null;

  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 9, padding: '12px 14px', background: PANEL }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: st.color, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{st.label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>
          {ticket.url ? <a href={ticket.url} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', textDecoration: 'none' }}>{ticket.ticketId}</a> : ticket.ticketId}
        </span>
        <span style={{ fontSize: 11, color: INK3 }}>in {SYS_LABEL[ticket.system] || ticket.system}</span>
        <button onClick={refresh} disabled={busy} title="Refresh status from the ticketing system"
          style={{ marginLeft: 'auto', background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: INK, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? '…' : '↻ Refresh status'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 9, fontSize: 11.5, color: INK2 }}>
        {ticket.daysOpen != null && <span>Day <strong style={{ color: INK }}>{ticket.daysOpen}</strong> open</span>}
        {ticket.dueDate && <span>Due <strong style={{ color: INK }}>{fmtDate(ticket.dueDate)}</strong>{ticket.daysToDue != null && ticket.status !== 'resolved' ? <span style={{ color: alert ? alert.fg : INK3 }}> ({ticket.daysToDue >= 0 ? `${ticket.daysToDue}d left` : `${Math.abs(ticket.daysToDue)}d over`})</span> : ''}</span>}
        {ticket.demo && <span style={{ color: INK3 }}>Demo ticket — connect {sysLabel} at setup for a live ticket</span>}
        {ticket.owner && <span>Owner <strong style={{ color: INK }}>{ticket.owner}</strong></span>}
        {ticket.lastSyncedAt && <span style={{ color: INK3 }}>Synced {new Date(ticket.lastSyncedAt).toLocaleTimeString()}</span>}
      </div>
      {alert && (
        <div style={{ marginTop: 9, background: alert.bg, border: `1px solid ${alert.bd}`, borderRadius: 7, padding: '7px 11px', fontSize: 11.5, fontWeight: 600, color: alert.fg }}>
          ⚠ {alert.text}
        </div>
      )}
    </div>
  );
}

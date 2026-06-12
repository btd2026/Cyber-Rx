/**
 * RemediationPanel (Papa #12)
 * ---------------------------
 * The remediation path: every open finding (vendor risk signals, Zadkiel's
 * NIST CSF review) opens a ticket with high-level remediation recommendations
 * in the organization's ticketing system (Jira / ServiceNow / demo when no
 * credentials are connected). Re-running the sweep only tickets NEW findings.
 *
 * Data: GET /api/remediation/tickets · POST /api/remediation/sweep
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK_2 = '#475569', INK_3 = '#94a3b8', HAIRLINE = '#e2e8f0';
const SEV = { Critical: '#9E3B32', High: '#A85B2E', Medium: '#B07C2E', Low: '#6E7F49' };
const SYSTEMS = [['demo', 'Demo (no credentials)'], ['jira', 'Jira'], ['snow', 'ServiceNow']];

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || ((typeof window!=='undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

export default function RemediationPanel(props) {
  const [tickets, setTickets] = useState(null);
  const [system, setSystem] = useState('demo');
  const [sweeping, setSweeping] = useState(false);
  const [lastSweep, setLastSweep] = useState(null);
  const [error, setError] = useState(null);
  const { token, organizationId, apiUrl } = resolveCtx(props);

  const headers = useCallback(() => {
    const h = { 'X-Org-Id': organizationId, 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token, organizationId]);

  const load = useCallback(() => {
    fetch(`${apiUrl}/api/remediation/tickets?org_id=${encodeURIComponent(organizationId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTickets(d ? d.tickets : []))
      .catch((e) => setError(e.message));
  }, [apiUrl, organizationId, headers]);

  useEffect(() => { load(); }, [load]);

  const sweep = async () => {
    setSweeping(true); setError(null);
    try {
      const r = await fetch(`${apiUrl}/api/remediation/sweep?org_id=${encodeURIComponent(organizationId)}`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ system }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setLastSweep(await r.json());
      load();
    } catch (e) { setError(e.message); } finally { setSweeping(false); }
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            Remediation Path · findings → tickets
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>Remediation Tickets</h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 660, lineHeight: 1.55 }}>
            Every open finding — vendor risk signals from Saraqael and the monitors, and gaps from Zadkiel's NIST CSF
            review — opens a ticket with high-level remediation recommendations in your ticketing system. Re-running
            the sweep only tickets new findings.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 20 }}>
          <select value={system} onChange={(e) => setSystem(e.target.value)}
            style={{ border: `1px solid #cbd5e1`, borderRadius: 3, padding: '7px 9px', fontSize: 11.5, color: INK }}>
            {SYSTEMS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <button onClick={sweep} disabled={sweeping}
            style={{ background: '#0f1b2d', color: '#fff', border: 'none', borderRadius: 3, padding: '8px 16px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', opacity: sweeping ? 0.6 : 1 }}>
            {sweeping ? 'Opening tickets…' : 'Open tickets for new findings'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: SEV.Critical, fontSize: 12, marginTop: 12 }}>{error}</div>}
      {lastSweep && (
        <div style={{ marginTop: 12, fontSize: 12, color: INK_2, background: '#fafbfc', border: `1px solid ${HAIRLINE}`, borderRadius: 4, padding: '10px 14px' }}>
          Sweep complete: {lastSweep.swept} finding(s) reviewed · {lastSweep.created.length} new ticket(s) opened ·
          {' '}{lastSweep.alreadyTicketed} already ticketed.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {tickets == null && <div style={{ color: INK_3, fontSize: 13 }}>Loading tickets…</div>}
        {tickets && tickets.length === 0 && (
          <div style={{ color: INK_3, fontSize: 13, padding: '20px 0' }}>
            No remediation tickets yet — run a sweep to open tickets for current findings.
          </div>
        )}
        {tickets && tickets.map((t) => (
          <div key={t.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '11px 0', borderBottom: `1px solid #f1f5f9` }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: '#fff', background: SEV[t.severity] || INK_3, borderRadius: 2, padding: '3px 7px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, marginTop: 2 }}>
              {t.severity}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{t.title}</div>
              <div style={{ fontSize: 11.5, color: INK_2, marginTop: 3, lineHeight: 1.5 }}>→ {t.recommendation}</div>
              <div style={{ fontSize: 10, color: INK_3, marginTop: 3 }}>{t.source} · {new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {t.url
                ? <a href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, fontWeight: 600, color: '#2563eb' }}>{t.ticketId}</a>
                : <span style={{ fontSize: 11.5, fontWeight: 600, color: INK_2, fontVariantNumeric: 'tabular-nums' }}>{t.ticketId}</span>}
              <div style={{ fontSize: 9.5, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{t.system}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

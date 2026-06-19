/**
 * AttackPathDiagram — CISO attack path (Azure-style security graph)
 * ----------------------------------------------------------------
 * Azure-style security graph: hub-and-spoke resource/threat clusters drawn from
 * real org data via /api/attack-path, with the exposed attack chain highlighted.
 * Findings (control failures) ride as red nodes; clicking one opens the
 * right-hand MITRE ATT&CK / CIS detail panel with a remediation-ticket action.
 */

import React, { useState, useEffect } from 'react';
import AttackPathGraph from './AttackPathGraph';

const INK = '#0f172a', INK_2 = '#475569', INK_3 = '#94a3b8', HAIRLINE = '#e2e8f0';
const SEV = { Critical: '#9E3B32', High: '#A85B2E', Medium: '#B07C2E', Low: '#6E7F49' };

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || ((typeof window!=='undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

const usd = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v}`);

export default function AttackPathDiagram(props) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selFinding, setSelFinding] = useState(null); // clicked control failure
  const [ticket, setTicket] = useState(null);   // ticket for the selected finding
  const [ticketBusy, setTicketBusy] = useState(false);
  const { token, organizationId, apiUrl } = resolveCtx(props);

  const remHeaders = () => { const h = { 'X-Org-Id': organizationId, 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; };
  const openFinding = (f) => {
    setSelFinding(f); setTicket(null);
    const ref = `finding:${f.id || f.ref}`;
    fetch(`${apiUrl}/api/remediation/ticket?org_id=${encodeURIComponent(organizationId)}&sourceRef=${encodeURIComponent(ref)}`, { headers: remHeaders() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setTicket(d.ticket); }).catch(() => {});
  };
  const sendToTicketing = async (f) => {
    setTicketBusy(true);
    try {
      const res = await fetch(`${apiUrl}/api/remediation/ticket?org_id=${encodeURIComponent(organizationId)}`, {
        method: 'POST', headers: remHeaders(),
        body: JSON.stringify({ sourceRef: `finding:${f.id || f.ref}`, source: 'Attack-path control failure',
          title: `${f.ref} — ${f.title}`, recommendation: f.remediation || 'Remediate the failed control.', severity: f.severity, system: 'demo' }),
      });
      if (res.ok) setTicket(await res.json());
    } catch (_) {} finally { setTicketBusy(false); }
  };

  useEffect(() => {
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    setLoading(true); setError(null);
    fetch(`${apiUrl}/api/attack-path?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [apiUrl, organizationId, token]);

  if (loading) return <div style={{ padding: 28, color: INK_3, fontSize: 13 }}>Mapping attack paths from live data…</div>;
  if (error || !data) return (
    <div style={{ padding: 28, color: SEV.Critical, fontSize: 13 }}>Could not build the attack path: {error || 'no data'}</div>
  );

  const empty = data.counts.processes + data.counts.threats === 0;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            CISO · Attack Path Analysis
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>Threat exposure graph</h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 680, lineHeight: 1.55 }}>
            How a threat reaches each crown-jewel process, mapped from your live business processes, assets, and threat
            scenarios. The exposed attack chain is highlighted; click a flagged node to inspect the finding and open a
            remediation ticket.
          </div>
          {data.synthesized && (
            <div style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff7ed', border: '1px solid #f2d2ab', borderRadius: 7, padding: '6px 11px', fontSize: 11, color: '#9a5b1f', maxWidth: 680, lineHeight: 1.45 }}>
              <span style={{ fontSize: 12 }}>ⓘ</span>
              <span>Modeled from your risk data. Connect asset, vulnerability and threat sources to render live attack paths from observed telemetry.</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20, fontSize: 11, color: INK_2 }}>
          <div style={{ fontSize: 19, fontWeight: 600, color: SEV.Critical, fontVariantNumeric: 'tabular-nums' }}>{usd(data.totalExposure)}</div>
          <div style={{ fontSize: 10, color: INK_3 }}>exposure across {data.counts.processes} processes · {data.counts.threats} threats</div>
        </div>
      </div>

      {empty ? (
        <div style={{ padding: '40px 0', color: INK_3, fontSize: 13 }}>
          No business processes or threats are mapped for this organization yet. Complete setup (process selection,
          application mapping) and the attack path will populate from your data.
        </div>
      ) : (
        <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AttackPathGraph graph={data} authToken={token} orgId={organizationId} api_url={apiUrl} onFinding={openFinding} />
          </div>
          {/* Wiz/Azure-style right-hand detail panel */}
          {selFinding && (
            <div style={{ width: 340, flexShrink: 0, border: `1px solid ${HAIRLINE}`, borderRadius: 8, background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${HAIRLINE}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${SEV[selFinding.severity] || '#9E3B32'}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: SEV[selFinding.severity] || '#9E3B32', fontSize: 15 }}>⚠</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{selFinding.title}</div>
                  <div style={{ fontSize: 10.5, color: INK_3, marginTop: 2 }}>{selFinding.ref} · Finding</div>
                </div>
                <button onClick={() => { setSelFinding(null); setTicket(null); }} style={{ background: 'transparent', border: 'none', color: INK_3, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {[
                  ['Severity', <span key="s"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: SEV[selFinding.severity] || '#9E3B32', marginRight: 5 }} />{selFinding.severity}</span>],
                  ['MITRE ATT&CK', selFinding.mitre ? `${selFinding.mitre.techniqueId} · ${selFinding.mitre.technique}` : '—'],
                  ['ATT&CK Tactic', selFinding.mitre ? selFinding.mitre.tactic : '—'],
                  ['CIS Control', selFinding.cis ? `${selFinding.cis.id} · ${selFinding.cis.name}` : '—'],
                  ['Affected system', selFinding.system || '—'],
                  ['Source', selFinding.source || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', padding: '6px 0', borderBottom: `1px solid #f1f5f9`, fontSize: 12 }}>
                    <span style={{ width: 116, flexShrink: 0, color: INK_3 }}>{k}</span>
                    <span style={{ color: INK, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                {selFinding.description && <div style={{ fontSize: 11.5, color: INK_2, marginTop: 10, lineHeight: 1.5 }}>{selFinding.description}</div>}
                {selFinding.remediation && <div style={{ fontSize: 11.5, color: INK_2, marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>→ {selFinding.remediation}</div>}

                <div style={{ marginTop: 14 }}>
                  {ticket && ticket.ticketId ? (
                    <div style={{ fontSize: 12, color: INK_2, background: '#f8fafc', border: `1px solid ${HAIRLINE}`, borderRadius: 4, padding: '10px 12px' }}>
                      Ticket <strong style={{ color: INK }}>{ticket.ticketId}</strong>
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: ticket.status === 'closed' ? '#31604B' : ticket.status === 'in_progress' ? '#B07C2E' : '#2563eb', border: `1px solid currentColor`, borderRadius: 3, padding: '2px 8px' }}>
                        {ticket.status === 'open' ? 'Processing' : ticket.status === 'in_progress' ? 'In progress' : ticket.status === 'closed' ? 'Closed' : ticket.status}
                      </span>
                      <span style={{ fontSize: 10, color: INK_3, marginLeft: 8 }}>· {ticket.system}</span>
                      {ticket.url && <a href={ticket.url} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: 11, color: '#2563eb' }}>open</a>}
                    </div>
                  ) : (
                    <button onClick={() => sendToTicketing(selFinding)} disabled={ticketBusy}
                      style={{ width: '100%', background: '#1c64f2', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: ticketBusy ? 0.6 : 1 }}>
                      {ticketBusy ? 'Opening ticket…' : 'Send to ticketing for remediation →'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * DataSources — the "Connect data sources" admin surface. Lists the read-only
 * security-tool connectors, their status/freshness, and lets you connect, sync,
 * or disconnect. Connecting flips posture signals from modeled/demo to live
 * (the Live Coverage meter reflects it). Opened as a modal from the hero.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const STATUS = { connected: COLORS.good, error: COLORS.bad, not_connected: COLORS.ink3 };

export default function DataSources({ orgId, authToken, apiUrl }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [active, setActive] = useState(null); // connector key being edited
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (authToken) h.Authorization = `Bearer ${authToken}`; return h; }, [orgId, authToken]);

  const load = useCallback(() => {
    fetch(`${apiUrl}/api/integrations?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setList(d.connectors); }).catch(() => {});
  }, [apiUrl, orgId, headers]);
  useEffect(() => { if (open) load(); }, [open, load]);

  function call(method, key, body) {
    setBusy(true); setErr(null);
    return fetch(`${apiUrl}/api/integrations/${key}${method === 'DELETE' ? `?org_id=${encodeURIComponent(orgId)}` : ''}`, { method, headers: headers(), body: body ? JSON.stringify(Object.assign({ org_id: orgId }, body)) : undefined })
      .then((r) => r.json()).then((res) => { if (res.error) setErr(res.error); else { setList(res.connectors); setActive(null); setForm({}); } })
      .catch((e) => setErr(e.message)).finally(() => setBusy(false));
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title="Connect read-only security tools"
        style={{ background: '#ffffff', color: '#5c6066', border: '1px solid #dfe1e6', borderRadius: 7, padding: '8px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔌 Connect data sources</button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,15,28,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 16px', overflowY: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(680px, 96vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>Connect data sources</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: INK3, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: INK2, lineHeight: 1.5 }}>
              Read-only connectors. Connecting a source flips its posture signals from modeled to <strong>live</strong>. Credentials are stored securely and never displayed again.
            </p>
            {err && <div style={{ color: '#C0392B', fontSize: 12, marginBottom: 10 }}>{err}</div>}
            {!list ? <div style={{ fontSize: 12, color: INK3 }}>Loading…</div> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {list.map((c) => (
                  <div key={c.key} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${STATUS[c.status] || INK3}`, borderRadius: 9, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: FONTS.display }}>{c.label}</span>
                        <span style={{ fontSize: 10.5, color: INK3, marginLeft: 8 }}>{c.category}</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: STATUS[c.status] || INK3, textTransform: 'uppercase' }}>
                        {c.status === 'connected' ? `Connected${c.signalCount ? ` · ${c.signalCount} signals` : ''}` : c.status === 'error' ? 'Error' : 'Not connected'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: INK3, marginTop: 3 }}>Signals: {c.signals.join(', ')} · Access: {c.scopes.join(', ')}</div>
                    {c.error && <div style={{ fontSize: 10.5, color: '#C0392B', marginTop: 3 }}>{c.error}</div>}
                    {c.lastSync && <div style={{ fontSize: 10, color: INK3, marginTop: 2 }}>Last sync {new Date(c.lastSync).toLocaleString()}</div>}

                    {active === c.key ? (
                      <div style={{ marginTop: 10, background: PANEL, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {c.fields.map((f) => (
                            <input key={f.key} type={f.secret ? 'password' : 'text'} placeholder={f.label + (f.optional ? ' (optional)' : '')}
                              value={form[f.key] || ''} onChange={(e) => setForm(Object.assign({}, form, { [f.key]: e.target.value }))}
                              style={{ border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                          <button onClick={() => call('POST', `${c.key}/connect`, form)} disabled={busy} style={btn('#4f46e5')}>{busy ? 'Connecting…' : 'Connect & sync'}</button>
                          <button onClick={() => { setActive(null); setForm({}); }} style={btn('#fff', INK2)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                        {c.connected ? (
                          <>
                            <button onClick={() => call('POST', `${c.key}/sync`)} disabled={busy} style={btn('#0e7490')}>Sync now</button>
                            <button onClick={() => call('DELETE', c.key)} disabled={busy} style={btn('#fff', '#C0392B')}>Disconnect</button>
                          </>
                        ) : (
                          <button onClick={() => { setActive(c.key); setForm({}); setErr(null); }} style={btn('#4f46e5')}>Connect</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function btn(bg, color) {
  return { background: bg, color: color || '#fff', border: `1px solid ${bg === '#fff' ? '#e6ebf2' : bg}`, borderRadius: 7, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
}

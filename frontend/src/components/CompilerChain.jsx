/**
 * CompilerChain — the compiler surface: per-framework posture (each framework
 * assessed INDEPENDENTLY, no crosswalk), a remediation queue (one control that
 * closes several framework gaps is highest-leverage), and the traceable chain
 * drill-down: business risk → process → application → security system → control →
 * the five independent framework verdicts.
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc', NAVY = '#0f1b2d';
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B' };
const ST = { met: '#1f8a4c', partial: '#B07C2E', gap: '#C0392B', not_assessed: '#94a3b8', not_applicable: '#cbd5e1' };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl || props.api_url ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CompilerChain(props) {
  const { token, orgId, api } = ctx(props);
  const [posture, setPosture] = useState(null);
  const [chain, setChain] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openRisk, setOpenRisk] = useState(null);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    fetch(`${api}/api/compiler/posture?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setPosture(d)).catch(() => {});
    fetch(`${api}/api/compiler/chain?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setChain(d)).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

  function recompile() {
    setBusy(true);
    fetch(`${api}/api/compiler/run`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId }) })
      .then((r) => r.json()).then(() => load()).catch(() => {}).finally(() => setBusy(false));
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: NAVY, color: '#e6ecf5', borderRadius: 10, padding: '13px 16px' }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          The traceable chain <strong style={{ color: '#9bc0ff' }}>business risk → process → application → security system → control</strong>, with each control assessed against all five frameworks <strong>independently</strong> (no crosswalk).
        </div>
        <button onClick={recompile} disabled={busy} style={{ background: busy ? '#475569' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>{busy ? 'Compiling…' : '↻ Recompile'}</button>
      </div>

      {/* per-framework posture */}
      <div>
        <Label>Framework posture — assessed independently</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 10 }}>
          {(posture ? posture.perFramework : []).map((f) => (
            <div key={f.framework} style={{ border: `1px solid ${HAIR}`, borderTop: `3px solid ${f.posture == null ? INK3 : f.posture >= 75 ? TONE.good : f.posture >= 50 ? TONE.warn : TONE.bad}`, borderRadius: 10, background: '#fff', padding: '11px 13px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: INK }}>{f.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: f.posture == null ? INK3 : f.posture >= 75 ? TONE.good : f.posture >= 50 ? TONE.warn : TONE.bad, marginTop: 2 }}>{f.posture == null ? 'Not assessed' : `${f.posture}%`}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 10, color: INK3, flexWrap: 'wrap' }}>
                <Chip n={f.met} t="met" /><Chip n={f.partial} t="partial" /><Chip n={f.gap} t="gap" />
                {f.not_assessed ? <Chip n={f.not_assessed} t="not_assessed" /> : null}
              </div>
            </div>
          ))}
          {!posture && <div style={{ fontSize: 12, color: INK3 }}>Loading posture…</div>}
        </div>
      </div>

      {/* remediation queue */}
      {posture && posture.remediation && posture.remediation.length > 0 && (
        <div>
          <Label>Highest-leverage remediation (one control, multiple framework gaps)</Label>
          <div style={{ display: 'grid', gap: 7 }}>
            {posture.remediation.slice(0, 8).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderLeft: `4px solid ${ST[r.worst]}`, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 11.5, color: INK }}>{r.action}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: ST[r.worst], borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{r.frameworkCount} fw</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* traceable chain */}
      <div>
        <Label>Traceable chain — pick a risk to trace it to controls</Label>
        {!chain || !chain.risks || chain.risks.length === 0 ? (
          <div style={{ fontSize: 11.5, color: INK3, border: `1px dashed ${HAIR}`, borderRadius: 9, padding: '14px', textAlign: 'center' }}>
            No compiled chain yet. Complete intake (processes + applications) and recompile to populate the chain.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {chain.risks.map((r) => {
              const open = openRisk === r.id;
              return (
                <div key={r.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 9, background: '#fff' }}>
                  <button onClick={() => setOpenRisk(open ? null : r.id)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{r.title}</span>
                    <span style={{ fontSize: 10.5, color: INK3 }}>{r.severity} · {usd(r.financialExposure)} · {r.processes.length} process(es) {open ? '▲' : '▼'}</span>
                  </button>
                  {open && (
                    <div style={{ borderTop: `1px solid ${HAIR}`, padding: '10px 13px', background: PANEL, fontSize: 11.5 }}>
                      {r.processes.length === 0 && <div style={{ color: INK3 }}>No mapped processes.</div>}
                      {r.processes.map((p, pi) => (
                        <div key={pi} style={{ marginBottom: 6 }}>
                          <span style={{ color: INK, fontWeight: 600 }}>{p.name}</span>
                          <span style={{ color: INK3 }}> → {p.applications.length ? p.applications.map((a) => a.name).join(', ') : 'no apps mapped'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* security systems → controls → framework verdicts */}
      {chain && chain.securitySystems && chain.securitySystems.length > 0 && (
        <div>
          <Label>Security systems → controls → framework verdicts</Label>
          <div style={{ display: 'grid', gap: 8 }}>
            {chain.securitySystems.map((s, si) => (
              <div key={si} style={{ border: `1px solid ${HAIR}`, borderRadius: 9, background: '#fff', padding: '10px 13px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 6 }}>{s.system} <span style={{ color: INK3, fontWeight: 400 }}>· {s.controls.length} control(s)</span></div>
                {s.controls.map((c, ci) => (
                  <div key={ci} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', borderTop: `1px solid ${PANEL}` }}>
                    <span style={{ fontSize: 11, color: INK2 }}>{c.title}</span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      {c.frameworks.map((fw) => <span key={fw.framework} title={`${fw.label}: ${fw.status}`} style={{ width: 9, height: 9, borderRadius: 2, background: ST[fw.status] || INK3, display: 'inline-block' }} />)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: INK3 }}>Each framework verdict is computed only from that framework's own evidence (assessment → document → implementation). No framework reads another's result.</div>
    </div>
  );
}

const Label = ({ children }) => <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>{children}</div>;
const Chip = ({ n, t }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: ST[t], display: 'inline-block' }} />{n} {t.replace('_', ' ')}</span>;

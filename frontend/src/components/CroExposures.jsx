/**
 * CroExposures — CRO Sub-tab 2: Cyber Risk vs Appetite & Top Exposures.
 * Cyber as KRIs vs the central appetite (breaches flagged), and the top SHARED
 * exposures ranked by enterprise impact. Click an exposure to drill into the
 * business processes, the CFO financial translation, and the CISO attack path —
 * the same event, three lenses. Projections show trajectory vs appetite.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}
const Pill = ({ text, color }) => <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{text}</span>;

export default function CroExposures(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/cro/exposures?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Measuring cyber against appetite…</div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: INK2, display: 'flex', alignItems: 'center', gap: 6 }}>{d.provenance && <Provenance prov={d.provenance} />}<span><strong>{d.breaches}</strong> of {d.kris.length} KRIs breach appetite · <strong>{d.aboveAppetite}</strong> exposure(s) above appetite.</span></div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>

      {/* KRIs vs appetite */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10 }}>
        {d.kris.map((k) => (
          <div key={k.name} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${k.breached ? SEV.Critical : SEV.Low}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
            <div style={{ fontSize: 10.5, color: INK2 }}>{k.name}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.breached ? SEV.Critical : INK, marginTop: 2, fontFamily: FONTS.mono }}>{k.display}</div>
            <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>Appetite: {k.thresholdDisplay} {k.breached ? <span style={{ color: SEV.Critical, fontWeight: 700 }}>· BREACHED</span> : <span style={{ color: SEV.Low }}>· within</span>}</div>
          </div>
        ))}
      </div>

      {/* top exposures */}
      <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top exposures by enterprise impact (shared events)</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {d.exposures.map((e) => {
          const isOpen = open === e.id; const sev = SEV[e.severity] || INK3;
          return (
            <div key={e.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${e.aboveAppetite ? SEV.Critical : sev}`, borderRadius: 10, background: '#fff' }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill text={e.scenarioType} color={sev} />
                      <Pill text={e.severity} color={sev} />
                      {e.aboveAppetite && <Pill text="Above appetite" color={SEV.Critical} />}
                      {e.decision && <Pill text="Decided" color="#1a7f37" />}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONTS.display }}>{e.provenance && <Provenance prov={e.provenance} />}<span>{e.title}</span></div>
                    <div style={{ fontSize: 11.5, color: INK2, marginTop: 3 }}>{(e.croLens && e.croLens.narrative) || ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 130 }}>
                    <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase' }}>Expected loss</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: sev, fontFamily: FONTS.mono }}>{usd(e.loss.expected)}</div>
                    <div style={{ fontSize: 10.5, color: INK2 }}>P90 {usd(e.loss.p90)}</div>
                  </div>
                </div>
                {/* trajectory vs appetite */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, fontSize: 10.5, color: INK2 }}>
                  <span style={{ color: INK3, textTransform: 'uppercase', fontSize: 9 }}>Trajectory vs appetite</span>
                  <span>7d <strong>{e.projection.p7}%</strong></span>
                  <span>30d <strong style={{ color: e.projection.p30 >= e.projection.appetiteLine ? SEV.Critical : INK }}>{e.projection.p30}%</strong></span>
                  <span>90d <strong>{e.projection.p90}%</strong></span>
                  <span style={{ color: INK3 }}>· appetite line {e.projection.appetiteLine}%</span>
                </div>
                <button onClick={() => setOpen(isOpen ? null : e.id)} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#4f5ac4', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{isOpen ? '▲ Hide cross-lens detail' : '▼ Processes · CFO financial · CISO attack path'}</button>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${HAIR}`, padding: '12px 14px', background: PANEL, display: 'grid', gap: 12 }}>
                  <div>
                    <Label>Impacted business processes</Label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{e.businessProcesses.map((p, i) => <span key={i} style={{ fontSize: 11, color: '#1c1f26', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 6, padding: '3px 9px' }}>{p}</span>)}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {e.financial && (
                      <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 12px' }}>
                        <Label>💰 CFO lens — financial translation</Label>
                        <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{e.financial.headline}</div>
                        {e.financial.primary && <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>{e.financial.primary.label}: <strong>{e.financial.primary.value}</strong></div>}
                        <div style={{ fontSize: 11, color: INK2, marginTop: 4, lineHeight: 1.5 }}>{e.financial.narrative}</div>
                      </div>
                    )}
                    {e.attackPathLens && (
                      <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 12px' }}>
                        <Label>🛡 CISO lens — attack path</Label>
                        <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{e.attackPathLens.headline}</div>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
                          {e.attackPath.map((s, i) => (
                            <React.Fragment key={i}>
                              <span style={{ fontSize: 10.5, color: INK, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '3px 7px' }}>{s.label}</span>
                              {i < e.attackPath.length - 1 && <span style={{ color: '#cf222e', fontWeight: 800 }}>→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* portfolio-level decision options */}
      <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 4, fontFamily: FONTS.display }}>Portfolio-level options</div>
        <div style={{ fontSize: 10.5, color: INK3, marginBottom: 9 }}>Act on the set, not one card. Aggregate loss {usd(d.aggregate.expectedLoss)} (P90 {usd(d.aggregate.p90)}) vs {usd(d.aggregate.lossTolerance)} tolerance.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 9 }}>
          {d.portfolioOptions.map((o) => (
            <div key={o.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 9, padding: '10px 12px', background: PANEL }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{o.label}</div>
              <div style={{ fontSize: 10.5, color: INK2, marginTop: 4 }}>{o.costLabel} · −{o.residualRiskReductionPct}% residual</div>
              <div style={{ fontSize: 10, color: INK3, marginTop: 5, lineHeight: 1.4 }}>{o.note}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: INK3, marginTop: 8 }}>Record individual decisions in the Decisions queue — same shared ledger.</div>
      </div>
    </div>
  );
}
const Label = ({ children }) => <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 5 }}>{children}</div>;

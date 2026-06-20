/**
 * CioResilience — CIO Sub-tab 2: Resilience Risks & SPOFs.
 * The SAME shared events the CISO sees (decision spine), read operationally:
 * which risks threaten operations, single points of failure, and vendor/cloud/
 * region concentration. Click a risk → impacted services/customers + recovery
 * path + the live attack path, with the shared DecisionCard options.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };
const FRIC = { None: COLORS.good, Low: COLORS.good, Medium: COLORS.warn, High: COLORS.bad };
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

export default function CioResilience(props) {
  const role = 'CIO';
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/cio/resilience?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Mapping resilience risks…</div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#8b9098', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: INK2 }}>
          <strong>{d.counts.events}</strong> shared risk(s) threaten operations · <strong>{d.counts.spofs}</strong> single points of failure · <strong>{d.counts.concentration}</strong> concentration risk(s).
          <span style={{ color: INK3 }}> Same events the security team sees.</span>
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>

      {/* shared resilience-threatening events */}
      <div style={{ display: 'grid', gap: 10 }}>
        {d.events.map((e) => {
          const isOpen = open === e.id; const sev = SEV[e.severity] || INK3; const lens = e.lens || {};
          return (
            <div key={e.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${e.type === 'compound' ? '#7c3aed' : sev}`, borderRadius: 10, background: '#fff' }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      {e.type === 'compound' && <Pill text="⛓ Chained" color="#7c3aed" />}
                      <Pill text={e.scenarioType} color={sev} />
                      <Pill text={e.severity} color={sev} />
                      {e.impactedServices.customerFacing && <Pill text="Customer-facing" color="#4f5ac4" />}
                      {e.decision && <Pill text="Decided" color="#1a7f37" />}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 6, fontFamily: FONTS.display }}>{lens.headline || e.title}</div>
                    <div style={{ fontSize: 11.5, color: INK2, marginTop: 4, lineHeight: 1.5 }}>{lens.narrative || ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 140 }}>
                    <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase' }}>Time to effect</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: sev, fontFamily: FONTS.mono }}>{lens.primary ? lens.primary.value : '—'}</div>
                    <div style={{ fontSize: 10.5, color: INK2, marginTop: 2 }}>Loss P90 <strong style={{ color: '#cf222e' }}>{usd(e.loss.p90)}</strong></div>
                    {lens.narration && <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}><VoiceControls voice={voice} onReplay={() => voice.speak(lens.narration)} label="Listen" /></div>}
                  </div>
                </div>
                <button onClick={() => setOpen(isOpen ? null : e.id)} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#4f5ac4', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{isOpen ? '▲ Hide impact, recovery & attack path' : '▼ Impact, recovery path & live attack path'}</button>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${HAIR}`, padding: '12px 14px', background: PANEL, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <Label>Impacted services / customers</Label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{e.impactedServices.services.map((s, i) => <span key={i} style={{ fontSize: 11, color: '#1c1f26', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 6, padding: '3px 9px' }}>{s}</span>)}</div>
                      {e.impactedServices.customerFacing && <div style={{ fontSize: 10.5, color: '#cf222e', marginTop: 4 }}>Customer-facing — outage is externally visible.</div>}
                    </div>
                    <div>
                      <Label>Recovery path</Label>
                      <ol style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 2 }}>{e.recoveryPath.map((s, i) => <li key={i} style={{ fontSize: 11, color: INK2 }}>{s}</li>)}</ol>
                    </div>
                  </div>
                  <div>
                    <Label>Live attack path → crown jewel (shared with security)</Label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {e.attackPath.map((s, i) => (
                        <React.Fragment key={i}>
                          <span style={{ fontSize: 11, color: INK, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '4px 9px' }}>{s.label}</span>
                          {i < e.attackPath.length - 1 && <span style={{ color: '#cf222e', fontWeight: 800 }}>→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  {/* shared DecisionCard options */}
                  <div>
                    <Label>Decision options (same as the security queue)</Label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 8 }}>
                      {e.options.map((o) => (
                        <div key={o.id} style={{ border: `1px solid ${o.id === e.recommended ? '#5e6ad2' : HAIR}`, borderRadius: 8, padding: '8px 10px', background: '#fff' }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: INK }}>{o.label}{o.id === e.recommended && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: '#5e6ad2', borderRadius: 999, padding: '1px 6px', marginLeft: 5 }}>REC</span>}</div>
                          <div style={{ fontSize: 10.5, color: INK2, marginTop: 4 }}>{o.costLabel} · {o.timeToEffectDays}d · −{o.residualRiskReductionPct}% · <span style={{ color: FRIC[o.friction] }}>{o.friction} friction</span></div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: INK3, marginTop: 6 }}>Decide these in the Decisions queue — one record, shared across every leader.</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SPOFs */}
      <Section title="🔌 Single points of failure">
        <div style={{ display: 'grid', gap: 8 }}>
          {d.spofs.map((s, i) => (
            <div key={i} style={{ borderLeft: `4px solid #cf222e`, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '9px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{s.name}{s.modeled ? <span style={{ fontSize: 9.5, color: INK3, fontWeight: 500 }}> · modeled</span> : null}</span>
                <span style={{ fontSize: 10.5, color: INK3 }}>{s.dependents} dependents · {s.layer}</span>
              </div>
              <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>{s.why}</div>
              <div style={{ fontSize: 11, color: '#1a7f37', fontWeight: 600, marginTop: 3 }}>→ {s.recommendation}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* concentration */}
      <Section title="🌐 Vendor / cloud / region concentration">
        <div style={{ display: 'grid', gap: 8 }}>
          {d.concentration.map((c, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '9px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{c.label}{c.modeled ? <span style={{ fontSize: 9.5, color: INK3, fontWeight: 500 }}> · modeled</span> : null}</span>
                <Pill text={c.severity} color={SEV[c.severity] || INK3} />
              </div>
              <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>{c.detail}</div>
              <div style={{ fontSize: 11, color: '#1a7f37', fontWeight: 600, marginTop: 3 }}>→ {c.recommendation}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const Label = ({ children }) => <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 5 }}>{children}</div>;
function Section({ title, children }) {
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: PANEL, padding: '13px 16px' }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 9, fontFamily: FONTS.display }}>{title}</div>
      {children}
    </div>
  );
}

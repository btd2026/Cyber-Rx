/**
 * ControlEfficacy — CISO Control Efficacy sub-tab. Never an abstract score:
 * each control is tied to the risk(s) it reduces, with "Degrading/Weak — gating
 * risk #N" called out. Plus SOC performance (MTTD/MTTR) and a framework + active
 * industry overlay with a visible compliance posture. Reads /api/ciso/control-efficacy.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const bandColor = (s) => (s >= 80 ? COLORS.good : s >= 60 ? COLORS.warn : s >= 40 ? '#c2410c' : COLORS.bad);
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function ControlEfficacy(props) {
  const d = props.d || {};
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [e, setE] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/ciso/control-efficacy?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((x) => x && setE(x)).catch(() => {});
  }, [api, orgId, headers]);

  if (!e) return <div style={{ fontSize: 12, color: INK3 }}>Computing control efficacy…</div>;

  const flagged = e.controls.filter((c) => c.flag);
  const narration = `Control efficacy. ${e.counts.linked} of ${e.counts.total} controls are tied to the risks they reduce. ` +
    `${e.counts.flagged} are weak or degrading while gating a top risk. ` +
    (flagged[0] ? `The most urgent is ${flagged[0].name}, holding back ${(flagged[0].gatingRisk || {}).title}. ` : '') +
    `SOC: ${e.soc.map((s) => `${s.name} ${s.current}${s.unit || ''}`).join(', ')}. ` +
    `Compliance posture is ${e.framework.postureBand} at ${e.framework.posture} percent against ${e.framework.base.join(', ')} plus ${e.framework.overlays.map((o) => o.name).join(', ')}.`;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: INK2, maxWidth: 640, lineHeight: 1.5 }}>
          Every control is tied to the <strong>risk it reduces</strong> — we flag controls that are weak or degrading <strong>and</strong> gating a top risk.
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(narration)} label="Listen" />
      </div>

      {/* Control → risk efficacy */}
      <div style={{ display: 'grid', gap: 8 }}>
        {e.controls.map((c) => (
          <div key={c.id} style={{ border: `1px solid ${c.flag ? '#f3c9c4' : HAIR}`, borderLeft: `4px solid ${c.flag ? '#cf222e' : bandColor(c.effectiveness)}`, borderRadius: 9, padding: '11px 14px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>
                  {c.provenance && <span style={{ marginRight: 6, verticalAlign: 'middle' }}><Provenance prov={c.provenance} /></span>}
                  {c.name}
                  <span style={{ fontSize: 9.5, color: INK3, fontWeight: 500, marginLeft: 8 }}>{c.csf} · {c.cis}</span>
                  {c.flag && <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: '#cf222e', borderRadius: 999, padding: '2px 8px', marginLeft: 8, textTransform: 'uppercase' }}>{c.flag}</span>}
                </div>
                {c.reducesRisks.length > 0 ? (
                  <div style={{ fontSize: 11, color: INK2, marginTop: 4 }}>Reduces: {c.reducesRisks.map((r, i) => (
                    <span key={i} style={{ color: SEV[r.severity] || INK2, fontWeight: 600 }}>{r.title}{i < c.reducesRisks.length - 1 ? ' · ' : ''}</span>
                  ))}</div>
                ) : <div style={{ fontSize: 11, color: INK3, marginTop: 4 }}>No mapped risk yet.</div>}
                {c.flag && c.gatingRisk && <div style={{ fontSize: 11, color: '#cf222e', marginTop: 3 }}>⚠ {c.flag} <strong>{c.gatingRisk.title}</strong> — {c.action}</div>}
              </div>
              <div style={{ width: 130 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: INK3 }}><span>Effectiveness</span><strong style={{ color: bandColor(c.effectiveness) }}>{c.effectiveness}%</strong></div>
                <div style={{ height: 6, background: '#f0f1f4', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}><div style={{ width: `${c.effectiveness}%`, height: '100%', background: bandColor(c.effectiveness) }} /></div>
                <div style={{ fontSize: 9.5, color: c.trend === 'deteriorating' ? '#cf222e' : c.trend === 'improving' ? '#1a7f37' : INK3, marginTop: 3, textTransform: 'capitalize' }}>{c.trend}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SOC performance */}
      <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '14px 16px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 8, fontFamily: FONTS.display }}>SOC performance</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
          {e.soc.map((s) => (
            <div key={s.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${s.breach ? (SEV[s.severity] || '#cf222e') : '#1a7f37'}`, borderRadius: 8, padding: '9px 11px' }}>
              <div style={{ fontSize: 10.5, color: INK2 }}>{s.name}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.breach ? (SEV[s.severity] || '#cf222e') : INK, fontFamily: FONTS.mono }}>{s.current}<span style={{ fontSize: 11, color: INK3, fontWeight: 600 }}>{s.unit === '%' ? '%' : ` ${s.unit || ''}`}</span></div>
              <div style={{ fontSize: 9.5, color: INK3, marginTop: 2 }}>target {s.threshold} · <span style={{ color: s.trend === 'worsening' ? '#cf222e' : s.trend === 'improving' ? '#1a7f37' : INK3 }}>{s.trend}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Framework + compliance posture */}
      <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>Compliance posture</div>
          <span style={{ fontSize: 13, fontWeight: 800, color: bandColor(e.framework.posture), fontFamily: FONTS.mono }}>{e.framework.postureBand} · {e.framework.posture}%</span>
        </div>
        <div style={{ fontSize: 11, color: INK2 }}>Base framework: <strong>{e.framework.base.join(', ')}</strong></div>
        <div style={{ fontSize: 11, color: INK2, marginTop: 6 }}>Active industry overlay:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
          {e.framework.overlays.map((o, i) => <span key={i} style={{ fontSize: 10.5, color: '#1c1f26', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 999, padding: '3px 10px' }}>{o.name}</span>)}
        </div>
      </div>

      {/* Domain health quick strip */}
      {(d.domainMatrix || []).filter((m) => m.weight > 0).length > 0 && (
        <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 8, fontFamily: FONTS.display }}>Domain health</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {d.domainMatrix.filter((m) => m.weight > 0).map((m) => (
              <div key={m.id} title={`${m.name} ${m.current}`} style={{ flex: 1, minWidth: 92, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '7px 9px' }}>
                <div style={{ fontSize: 9.5, color: INK3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: bandColor(m.current), fontFamily: FONTS.mono }}>{m.current}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: (m.delta || 0) >= 0 ? '#1a7f37' : '#cf222e' }}>{(m.delta || 0) >= 0 ? '+' : ''}{m.delta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CroAggregation — CRO Sub-tab 3 (priority): Aggregation & Correlation.
 * Concentration risk (single vendor/cloud/region), correlated multi-risk failures
 * (the SHARED compound events), and cyber's correlation with the other enterprise
 * risk categories.
 */

import React from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import { useState, useEffect, useCallback } from 'react';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const SEV = { Critical: COLORS.bad, High: '#A85B2E', Medium: COLORS.warn, Low: COLORS.good };
const BAND = { Strong: COLORS.bad, Moderate: COLORS.warn, Weak: COLORS.good };
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
const Pill = ({ text, color }) => <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{text}</span>;

export default function CroAggregation(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/cro/aggregation?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Computing aggregation & correlation…</div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: INK2, display: 'flex', alignItems: 'center', gap: 6 }}>{d.provenance && <Provenance prov={d.provenance} />}<span><strong>{d.counts.correlatedFailures}</strong> correlated multi-risk failure(s) · <strong>{d.counts.concentration}</strong> concentration risk(s).</span></div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>

      {/* correlated multi-risk failures (shared compounds) */}
      <Section title="⛓ Correlated multi-risk failures (shared compound scenarios)">
        <div style={{ display: 'grid', gap: 10 }}>
          {d.correlatedFailures.length === 0 && <div style={{ fontSize: 11.5, color: INK3 }}>No correlated failures currently detected.</div>}
          {d.correlatedFailures.map((f) => (
            <div key={f.id} style={{ border: `1px solid #e3d5f5`, borderRadius: 10, background: 'linear-gradient(135deg,#faf8ff,#fff)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Pill text="Correlated" color="#7c3aed" />
                    {f.aboveAppetite && <Pill text="Above appetite" color={SEV.Critical} />}
                    {f.decision && <Pill text="Decided" color="#1f8a4c" />}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONTS.display }}>{f.provenance && <Provenance prov={f.provenance} />}<span>{f.title}</span></div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                    {f.members.map((m, i) => (
                      <React.Fragment key={i}>
                        <span style={{ fontSize: 10.5, color: INK, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 7, padding: '3px 8px' }}>{m.title} <strong style={{ color: '#1f8a4c' }}>~{m.p30}%</strong></span>
                        {i < f.members.length - 1 && <span style={{ color: '#7c3aed', fontWeight: 800 }}>＋</span>}
                      </React.Fragment>
                    ))}
                    <span style={{ color: '#7c3aed', fontWeight: 800 }}>→</span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#7c3aed' }}>{f.jointPct}% ({f.amplification})</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: INK2, marginTop: 6, lineHeight: 1.5 }}>{f.outcome}</div>
                  <div style={{ fontSize: 11, color: INK, marginTop: 5 }}>💡 Break one link: {f.breaks}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase' }}>Combined loss</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: SEV.Critical, fontFamily: FONTS.mono }}>{usd(f.loss.expected)}</div>
                  <div style={{ fontSize: 10, color: INK3, marginTop: 2 }}>{f.blastRadius ? f.blastRadius.scope : ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* concentration */}
      <Section title="🌐 Concentration risk (single vendor / cloud / region / identity)">
        <div style={{ display: 'grid', gap: 8 }}>
          {d.concentration.map((c, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${HAIR}`, borderLeft: `4px solid ${SEV[c.severity] || INK3}`, borderRadius: 8, padding: '9px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{c.label}{c.modeled ? <span style={{ fontSize: 9.5, color: INK3, fontWeight: 500 }}> · modeled</span> : null}</span>
                <Pill text={c.severity} color={SEV[c.severity] || INK3} />
              </div>
              <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>{c.detail}</div>
              <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 3 }}>→ {c.recommendation}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* correlation matrix */}
      <Section title="🔗 Cyber correlation with other enterprise risk categories">
        <div style={{ fontSize: 10.5, color: INK3, marginBottom: 8 }}>How strongly a realized cyber event transmits into each category (modeled · {usd(d.aggregateLoss)} aggregate cyber loss as the anchor).</div>
        <div style={{ display: 'grid', gap: 7 }}>
          {d.correlationMatrix.map((m) => (
            <div key={m.category} style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: INK }}>{m.category}</span>
              <div style={{ height: 9, background: '#eef2f6', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${m.coefficient * 100}%`, height: '100%', background: BAND[m.band] }} /></div>
              <span style={{ fontSize: 11, fontWeight: 700, color: BAND[m.band], minWidth: 130, textAlign: 'right' }}>{m.band} ({m.coefficient}) · {usd(m.transmittedLoss)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 4, marginTop: 9 }}>
          {d.correlationMatrix.map((m) => <div key={m.category} style={{ fontSize: 10.5, color: INK2 }}><strong style={{ color: INK }}>{m.category}:</strong> {m.mechanism}</div>)}
        </div>
      </Section>
    </div>
  );
}
function Section({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: PANEL, padding: '13px 16px' }}><div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 9, fontFamily: FONTS.display }}>{title}</div>{children}</div>;
}

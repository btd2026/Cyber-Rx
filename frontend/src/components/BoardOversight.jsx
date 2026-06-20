/**
 * BoardOversight — Board Sub-tab 1: Enterprise Oversight (Current State).
 * One-screen oversight: board-level cyber posture vs the approved appetite,
 * decisions needing board attention, what changed since last meeting, a plain-
 * English brief with voice, and visibility confidence.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, NAVY = COLORS.navy1;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const bandTone = (b) => (b === 'Strong' ? 'good' : b === 'Adequate' ? 'warn' : 'bad');

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function BoardOversight(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/board/oversight?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Composing the board oversight view…</div>;
  const c = d.counts;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#8b9098', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: COLORS.subtle, border: `1px solid ${COLORS.hair}`, color: COLORS.ink2, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, fontFamily: FONTS.mono, color: TONE[bandTone(d.band)] }}>{d.posture}</div>
            <div style={{ fontSize: 9, color: COLORS.accentText, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{d.band}</div>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, maxWidth: 640 }}>{d.brief}</div>
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration || d.brief)} label="Listen" />
      </div>

      {/* oversight KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10 }}>
        <Kpi label="Aggregate exposure" value={usd(d.aggregate.expectedLoss)} sub={`P90 ${usd(d.aggregate.p90)}`} tone="bad" />
        <Kpi label="Critical scenarios" value={`${c.critical}`} tone={c.critical ? 'bad' : 'good'} />
        <Kpi label="Above appetite" value={`${c.aboveAppetite}`} sub={`appetite ${d.appetite.riskThreshold}+`} tone={c.aboveAppetite ? 'bad' : 'good'} />
        <Kpi label="Correlated scenarios" value={`${c.compounds}`} tone={c.compounds ? 'warn' : 'good'} />
        <Kpi label="Need ownership" value={`${c.attention}`} tone={c.attention ? 'warn' : 'good'} />
        <Kpi label="Decided (documented)" value={`${c.decided}`} tone="good" />
      </div>

      {/* needs board attention */}
      <Panel title="Decisions needing board attention">
        {d.attentionItems.length === 0 ? <div style={{ fontSize: 11.5, color: INK3 }}>Every board-level risk is owned and decided.</div> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {d.attentionItems.map((a, i) => (
              <div key={i} style={{ borderLeft: `4px solid ${SEV[a.severity] || INK3}`, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '9px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{a.title}</span>
                  <span style={{ fontSize: 10.5, color: a.owner === 'Unassigned' ? TONE.bad : INK3 }}>Owner: {a.owner}</span>
                </div>
                {a.question && <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginTop: 3 }}>Ask management: {a.question}</div>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* what changed */}
      <Panel title="What changed since last meeting">
        <div style={{ display: 'grid', gap: 6 }}>
          {d.whatChanged.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12, color: INK2 }}>
              <span style={{ color: w.dir === 'up' ? TONE.good : w.dir === 'down' ? TONE.bad : INK3, fontWeight: 800 }}>{w.dir === 'up' ? '▲' : w.dir === 'down' ? '▼' : '▬'}</span>
              <span>{w.text}</span>
            </div>
          ))}
        </div>
      </Panel>

      {d.visibility && (
        <Panel title="Visibility confidence">
          <div style={{ fontSize: 12, color: INK2 }}>Overall <strong style={{ color: INK }}>{d.visibility.overall || d.visibility.band}</strong>{d.visibility.caveat ? <span style={{ color: INK3 }}> — {d.visibility.caveat}</span> : null}</div>
        </Panel>
      )}
    </div>
  );
}
function Kpi({ label, value, sub, tone }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? TONE[tone] : '#d7d9de'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}><div style={{ fontSize: 10.5, color: INK2 }}>{label}</div><div style={{ fontSize: 19, fontWeight: 800, fontFamily: FONTS.mono, color: tone ? TONE[tone] : INK, marginTop: 2 }}>{value}</div>{sub && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{sub}</div>}</div>;
}
function Panel({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}><div style={{ fontSize: 12.5, fontWeight: 800, fontFamily: FONTS.display, color: INK, marginBottom: 9 }}>{title}</div>{children}</div>;
}

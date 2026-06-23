/**
 * CloObligationPosture — CLO Sub-tab 1: Obligation Posture (Current State).
 * Obligations by jurisdiction / data type / contract (from the active industry
 * regulatory overlay), upcoming regulatory changes, active notification clocks,
 * defensibility posture, a legal-language brief with voice, and visibility.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import NarrativeSection from './NarrativeSection';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CloObligationPosture(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/clo/obligations?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Composing the obligation posture…</div>;
  const def = d.defensibility;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 28 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#8b9098', marginBottom: -14 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}

      {/* 01 — The lede: the legal posture in a sentence, with the standing caveat */}
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: COLORS.subtle, border: `1px solid ${COLORS.hair}`, color: COLORS.ink2, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{d.brief}</div>
          <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration || d.brief)} label="Listen" />
        </div>
        <div style={{ fontSize: 11, color: '#7a5b1e', background: '#fbf3df', border: '1px solid #f0dcae', borderRadius: 8, padding: '9px 12px', lineHeight: 1.5 }}>
          <strong>⚖️ Legal caveat:</strong> {d.legalCaveat}
        </div>
      </div>

      {/* 02 — Can we defend our oversight? */}
      <NarrativeSection step={2} kicker="Defensibility" title="Could we defend our oversight?"
        lede="Before the obligations themselves, the question that matters in litigation: is the decision record strong enough to show good-faith oversight (Caremark / SEC)?">
        <Panel>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 30, fontWeight: 800, fontFamily: FONTS.mono, color: def.band === 'Strong' ? TONE.good : def.band === 'Adequate' ? TONE.warn : TONE.bad }}>{def.score}</div><div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase' }}>{def.band}</div></div>
            <div style={{ fontSize: 12, color: INK2, lineHeight: 1.6 }}>
              {def.decisionsLogged} decision(s) on the record · {def.acceptsWithRationale}/{def.accepts} acceptances carry a substantive rationale.
              <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>A documented record supports a good-faith oversight defense (Caremark / SEC).</div>
            </div>
          </div>
        </Panel>
      </NarrativeSection>

      {/* 03 — What we're on the hook for */}
      <NarrativeSection step={3} kicker="Obligations" title="What we're on the hook for"
        lede={`The obligations that attach under the ${d.industry.replace(/_/g, ' ')} overlay — by jurisdiction and data type. The notification clocks in red are the tight ones (≤72h) that drive the timeline if an event lands.`}>
        <Panel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead><tr style={{ color: INK3, fontSize: 9.5, textTransform: 'uppercase' }}>
                {['Obligation', 'Jurisdiction', 'Data type', 'Notification clock', 'Trigger'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {d.obligations.map((o, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${HAIR}` }}>
                    <td style={{ padding: '7px 8px', color: INK, fontWeight: 600 }}>{o.obligation}</td>
                    <td style={{ padding: '7px 8px', color: INK2 }}>{o.jurisdiction}</td>
                    <td style={{ padding: '7px 8px', color: INK2 }}>{(o.dataTypes || []).join(', ') || '—'}</td>
                    <td style={{ padding: '7px 8px', color: o.clockHours != null && o.clockHours <= 72 ? TONE.bad : INK2, fontWeight: o.clockHours != null && o.clockHours <= 72 ? 700 : 400 }}>{o.clockLabel}</td>
                    <td style={{ padding: '7px 8px', color: INK3 }}>{o.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </NarrativeSection>

      {/* 04 — What's ticking now, and what's coming */}
      <NarrativeSection step={4} kicker="Clocks & change" title="What's ticking now — and what's coming"
        lede="Obligations only become urgent when an event starts a clock or a rule changes. Left: clocks running today. Right: regulatory shifts on the horizon to get ahead of.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* active notification clocks */}
          <Panel title={`Active notification clocks · ${d.activeClocks.length}`}>
            {d.activeClocks.length === 0 ? <div style={{ fontSize: 11.5, color: INK3 }}>No active clocks — no realized disclosure events.</div> : (
              <div style={{ display: 'grid', gap: 7 }}>
                {d.activeClocks.map((a, i) => (
                  <div key={i} style={{ borderLeft: `4px solid ${a.status.startsWith('Undecided') ? TONE.bad : TONE.warn}`, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 11px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{a.event}</div>
                    <div style={{ fontSize: 10.5, color: INK2, marginTop: 2 }}>{a.dataAtRisk} · {a.status}</div>
                    {a.nearestClock && <div style={{ fontSize: 10.5, color: TONE.bad, marginTop: 2 }}>Nearest clock: {a.nearestClock.obligation} — {a.nearestClock.clockLabel}</div>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
          {/* upcoming regulatory changes */}
          <Panel title="Upcoming regulatory changes">
            <div style={{ display: 'grid', gap: 7 }}>
              {d.upcoming.map((u, i) => (
                <div key={i} style={{ fontSize: 11.5, color: INK2, borderBottom: `1px solid ${PANEL}`, paddingBottom: 5 }}>
                  <strong style={{ color: INK }}>{u.name}</strong> <span style={{ color: INK3 }}>· {u.when}</span>
                  <div style={{ fontSize: 10.5, color: INK3 }}>{u.impact}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </NarrativeSection>

      {/* 05 — How much to trust this read */}
      {d.visibility && (
        <NarrativeSection step={5} kicker="Visibility" title="How much to trust this read"
          lede="The posture above rests on what we can see of data flows and contracts. Here's the confidence behind it.">
          <Panel>
            <div style={{ fontSize: 12, color: INK2 }}>Overall <strong style={{ color: INK }}>{d.visibility.overall || d.visibility.band}</strong>{d.visibility.caveat ? <span style={{ color: INK3 }}> — {d.visibility.caveat}</span> : null}</div>
            {d.note && <div style={{ fontSize: 10, color: INK3, marginTop: 6 }}>{d.note}</div>}
          </Panel>
        </NarrativeSection>
      )}
    </div>
  );
}
function Panel({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}>{title && <div style={{ fontSize: 12.5, fontWeight: 800, fontFamily: FONTS.display, color: INK, marginBottom: 9 }}>{title}</div>}{children}</div>;
}

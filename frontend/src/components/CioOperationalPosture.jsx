/**
 * CioOperationalPosture — CIO Sub-tab 1: Operational Posture (Current State).
 * Availability risk, recovery readiness vs DECLARED RTO/RPO, tech-debt + shadow-IT
 * exposure, what changed, a generated exec brief with voice, and visibility
 * confidence. Auto-derived from the shared substrate — no questionnaire.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import NarrativeSection from './NarrativeSection';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const band = (s) => (s >= 80 ? 'good' : s >= 55 ? 'warn' : 'bad');

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CioOperationalPosture(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/cio/operational?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Composing operational posture…</div>;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 28 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#8b9098', marginBottom: -14 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}

      {/* 01 — The lede: today's operational standing, in a sentence */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: COLORS.subtle, border: `1px solid ${COLORS.hair}`, color: COLORS.ink2, borderRadius: 10, padding: '14px 16px' }}>
        <div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
            <Score label="Operational" value={d.overall} />
            <Score label="Availability" value={d.availabilityScore} />
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{d.brief}</div>
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration || d.brief)} label="Listen" />
      </div>

      {/* 02 — What moved */}
      <NarrativeSection step={2} kicker="Since last period" title="What moved"
        lede="Start with the deltas — these are the shifts that pulled the scores above up or down since the last read.">
        <Panel>
          <div style={{ display: 'grid', gap: 6 }}>
            {d.whatChanged.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12, color: INK2 }}>
                <span style={{ color: w.dir === 'up' ? TONE.good : w.dir === 'down' ? TONE.bad : INK3, fontWeight: 800 }}>{w.dir === 'up' ? '▲' : w.dir === 'down' ? '▼' : '▬'}</span>
                <span>{w.text}</span>
              </div>
            ))}
          </div>
        </Panel>
      </NarrativeSection>

      {/* 03 — Could we actually recover in time? */}
      <NarrativeSection step={3} kicker="Resilience" title="Could we actually recover in time?"
        lede={`Your declared RTO/RPO targets are the promise; the capability columns are what the evidence says you can really do today${d.recoverySource ? ` — ${d.recoverySource === 'live' ? 'pulled live from the CMDB' : 'modeled from available signals'}` : ''}. Rows shaded red miss the promise.`}>
        <Panel note={d.recoveryNote}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead><tr style={{ color: INK3, fontSize: 9.5, textTransform: 'uppercase' }}>
                {['Service', 'Tier', 'RTO target', 'RTO capability', 'RPO target', 'RPO capability', 'Restore-tested'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {d.recovery.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${HAIR}`, background: r.gap ? '#fff8f6' : '#fff' }}>
                    <td style={{ padding: '7px 8px', color: INK, fontWeight: 600 }}>{r.process}</td>
                    <td style={{ padding: '7px 8px', color: INK2 }}>{r.tier}</td>
                    <td style={{ padding: '7px 8px', color: INK2 }}>{r.rtoTargetHrs}h</td>
                    <td style={{ padding: '7px 8px', fontWeight: 700, color: r.rtoMet ? TONE.good : TONE.bad }}>{r.rtoCapabilityHrs}h</td>
                    <td style={{ padding: '7px 8px', color: INK2 }}>{r.rpoTargetHrs}h</td>
                    <td style={{ padding: '7px 8px', fontWeight: 700, color: r.rpoMet ? TONE.good : TONE.bad }}>{r.rpoCapabilityHrs}h</td>
                    <td style={{ padding: '7px 8px' }}>{r.recoveryTested ? <span style={{ color: TONE.good }}>✓ tested</span> : <span style={{ color: TONE.bad, fontWeight: 700 }}>✗ untested</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </NarrativeSection>

      {/* 04 — What's quietly dragging the score down */}
      <NarrativeSection step={4} kicker="Debt & sprawl" title="What's quietly dragging the score down"
        lede="Two slow leaks sit underneath the headline: aging systems past their support life, and tooling running outside change control. Each carries a modeled dollar exposure.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* tech debt */}
          <Panel title={`Technical debt · ${d.techDebt.band}`}>
            <div style={{ display: 'grid', gap: 5, fontSize: 12, color: INK2 }}>
              <Row k="End-of-life systems" v={d.techDebt.eolSystems} bad={d.techDebt.eolSystems > 0} />
              <Row k="Repeat findings" v={d.techDebt.repeatFindings} bad={d.techDebt.repeatFindings > 0} />
              <Row k="Overdue remediation" v={d.techDebt.overdueRemediation} bad={d.techDebt.overdueRemediation > 0} />
              <Row k="Controls not implemented" v={d.techDebt.notImplementedControls} bad={d.techDebt.notImplementedControls > 0} />
              <div style={{ marginTop: 4, fontSize: 11.5, color: INK }}>Modeled exposure <strong style={{ color: TONE.bad }}>{usd(d.techDebt.exposure)}</strong></div>
            </div>
          </Panel>
          {/* shadow IT/AI */}
          <Panel title={`Shadow IT / AI · ${d.shadow.count} outside change control`}>
            <div style={{ display: 'grid', gap: 6 }}>
              {d.shadow.items.map((s, i) => (
                <div key={i} style={{ fontSize: 11.5, color: INK2, borderBottom: `1px solid ${PANEL}`, paddingBottom: 4 }}>
                  <strong style={{ color: INK }}>{s.name}</strong> <span style={{ color: INK3 }}>· data {s.data}{s.autonomy && s.autonomy !== 'None' ? ` · ${s.autonomy}` : ''}</span>
                </div>
              ))}
              <div style={{ marginTop: 2, fontSize: 11.5, color: INK }}>Modeled exposure <strong style={{ color: TONE.bad }}>{usd(d.shadow.exposure)}</strong></div>
            </div>
          </Panel>
        </div>
      </NarrativeSection>

      {/* 05 — How much to trust this read */}
      {d.visibility && (
        <NarrativeSection step={5} kicker="Visibility" title="How much to trust this read"
          lede="Every number above is only as good as what we can see. Here's where coverage is solid and where it's thin.">
          <Panel>
            <div style={{ fontSize: 12, color: INK2 }}>
              Overall <strong style={{ color: INK }}>{d.visibility.overall || d.visibility.band}</strong>
              {d.visibility.caveat ? <span style={{ color: INK3 }}> — {d.visibility.caveat}</span> : null}
            </div>
            {Array.isArray(d.visibility.thin) && d.visibility.thin.length > 0 && (
              <div style={{ fontSize: 11, color: INK3, marginTop: 5 }}>Thin coverage: {d.visibility.thin.join(', ')}</div>
            )}
          </Panel>
        </NarrativeSection>
      )}
    </div>
  );
}

function Score({ label, value }) {
  const c = TONE[band(value)];
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: c === COLORS.warn ? COLORS.warn : c, fontFamily: FONTS.mono }}>{value}</div>
      <div style={{ fontSize: 9, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Panel({ title, note, children }) {
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}>
      {title && <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: note ? 2 : 9, fontFamily: FONTS.display }}>{title}</div>}
      {note && <div style={{ fontSize: 10, color: INK3, marginBottom: 9 }}>{note}</div>}
      {children}
    </div>
  );
}
function Row({ k, v, bad }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{k}</span><strong style={{ color: bad ? TONE.bad : INK }}>{v}</strong></div>;
}

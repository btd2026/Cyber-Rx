/**
 * CurrentState — auto-derived CISO brief (no questionnaire / self-assessment).
 * Leads with "what changed since your last brief", then a generated executive
 * summary with a voice/audio brief, the per-asset-class visibility confidence,
 * and the inputs we INFERRED (appetite, crown jewels) which remain overridable.
 *
 * Reads the shared substrate: the dashboard payload (posture, domains, controls,
 * thresholds, readiness), the decision spine (/api/decisions), visibility
 * (/api/visibility), and tenant config (/api/tenant-config). It does not gate on
 * any self-assessment.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import { scoreUp, scoreDown, isMuted, setMuted } from './soundFx';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const band = (s) => (s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical');

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CurrentState(props) {
  const d = props.d || {};
  const role = props.role || 'CISO';
  const view = props.view; // 'brief' = what-changed + exec summary; 'detail' = visibility + inferred inputs; undefined = all
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const scoreRef = useRef(null);
  const playedRef = useRef(false);
  const [muted, setMutedState] = useState(isMuted());
  const [vis, setVis] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  useEffect(() => {
    fetch(`${api}/api/visibility?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((x) => x && setVis(x)).catch(() => {});
    fetch(`${api}/api/tenant-config?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((x) => x && setCfg(x)).catch(() => {});
    fetch(`${api}/api/decisions?role=${encodeURIComponent(role)}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((x) => x && setDecisions(x.cards || [])).catch(() => {});
  }, [api, orgId, role, headers]);

  const p = d.overallPosture || { current: 0, previous: 0, delta: 0, trend: 'stable', narrative: '' };
  const matrix = d.domainMatrix || [];
  const improving = matrix.filter((m) => (m.delta || 0) >= 2).sort((a, b) => b.delta - a.delta).slice(0, 2);
  const declining = matrix.filter((m) => (m.delta || 0) <= -2).sort((a, b) => a.delta - b.delta).slice(0, 2);
  const topControls = (d.controlRisk || []).slice(0, 3);
  const breaches = (d.thresholds && d.thresholds.breaches) || 0;
  const undecided = decisions.filter((c) => !c.decision && c.relevant !== false);
  const crit = undecided.filter((c) => c.event && c.event.severity === 'Critical').length;
  const readiness = (d.readiness && d.readiness.overall) || null;

  // Auto-generated brief (deterministic, from the substrate) — also the voice script.
  const changed = `Since the last brief, posture is ${p.delta >= 0 ? 'up' : 'down'} ${Math.abs(p.delta)} to ${p.current} out of 100 (${band(p.current)}), trending ${p.trend}.` +
    (improving.length ? ` Gains in ${improving.map((m) => m.name).join(' and ')}.` : '') +
    (declining.length ? ` Deterioration in ${declining.map((m) => m.name).join(' and ')}.` : '');
  const brief = `${changed} ` +
    (topControls.length ? `Greatest risk is concentrated in ${topControls.map((c) => c.name).join(', ')}. ` : '') +
    `${breaches} risk-appetite threshold${breaches === 1 ? '' : 's'} breached. ` +
    (undecided.length ? `${undecided.length} decision${undecided.length === 1 ? '' : 's'} need your attention${crit ? `, ${crit} critical` : ''}. ` : 'No open decisions. ') +
    (readiness != null ? `Major-event readiness is ${readiness} out of 100. ` : '') +
    (vis ? `Data visibility is ${vis.band} at ${vis.overall} percent${vis.thin && vis.thin.length ? `; thin coverage in ${vis.thin.join(', ')}.` : '.'}` : '');

  // Spoken briefing — an advisor talking the CISO through the situation, NOT a
  // verbatim read of the on-screen text. Conversational, story-first, derived
  // from the same data but phrased as guidance.
  const topRisk = topControls[0] && topControls[0].name;
  const spoken = [
    `Here's your security briefing.`,
    `Right now you're sitting at ${p.current} out of 100 — that's ${band(p.current).toLowerCase()} — and the direction is ${p.trend}${p.delta > 0 ? `, up ${p.delta} since we last spoke` : p.delta < 0 ? `, down ${Math.abs(p.delta)} since we last spoke` : `, basically flat`}.`,
    improving.length ? `The encouraging part: ${improving.map((m) => m.name).join(' and ')} ${improving.length > 1 ? 'have' : 'has'} strengthened.` : '',
    declining.length ? `What I'd keep an eye on is ${declining.map((m) => m.name).join(' and ')} — ${declining.length > 1 ? "they've" : "it's"} slipped, and that's where attention pays off.` : '',
    topRisk ? `If you only focus on one thing today, your biggest concentration of risk is ${topRisk}.` : '',
    breaches ? `You also have ${breaches} area${breaches === 1 ? '' : 's'} running hotter than the risk appetite you set.` : `You're inside your risk appetite across the board, which is good.`,
    undecided.length ? `There ${undecided.length === 1 ? 'is one decision' : `are ${undecided.length} decisions`} waiting on you${crit ? `, and ${crit === 1 ? 'one is' : `${crit} are`} critical — that's where your judgment matters most` : ''}.` : `Nothing is waiting on a decision from you at the moment.`,
    readiness != null ? `If a serious incident hit today, I'd put your readiness at about ${readiness} out of 100.` : '',
    vis ? `One honest caveat — I'm only working with ${vis.overall} percent data visibility right now, so treat the thinner areas as estimates until we wire in more sources.` : '',
    `That's the headline. I can take you deeper on any of it whenever you want.`,
  ].filter(Boolean).join(' ');

  const appetite = cfg && cfg.config && cfg.config.appetite;

  // Dynamic cue: when the brief first shows the posture, play a subtle sound and
  // pulse the score in the direction it moved. Fires once per mount.
  useEffect(() => {
    if (view === 'detail' || !d.overallPosture || playedRef.current) return;
    playedRef.current = true;
    const delta = d.overallPosture.delta || 0;
    if (delta > 0) scoreUp(); else if (delta < 0) scoreDown();
    const el = scoreRef.current;
    if (el && el.animate && delta !== 0) {
      el.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
        { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    }
  }, [view, d.overallPosture]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {view !== 'detail' && (<>
      {/* What changed since last brief */}
      <div style={{ background: COLORS.subtle, border: `1px solid ${COLORS.hair}`, color: COLORS.ink, borderRadius: 11, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.accentText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>What changed since your last brief</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { const m = !muted; setMuted(m); setMutedState(m); }} title={muted ? 'Sound effects off' : 'Sound effects on'} aria-label="Toggle sound effects" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: COLORS.ink3, padding: 0, lineHeight: 1 }}>{muted ? '🔇' : '🔊'}</button>
            <VoiceControls voice={voice} onReplay={() => voice.speak(spoken)} label="Listen to brief" />
          </div>
        </div>
        <div ref={scoreRef} style={{ fontSize: 14, fontWeight: 700, marginTop: 6, fontFamily: FONTS.mono, display: 'inline-block', transformOrigin: 'left center' }}>
          {p.current}/100 · {band(p.current)} <span style={{ color: p.delta >= 0 ? COLORS.good : COLORS.bad }}>{p.delta >= 0 ? '↑ +' : '↓ '}{p.delta}</span> <span style={{ color: COLORS.ink3, textTransform: 'capitalize', fontWeight: 500 }}>· {p.trend}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {improving.map((m) => <span key={m.id} style={{ fontSize: 11, color: COLORS.good, background: COLORS.goodSoft, borderRadius: 999, padding: '3px 10px' }}>↑ {m.name} +{m.delta}</span>)}
          {declining.map((m) => <span key={m.id} style={{ fontSize: 11, color: COLORS.bad, background: COLORS.badSoft, borderRadius: 999, padding: '3px 10px' }}>↓ {m.name} {m.delta}</span>)}
          {!improving.length && !declining.length && <span style={{ fontSize: 11, color: COLORS.ink3 }}>No material domain movement this period.</span>}
        </div>
      </div>

      {/* Generated executive summary */}
      <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '14px 16px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 6, fontFamily: FONTS.display }}>Executive summary <span style={{ fontSize: 10, fontWeight: 600, color: INK3, fontFamily: FONTS.body }}>· auto-derived from your data</span></div>
        <div style={{ fontSize: 13, color: INK, lineHeight: 1.6 }}>{p.narrative || brief}</div>
        <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.6, marginTop: 8 }}>{brief}</div>
        {undecided.length > 0 && props.onOpenQueue && (
          <button onClick={props.onOpenQueue} style={{ marginTop: 10, background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Review {undecided.length} open decision{undecided.length === 1 ? '' : 's'} →</button>
        )}
      </div>
      </>)}

      {view !== 'brief' && (<>
      {/* Visibility confidence */}
      {vis && (
        <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>Data visibility confidence</div>
            <span style={{ fontSize: 12, fontWeight: 800, color: vis.band === 'High' ? TONE.good : vis.band === 'Moderate' ? TONE.warn : TONE.bad, fontFamily: FONTS.mono }}>{vis.band} · {vis.overall}%</span>
          </div>
          <div style={{ fontSize: 11, color: INK3, marginBottom: 10, lineHeight: 1.5, maxWidth: 760 }}>
            How complete the data behind these results is, by source. The platform's outputs are only as trustworthy as their inputs — connect each source to move it from <em>inferred</em> to observed and raise confidence.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {vis.classes.map((c) => {
              const col = c.confidence >= 80 ? TONE.good : c.confidence >= 50 ? TONE.warn : TONE.bad;
              return (
                <div key={c.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: INK2 }}>{c.label}</span><strong style={{ color: col }}>{c.band}</strong></div>
                  <div style={{ height: 5, background: '#f0f1f4', borderRadius: 3, marginTop: 5, overflow: 'hidden' }}><div style={{ width: `${c.confidence}%`, height: '100%', background: col }} /></div>
                  <div style={{ fontSize: 9.5, color: INK3, marginTop: 3 }}>{c.hasData ? `${c.rows} records` : 'no data — inferred'}</div>
                </div>
              );
            })}
          </div>
          {vis.thin && vis.thin.length > 0 && <div style={{ fontSize: 11, color: INK2, marginTop: 8 }}>{vis.caveat}</div>}
        </div>
      )}

      {/* Inferred & overridable inputs */}
      <div style={{ border: `1px dashed ${HAIR}`, borderRadius: 11, background: PANEL, padding: '12px 16px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: INK2, marginBottom: 6 }}>Inferred inputs <span style={{ fontWeight: 500, color: INK3 }}>— defaulted from your data; override any in Settings</span></div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11.5, color: INK2 }}>
          <span>Risk appetite: <strong style={{ color: INK }}>{appetite ? `${appetite.riskThreshold}+ = above appetite` : '—'}</strong></span>
          {appetite && <span>Tolerance: <strong style={{ color: INK }}>≤{appetite.maxHighOpen} high, {appetite.maxCriticalOpen} critical</strong></span>}
          <span style={{ color: INK3 }}>Application criticality &amp; crown jewels are inferred from the process→app map; correct any in the Process/Application steps.</span>
        </div>
      </div>
      </>)}
    </div>
  );
}

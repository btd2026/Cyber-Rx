/**
 * AiSecurityControls
 * ------------------
 * How well the org's AI-related security controls are operating — the controls
 * around AI coding assistants (Claude Code, Copilot) and generative AI. Each
 * control card shows operating effectiveness (0–100), status, the framework it
 * maps to (OWASP LLM Top 10 / NIST AI RMF), the signals behind it, and the
 * recommended action.
 *
 * Data: GET /api/ciso/ai-controls
 */

import React, { useState, useEffect } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK_2 = COLORS.ink2, INK_3 = COLORS.ink3, HAIRLINE = COLORS.hair;
const STATUS = { Operating: '#1f8a4c', Partial: '#B07C2E', Weak: '#A85B2E', Gap: '#C0392B', 'Not assessed': '#94a3b8' };

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

const AI_INTRO = "This is your AI and GenAI controls view. It shows how well the safeguards around AI coding assistants — like Claude Code and Copilot — and generative-AI use are actually operating, each mapped to the OWASP LLM Top 10 and the NIST AI Risk Management Framework. The score at the top is the overall health of these controls; the cards below show where the gaps are and what to do about each one. The fastest-moving risk here is data leaking into AI tools without controls, so watch the data-protection items closely.";

export default function AiSecurityControls(props) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const voice = useAgentVoice();
  const { token, organizationId, apiUrl } = resolveCtx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    fetch(`${apiUrl}/api/ciso/ai-controls?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message));
  }, [apiUrl, organizationId, token]);

  useEffect(() => {
    if (!data) return;
    if (typeof window !== 'undefined' && !window._cx_ai_intro) { window._cx_ai_intro = true; voice.speak(AI_INTRO); }
    return () => voice.stop();
  }, [data]); // eslint-disable-line

  if (error) return <div style={{ padding: 20, color: '#C0392B', fontSize: 13 }}>Could not load AI controls: {error}</div>;
  if (!data) return <div style={{ padding: 20, color: INK_3, fontSize: 13 }}>Assessing AI security controls…</div>;
  const sc = (s) => STATUS[s] || INK_3;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            CISO · AI &amp; GenAI Security Controls
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, fontFamily: FONTS.display }}>How well are our AI controls operating?</h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 680, lineHeight: 1.55 }}>
            Controls around AI coding assistants (Claude Code, Copilot) and generative-AI use. {data.note}
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'stretch', background: '#0f1b2d', borderRadius: 4, overflow: 'hidden', flexShrink: 0, marginLeft: 20 }}>
          <span style={{ background: sc(data.overall.status), color: '#fff', fontWeight: 600, fontSize: 19, fontVariantNumeric: 'tabular-nums', padding: '10px 14px', display: 'flex', alignItems: 'center', fontFamily: FONTS.mono }}>{data.overall.score}</span>
          <span style={{ color: '#e2e8f0', fontWeight: 500, fontSize: 12, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.35 }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, color: COLORS.accent }}>AI controls operating</span>
            <span>{data.controlsOperating}/{data.totalControls} operating · {data.controlsWithGaps} gap(s)</span>
          </span>
        </div>
      </div>

      {/* Dashboard intro + agent voice (mutable) */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'space-between', alignItems: 'center', background: '#eef4fb', border: '1px solid #cfe0f3', borderRadius: 8, padding: '10px 15px', marginTop: 16 }}>
        <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.5 }}>
          <strong style={{ color: '#1d4ed8' }}>What this shows:</strong> how well your AI/GenAI safeguards (Claude Code, Copilot, generative-AI use) are operating — each mapped to OWASP LLM Top 10 and NIST AI RMF, with the action to close each gap.
        </div>
        <div style={{ flexShrink: 0 }}><VoiceControls voice={voice} onReplay={() => voice.speak(AI_INTRO)} label="Listen" /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 16 }}>
        {data.controls.map((c) => (
          <div key={c.id} style={{ border: `1px solid ${HAIRLINE}`, borderLeft: `4px solid ${sc(c.status)}`, borderRadius: 6, padding: '13px 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: FONTS.display }}>{c.name}</div>
                <div style={{ fontSize: 9.5, color: INK_3, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.ref}</div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: sc(c.status), fontVariantNumeric: 'tabular-nums', lineHeight: 1, fontFamily: FONTS.mono }}>{c.score}</div>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: sc(c.status), textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.status}</div>
              </div>
            </div>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', margin: '8px 0 9px' }}>
              <div style={{ width: `${c.score}%`, height: '100%', background: sc(c.status), borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11.5, color: INK_2, lineHeight: 1.5 }}>{c.description}</div>
            <div style={{ fontSize: 10, color: INK_3, marginTop: 6 }}>Signals: {c.signals.join(' · ')}</div>
            <div style={{ marginTop: 8, fontSize: 11.5, color: INK, background: `${sc(c.status)}10`, border: `1px solid ${sc(c.status)}30`, borderRadius: 4, padding: '6px 9px' }}>
              <span style={{ fontWeight: 700, color: sc(c.status) }}>Action:</span> {c.recommendedAction}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

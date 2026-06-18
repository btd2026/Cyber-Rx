/**
 * Coaching — the coaching layer + blind-spot detection for a role.
 * Questions this leader should be asking now, a materiality checklist, a
 * ready-to-run tabletop from the top event, and the neglect patterns
 * (blind spots) detected from the decision ledger.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc', NAVY = '#0f1b2d';
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
const STAT = (s) => (/^yes/i.test(s) ? '#1f8a4c' : /^no/i.test(s) ? '#C0392B' : /likely/i.test(s) ? '#B07C2E' : INK3);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function Coaching(props) {
  const role = props.role || 'Board';
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  const load = useCallback(() => {
    fetch(`${api}/api/coaching?role=${encodeURIComponent(role)}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, role, headers]);
  useEffect(() => { load(); }, [load]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Preparing your coaching…</div>;
  const co = d.coaching || {}, bs = d.blindSpots || [], tt = co.tabletop;

  const Card = ({ title, accent, narrate, children }) => (
    <div style={{ border: `1px solid ${HAIR}`, borderTop: `3px solid ${accent}`, borderRadius: 11, background: '#fff', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK }}>{title}</div>
        {narrate && <VoiceControls voice={voice} onReplay={() => voice.speak(narrate)} label="Listen" />}
      </div>
      {children}
    </div>
  );
  const bsNarr = bs.length ? `Blind spots for the ${role}. ` + bs.map((f) => `${f.pattern}. ${f.detail} ${f.recommendation}`).join(' ') : `No blind spots flagged for the ${role} right now.`;
  const qNarr = `Questions to ask right now. ` + (co.questionsToAsk || []).join('. ');
  const mNarr = `Materiality checklist${co.topEvent ? ` for ${co.topEvent.title}` : ''}. ` + (co.materialityChecklist || []).map((m) => `${m.item}: ${m.status}, ${m.note}`).join('. ');
  const ttNarr = tt ? `${tt.scenario} ` + tt.prompts.join(' ') : '';
  const overview = `Your ${role} coaching. What to ask, what's material, a tabletop to run, and the blind spots detected from how decisions are actually being made. Press listen on any section for the detail.`;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: NAVY, color: '#e6ecf5', borderRadius: 10, padding: '13px 16px' }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          Your <strong style={{ color: '#9bc0ff' }}>{role} coaching</strong> — what to ask, what's material, a tabletop to run, and the blind spots detected from how decisions are actually being made.
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(overview)} label="Listen" />
      </div>

      {/* blind spots */}
      <Card title="🔭 Blind spots detected" accent="#7c3aed" narrate={bsNarr}>
        {bs.length === 0 ? <div style={{ fontSize: 12, color: INK3 }}>No blind spots flagged for the {role} right now.</div> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {bs.map((f, i) => (
              <div key={i} style={{ borderLeft: `4px solid ${SEV[f.severity] || INK3}`, background: PANEL, borderRadius: 8, padding: '9px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{f.pattern}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: SEV[f.severity] || INK3, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase' }}>{f.severity}</span>
                </div>
                <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>{f.detail}</div>
                <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 3 }}>→ {f.recommendation}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* questions to ask */}
      <Card title="❓ Questions to ask right now" accent="#1d4ed8" narrate={qNarr}>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          {(co.questionsToAsk || []).map((q, i) => <li key={i} style={{ fontSize: 12.5, color: INK, lineHeight: 1.5 }}>{q}</li>)}
        </ol>
      </Card>

      {/* materiality checklist */}
      <Card title="⚖️ Materiality checklist (top event)" accent="#B07C2E" narrate={mNarr}>
        {co.topEvent && <div style={{ fontSize: 11, color: INK3, marginBottom: 8 }}>For: {co.topEvent.title}</div>}
        <div style={{ display: 'grid', gap: 6 }}>
          {(co.materialityChecklist || []).map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 12, borderBottom: `1px solid ${PANEL}`, paddingBottom: 5 }}>
              <span style={{ color: INK }}>{m.item}<span style={{ color: INK3, fontSize: 10.5 }}> — {m.note}</span></span>
              <strong style={{ color: STAT(m.status), whiteSpace: 'nowrap' }}>{m.status}</strong>
            </div>
          ))}
        </div>
      </Card>

      {/* tabletop */}
      {tt && (
        <Card title="🎲 Tabletop — run this in your next meeting" accent="#C0392B" narrate={ttNarr}>
          <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.6, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 12px' }}>{tt.scenario}</div>
          <ol style={{ margin: '10px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
            {tt.prompts.map((p, i) => <li key={i} style={{ fontSize: 12, color: INK2, lineHeight: 1.5 }}>{p}</li>)}
          </ol>
        </Card>
      )}
    </div>
  );
}

/**
 * BoardDecisions — Board Sub-tab 2: Top Decisions for the Board.
 * The SHARED events that rise to board altitude (critical / above appetite /
 * correlated), each through the Board lens: management's recommendation, the cost
 * of doing nothing, and the question to put to management. Recording happens in
 * the Decisions queue (same shared ledger).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
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

export default function BoardDecisions(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/board/decisions?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Assembling board-level decisions…</div>;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#94a3b8', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: INK2 }}><strong>{d.counts.total}</strong> risk(s) at board altitude · <strong>{d.counts.open}</strong> open. Same events every executive manages — here at oversight altitude.</div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>

      <div style={{ display: 'grid', gap: 11 }}>
        {d.items.map((it) => {
          const sev = SEV[it.severity] || INK3; const lens = it.lens || {};
          return (
            <div key={it.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${it.type === 'compound' ? '#7c3aed' : sev}`, borderRadius: 11, background: '#fff', padding: '12px 15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                    {it.type === 'compound' && <Pill text="Correlated" color="#7c3aed" />}
                    <Pill text={it.severity} color={sev} />
                    {it.aboveAppetite && <Pill text="Above appetite" color={SEV.Critical} />}
                    {it.decision ? <Pill text="Decided" color="#1f8a4c" /> : <Pill text="Open" color="#B07C2E" />}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{it.provenance && <Provenance prov={it.provenance} />}<span>{lens.headline || it.title}</span></div>
                  <div style={{ fontSize: 11, color: INK3, marginTop: 1 }}>Event: {it.title} · owner {it.owner}</div>
                  {lens.narrative && <div style={{ fontSize: 11.5, color: INK2, marginTop: 5, lineHeight: 1.55 }}>{lens.narrative}</div>}
                  {lens.questionToAsk && <div style={{ fontSize: 11.5, color: '#7c3aed', fontWeight: 600, marginTop: 6 }}>❓ Ask management: {lens.questionToAsk}</div>}
                </div>
                <div style={{ textAlign: 'right', minWidth: 150 }}>
                  {lens.primary && <><div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase' }}>{lens.primary.label}</div><div style={{ fontSize: 14, fontWeight: 800, color: INK }}>{lens.primary.value}</div></>}
                  {lens.secondary && <div style={{ fontSize: 10.5, color: INK2, marginTop: 3 }}>{lens.secondary.label}: <strong style={{ color: sev }}>{lens.secondary.value}</strong></div>}
                  {lens.narration && <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}><VoiceControls voice={voice} onReplay={() => voice.speak(lens.narration)} label="Listen" /></div>}
                </div>
              </div>
              {it.decision && <div style={{ fontSize: 11, color: INK2, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 8, padding: '7px 11px', marginTop: 8 }}><strong style={{ color: '#1f8a4c' }}>On the record:</strong> {it.decision.action === 'accept' ? 'Accepted & monitoring' : 'Treatment selected'} by {it.decision.decidedBy || it.decision.role || 'management'}{it.decision.rationale ? ` — "${it.decision.rationale}"` : ''}.</div>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: INK3 }}>Decisions are recorded in the Decisions queue and written to the shared ledger — this is the board's read of that same record.</div>
    </div>
  );
}

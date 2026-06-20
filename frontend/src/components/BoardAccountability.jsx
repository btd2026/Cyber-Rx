/**
 * BoardAccountability — Board Sub-tab 3 (priority): Oversight & Accountability.
 * Are critical risks owned and decided? Is management remediating or quietly
 * accepting? Caremark / SEC oversight documentation, ownership coverage, and the
 * shared decision ledger as the board's evidence of oversight. Exportable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B' };
const STAT = (s) => (/^yes/i.test(s) ? TONE.good : /^no|unowned|weak/i.test(s) ? TONE.bad : /review|configure|monitor|assess/i.test(s) ? TONE.warn : INK2);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function BoardAccountability(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/board/accountability?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Assessing oversight & accountability…</div>;
  const s = d.summary;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#94a3b8', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div><div style={{ fontSize: 30, fontWeight: 800, color: d.score >= 80 ? TONE.good : d.score >= 60 ? TONE.warn : TONE.bad }}>{d.score}</div><div style={{ fontSize: 9, color: INK3, textTransform: 'uppercase' }}>Oversight</div></div>
          <div style={{ fontSize: 12, color: INK2, lineHeight: 1.6, maxWidth: 560 }}>Critical decided {s.criticalDecided}/{s.criticalTotal} · acceptance ratio {s.acceptRatio}% · {s.thinAccepts} thin rationale · {s.unowned} unowned · {s.decisions} decision(s) on record.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
          <a href={`${api}${d.exportUrl}`} style={{ background: '#0f172a', color: '#fff', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>⤓ Export oversight record</a>
        </div>
      </div>

      {/* management posture: remediating vs accepting */}
      <Panel title="Management posture — remediating vs accepting">
        <div style={{ display: 'flex', gap: 4, height: 26, borderRadius: 6, overflow: 'hidden', border: `1px solid ${HAIR}` }}>
          <div style={{ width: `${100 - s.acceptRatio}%`, background: TONE.good, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#fff' }}>{s.treating} treating</div>
          <div style={{ width: `${s.acceptRatio}%`, background: s.acceptRatio >= 50 ? TONE.bad : TONE.warn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#fff' }}>{s.accepting} accepting</div>
        </div>
        <div style={{ fontSize: 11, color: INK2, marginTop: 6 }}>A high acceptance ratio can signal risk being pushed into the future without a plan. {s.thinAccepts > 0 && <strong style={{ color: TONE.bad }}>{s.thinAccepts} acceptance(s) lack a substantive rationale.</strong>}</div>
      </Panel>

      {/* oversight checklist */}
      <Panel title="Board-oversight documentation (Caremark / SEC)">
        {d.oversight.map((o, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, fontSize: 12, borderBottom: `1px solid ${PANEL}`, padding: '6px 0' }}>
            <span style={{ color: INK }}>{o.item}<span style={{ color: INK3, fontSize: 10.5 }}> — {o.note}</span></span>
            <strong style={{ color: STAT(o.status), whiteSpace: 'nowrap' }}>{o.status}</strong>
          </div>
        ))}
      </Panel>
      <div style={{ fontSize: 10.5, color: INK3 }}>The decision/evidence ledger is the contemporaneous record that evidences good-faith oversight. Export it for board minutes / committee files.</div>
    </div>
  );
}
function Panel({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}><div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 9 }}>{title}</div>{children}</div>;
}

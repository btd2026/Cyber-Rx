/**
 * CloDefensibility — CLO Sub-tab 3: Defensibility & Evidence.
 * The SHARED decision/evidence ledger surfaced as a legal artifact (who knew what
 * when, decisions + rationale, scored for defensibility), legal-hold status,
 * evidence/privilege preservation, and board-oversight documentation
 * (Caremark / SEC). Exportable. Prominently flags litigation discoverability.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B' };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}
const STAT = (s) => (/^yes/i.test(s) ? TONE.good : /^no/i.test(s) || /weak/i.test(s) ? TONE.bad : /review|define|configure|assess/i.test(s) ? TONE.warn : INK2);

export default function CloDefensibility(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/clo/defensibility?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Assembling the legal record…</div>;
  const s = d.summary;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* prominent legal-review flag */}
      <div style={{ fontSize: 11.5, color: '#7a1d1d', background: '#fdecea', border: '1px solid #f3c9c4', borderRadius: 9, padding: '11px 14px', lineHeight: 1.55 }}>
        <strong>⚖️ {d.legalCaveat}</strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div><div style={{ fontSize: 30, fontWeight: 800, color: d.defensibilityScore >= 80 ? TONE.good : d.defensibilityScore >= 60 ? TONE.warn : TONE.bad }}>{d.defensibilityScore}</div><div style={{ fontSize: 9, color: INK3, textTransform: 'uppercase' }}>Defensibility</div></div>
          <div style={{ fontSize: 12, color: INK2, lineHeight: 1.6 }}>{s.decisions} decision(s) on record · {s.accepts} acceptance(s), {s.thinRationale} with thin rationale · critical decided {s.criticalDecided}/{s.criticalTotal}.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
          <a href={`${api}${d.exportUrl}`} style={{ background: '#0f172a', color: '#fff', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>⤓ Export ledger (CSV)</a>
        </div>
      </div>

      {/* board oversight (Caremark / SEC) */}
      <Panel title="Board-oversight documentation (Caremark / SEC)">
        {d.oversight.map((o, i) => (
          <Row key={i} item={o.item} status={o.status} note={o.note} />
        ))}
      </Panel>

      {/* evidence / privilege preservation */}
      <Panel title="Evidence & privilege preservation">
        {d.preservation.map((o, i) => <Row key={i} item={o.item} status={o.status} note={o.note} />)}
      </Panel>

      {/* the ledger as a legal record */}
      <Panel title={`Decision & evidence ledger — who knew what, when (${d.record.length})`}>
        {d.record.length === 0 ? <div style={{ fontSize: 11.5, color: INK3 }}>No decisions recorded yet. Each decision here becomes part of the contemporaneous record.</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr style={{ color: INK3, fontSize: 9.5, textTransform: 'uppercase' }}>
                {['When', 'Role', 'Action', 'Rationale', 'Discoverable', 'Defensibility'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {d.record.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${HAIR}` }}>
                    <td style={{ padding: '7px 8px', color: INK2, whiteSpace: 'nowrap' }}>{r.at ? new Date(r.at).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '7px 8px', color: INK }}>{r.role || '—'}</td>
                    <td style={{ padding: '7px 8px', color: INK2 }}>{r.action}</td>
                    <td style={{ padding: '7px 8px', color: INK2, maxWidth: 280 }}>{r.rationale || <span style={{ color: INK3 }}>—</span>}</td>
                    <td style={{ padding: '7px 8px' }}>{r.discoverable ? <span style={{ color: TONE.bad, fontWeight: 700 }}>Yes</span> : <span style={{ color: INK3 }}>—</span>}</td>
                    <td style={{ padding: '7px 8px', fontWeight: 700, color: /defensible/i.test(r.defensibility) ? TONE.good : /weak/i.test(r.defensibility) ? TONE.bad : INK3 }}>{r.defensibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
function Panel({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}><div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 9 }}>{title}</div>{children}</div>;
}
function Row({ item, status, note }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, fontSize: 12, borderBottom: `1px solid ${PANEL}`, padding: '5px 0' }}>
      <span style={{ color: INK }}>{item}<span style={{ color: INK3, fontSize: 10.5 }}> — {note}</span></span>
      <strong style={{ color: STAT(status), whiteSpace: 'nowrap' }}>{status}</strong>
    </div>
  );
}

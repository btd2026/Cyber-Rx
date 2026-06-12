/**
 * CsfControlLibrary
 * -----------------
 * The full NIST CSF 2.0 control library (all 106 subcategories) with two
 * cross-reference tables:
 *
 *   • Controls → Tools : every control, whether it is testable automatically
 *     (via a tool API) or manually (evidence requested at setup), and the
 *     security tools whose API can evidence it.
 *
 *   • Tools → API : every security tool (Okta, Prisma Cloud, …) with the
 *     specific JSON API call(s) used to collect control evidence.
 *
 * Data: GET /api/csf/control-library
 */

import React, { useState, useEffect, useMemo } from 'react';

const INK = '#0f172a', INK_2 = '#475569', INK_3 = '#94a3b8', HAIRLINE = '#e2e8f0', PANEL = '#f8fafc';
const TEST = {
  auto: { label: 'Automated', color: '#1f8a4c', bg: '#1f8a4c14' },
  partial: { label: 'Hybrid', color: '#B07C2E', bg: '#B07C2E14' },
  manual: { label: 'Manual', color: '#6366f1', bg: '#6366f114' },
};
const FN = {
  GV: '#7c3aed', ID: '#2563eb', PR: '#0891b2', DE: '#ca8a04', RS: '#dc2626', RC: '#059669',
};

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

function Pill({ text, color, bg }) {
  return <span style={{ fontSize: 9.5, fontWeight: 700, color, background: bg || `${color}14`, border: `1px solid ${color}40`, borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{text}</span>;
}

export default function CsfControlLibrary(props) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('controls');      // 'controls' | 'tools'
  const [fnFilter, setFnFilter] = useState('ALL');
  const [testFilter, setTestFilter] = useState('ALL');
  const [q, setQ] = useState('');
  const [openTool, setOpenTool] = useState(null);
  const { token, organizationId, apiUrl } = resolveCtx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    fetch(`${apiUrl}/api/csf/control-library?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message));
  }, [apiUrl, organizationId, token]);

  const controls = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.controls.filter((c) =>
      (fnFilter === 'ALL' || c.function === fnFilter) &&
      (testFilter === 'ALL' || c.test === testFilter) &&
      (!needle || c.id.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle) ||
        c.tools.some((t) => t.name.toLowerCase().includes(needle))));
  }, [data, fnFilter, testFilter, q]);

  const tools = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.tools.filter((t) => !needle || t.name.toLowerCase().includes(needle) ||
      t.category.toLowerCase().includes(needle) || t.controls.some((c) => c.toLowerCase().includes(needle)));
  }, [data, q]);

  if (error) return <div style={{ padding: 20, color: '#C0392B', fontSize: 13 }}>Could not load control library: {error}</div>;
  if (!data) return <div style={{ padding: 20, color: INK_3, fontSize: 13 }}>Loading NIST CSF 2.0 control library…</div>;
  const S = data.summary;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '22px 26px' }}>
      {/* Header + summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', paddingBottom: 14, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>{data.framework} · Control Library</div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK }}>Every control, how it is tested, and which tool evidences it</h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 720, lineHeight: 1.55 }}>
            All {S.totalControls} NIST CSF 2.0 subcategories. <strong>{S.automatableTotal}</strong> can be evidenced via a security-tool API ({S.automated} fully automated, {S.hybrid} hybrid); <strong>{S.manual}</strong> are evidenced by documentation collected during organization setup.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Automated', S.automated, TEST.auto.color], ['Hybrid', S.hybrid, TEST.partial.color], ['Manual', S.manual, TEST.manual.color], ['Tools', S.totalTools, INK_2]].map(([l, v, col]) => (
            <div key={l} style={{ minWidth: 78, border: `1px solid ${HAIRLINE}`, borderTop: `3px solid ${col}`, borderRadius: 5, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: col, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 9, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${HAIRLINE}`, margin: '14px 0' }}>
        {[['controls', `Controls → Tools (${data.controls.length})`], ['tools', `Tools → API (${data.tools.length})`]].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === k ? INK : 'transparent'}`, color: tab === k ? INK : INK_3, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: tab === k ? 700 : 500, marginBottom: -1 }}>{lbl}</button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search controls, tools…"
          style={{ marginLeft: 'auto', alignSelf: 'center', border: `1px solid ${HAIRLINE}`, borderRadius: 5, padding: '5px 10px', fontSize: 11.5, width: 200, color: INK }} />
      </div>

      {tab === 'controls' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>Function</span>
            {['ALL', ...data.functions.map((f) => f.id)].map((f) => (
              <button key={f} onClick={() => setFnFilter(f)} style={{ fontSize: 10.5, fontWeight: fnFilter === f ? 700 : 500, color: fnFilter === f ? '#fff' : (FN[f] || INK_2), background: fnFilter === f ? (FN[f] || INK) : '#fff', border: `1px solid ${fnFilter === f ? (FN[f] || INK) : HAIRLINE}`, borderRadius: 4, padding: '3px 9px', cursor: 'pointer' }}>{f}</button>
            ))}
            <span style={{ width: 1, height: 16, background: HAIRLINE, margin: '0 4px' }} />
            {['ALL', 'auto', 'partial', 'manual'].map((t) => (
              <button key={t} onClick={() => setTestFilter(t)} style={{ fontSize: 10.5, fontWeight: testFilter === t ? 700 : 500, color: testFilter === t ? '#fff' : INK_2, background: testFilter === t ? (TEST[t] ? TEST[t].color : INK) : '#fff', border: `1px solid ${testFilter === t ? (TEST[t] ? TEST[t].color : INK) : HAIRLINE}`, borderRadius: 4, padding: '3px 9px', cursor: 'pointer' }}>{t === 'ALL' ? 'All' : TEST[t].label}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: INK_3 }}>{controls.length} shown</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: INK_3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '7px 8px', borderBottom: `1px solid ${HAIRLINE}`, width: 78 }}>Control</th>
                  <th style={{ padding: '7px 8px', borderBottom: `1px solid ${HAIRLINE}` }}>Outcome</th>
                  <th style={{ padding: '7px 8px', borderBottom: `1px solid ${HAIRLINE}`, width: 92 }}>Testing</th>
                  <th style={{ padding: '7px 8px', borderBottom: `1px solid ${HAIRLINE}` }}>Evidencing tools / setup evidence</th>
                </tr>
              </thead>
              <tbody>
                {controls.map((c) => {
                  const t = TEST[c.test];
                  return (
                    <tr key={c.id} style={{ verticalAlign: 'top' }}>
                      <td style={{ padding: '9px 8px', borderBottom: `1px solid ${PANEL}` }}>
                        <span style={{ fontWeight: 700, color: FN[c.function] || INK, fontVariantNumeric: 'tabular-nums', fontSize: 11.5 }}>{c.id}</span>
                        <div style={{ fontSize: 9, color: INK_3, marginTop: 2 }}>{c.categoryName}</div>
                      </td>
                      <td style={{ padding: '9px 8px', borderBottom: `1px solid ${PANEL}`, color: INK, lineHeight: 1.45 }}>{c.name}</td>
                      <td style={{ padding: '9px 8px', borderBottom: `1px solid ${PANEL}` }}>
                        <Pill text={t.label} color={t.color} bg={t.bg} />
                      </td>
                      <td style={{ padding: '9px 8px', borderBottom: `1px solid ${PANEL}` }}>
                        {c.tools.length > 0 ? (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {c.tools.map((tool) => (
                              <button key={tool.id} onClick={() => { setTab('tools'); setOpenTool(tool.id); setQ(''); }}
                                title={`${tool.category} — view API`}
                                style={{ fontSize: 10.5, fontWeight: 600, color: tool.connected ? '#1f8a4c' : INK_2, background: tool.connected ? '#1f8a4c10' : '#fff', border: `1px solid ${tool.connected ? '#1f8a4c40' : HAIRLINE}`, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>
                                {tool.name}{tool.connected ? ' ●' : ''}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: INK_2, fontStyle: 'italic' }}>↳ Setup evidence: {c.evidenceRequest}</span>
                        )}
                        {c.tools.length > 0 && c.evidenceRequest && (
                          <div style={{ fontSize: 10, color: INK_3, marginTop: 4 }}>Attestation completes it: {c.evidenceRequest}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 10.5, color: INK_3 }}>● = tool currently connected for this organization. Click a tool to jump to its JSON API specification.</div>
        </>
      )}

      {tab === 'tools' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {tools.map((t) => {
            const open = openTool === t.id;
            return (
              <div key={t.id} style={{ border: `1px solid ${HAIRLINE}`, borderLeft: `4px solid ${t.connected ? '#1f8a4c' : INK_3}`, borderRadius: 6, overflow: 'hidden' }}>
                <button onClick={() => setOpenTool(open ? null : t.id)} style={{ width: '100%', textAlign: 'left', background: open ? PANEL : '#fff', border: 'none', cursor: 'pointer', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{t.name}</span>
                      <span style={{ fontSize: 10.5, color: INK_3 }}>{t.vendor}</span>
                      {t.live && <Pill text="Live connector" color="#1f8a4c" />}
                      {t.connected && <Pill text="Connected" color="#1f8a4c" bg="#1f8a4c14" />}
                    </div>
                    <div style={{ fontSize: 11, color: INK_2, marginTop: 3 }}>{t.category} · evidences {t.controlCount} control(s): <span style={{ color: INK_3 }}>{t.controls.join(', ')}</span></div>
                  </div>
                  <span style={{ fontSize: 16, color: INK_3, flexShrink: 0 }}>{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div style={{ padding: '4px 15px 15px', background: PANEL }}>
                    <div style={{ fontSize: 11, color: INK_2, margin: '6px 0' }}><strong>Auth:</strong> {t.auth}</div>
                    <div style={{ fontSize: 11, color: INK_2, marginBottom: 10 }}><strong>Base URL:</strong> <code style={{ fontSize: 10.5 }}>{t.baseUrl}</code>{t.docs && <> · <a href={t.docs} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>API docs ↗</a></>}</div>
                    {t.apis.map((a, i) => (
                      <div key={i} style={{ background: '#0b1220', borderRadius: 6, padding: '11px 13px', marginBottom: 9, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                        <div style={{ color: '#94a3b8', fontSize: 10.5, marginBottom: 6, fontFamily: 'system-ui' }}>{a.purpose}{a.signal ? ` · → ${a.signal}` : ''}</div>
                        <div style={{ fontSize: 11.5, color: '#e2e8f0', wordBreak: 'break-all' }}>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>{a.method}</span> {a.path}
                        </div>
                        {a.headers && Object.keys(a.headers).length > 0 && (
                          <div style={{ fontSize: 10.5, color: '#7dd3fc', marginTop: 5 }}>
                            {Object.entries(a.headers).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
                          </div>
                        )}
                        {a.sample && <div style={{ fontSize: 10.5, color: '#fbbf24', marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{a.sample}</div>}
                        <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 7, fontFamily: 'system-ui', lineHeight: 1.5 }}>
                          <span style={{ color: '#94a3b8' }}>Evidence:</span> {a.extract}
                        </div>
                        {a.controls && a.controls.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {a.controls.map((cid) => <span key={cid} style={{ fontSize: 9.5, fontWeight: 700, color: '#0b1220', background: '#7dd3fc', borderRadius: 3, padding: '1px 6px' }}>{cid}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

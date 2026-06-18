/**
 * KeyRisks — CISO Key Risks hero. Business risks ABOVE APPETITE (configurable),
 * each with owner, status, scenario type, a business explanation and its own
 * trajectory; click to drill into impacted processes, impacted applications, and
 * the live attack path (entry → steps → crown-jewel target with business
 * context). Exploitability-ranked vulnerabilities sit BENEATH as the evidence
 * layer. Projections & Decisions live in the adjacent sub-tab (DecisionQueue).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const SCEN = { Ransomware: '#C0392B', 'Data exfiltration': '#7c3aed', Fraud: '#A85B2E', 'Business disruption': '#1d4ed8' };
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
const Pill = ({ text, color }) => <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{text}</span>;

export default function KeyRisks(props) {
  const role = 'CISO';
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [cards, setCards] = useState([]);
  const [threshold, setThreshold] = useState('High');
  const [evidence, setEvidence] = useState(null);
  const [graph, setGraph] = useState(null);
  const [open, setOpen] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  useEffect(() => {
    fetch(`${api}/api/decisions?role=${role}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setCards(d.cards || [])).catch(() => {});
    fetch(`${api}/api/tenant-config?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && d.config && d.config.appetite && setThreshold(d.config.appetite.riskThreshold || 'High')).catch(() => {});
    fetch(`${api}/api/ciso/exploitability?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setEvidence(d)).catch(() => {});
    fetch(`${api}/api/attack-path?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setGraph(d)).catch(() => {});
  }, [api, orgId, headers]);

  // Business risks (single, non-project events) above appetite.
  const all = cards.filter((c) => c.type !== 'compound' && c.event.category !== 'project');
  const above = all.filter((c) => sevRank[c.event.severity] <= sevRank[threshold]);
  const below = all.length - above.length;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: INK2 }}>
          Business risks <strong>at or above your appetite</strong> ({threshold}+). {below > 0 && <span style={{ color: INK3 }}>{below} below-appetite risk{below === 1 ? '' : 's'} hidden.</span>}
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(`${above.length} business risks are above your ${threshold} appetite. ` + above.slice(0, 4).map((c) => `${c.event.title}, ${c.event.scenarioType}, ${c.event.timing.p30} percent in 30 days, ${usd(c.event.loss.expected)} expected loss.`).join(' '))} label="Listen" />
      </div>

      {/* Business-risk hero cards */}
      <div style={{ display: 'grid', gap: 10 }}>
        {above.length === 0 && <div style={{ fontSize: 12, color: INK3 }}>No risks currently above appetite.</div>}
        {above.map((c) => {
          const e = c.event; const isOpen = open === c.id;
          const apps = appsForRisk(graph, e);
          const procs = procsForRisk(graph, e);
          return (
            <div key={c.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${SEV[e.severity]}`, borderRadius: 10, background: '#fff' }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill text={e.scenarioType} color={SCEN[e.scenarioType] || INK3} />
                      <Pill text={e.severity} color={SEV[e.severity]} />
                      {c.decision && <Pill text={c.decision.action === 'accept' ? 'Accepted' : 'In treatment'} color="#1f8a4c" />}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 6 }}>{e.title}</div>
                    <div style={{ fontSize: 11.5, color: INK2, marginTop: 4, lineHeight: 1.5 }}>{(c.lens && c.lens.narrative) || ''}</div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 10.5, color: INK3, marginTop: 6 }}>
                      <span>Owner <strong style={{ color: INK2 }}>{e.owner || 'CISO'}</strong></span>
                      <span>Status <strong style={{ color: INK2 }}>{c.decision ? (c.decision.action === 'accept' ? 'accepted & monitoring' : 'in treatment') : 'open'}</strong></span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 150 }}>
                    <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase' }}>Trajectory (exploit p)</div>
                    <div style={{ fontSize: 11.5, color: INK }}>7d <strong>{e.timing.p7}%</strong> · 30d <strong style={{ color: SEV[e.severity] }}>{e.timing.p30}%</strong> · 90d <strong>{e.timing.p90}%</strong></div>
                    <div style={{ fontSize: 10.5, color: INK2, marginTop: 3 }}>Loss P50 <strong>{usd(e.loss.p50)}</strong> · P90 <strong style={{ color: '#C0392B' }}>{usd(e.loss.p90)}</strong></div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {voice && c.lens && c.lens.narration && <VoiceControls voice={voice} onReplay={() => voice.speak(c.lens.narration)} label="Listen" />}
                    </div>
                  </div>
                </div>
                <button onClick={() => setOpen(isOpen ? null : c.id)} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{isOpen ? '▲ Hide impact & attack path' : '▼ Impact & live attack path'}</button>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${HAIR}`, padding: '12px 14px', background: PANEL, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 4 }}>Impacted business processes</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{procs.length ? procs.map((p, i) => <span key={i} style={{ fontSize: 11, color: '#1e3a5f', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 6, padding: '3px 9px' }}>{p}</span>) : <span style={{ fontSize: 11, color: INK3 }}>{e.crownJewel}</span>}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 4 }}>Impacted applications</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{apps.length ? apps.map((a, i) => <span key={i} style={{ fontSize: 11, color: INK2, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '3px 9px' }}>{a}</span>) : <span style={{ fontSize: 11, color: INK3 }}>Connect the app inventory to map applications.</span>}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 5 }}>Live attack path → crown jewel</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {e.attackPath.map((s, i) => (
                        <React.Fragment key={i}>
                          <span style={{ fontSize: 11, color: INK, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '4px 9px' }}>{s.label}</span>
                          {i < e.attackPath.length - 1 && <span style={{ color: '#C0392B', fontWeight: 800 }}>→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div style={{ fontSize: 10.5, color: INK2, marginTop: 6 }}>Target: <strong>{e.crownJewel}</strong> — {e.dataAtRisk}. A successful chain here is {usd(e.loss.expected)} expected loss ({e.timing.p30}% within 30 days).</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Evidence layer: exploitability-ranked vulnerabilities */}
      <div style={{ border: `1px dashed ${HAIR}`, borderRadius: 11, background: '#fff' }}>
        <button onClick={() => setShowEvidence(!showEvidence)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: INK }}>🔬 Evidence — exploitability-ranked vulnerabilities {evidence && <span style={{ fontSize: 10.5, fontWeight: 600, color: INK3 }}>· {evidence.counts.kev} on CISA KEV · {evidence.counts.highEpss} high-EPSS{evidence.source === 'demo' ? ' · sample' : ''}</span>}</span>
          <span style={{ color: '#1d4ed8', fontSize: 11.5, fontWeight: 700 }}>{showEvidence ? 'Hide' : 'Show'}</span>
        </button>
        {showEvidence && evidence && (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ fontSize: 11, color: INK3, marginBottom: 8 }}>Ranked by real exploit probability (EPSS) and active exploitation (KEV) — the technical evidence under the business risks above.</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr style={{ color: INK3, fontSize: 9.5, textTransform: 'uppercase' }}>
                  {['CVE', 'Vulnerability', 'Asset', 'Sev', 'EPSS', 'KEV', 'Age'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {evidence.vulns.map((v, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${HAIR}` }}>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace', color: INK }}>{v.cve}</td>
                      <td style={{ padding: '7px 8px', color: INK }}>{v.title}</td>
                      <td style={{ padding: '7px 8px', color: INK2 }}>{v.asset}</td>
                      <td style={{ padding: '7px 8px' }}><Pill text={v.severity} color={SEV[v.severity] || INK3} /></td>
                      <td style={{ padding: '7px 8px', fontWeight: 700, color: (v.epss || 0) >= 50 ? '#C0392B' : INK }}>{v.epss != null ? `${v.epss}%` : '—'}</td>
                      <td style={{ padding: '7px 8px' }}>{v.kev ? <Pill text="KEV" color="#C0392B" /> : <span style={{ color: INK3 }}>—</span>}</td>
                      <td style={{ padding: '7px 8px', color: INK2 }}>{v.ageDays != null ? `${v.ageDays}d` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Best-effort impacted processes/apps from the attack-path graph, matched to the
// risk's crown jewel / affected system.
function procsForRisk(graph, e) {
  if (!graph || !graph.layers) return [];
  const proc = (graph.layers.find((l) => l.id === 'process') || {}).nodes || [];
  const want = `${e.crownJewel || ''} ${e.affectedSystem || ''}`.toLowerCase();
  const hits = proc.filter((p) => want.includes(String(p.label || '').toLowerCase()) || String(p.label || '').toLowerCase().includes((e.crownJewel || '').toLowerCase())).map((p) => p.label);
  return hits.length ? [...new Set(hits)] : (e.crownJewel ? [e.crownJewel] : []);
}
function appsForRisk(graph, e) {
  if (!graph || !graph.layers) return [];
  const apps = (graph.layers.find((l) => l.id === 'app') || {}).nodes || [];
  const procs = procsForRisk(graph, e).map((p) => p.toLowerCase());
  const hits = apps.filter((a) => (a.procs || []).some((pid) => procs.some((p) => String(pid).toLowerCase().includes(p)))).map((a) => a.label);
  return [...new Set(hits)].slice(0, 8);
}

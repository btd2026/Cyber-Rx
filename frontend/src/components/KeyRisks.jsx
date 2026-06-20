/**
 * KeyRisks — CISO Key Risks hero. Business risks ABOVE APPETITE (configurable),
 * each with owner, status, scenario type, a business explanation and its own
 * trajectory; click to drill into impacted processes, impacted applications, and
 * the live attack path (entry → steps → crown-jewel target with business
 * context). Exploitability-ranked vulnerabilities sit BENEATH as the evidence
 * layer. Projections & Decisions live in the adjacent sub-tab (DecisionQueue).
 */

import React, { useState, useEffect, useCallback } from 'react';
import Provenance from './Provenance';
import { useAgentVoice, VoiceControls } from './agentVoice';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };
const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const SCEN = { Ransomware: '#cf222e', 'Data exfiltration': '#7c3aed', Fraud: '#c2410c', 'Business disruption': '#4f5ac4' };
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
// Refined, low-noise status chip: tinted background + colored text (premium feel).
const SoftChip = ({ text, color }) => <span style={{ fontSize: 10, fontWeight: 700, color, background: color + '14', border: `1px solid ${color}33`, borderRadius: 6, padding: '2px 9px', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{text}</span>;
// Compact labelled metric used in the right-hand stat panel.
const Stat = ({ k, v, accent }) => <div style={{ minWidth: 0 }}><div style={{ fontSize: 9, color: INK3, fontWeight: 600 }}>{k}</div><div style={{ fontSize: 13.5, fontWeight: 700, color: accent || INK, lineHeight: 1.2, marginTop: 1, fontFamily: FONTS.mono }}>{v}</div></div>;
// Drop the leading quoted echo of the title that the lens narrative prepends.
function cleanNarrative(n) {
  if (!n) return '';
  const s = String(n).trim();
  const i = s.indexOf(' — ');
  return (i !== -1 && /^["“']/.test(s)) ? s.slice(i + 3).trim() : s;
}

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
  const [crq, setCrq] = useState(null); // { id, title, loss }
  const [method, setMethod] = useState(null);
  const [aform, setAform] = useState({});
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  const reloadCards = useCallback(() => { fetch(`${api}/api/decisions?role=${role}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setCards(d.cards || [])).catch(() => {}); }, [api, orgId, headers]);
  function openCrq(c) {
    setCrq({ id: c.id, title: c.event.title, loss: c.event.loss || {}, prov: c.event.provenance });
    setAform({});
    if (!method) fetch(`${api}/api/decisions/methodology?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setMethod(d)).catch(() => {});
  }
  function saveCrq() {
    fetch(`${api}/api/decisions/assumptions`, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, cardId: crq.id, ...aform }) })
      .then((r) => r.json()).then(() => { setCrq(null); reloadCards(); }).catch(() => {});
  }

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
            <div key={c.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `3px solid ${SEV[e.severity]}`, borderRadius: 12, background: '#fff', boxShadow: '0 1px 2px rgba(11, 12, 14,0.04)' }}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 9 }}>
                      <SoftChip text={e.severity} color={SEV[e.severity]} />
                      <SoftChip text={e.scenarioType} color={SCEN[e.scenarioType] || INK3} />
                      {c.decision && <SoftChip text={c.decision.action === 'accept' ? 'Accepted' : 'In treatment'} color={TONE.good} />}
                    </div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: INK, lineHeight: 1.35, fontFamily: FONTS.display }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: INK2, marginTop: 7, lineHeight: 1.6, maxWidth: 660 }}>{cleanNarrative(c.lens && c.lens.narrative)}</div>
                    <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 11, color: INK3, marginTop: 12 }}>
                      <span>Owner&nbsp;&nbsp;<strong style={{ color: INK2 }}>{e.owner || 'CISO'}</strong></span>
                      <span>Status&nbsp;&nbsp;<strong style={{ color: INK2, textTransform: 'capitalize' }}>{c.decision ? (c.decision.action === 'accept' ? 'Accepted & monitoring' : 'In treatment') : 'Open'}</strong></span>
                    </div>
                  </div>
                  <div style={{ minWidth: 196, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 10, padding: '11px 13px' }}>
                    <div style={{ fontSize: 9, color: INK3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>{e.provenance && <Provenance prov={e.provenance} />}Exploit likelihood &amp; loss</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      <Stat k="7 days" v={`${e.timing.p7}%`} />
                      <Stat k="30 days" v={`${e.timing.p30}%`} accent={SEV[e.severity]} />
                      <Stat k="90 days" v={`${e.timing.p90}%`} />
                    </div>
                    {e.timing.confidence && (
                      <div title={e.timing.basis || ''} style={{ fontSize: 9.5, color: INK3, marginTop: 6, cursor: e.timing.basis ? 'help' : 'default' }}>
                        {(e.timing.cves && e.timing.cves.length) ? 'Live exploit signal' : 'Modeled'} · {e.timing.confidence} confidence
                      </div>
                    )}
                    <button onClick={() => openCrq(c)} style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, fontSize: 9.5, color: '#4f5ac4', fontWeight: 700, cursor: 'pointer' }}>ⓘ How this is calculated</button>
                    <div style={{ borderTop: `1px solid ${HAIR}`, margin: '10px 0' }} />
                    <div style={{ fontSize: 9, color: INK3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Modeled loss</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      <Stat k="Expected" v={usd(e.loss.expected)} />
                      <Stat k="Severe (P90)" v={usd(e.loss.p90)} accent={TONE.bad} />
                    </div>
                    {voice && c.lens && c.lens.narration && (
                      <div style={{ marginTop: 11, display: 'flex', justifyContent: 'flex-end' }}>
                        <VoiceControls voice={voice} compact onReplay={() => voice.speak(c.lens.narration)} />
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setOpen(isOpen ? null : c.id)} style={{ marginTop: 12, background: 'transparent', border: 'none', color: '#4f5ac4', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{isOpen ? '▲ Hide impact & attack path' : '▼ Impact & live attack path'}</button>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${HAIR}`, padding: '12px 14px', background: PANEL, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 4 }}>Impacted business processes</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{procs.length ? procs.map((p, i) => <span key={i} style={{ fontSize: 11, color: '#1c1f26', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 6, padding: '3px 9px' }}>{p}</span>) : <span style={{ fontSize: 11, color: INK3 }}>{e.crownJewel}</span>}</div>
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
                          {i < e.attackPath.length - 1 && <span style={{ color: '#cf222e', fontWeight: 800 }}>→</span>}
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
          <span style={{ fontSize: 12.5, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>🔬 Evidence — exploitability-ranked vulnerabilities {evidence && <span style={{ fontSize: 10.5, fontWeight: 600, color: INK3, fontFamily: FONTS.body }}>· {evidence.counts.kev} on CISA KEV · {evidence.counts.highEpss} high-EPSS{evidence.source === 'demo' ? ' · sample' : ''}</span>}</span>
          <span style={{ color: '#4f5ac4', fontSize: 11.5, fontWeight: 700 }}>{showEvidence ? 'Hide' : 'Show'}</span>
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
                      <td style={{ padding: '7px 8px', fontWeight: 700, color: (v.epss || 0) >= 50 ? TONE.bad : INK, fontFamily: FONTS.mono }}>{v.epss != null ? `${v.epss}%` : '—'}</td>
                      <td style={{ padding: '7px 8px' }}>{v.kev ? <Pill text="KEV" color={TONE.bad} /> : <span style={{ color: INK3 }}>—</span>}</td>
                      <td style={{ padding: '7px 8px', color: INK2 }}>{v.ageDays != null ? `${v.ageDays}d` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {crq && (
        <div onClick={() => setCrq(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(11, 12, 14,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '48px 16px', overflowY: 'auto' }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(560px, 96vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>How this loss is calculated</h3>
              <button onClick={() => setCrq(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: INK3, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 11.5, color: INK2, marginTop: 4 }}>{crq.title}</div>

            {/* distribution */}
            <div style={{ display: 'flex', gap: 14, marginTop: 14, padding: '12px 0', borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}`, flexWrap: 'wrap' }}>
              {[['Expected', crq.loss.expected], ['P10', crq.loss.p10], ['P50 (median)', crq.loss.p50], ['P90', crq.loss.p90], ['Worst case', crq.loss.worstCase]].map(([k, v]) => (
                <div key={k} style={{ minWidth: 84 }}>
                  <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: k === 'Worst case' ? TONE.bad : INK, fontFamily: FONTS.mono }}>{usd(v)}</div>
                </div>
              ))}
            </div>

            {/* methodology */}
            {method && (
              <div style={{ fontSize: 11.5, color: INK2, lineHeight: 1.55, marginTop: 12 }}>
                <div><strong style={{ color: INK }}>Model.</strong> {method.model}</div>
                <div style={{ marginTop: 4 }}><strong style={{ color: INK }}>Frequency (LEF).</strong> {method.frequency}</div>
                <div style={{ marginTop: 4 }}><strong style={{ color: INK }}>Magnitude (LM).</strong> {method.magnitude}</div>
                <div style={{ marginTop: 4 }}><strong style={{ color: INK }}>Method.</strong> {method.method}</div>
                <div style={{ marginTop: 4, color: INK3 }}>Sources: {(method.dataSources || []).join(' · ')}</div>
              </div>
            )}

            {/* tunable assumptions */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: INK, marginBottom: 7 }}>Tune assumptions for this risk</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['exposure', 'Asset value / exposure ($)'], ['freq', 'Annual likelihood (%)'], ['spreadLo', 'Magnitude low (×, e.g. 0.3)'], ['spreadHi', 'Magnitude high (×, e.g. 2.2)']].map(([k, ph]) => (
                  <input key={k} type="number" placeholder={ph} value={aform[k] == null ? '' : aform[k]} onChange={(ev) => setAform(Object.assign({}, aform, { [k]: ev.target.value }))}
                    style={{ border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <button onClick={saveCrq} style={{ background: '#5e6ad2', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save &amp; recompute</button>
                <span style={{ fontSize: 10.5, color: INK3 }}>Recomputes the loss distribution and marks it user-tuned.</span>
              </div>
            </div>
          </div>
        </div>
      )}
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

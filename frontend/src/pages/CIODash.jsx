/**
 * CIO Dashboard Page
 *
 * Chief Information Officer technology-risk dashboard. Answers the CIO's
 * question: "Are my security investments reducing operational risk — or just
 * adding more tools?" by mapping technology assets and dependencies to the
 * crown-jewel business processes they support.
 *
 * Sections:
 *  - AI agent brief (continuous, role-specific)
 *  - Technology risk score + KPI strip
 *  - Crown-jewel systems / business processes at risk (with $ exposure)
 *  - Asset inventory (criticality, vulns, patch %, support status)
 *  - Vulnerability & patch posture
 *  - Control effectiveness by framework
 *  - End-of-life / unsupported technology
 *  - Attack pathways mapped to systems
 *  - Remediation backlog (cost + overdue)
 *
 * Data: GET /api/cio/overview (demo posture — X-Org-Id / org_id, optional JWT)
 * Route: /cio
 */

import React, { useState, useEffect, useCallback } from 'react';
import ExecutiveAgentBrief from '../components/ExecutiveAgentBrief';
import DashNav from '../components/DashNav';
import ResolutionPanel from '../components/ResolutionPanel';

const fmtUSD = (v) => {
  const x = Number(v) || 0;
  if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`;
  if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e3) return `$${(x / 1e3).toFixed(0)}K`;
  return `$${x}`;
};

const SEV = {
  Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a',
};
const sevColor = (s) => SEV[s] || '#6b7280';

const card = { backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' };
const sectionHead = { padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const h2 = { fontSize: '1rem', fontWeight: 600, margin: 0, color: '#111827' };
const th = { padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' };
const td = { padding: '0.75rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6' };
const pill = (bg, color) => ({ padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, backgroundColor: bg, color });

const CIODash = (props) => {
  const { goBack, authToken, orgId, api_url } = props;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [crownJewelFilter, setCrownJewelFilter] = useState(
    () => new URLSearchParams(window.location.search).get('crown_jewel') === 'true'
  );
  // Agent-driven view: page opens with just the agent; a question reveals the
  // section(s) that answer it.
  const [cioView, setCioView] = useState(null);
  const [cioQ, setCioQ] = useState('');
  const applyAgentAnswer = useCallback((ans) => {
    if (!ans || !ans.matched || ans.source === 'out_of_scope') return;
    const q = String(ans.matchedQuestion || ans.question || '').toLowerCase();
    setCioQ(ans.matchedQuestion || ans.question || '');
    const v = /end.?of.?life|unsupported|eol/.test(q) ? 'eol'
      : /patch|vuln|cve/.test(q) ? 'vulns'
      : /overdue|remediat|backlog|task/.test(q) ? 'remediation'
      : /investment|reducing|roi|tool/.test(q) ? 'investments'
      : /crown|process|exposed/.test(q) ? 'crownjewel'
      : 'systems';
    setCioView(v);
  }, []);
  const clearCioView = useCallback(() => { setCioView(null); setCioQ(''); }, []);

  const ctx = useCallback(() => {
    const token = authToken || localStorage.getItem('authToken') || '';
    const organizationId = orgId || localStorage.getItem('cyberrx_org_id') || localStorage.getItem('orgId') || '';
    const apiUrl = api_url || import.meta.env?.VITE_API_URL || ((typeof window!=='undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
    return { token, organizationId, apiUrl };
  }, [authToken, orgId, api_url]);

  useEffect(() => {
    const { token, organizationId, apiUrl } = ctx();
    setLoading(true);
    setError(null);
    const headers = { 'X-Org-Id': organizationId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Don't let a slow/unreachable backend hang the page forever (the agent
    // and the rest of the dashboard render regardless).
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    fetch(`${apiUrl}/api/cio/overview?org_id=${encodeURIComponent(organizationId)}`, { headers, signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => setData(d))
      .catch((e) => setError(e.name === 'AbortError' ? 'Technology-risk data timed out' : e.message))
      .finally(() => { clearTimeout(timer); setLoading(false); });
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [ctx]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (crownJewelFilter) params.set('crown_jewel', 'true'); else params.delete('crown_jewel');
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [crownJewelFilter]);

  // Note: we no longer block the whole page on the data fetch — the agent panel
  // and dashboard render immediately; live data fills in when it arrives.
  const k = (data && data.kpis) || {};
  const risk = (data && data.techRiskScore) || { score: 0, grade: 'Healthy' };
  const assets = (data && data.assets) || [];
  const filteredAssets = crownJewelFilter ? assets.filter((a) => a.crownJewel) : assets;
  const processesAtRisk = (data && data.processesAtRisk) || [];
  const controlPosture = (data && data.controlPosture) || { byFramework: [] };
  const vulns = (data && data.vulnerabilities) || { topAssets: [] };
  const patch = (data && data.patchPosture) || { worst: [] };
  const eol = (data && data.eolSystems) || [];
  const backlog = (data && data.remediationBacklog) || [];
  const threats = (data && data.threatsToSystems) || [];

  const gradeColor = { Critical: '#dc2626', Elevated: '#ea580c', Moderate: '#ca8a04', Healthy: '#16a34a' }[risk.grade] || '#6b7280';

  // Which sections answer the current question, and the figure that leads the view.
  const show = (...vs) => vs.includes(cioView);
  const procExposure = processesAtRisk.reduce((s, p) => s + (Number(p.exposure) || 0), 0);
  const cioViewMeta = () => {
    if (cioView === 'eol') return { title: 'End-of-Life Technology', num: String(eol.length), unit: '', color: '#ca8a04', label: 'Unsupported systems in the estate', sub: `${eol.filter((a) => a.criticality === 'Critical').length} on crown-jewel processes` };
    if (cioView === 'vulns') return { title: 'Vulnerability & Patch Posture', num: String(k.criticalVulns ?? 0), unit: '', color: '#dc2626', label: 'Critical vulnerabilities open', sub: `${k.highVulns ?? 0} high · ${patch.avgPatch ?? 0}% avg patch SLA` };
    if (cioView === 'remediation') return { title: 'Remediation Backlog', num: String(k.overdueTasks ?? 0), unit: '', color: (k.overdueTasks ?? 0) > 0 ? '#dc2626' : '#16a34a', label: 'Overdue remediation tasks', sub: `${k.openTasks ?? 0} open · ${fmtUSD(backlog.reduce((s, t) => s + (Number(t.estimatedCost) || 0), 0))} estimated cost` };
    if (cioView === 'investments') return { title: 'Investments vs Operational Risk', num: String(risk.score), unit: '/100', color: gradeColor, label: `Technology risk score — ${risk.grade}`, sub: `${k.controlEffectiveness ?? 0}% control effectiveness across the estate` };
    return { title: cioView === 'crownjewel' ? 'Crown-Jewel Processes Exposed' : 'Systems Most At Risk', num: String(processesAtRisk.length), unit: '', color: '#dc2626', label: 'Crown-jewel processes carrying open risk', sub: `${fmtUSD(procExposure)} exposure · ${k.criticalRisks ?? 0} critical risks` };
  };

  const Kpi = ({ label, value, color, sub }) => (
    <div style={{ ...card, padding: '1rem' }}>
      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color || '#111827' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <DashNav current="cio" go={props.go} />
      <ResolutionPanel authToken={authToken} orgId={orgId} api_url={api_url} />
      {/* Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>Technology Risk Protection Dashboard</h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
              YOUR part of cyber responsibility — mapping systems and vulnerabilities to the crown-jewel processes they support
            </p>
          </div>
          {goBack && (
            <button onClick={goBack} style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>← Back</button>
          )}
        </div>
      </div>

      {/* AI agent brief — page opens here; a question reveals the relevant section(s) */}
      <ExecutiveAgentBrief role="CIO" entry onAnswer={applyAgentAnswer} onGeneral={() => { setCioQ('General dashboard'); setCioView('systems'); }} authToken={authToken} orgId={orgId} api_url={api_url} />

      {loading && !error && (
        <div style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0.5rem 0 1rem' }}>● Loading live technology-risk data…</div>
      )}

      {error && (
        <div style={{ ...card, padding: '1rem', marginBottom: '1.5rem', borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.85rem' }}>
          Could not load technology-risk data: {error}. Showing whatever is available.
        </div>
      )}

      {/* Answer hero — mirrors the asked question */}
      {cioView && (() => {
        const h = cioViewMeta();
        return (
          <div style={{ ...card, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: `5px solid ${h.color}` }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: h.color, lineHeight: 1, flexShrink: 0 }}>
              {h.num}<span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 600 }}>{h.unit}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Chief Information Officer — {h.title}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{h.label}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>{cioQ ? `Answering: “${cioQ}” · ` : ''}{h.sub}</div>
            </div>
            <button onClick={clearCioView} style={{ padding: '0.5rem 0.85rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}>← Ask another</button>
          </div>
        );
      })()}

      {/* Technology Risk Score banner */}
      {show('investments') && (
      <div style={{ ...card, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `5px solid ${gradeColor}` }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Technology Risk Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: 4 }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: gradeColor }}>{risk.score}</span>
            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>/ 100</span>
            <span style={pill(`${gradeColor}1a`, gradeColor)}>{risk.grade}</span>
          </div>
        </div>
        <div style={{ flex: 1, marginLeft: '2rem', maxWidth: 420 }}>
          <div style={{ height: 10, borderRadius: 6, backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
            <div style={{ width: `${risk.score}%`, height: '100%', backgroundColor: gradeColor }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 6 }}>
            Composite of critical risks, EoL systems, overdue remediation, unpatched assets, and control gaps.
          </div>
        </div>
      </div>
      )}

      {/* KPI Strip */}
      {show('investments') && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <Kpi label="Total Assets" value={k.totalAssets ?? 0} />
        <Kpi label="Crown Jewels" value={k.crownJewels ?? 0} color="#dc2626" />
        <Kpi label="Open Risks" value={k.openRisks ?? 0} color="#ea580c" sub={`${k.criticalRisks ?? 0} critical`} />
        <Kpi label="EoL Systems" value={k.eolSystems ?? 0} color="#ca8a04" />
        <Kpi label="Critical Vulns" value={k.criticalVulns ?? 0} color="#dc2626" sub={`${k.highVulns ?? 0} high`} />
        <Kpi label="Avg Patch SLA" value={`${k.avgPatch ?? 0}%`} color={(k.avgPatch ?? 0) >= 85 ? '#16a34a' : '#ca8a04'} />
        <Kpi label="Control Effectiveness" value={`${k.controlEffectiveness ?? 0}%`} color={(k.controlEffectiveness ?? 0) >= 75 ? '#16a34a' : '#ca8a04'} />
        <Kpi label="Overdue Tasks" value={k.overdueTasks ?? 0} color={(k.overdueTasks ?? 0) > 0 ? '#dc2626' : '#16a34a'} sub={`${k.openTasks ?? 0} open`} />
      </div>
      )}

      {/* Systems / Business Processes at risk */}
      {show('systems', 'crownjewel') && (
      <section style={{ ...card, marginBottom: '1.5rem' }}>
        <div style={sectionHead}><h2 style={h2}>Crown-Jewel Systems at Risk</h2><span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{processesAtRisk.length} processes with open risk</span></div>
        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {processesAtRisk.length === 0 && <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No business processes currently carrying open risk.</div>}
          {processesAtRisk.map((p) => (
            <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.85rem', borderTop: `3px solid ${sevColor(p.criticality)}` }}>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{p.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', margin: '2px 0 8px' }}>{p.tier} • Owner: {p.owner}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={pill(`${sevColor(p.criticality)}1a`, sevColor(p.criticality))}>{p.criticality}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{fmtUSD(p.exposure)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{p.openRisks} open risk(s)</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Two-column: Vulnerability posture + Control effectiveness */}
      {show('vulns', 'investments') && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {show('vulns') && (
        <section style={card}>
          <div style={sectionHead}><h2 style={h2}>Vulnerability & Patch Posture</h2></div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: 8 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{vulns.critical ?? 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#991b1b' }}>Critical vulns</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: 8 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ea580c' }}>{vulns.high ?? 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#9a3412' }}>High vulns</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: 8 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (patch.avgPatch ?? 0) >= 85 ? '#16a34a' : '#ca8a04' }}>{patch.avgPatch ?? 0}%</div>
                <div style={{ fontSize: '0.7rem', color: '#166534' }}>Avg patch SLA</div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 6 }}>Most exposed assets</div>
            {(vulns.topAssets || []).map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.8rem' }}>
                <span style={{ color: '#374151' }}>{a.name}</span>
                <span style={{ color: '#6b7280' }}>{a.vulnCritical}C / {a.vulnHigh}H · {a.patchPct ?? '—'}% patched</span>
              </div>
            ))}
            {(vulns.topAssets || []).length === 0 && <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>No outstanding vulnerabilities.</div>}
          </div>
        </section>
        )}

        {show('investments') && (
        <section style={card}>
          <div style={sectionHead}><h2 style={h2}>Control Effectiveness</h2><span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{controlPosture.implemented}/{controlPosture.total} implemented</span></div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.72rem' }}>
              <span style={pill('#dcfce7', '#166534')}>{controlPosture.implemented} Implemented</span>
              <span style={pill('#fef9c3', '#854d0e')}>{controlPosture.partial} Partial</span>
              <span style={pill('#e0e7ff', '#3730a3')}>{controlPosture.planned} Planned</span>
              <span style={pill('#fecaca', '#991b1b')}>{controlPosture.none} None</span>
            </div>
            {(controlPosture.byFramework || []).map((f) => (
              <div key={f.framework} style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{f.framework}</span>
                  <span style={{ color: '#6b7280' }}>{f.avgEffectiveness}% · {f.count} controls</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                  <div style={{ width: `${f.avgEffectiveness}%`, height: '100%', backgroundColor: f.avgEffectiveness >= 75 ? '#16a34a' : f.avgEffectiveness >= 50 ? '#ca8a04' : '#dc2626' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        )}
      </div>
      )}

      {/* Asset Inventory */}
      {show('systems', 'crownjewel', 'vulns') && (
      <section style={{ ...card, marginBottom: '1.5rem' }}>
        <div style={sectionHead}>
          <h2 style={h2}>Asset Inventory</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', color: '#374151' }}>
            <input type="checkbox" checked={crownJewelFilter} onChange={(e) => setCrownJewelFilter(e.target.checked)} style={{ cursor: 'pointer' }} />
            Crown jewels only ({filteredAssets.length})
          </label>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={th}>Asset</th><th style={th}>Type</th><th style={th}>Supports</th>
                <th style={th}>Criticality</th><th style={th}>Vulns</th><th style={th}>Patch</th><th style={th}>Support</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((a) => (
                <tr key={a.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{a.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{a.hostname} · {a.owner}{a.crownJewel ? '' : ''}</div>
                  </td>
                  <td style={td}>{a.type}</td>
                  <td style={{ ...td, fontSize: '0.78rem', color: '#6b7280' }}>{(a.processNames || []).join(', ') || '—'}</td>
                  <td style={td}><span style={pill(`${sevColor(a.criticality)}1a`, sevColor(a.criticality))}>{a.criticality || '—'}</span>{a.crownJewel && <span style={{ ...pill('#fef3c7', '#92400e'), marginLeft: 4 }}>★</span>}</td>
                  <td style={td}>
                    {a.vulnCritical > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>{a.vulnCritical}C </span>}
                    {a.vulnHigh > 0 && <span style={{ color: '#ea580c', fontWeight: 600 }}>{a.vulnHigh}H</span>}
                    {a.vulnCritical === 0 && a.vulnHigh === 0 && <span style={{ color: '#16a34a' }}>clean</span>}
                  </td>
                  <td style={td}>
                    <span style={{ color: a.patchPct == null ? '#9ca3af' : a.patchPct >= 85 ? '#16a34a' : a.patchPct >= 60 ? '#ca8a04' : '#dc2626', fontWeight: 600 }}>
                      {a.patchPct == null ? '—' : `${a.patchPct}%`}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={pill(a.supported ? '#dcfce7' : '#fecaca', a.supported ? '#166534' : '#991b1b')}>{a.supported ? 'Supported' : 'End-of-Life'}</span>
                    {!a.supported && a.endOfSupportDate && <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: 2 }}>EoL {new Date(a.endOfSupportDate).toLocaleDateString()}</div>}
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#6b7280' }} colSpan={7}>No assets in inventory.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* End-of-Life technology + Attack pathways */}
      {show('eol', 'systems', 'crownjewel') && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {show('eol') && (
        <section style={card}>
          <div style={sectionHead}><h2 style={h2}>End-of-Life / Unsupported Technology</h2><span style={{ fontSize: '0.75rem', color: eol.length ? '#dc2626' : '#16a34a' }}>{eol.length} system(s)</span></div>
          <div style={{ padding: '1rem' }}>
            {eol.length === 0 && <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No unsupported technology detected.</div>}
            {eol.map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontWeight: 500, color: '#111827', fontSize: '0.85rem' }}>{a.name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{a.type} · supports {(a.processNames || []).join(', ') || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={pill(`${sevColor(a.criticality)}1a`, sevColor(a.criticality))}>{a.criticality}</span>
                  {a.endOfSupportDate && <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: 2 }}>EoL {new Date(a.endOfSupportDate).toLocaleDateString()}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {show('systems', 'crownjewel') && (
        <section style={card}>
          <div style={sectionHead}><h2 style={h2}>Attack Pathways → Systems</h2></div>
          <div style={{ padding: '1rem' }}>
            {threats.length === 0 && <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No active threat scenarios mapped.</div>}
            {threats.map((t) => (
              <div key={t.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500, color: '#111827', fontSize: '0.85rem' }}>{t.name}</span>
                  <span style={pill(`${sevColor(t.impact)}1a`, sevColor(t.impact))}>{t.probability}% · {t.impact}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 3 }}>
                  {t.type} → {(t.systems || []).join(', ') || 'no mapped systems'}
                </div>
              </div>
            ))}
          </div>
        </section>
        )}
      </div>
      )}

      {/* Remediation Backlog */}
      {show('remediation') && (
      <section style={{ ...card, marginBottom: '1.5rem' }}>
        <div style={sectionHead}>
          <h2 style={h2}>Remediation Backlog</h2>
          <button onClick={() => props.go && props.go('execution')} style={{ padding: '0.375rem 0.75rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>View All Tasks</button>
        </div>
        <div style={{ padding: '1rem' }}>
          {backlog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No open remediation items</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {backlog.map((t) => (
                <div key={t.id} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${sevColor(t.priority)}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#111827', fontSize: '0.85rem' }}>
                      {t.title}
                      {t.overdue && <span style={{ ...pill('#fecaca', '#991b1b'), marginLeft: 8 }}>OVERDUE</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>
                      {t.assignedTeam}{t.targetDate && ` • Due ${new Date(t.targetDate).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={pill(`${sevColor(t.priority)}1a`, sevColor(t.priority))}>{t.priority}</span>
                    <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>{t.status}</span>
                    {t.estimatedCost > 0 && (
                      <div style={{ textAlign: 'right', minWidth: 70 }}>
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Est. cost</div>
                        <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>{fmtUSD(t.estimatedCost)}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* Footer */}
      {cioView && (
      <div style={{ ...card, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Technology Risk Summary — Board-ready export</div>
        <button onClick={() => window.print()} style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}>Export PDF</button>
      </div>
      )}
    </div>
  );
};

export default CIODash;

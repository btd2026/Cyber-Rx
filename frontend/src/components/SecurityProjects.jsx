/**
 * SecurityProjects — current cybersecurity projects/portfolio with ROI and
 * delay-impact projections. Leaders import their project inventory (file) or
 * pull from Jira, and CyberRX projects how each project's milestones and any
 * delays move the overall security posture and dollar exposure.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const statusTone = (s) => (/hold|block|delay|behind|risk/i.test(s || '') ? 'bad' : /done|complete|operational/i.test(s || '') ? 'good' : 'warn');

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const Pill = ({ text, tone }) => (
  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: TONE[tone] || INK3, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{text}</span>
);

// Supported read-only project-system connectors and the credentials each needs.
// All post to /api/projects/connect/:key. Tools without API access can still use
// the CSV/Excel "Import inventory" path.
const TOOLS = [
  { key: 'jira', label: 'Jira', fields: [['baseUrl', 'Base URL (https://yourco.atlassian.net)'], ['email', 'Account email'], ['apiToken', 'API token', 'password'], ['jql', 'JQL (optional — defaults to Epics/Initiatives)', 'text', 'full']] },
  { key: 'azure_devops', label: 'Azure DevOps', fields: [['organization', 'Organization'], ['project', 'Project'], ['pat', 'Personal access token (PAT)', 'password'], ['wiql', 'WIQL (optional — defaults to Epics/Features)', 'text', 'full']] },
  { key: 'servicenow', label: 'ServiceNow', fields: [['instanceUrl', 'Instance URL (https://yourco.service-now.com)'], ['username', 'Username'], ['password', 'Password / token', 'password'], ['query', 'Encoded query (optional)', 'text', 'full']] },
  { key: 'asana', label: 'Asana', fields: [['accessToken', 'Personal access token', 'password'], ['workspaceGid', 'Workspace GID (optional)']] },
  { key: 'monday', label: 'monday.com', fields: [['apiToken', 'API token', 'password'], ['boardId', 'Board ID (optional — defaults to all boards)']] },
];

export default function SecurityProjects(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [pf, setPf] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(false); // connector panel open
  const [tool, setTool] = useState('jira');
  const [creds, setCreds] = useState({});
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    fetch(`${api}/api/projects/portfolio?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setPf(d); }).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

  function upload(file) {
    if (!file) return;
    setBusy(true); setErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || '').split(',').pop();
      fetch(`${api}/api/projects/upload`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, fileName: file.name, contentBase64: b64 }) })
        .then((r) => r.json()).then((res) => { if (res.error) setErr(res.error); else load(); }).catch((e) => setErr(e.message)).finally(() => setBusy(false));
    };
    reader.readAsDataURL(file);
  }

  function importConnector() {
    setBusy(true); setErr(null);
    fetch(`${api}/api/projects/connect/${tool}`, { method: 'POST', headers: headers(), body: JSON.stringify(Object.assign({ org_id: orgId }, creds)) })
      .then((r) => r.json()).then((res) => { if (res.error) setErr(res.error); else { setMode(false); load(); } }).catch((e) => setErr(e.message)).finally(() => setBusy(false));
  }

  return (
    <div>
      {/* intake bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: INK2, maxWidth: 620, lineHeight: 1.5 }}>
          Import your current cybersecurity projects to see how milestones and delays move your security posture and dollar exposure.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ background: '#5e6ad2', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Working…' : '⬆ Import inventory'}
            <input type="file" style={{ display: 'none' }} disabled={busy} accept=".csv,.xls,.xlsx,.txt,.pdf,.doc,.docx" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) upload(f); e.target.value = ''; }} />
          </label>
          <button onClick={() => setMode(!mode)} style={{ background: '#fff', color: INK, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>⤵ Connect project tool</button>
        </div>
      </div>

      {err && <div style={{ color: '#cf222e', fontSize: 12, marginBottom: 10 }}>{err}</div>}

      {mode && (() => {
        const spec = TOOLS.find((t) => t.key === tool) || TOOLS[0];
        return (
          <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14, background: PANEL }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 9 }}>Connect a project tool <span style={{ fontWeight: 500, color: INK3 }}>— read-only; we only read project metadata</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 11 }}>
              {TOOLS.map((t) => (
                <button key={t.key} onClick={() => { setTool(t.key); setCreds({}); setErr(null); }}
                  style={{ background: t.key === tool ? '#0b0c0e' : '#fff', color: t.key === tool ? '#fff' : INK2, border: `1px solid ${t.key === tool ? '#0b0c0e' : HAIR}`, borderRadius: 999, padding: '5px 13px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{t.label}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {spec.fields.map(([k, ph, type, span]) => (
                <input key={k} type={type === 'password' ? 'password' : 'text'} placeholder={ph} value={creds[k] || ''} onChange={(e) => setCreds(Object.assign({}, creds, { [k]: e.target.value }))}
                  style={{ border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none', gridColumn: span === 'full' ? '1 / span 2' : 'auto' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={importConnector} disabled={busy} style={{ background: '#5e6ad2', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Importing…' : `Import from ${spec.label}`}</button>
              <span style={{ fontSize: 10.5, color: INK3 }}>Credentials are stored securely. No API access? Use <strong>Import inventory</strong> to upload a CSV/Excel export instead.</span>
            </div>
          </div>
        );
      })()}

      {!pf ? <div style={{ fontSize: 12, color: INK3 }}>Loading portfolio…</div> : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Portfolio</div>
            <VoiceControls voice={voice} onReplay={() => voice.speak(portfolioNarration(pf))} label="Listen" />
          </div>
          {/* portfolio summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10, marginBottom: 12 }}>
            <Kpi label="Active projects" value={`${pf.counts.total}`} sub={`${pf.counts.atRisk} at risk`} tone={pf.counts.atRisk ? 'warn' : 'good'} />
            <Kpi label="Total investment" value={usd(pf.totalBudget)} />
            <Kpi label="Posture lift" value={`+${pf.realizedLift} / +${pf.totalLift}`} sub="realized / predicted" tone="good" />
            <Kpi label="Loss avoided" value={`${usd(pf.realizedExposureReduced)} / ${usd(pf.totalExposureReduced)}`} sub="realized / predicted" tone="good" />
            <Kpi label="Loss avoided per $" value={pf.blendedRoi != null ? `${pf.blendedRoi}×` : '—'} sub={pf.realizedRoi != null ? `${pf.realizedRoi}× realized to date` : 'expected loss avoided per $'} />
          </div>

          {/* engine calibration — how realized accrual tracks the projection */}
          {pf.calibration != null && (
            <div style={{ fontSize: 11, color: INK2, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, lineHeight: 1.5 }}>
              <strong style={{ color: INK }}>Calibration:</strong> realized loss-avoided is tracking at <strong style={{ color: pf.calibration >= 90 ? TONE.good : pf.calibration >= 70 ? TONE.warn : TONE.bad }}>{pf.calibration}%</strong> of the straight-line projection — delivery friction and partial adoption are modeled, so realized benefit lands below a perfect-execution forecast. "Loss avoided per $" is expected loss avoided per dollar spent, not classic financial ROI.
            </div>
          )}

          {/* delay scenario */}
          {pf.delayScenario && pf.delayScenario.projectsAffected > 0 && (
            <div style={{ background: 'linear-gradient(135deg,#fdecea,#fff6f5)', border: '1px solid #f3c9c4', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#cf222e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>⚠️ Delay implication</div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>
                If the {pf.delayScenario.projectsAffected} at-risk project{pf.delayScenario.projectsAffected > 1 ? 's' : ''} each slip {pf.delayScenario.slipDays} days, <strong>+{pf.delayScenario.postureLiftDeferred} posture points are deferred</strong> and <strong style={{ color: '#cf222e' }}>{usd(pf.delayScenario.exposureRetained)}</strong> of exposure stays on the books for the slip window.
              </div>
              {pf.delayScenario.names && pf.delayScenario.names.length > 0 && <div style={{ fontSize: 11, color: INK2, marginTop: 5 }}>At risk: {pf.delayScenario.names.join(' · ')}</div>}
            </div>
          )}

          {/* per-project cards */}
          <div style={{ display: 'grid', gap: 12 }}>
            {pf.projects.map((p) => <ProjectCard key={p.id || p.name} p={p} voice={voice} />)}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? TONE[tone] : '#d7d9de'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
      <div style={{ fontSize: 10.5, color: INK2 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: tone ? TONE[tone] : INK, marginTop: 2, fontFamily: FONTS.mono }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function PvR({ label, realized, predicted, fmt }) {
  const r = Number(realized) || 0, p = Number(predicted) || 0;
  const pct = p > 0 ? Math.min(100, Math.round((r / p) * 100)) : 0;
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: INK2, marginBottom: 2 }}>
        <span>{label}</span>
        <span><strong style={{ color: TONE.good }}>{fmt(r)}</strong> realized <span style={{ color: INK3 }}>/ {fmt(p)} predicted</span></span>
      </div>
      <div style={{ height: 7, background: '#f0f1f4', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,#dbe3ec 0 6px,transparent 6px 12px)' }} />
        <div style={{ width: `${pct}%`, height: '100%', background: TONE.good, position: 'relative', borderRadius: 4 }} />
      </div>
    </div>
  );
}

function portfolioNarration(pf) {
  const ds = pf.delayScenario;
  return `Security project portfolio. ${pf.counts.total} active projects, ${pf.counts.atRisk} at risk. ` +
    `Total investment ${usd(pf.totalBudget)}. Predicted posture lift plus ${pf.totalLift}, with plus ${pf.realizedLift} realized so far. ` +
    `Predicted loss avoided ${usd(pf.totalExposureReduced)}, of which ${usd(pf.realizedExposureReduced)} is realized to date. ` +
    `Expected loss avoided per dollar ${pf.blendedRoi != null ? pf.blendedRoi + ' times' : 'not available'}. ` +
    (pf.calibration != null ? `Realized benefit is tracking at ${pf.calibration} percent of the straight-line projection. ` : '') +
    (ds && ds.projectsAffected ? `If the ${ds.projectsAffected} at-risk projects each slip ${ds.slipDays} days, plus ${ds.postureLiftDeferred} posture points are deferred and ${usd(ds.exposureRetained)} of exposure stays on the books.` : '');
}
function projectNarration(p) {
  const a = p.analysis || {};
  const d60 = (a.delay || []).find((d) => d.days === 60);
  const risks = (a.reducesRisks || []).map((r) => r.title).slice(0, 3);
  return `${p.name}. ${p.status}, ${p.percentComplete || 0} percent complete.${p.budget ? ' Budget ' + usd(p.budget) + '.' : ''} ` +
    (risks.length ? `It reduces ${risks.join(', ')}. ` : '') +
    `Predicted posture lift plus ${a.postureLift}, with plus ${a.realizedLift} realized so far. ` +
    `Predicted loss avoided ${usd(a.exposureReduced)}, ${usd(a.realizedExposureReduced)} realized to date${a.roi != null ? `, expected loss avoided per dollar ${a.roi} times` : ''}. ` +
    `Remaining exposure ${usd(a.remainingExposure)}.` + (d60 ? ` If it slips 60 days, ${usd(d60.exposureRetained)} of exposure stays on the books.` : '');
}
function ProjectCard({ p, voice }) {
  const a = p.analysis || {};
  const ms = a.milestones || [];
  const tone = statusTone(p.status);
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', overflow: 'hidden', boxShadow: '0 1px 2px rgba(11, 12, 14,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderLeft: `5px solid ${TONE[tone]}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>{p.name}</div>
            {voice && <VoiceControls voice={voice} onReplay={() => voice.speak(projectNarration(p))} label="Listen" />}
          </div>
          {p.objective && <div style={{ fontSize: 11, color: INK2, marginTop: 2, lineHeight: 1.45 }}>{p.objective}</div>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: INK3, marginTop: 6 }}>
            {p.owner && <span>Owner <strong style={{ color: INK2 }}>{p.owner}</strong></span>}
            {p.budget ? <span>Budget <strong style={{ color: INK2 }}>{usd(p.budget)}</strong></span> : null}
            {p.targetEnd && <span>Target <strong style={{ color: INK2 }}>{p.targetEnd}</strong></span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Pill text={p.status} tone={tone} />
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 6 }}>{p.percentComplete || 0}% complete</div>
        </div>
      </div>
      {/* progress */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ height: 6, background: '#f0f1f4', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${p.percentComplete || 0}%`, height: '100%', background: TONE[tone] }} /></div>
      </div>
      {/* risks this project reduces */}
      {a.reducesRisks && a.reducesRisks.length > 0 && (
        <div style={{ padding: '4px 16px 0' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Reduces these risks</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {a.reducesRisks.map((r, i) => (
              <span key={i} style={{ fontSize: 10.5, color: '#1c1f26', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 6, padding: '3px 9px' }}>
                {r.title}{r.severity ? <span style={{ color: INK3 }}> · {r.severity}</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* predicted vs realized */}
      <div style={{ padding: '11px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          <span>Predicted vs realized</span>
          <span style={{ textTransform: 'none', fontWeight: 600 }}>loss avoided per $: <strong style={{ color: INK }}>{a.roi != null ? `${a.roi}×` : '—'}</strong> predicted{a.realizedRoi != null ? ` · ${a.realizedRoi}× to date` : ''}</span>
        </div>
        <PvR label="Posture lift" realized={a.realizedLift} predicted={a.postureLift} fmt={(v) => `+${v}`} />
        <PvR label="Loss avoided" realized={a.realizedExposureReduced} predicted={a.exposureReduced} fmt={usd} />
        <div style={{ fontSize: 10.5, color: INK2, marginTop: 6 }}>Remaining (not yet realized) exposure <strong style={{ color: '#cf222e' }}>{usd(a.remainingExposure)}</strong>.</div>
      </div>
      {/* milestone ROI timeline */}
      {ms.length > 0 && (
        <div style={{ padding: '4px 16px 12px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>ROI realized at each milestone</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ms.map((m, i) => (
              <div key={i} style={{ flex: 1, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 10px', background: PANEL }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: INK }}>{m.name}</div>
                <div style={{ fontSize: 9.5, color: INK3, marginTop: 1 }}>{m.percent}% milestone</div>
                <div style={{ fontSize: 11, color: '#1a7f37', marginTop: 5 }}>+{m.postureGain} posture</div>
                <div style={{ fontSize: 11, color: INK2 }}>{usd(m.exposureRemoved)} reduced</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* delay impact */}
      {a.delay && a.delay.length > 0 && (
        <div style={{ padding: '0 16px 13px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>If delayed</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {a.delay.map((d) => (
              <span key={d.days} style={{ fontSize: 10.5, color: INK2, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 999, padding: '3px 10px' }}>
                {d.days}d slip → <strong style={{ color: '#cf222e' }}>{usd(d.exposureRetained)}</strong> exposure retained
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

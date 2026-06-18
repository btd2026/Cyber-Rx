/**
 * SecurityProjects — current cybersecurity projects/portfolio with ROI and
 * delay-impact projections. Leaders import their project inventory (file) or
 * pull from Jira, and CyberRX projects how each project's milestones and any
 * delays move the overall security posture and dollar exposure.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc', NAVY = '#0f1b2d';
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B' };
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

export default function SecurityProjects(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [pf, setPf] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // null | 'jira'
  const [jira, setJira] = useState({ baseUrl: '', email: '', apiToken: '', jql: '' });
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

  function importJira() {
    setBusy(true); setErr(null);
    fetch(`${api}/api/projects/jira/import`, { method: 'POST', headers: headers(), body: JSON.stringify(Object.assign({ org_id: orgId }, jira)) })
      .then((r) => r.json()).then((res) => { if (res.error) setErr(res.error); else { setMode(null); load(); } }).catch((e) => setErr(e.message)).finally(() => setBusy(false));
  }

  return (
    <div>
      {/* intake bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: INK2, maxWidth: 620, lineHeight: 1.5 }}>
          Import your current cybersecurity projects to see how milestones and delays move your security posture and dollar exposure.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Working…' : '⬆ Import inventory'}
            <input type="file" style={{ display: 'none' }} disabled={busy} accept=".csv,.xls,.xlsx,.txt,.pdf,.doc,.docx" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) upload(f); e.target.value = ''; }} />
          </label>
          <button onClick={() => setMode(mode === 'jira' ? null : 'jira')} style={{ background: '#fff', color: INK, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>⤵ Connect Jira</button>
        </div>
      </div>

      {err && <div style={{ color: '#C0392B', fontSize: 12, marginBottom: 10 }}>{err}</div>}

      {mode === 'jira' && (
        <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14, background: PANEL }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 8 }}>Connect Jira (read-only project / portfolio import)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['baseUrl', 'Jira base URL (https://yourco.atlassian.net)'], ['email', 'Account email'], ['apiToken', 'API token'], ['jql', 'JQL (optional — defaults to Epics/Initiatives)']].map(([k, ph]) => (
              <input key={k} type={k === 'apiToken' ? 'password' : 'text'} placeholder={ph} value={jira[k]} onChange={(e) => setJira(Object.assign({}, jira, { [k]: e.target.value }))}
                style={{ border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none', gridColumn: k === 'jql' ? '1 / span 2' : 'auto' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={importJira} disabled={busy} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Importing…' : 'Import from Jira'}</button>
            <span style={{ fontSize: 10.5, color: INK3, alignSelf: 'center' }}>Credentials are stored securely; CyberRX only reads project metadata.</span>
          </div>
        </div>
      )}

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
            <Kpi label="Posture lift (planned)" value={`+${pf.totalLift}`} sub={`+${pf.realizedLift} realized so far`} tone="good" />
            <Kpi label="Exposure reduced" value={usd(pf.totalExposureReduced)} tone="good" />
            <Kpi label="Blended ROI" value={pf.blendedRoi != null ? `${pf.blendedRoi}×` : '—'} sub="exposure removed per $" />
          </div>

          {/* delay scenario */}
          {pf.delayScenario && pf.delayScenario.projectsAffected > 0 && (
            <div style={{ background: 'linear-gradient(135deg,#fdecea,#fff6f5)', border: '1px solid #f3c9c4', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>⚠️ Delay implication</div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>
                If the {pf.delayScenario.projectsAffected} at-risk project{pf.delayScenario.projectsAffected > 1 ? 's' : ''} each slip {pf.delayScenario.slipDays} days, <strong>+{pf.delayScenario.postureLiftDeferred} posture points are deferred</strong> and <strong style={{ color: '#C0392B' }}>{usd(pf.delayScenario.exposureRetained)}</strong> of exposure stays on the books for the slip window.
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
    <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? TONE[tone] : '#cbd5e1'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
      <div style={{ fontSize: 10.5, color: INK2 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: tone ? TONE[tone] : INK, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function portfolioNarration(pf) {
  const ds = pf.delayScenario;
  return `Security project portfolio. ${pf.counts.total} active projects, ${pf.counts.atRisk} at risk. ` +
    `Total investment ${usd(pf.totalBudget)}. Planned posture lift plus ${pf.totalLift}, with plus ${pf.realizedLift} realized so far. ` +
    `Exposure reduced ${usd(pf.totalExposureReduced)}. Blended ROI ${pf.blendedRoi != null ? pf.blendedRoi + ' times' : 'not available'}. ` +
    (ds && ds.projectsAffected ? `If the ${ds.projectsAffected} at-risk projects each slip ${ds.slipDays} days, plus ${ds.postureLiftDeferred} posture points are deferred and ${usd(ds.exposureRetained)} of exposure stays on the books.` : '');
}
function projectNarration(p) {
  const a = p.analysis || {};
  const d60 = (a.delay || []).find((d) => d.days === 60);
  return `${p.name}. ${p.status}, ${p.percentComplete || 0} percent complete.${p.budget ? ' Budget ' + usd(p.budget) + '.' : ''} ` +
    `Posture lift plus ${a.postureLift}, exposure reduced ${usd(a.exposureReduced)}${a.roi != null ? `, ROI ${a.roi} times` : ''}. ` +
    `Remaining exposure ${usd(a.remainingExposure)}.` + (d60 ? ` If it slips 60 days, ${usd(d60.exposureRetained)} of exposure stays on the books.` : '');
}
function ProjectCard({ p, voice }) {
  const a = p.analysis || {};
  const ms = a.milestones || [];
  const tone = statusTone(p.status);
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderLeft: `5px solid ${TONE[tone]}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>{p.name}</div>
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
        <div style={{ height: 6, background: '#eef2f6', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${p.percentComplete || 0}%`, height: '100%', background: TONE[tone] }} /></div>
      </div>
      {/* ROI + lift */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', padding: '11px 16px', fontSize: 11.5, color: INK2 }}>
        <span>Posture lift <strong style={{ color: '#1f8a4c' }}>+{a.postureLift}</strong></span>
        <span>Exposure reduced <strong style={{ color: INK }}>{usd(a.exposureReduced)}</strong></span>
        {a.roi != null && <span>ROI <strong style={{ color: INK }}>{a.roi}×</strong></span>}
        <span>Remaining exposure <strong style={{ color: '#C0392B' }}>{usd(a.remainingExposure)}</strong></span>
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
                <div style={{ fontSize: 11, color: '#1f8a4c', marginTop: 5 }}>+{m.postureGain} posture</div>
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
                {d.days}d slip → <strong style={{ color: '#C0392B' }}>{usd(d.exposureRetained)}</strong> exposure retained
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * IntakeSummary — Intake Step 6: Summary & Confirm. Reviews the validated profile,
 * process hierarchy, and process→application mapping with coverage stats, an overall
 * visibility-confidence indicator, and a "Confirm & Compile" action that emits the
 * validated structures to the compiling phase (business risk → process →
 * application → security system → control) and ends intake.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const visTone = (b) => (/high|strong/i.test(b || '') ? 'good' : /mod/i.test(b || '') ? 'warn' : 'bad');

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl || props.api_url ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function IntakeSummary(props) {
  const { token, orgId, api } = ctx(props);
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  useEffect(() => {
    fetch(`${api}/api/intake/compile/preview?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  function confirm() {
    setBusy(true); setErr('');
    fetch(`${api}/api/intake/compile`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, decidedBy: props.decidedBy || 'intake user' }) })
      .then((r) => r.json()).then((res) => {
        if (res.error) { setErr(res.error); return; }
        if (props.onConfirm) props.onConfirm(res);
      }).catch((e) => setErr(e.message)).finally(() => setBusy(false));
  }

  if (!d) return <div style={{ fontSize: 12, color: INK3, padding: '8px 0' }}>Assembling your intake summary…</div>;
  const cov = d.coverage || {}, vis = d.visibility || {};
  const levels = {};
  (d.processes || []).forEach((p) => { const l = p.level || 'process'; levels[l] = (levels[l] || 0) + 1; });
  const profile = props.profile || {};
  const docs = props.documentCount, sys = props.securitySystemCount;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* visibility hero */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: COLORS.navy1, color: '#e6ecf5', borderRadius: 10, padding: '14px 18px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Overall visibility confidence</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONTS.mono, color: vis.overall >= 70 ? '#34d399' : vis.overall >= 45 ? '#f0a868' : '#f87171' }}>
            {vis.overall != null ? `${vis.overall}%` : '—'} <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{vis.band || ''}</span>
          </div>
          {vis.caveat && <div style={{ fontSize: 11, color: '#9fb2cc', marginTop: 3, maxWidth: 560 }}>{vis.caveat}</div>}
        </div>
        {vis.thin && vis.thin.length > 0 && <div style={{ fontSize: 11, color: '#f0a868' }}>Thin coverage: {vis.thin.join(', ')}</div>}
      </div>

      {/* coverage stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10 }}>
        <Stat label="Processes" value={cov.processes || 0} />
        <Stat label="Applications" value={cov.applications || 0} />
        <Stat label="% mapped" value={`${cov.pctMapped || 0}%`} tone={(cov.pctMapped || 0) >= 70 ? 'good' : (cov.pctMapped || 0) >= 40 ? 'warn' : 'bad'} />
        <Stat label="Validated mappings" value={cov.mappings || 0} />
        <Stat label="Uncovered processes" value={cov.uncoveredProcesses || 0} tone={(cov.uncoveredProcesses || 0) ? 'warn' : 'good'} />
        <Stat label="Orphan apps" value={cov.orphanApps || 0} tone={(cov.orphanApps || 0) ? 'warn' : 'good'} />
      </div>

      {/* section summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Panel title="Profile">
          <Row k="Organization" v={profile.orgName || '—'} />
          <Row k="Type" v={profile.orgType || '—'} />
          {profile.industry && <Row k="Industry" v={profile.industry} />}
        </Panel>
        <Panel title="Process hierarchy (validated)">
          <Row k="Functions" v={levels.function || 0} />
          <Row k="Processes" v={levels.process || 0} />
          <Row k="Sub-processes" v={levels.subprocess || 0} />
        </Panel>
        <Panel title="Documents">
          <Row k="Provided" v={docs != null ? docs : '—'} />
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>Evidence behind manual controls (Step 4).</div>
        </Panel>
        <Panel title="Security systems">
          <Row k="Connected / selected" v={sys != null ? sys : '—'} />
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>Tools that enforce controls (Step 5).</div>
        </Panel>
      </div>

      {/* gaps callout */}
      {((cov.uncoveredProcesses || 0) > 0 || (cov.orphanApps || 0) > 0) && (
        <div style={{ fontSize: 11.5, color: '#7a5b1e', background: '#fbf3df', border: '1px solid #f0dcae', borderRadius: 8, padding: '9px 12px', lineHeight: 1.5 }}>
          <strong>Before compiling:</strong> {cov.uncoveredProcesses || 0} process(es) have no application (coverage holes) and {cov.orphanApps || 0} app(s) are unmapped (orphans). You can compile now and resolve these later, or go back to Step 3 to close them.
          {cov.uncoveredProcessNames && cov.uncoveredProcessNames.length > 0 && <div style={{ marginTop: 3, color: INK2 }}>Uncovered: {cov.uncoveredProcessNames.join(' · ')}</div>}
        </div>
      )}

      {err && <div style={{ color: TONE.bad, fontSize: 12 }}>{err}</div>}

      {/* confirm & compile */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: `1px solid ${HAIR}`, paddingTop: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: INK3, maxWidth: 520, lineHeight: 1.5 }}>
          Confirm to emit the validated structures to the compiling phase — the chain <strong>business risk → process → application → security system → control</strong>, assessed against each framework independently (NIST CSF 2.0, 800-53 r5, CIS, ISO 27001, SOC 2).
        </div>
        <button onClick={confirm} disabled={busy} style={{ background: busy ? '#94a3b8' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 26px', fontSize: 14, fontWeight: 800, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Compiling…' : '✓ Confirm & Compile'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? TONE[tone] : '#cbd5e1'}`, borderRadius: 9, padding: '10px 12px', background: '#fff' }}><div style={{ fontSize: 10.5, color: INK2 }}>{label}</div><div style={{ fontSize: 20, fontWeight: 800, fontFamily: FONTS.mono, color: tone ? TONE[tone] : INK, marginTop: 2 }}>{value}</div></div>;
}
function Panel({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, background: '#fff', padding: '11px 14px' }}><div style={{ fontSize: 12, fontWeight: 800, color: INK, marginBottom: 7, fontFamily: FONTS.display }}>{title}</div>{children}</div>;
}
function Row({ k, v }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: INK2, padding: '2px 0' }}><span>{k}</span><strong style={{ color: INK }}>{v}</strong></div>;
}

/**
 * PersonaDashboard — shared C-suite dashboard shell so CIO / CFO / CRO / CLO /
 * Board open in the SAME format as the CISO view: a posture hero, a sticky tab
 * bar, and role-pertinent tabs (the role agent's "Current State" Q&A, the
 * Executive Summary, Business Risk, a role panel, and the role's detailed
 * dashboard as "Details"). One consistent, professional experience per seat.
 *
 * Hero data is the org's cyber posture (GET /api/ciso/dashboard), framed per role.
 */

import React, { useState, useEffect } from 'react';
import DashNav from './DashNav';
import { useAgentVoice, VoiceControls } from './agentVoice';
import ExecutiveAgentBrief from './ExecutiveAgentBrief';
import ExecutiveSummaryEditor from './ExecutiveSummaryEditor';
import BusinessRiskPanel from './BusinessRiskPanel';
import CfoExposurePanel from './CfoExposurePanel';
import ResolutionPanel from './ResolutionPanel';
import AuditLineagePanel from './AuditLineagePanel';
import CroBoardReport from './CroBoardReport';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc', NAVY = '#0f1b2d';
const band = (s) => (s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical');
const C = { Strong: '#1f8a4c', Moderate: '#B07C2E', Weak: '#A85B2E', Critical: '#C0392B' };
const sc = (s) => C[band(s)];

// Per-role framing + the extra tabs (beyond the common ones).
const ROLES = {
  CIO: { navId: 'cio', tag: 'CIO · Technology Risk', lead: 'One trustworthy picture across your systems — inventory reconciled, posture tied to audit readiness.', panels: [{ id: 'systems', label: 'Systems & Inventory', el: (p) => <ResolutionPanel {...p} /> }] },
  CFO: { navId: 'cfo', tag: 'CFO · Financial Exposure', lead: 'What our security dollars buy down — cyber risk in business-weighted dollars against today’s assessment.', panels: [{ id: 'exposure', label: 'Exposure ($)', el: (p) => <CfoExposurePanel {...p} /> }] },
  CRO: { navId: 'cro', tag: 'CRO · Operational Resilience', lead: 'Cyber tied to operational resilience and risk appetite — RTO bridge and dependency blast-radius.', panels: [{ id: 'boardpack', label: 'Board Pack', el: (p) => <CroBoardReport {...p} /> }] },
  CLO: { navId: 'clo', tag: 'CLO · Oversight & Compliance', lead: 'Provable oversight — one assessment across CSF / 800-53 / CIS with full, audit-ready control lineage.', panels: [{ id: 'lineage', label: 'Audit Lineage', el: (p) => <AuditLineagePanel {...p} /> }] },
  Board: { navId: 'boarddash', tag: 'Board · Executive Risk', lead: 'Enterprise cyber risk in business terms — posture, exposure, and resilience at a glance.', panels: [{ id: 'boardpack', label: 'Board Pack', el: (p) => <CroBoardReport {...p} /> }] },
};

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function PersonaDashboard(props) {
  const role = props.role || 'CIO';
  const cfg = ROLES[role] || ROLES.CIO;
  const { token, orgId, api } = ctx(props);
  const panelProps = { authToken: token, orgId, api_url: api };
  const [tab, setTab] = useState('brief');
  const [d, setD] = useState(null);
  const voice = useAgentVoice();

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/ciso/dashboard?org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {});
  }, [api, orgId, token]);

  const p = d && d.overallPosture;
  const refreshed = d && d.generatedAt ? new Date(d.generatedAt).toLocaleString() : '';

  const TABS = [
    ['brief', 'Current State'],
    ['summary', 'Executive Summary'],
    ['risk', 'Business Risk'],
    ...cfg.panels.map((x) => [x.id, x.label]),
    ['details', 'Details'],
  ];

  return (
    <div style={{ padding: '2rem', background: '#f9fafb', minHeight: '100vh' }}>
      <DashNav current={cfg.navId} go={props.go} />

      {/* Hero — same format as the CISO view, framed for this role */}
      <div style={{ background: NAVY, borderRadius: '8px 8px 0 0', padding: '22px 28px', color: '#fff', marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: p ? (sc(p.current) === '#A85B2E' ? '#f0a868' : sc(p.current)) : '#8fa3bd' }}>{p ? p.current : '—'}</div>
              <div style={{ fontSize: 10, color: '#8fa3bd', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>of 100{p ? ` · ${band(p.current)}` : ''}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#8fa3bd', textTransform: 'uppercase', letterSpacing: '0.16em' }}>{cfg.tag}</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 700 }}>{props.orgName ? props.orgName : 'Enterprise'} cyber posture</h2>
              {p && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5, color: '#cbd5e1', flexWrap: 'wrap' }}>
                  <span>Last period <strong style={{ color: '#fff' }}>{p.previous}</strong></span>
                  <span style={{ color: p.delta >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>{p.delta >= 0 ? '▲ +' : '▼ '}{p.delta} pts</span>
                  <span style={{ textTransform: 'capitalize' }}>{p.trend}</span>
                </div>
              )}
            </div>
          </div>
          <VoiceControls voice={voice} onReplay={() => voice.speak(cfg.lead + (p ? ` Overall posture ${p.current} of 100, ${band(p.current)}.` : ''))} label="Listen" />
        </div>
        <div style={{ marginTop: 14, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, maxWidth: 920 }}>{cfg.lead}</div>
        {d && d.domainMatrix && (
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {d.domainMatrix.filter((x) => x.weight > 0).map((x) => (
              <div key={x.id} title={`${x.name} ${x.current}`} style={{ flex: 1, minWidth: 92, background: '#16263b', borderRadius: 5, padding: '7px 9px' }}>
                <div style={{ fontSize: 9.5, color: '#8fa3bd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: sc(x.current) === '#A85B2E' ? '#f0a868' : sc(x.current) }}>{x.current}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky tab bar */}
      <div style={{ display: 'flex', gap: 0, background: '#fff', borderBottom: `1px solid ${HAIR}`, overflowX: 'auto', position: 'sticky', top: 0, zIndex: 5 }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === k ? INK : 'transparent'}`, color: tab === k ? INK : INK3, padding: '11px 15px', cursor: 'pointer', fontSize: 12, fontWeight: tab === k ? 700 : 500, whiteSpace: 'nowrap' }}>{label}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: '18px 22px' }}>
        {tab === 'brief' && <ExecutiveAgentBrief role={role} entry onAnswer={() => setTab('details')} onGeneral={() => setTab('details')} {...panelProps} />}
        {tab === 'summary' && <ExecutiveSummaryEditor {...panelProps} />}
        {tab === 'risk' && <BusinessRiskPanel {...panelProps} />}
        {cfg.panels.map((x) => (tab === x.id ? <div key={x.id}>{x.el(panelProps)}</div> : null))}
        {tab === 'details' && <div>{props.overview || <div style={{ fontSize: 12, color: INK3 }}>No additional detail view.</div>}</div>}
        {refreshed && <div style={{ fontSize: 10.5, color: INK3, marginTop: 16, borderTop: `1px solid ${HAIR}`, paddingTop: 10 }}>Posture last refreshed {refreshed}.</div>}
      </div>
    </div>
  );
}

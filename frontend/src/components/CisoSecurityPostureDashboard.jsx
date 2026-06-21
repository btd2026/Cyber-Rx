/**
 * CisoSecurityPostureDashboard — dedicated CISO persona view
 * ----------------------------------------------------------
 * Executive decision-support dashboard (NOT a GRC compliance view). Business
 * language first, technical detail second. Every score is explainable and every
 * recommendation traces to evidence. CISO persona only — no other executives.
 *
 * Sections: Overall Posture hero · Executive Q&A (15 decision-ready answers with
 * an evidence drawer) · Domain Health Matrix · Control Risk Contribution ·
 * Security Thresholds · Action-Now Queue · Business-Process Protection · Attack
 * Pathways · Readiness & Investment · Hidden Risk. Exportable executive summary.
 *
 * Data: GET /api/ciso/dashboard (computed; mock today, live-API replaceable).
 */

import React, { useState, useEffect } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import TicketControl from './TicketControl';
import RiskDecision from './RiskDecision';
import CisoAgentPanel from './CisoAgentPanel';
import ExecutiveSummaryEditor from './ExecutiveSummaryEditor';
import BusinessRiskPanel from './BusinessRiskPanel';
import DashNav from './DashNav';
import RoleSection from './RoleSections';
import SecurityProjects from './SecurityProjects';
import AiGovernance from './AiGovernance';
import SoftwareSupplyChain from './SoftwareSupplyChain';
import DecisionQueue from './DecisionQueue';
import DecisionRail from './DecisionRail';
import Provenance from './Provenance';
import { FONTS, COLORS, ELEV } from '../theme';
import CurrentState from './CurrentState';
import ControlEfficacy from './ControlEfficacy';
import KeyRisks from './KeyRisks';
import CompilerChain from './CompilerChain'; // eslint-disable-line no-unused-vars -- retired from CISO nav; kept for other layouts
import CisoExecReport from './CisoExecReport';
import CioOperationalPosture from './CioOperationalPosture';
import CioResilience from './CioResilience';
import CioFrictionMap from './CioFrictionMap';
import CioTransformation from './CioTransformation';
import CroEnterprisePosition from './CroEnterprisePosition';
import CroExposures from './CroExposures';
import CroAggregation from './CroAggregation';
import CroTreatment from './CroTreatment';
import CloObligationPosture from './CloObligationPosture';
import CloTriggerMap from './CloTriggerMap';
import CloMateriality from './CloMateriality';
import CloDefensibility from './CloDefensibility';
import CloPortfolio from './CloPortfolio';
import BoardOversight from './BoardOversight';
import BoardDecisions from './BoardDecisions';
import BoardAccountability from './BoardAccountability';
import BoardInvestment from './BoardInvestment';

// Per-role header framing so every C-suite seat uses this SAME rich view.
const ROLE_FRAME = {
  CISO: { tag: 'CISO · Security Posture', title: 'Executive Security Posture' },
  CFO: { tag: 'CFO · Financial Exposure', title: 'Executive Financial Exposure' },
  CIO: { tag: 'CIO · Technology Risk', title: 'Executive Technology Risk' },
  CRO: { tag: 'CRO · Operational Resilience', title: 'Executive Risk & Resilience' },
  CLO: { tag: 'CLO · Oversight & Compliance', title: 'Executive Oversight & Compliance' },
  Board: { tag: 'Board · Enterprise Risk', title: 'Enterprise Cyber Risk' },
};

const STATUS_SEV = { Strong: 'Low', Moderate: 'Medium', Weak: 'High', Critical: 'Critical' };
const numSev = (n) => (n >= 5 ? 'Critical' : n >= 4 ? 'High' : n >= 3 ? 'Medium' : 'Low');

const INK = '#0b0c0e', INK2 = '#5c6066', INK3 = '#8b9098', HAIR = '#ebecf0', PANEL = '#f6f7f9';
const SUBTLE = '#f6f7f9', BORDERSTRONG = '#dfe1e6', ACCENT = '#5e6ad2', ACCENT_SOFT = '#eef0fb', ACCENT_TEXT = '#4a52b0';
const C = { Strong: '#1a7f37', Moderate: '#9a6700', Weak: '#c2410c', Critical: '#cf222e', 'Not assessed': '#8b9098' };
const SEV = { Critical: '#cf222e', High: '#c2410c', Medium: '#9a6700', Low: '#1a7f37' };
// Soft tint paired to each status/accent color, for Linear-style soft badges.
const SOFT = { '#cf222e': '#fdecec', '#c2410c': '#fdeee6', '#9a6700': '#fbf3da', '#1a7f37': '#e6f4ea', '#8b9098': '#f0f1f4', '#5e6ad2': '#eef0fb' };
const conf = (c) => (c === 'High' ? '#1a7f37' : c === 'Medium' ? '#9a6700' : '#8b9098');
const band = (s) => (s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical');
const sc = (s) => C[band(s)];
const scoreColor = (s) => (s >= 80 ? '#1a7f37' : s >= 60 ? '#9a6700' : '#cf222e');

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const Pill = ({ text, color }) => (
  <span style={{ fontSize: 10.5, fontWeight: 600, color, background: SOFT[color] || '#f0f1f4', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>{text}</span>
);
const Trend = ({ d }) => {
  const up = d > 0, flat = d === 0;
  return <span style={{ color: flat ? INK3 : up ? '#1a7f37' : '#cf222e', fontWeight: 600, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{flat ? '→' : up ? '↑' : '↓'} {d > 0 ? '+' : ''}{d}</span>;
};
function Bar({ value, color }) {
  return <div style={{ height: 6, background: '#f0f1f4', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color || sc(value), borderRadius: 999 }} /></div>;
}
// Posture score ring (SVG) — the hero centerpiece, on a light surface.
function Ring({ value, size = 104 }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ebecf0" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(value)} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="crx-figure" style={{ fontSize: 30, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>{value}</span>
        <span style={{ fontSize: 9, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: -1 }}>of 100</span>
      </div>
    </div>
  );
}

// Five top-level groups so the dashboard stays focused; related views collapse
// into one group with an inner sub-nav (nothing is removed). Keys map every
// existing tab — CISO and role-specific — into a group; unknown keys → 'risk'.
const TAB_GROUPS = [
  { key: 'state', label: 'Current State' },
  { key: 'decisions', label: 'Decisions & Actions' },
  { key: 'risk', label: 'Risk & Controls' },
  { key: 'programs', label: 'Programs & AI' },
];
const GROUP_OF = {
  qa: 'state', summary: 'state',
  decisionq: 'decisions', actions: 'decisions',
  // risk & controls (CISO + every role's analytical sections)
  linkage: 'risk', domains: 'risk', controls: 'risk', thresholds: 'risk', processes: 'risk', paths: 'risk', hidden: 'risk', rolepanel: 'risk',
  exposure: 'risk', lossscenarios: 'risk', dollarrisks: 'risk', insurance: 'risk', capital: 'risk',
  vulnpatch: 'risk', systemsrisk: 'risk', controlcov: 'risk', resilience: 'risk', backlog: 'risk',
  register: 'risk', kri: 'risk', heat: 'risk', treatment: 'risk', exceptions: 'risk', assurance: 'risk',
  obligations: 'risk', notify: 'risk', vendorlegal: 'risk', penalty: 'risk',
  enterprise: 'risk', trend: 'risk', toprisks: 'risk', benchmark: 'risk', finexp: 'risk', posture: 'risk',
  // programs, investment & AI
  readiness: 'programs', roi: 'programs', investment: 'programs', projects: 'programs', ai: 'programs',
};
const groupOf = (k) => GROUP_OF[k] || 'risk';

// CISO uses the redesigned 5-group structure (per spec): Current State, Key
// Risks, Control Efficacy, Key Projects & ROI, Blind Spots & Coaching. Domain
// Health + Control Risk are folded into Control Efficacy.
const CISO_GROUP_DEFS = [
  { key: 'execsummary', label: 'Exec Summary' },
  { key: 'keyrisks', label: 'Key Risks' },
  { key: 'controlefficacy', label: 'Control Efficacy' },
  { key: 'projects', label: 'Key Projects & ROI' },
];
const CISO_MEMBER_OF = {
  qa: 'execsummary',
  // Key Risks — capped at five decision-focused views.
  bizrisks: 'keyrisks', decisionq: 'keyrisks', paths: 'keyrisks', thresholds: 'keyrisks', processes: 'keyrisks',
  // Migrated out of Key Risks to keep that group to five and avoid overload:
  ai: 'controlefficacy', supplychain: 'controlefficacy', actions: 'projects',
  controlefficacy: 'controlefficacy', fourlens: 'controlefficacy',
  readiness: 'projects', projects: 'projects',
};

// CIO uses a parallel 5-sub-tab lens, built on the SAME shared decision spine
// (resilience risks + friction-map risks are the same events the CISO sees).
const CIO_GROUP_DEFS = [
  { key: 'opstate', label: 'Operational Posture' },
  { key: 'resilience', label: 'Resilience & SPOFs' },
  { key: 'friction', label: 'Velocity vs Risk' },
  { key: 'transformation', label: 'Transformation & ROI' },
];
const CIO_MEMBER_OF = {
  cioposture: 'opstate',
  resiliencerisks: 'resilience', decisionq: 'resilience',
  frictionmap: 'friction', supplychain: 'friction',
  ciotransformation: 'transformation',
};
const CIO_TABS = [
  ['cioposture', 'Operational Posture'],
  ['resiliencerisks', 'Resilience Risks & SPOFs'], ['decisionq', 'Decisions'],
  ['frictionmap', 'Velocity-vs-Risk Friction Map'], ['supplychain', 'Software Supply Chain'],
  ['ciotransformation', 'Transformation Portfolio & ROI'],
];

// CRO uses a parallel 5-sub-tab lens at enterprise-risk altitude. Appetite is
// AUTHORED in sub-tab 1 and propagates (shared tenant config); exposures are the
// shared events normalized to portfolio altitude.
const CRO_GROUP_DEFS = [
  { key: 'position', label: 'Enterprise Risk Position' },
  { key: 'appetite', label: 'Cyber vs Appetite' },
  { key: 'aggregation', label: 'Aggregation & Correlation' },
  { key: 'treatment', label: 'Treatment Portfolio & ROI' },
];
const CRO_MEMBER_OF = {
  croposition: 'position',
  croexposures: 'appetite', decisionq: 'appetite',
  croaggregation: 'aggregation',
  crotreatment: 'treatment',
};
const CRO_TABS = [
  ['croposition', 'Enterprise Risk Position'],
  ['croexposures', 'Cyber Risk vs Appetite & Top Exposures'], ['decisionq', 'Decisions'],
  ['croaggregation', 'Aggregation & Correlation'],
  ['crotreatment', 'Risk Treatment Portfolio & ROI'],
];

// CLO / General Counsel: a parallel 5-sub-tab lens at legal altitude. Triggers
// attach to the shared events; the decision/evidence ledger is the legal artifact.
const CLO_GROUP_DEFS = [
  { key: 'obligations', label: 'Obligation Posture' },
  { key: 'triggers', label: 'Trigger Map & Materiality' },
  { key: 'defensibility', label: 'Defensibility & Evidence' },
  { key: 'legalportfolio', label: 'Regulatory & Litigation' },
];
const CLO_MEMBER_OF = {
  cloobligations: 'obligations',
  clotriggers: 'triggers', clomateriality: 'triggers', decisionq: 'triggers',
  clodefensibility: 'defensibility',
  cloportfolio: 'legalportfolio',
};
const CLO_TABS = [
  ['cloobligations', 'Obligation Posture'],
  ['clotriggers', 'Trigger Map & Materiality'], ['clomateriality', 'SEC Materiality (8-K)'], ['decisionq', 'Decisions'],
  ['clodefensibility', 'Defensibility & Evidence'],
  ['cloportfolio', 'Regulatory & Litigation Portfolio'],
];

// Board: a parallel 5-sub-tab oversight lens. Everything is an aggregation of the
// shared spine + the shared ledger — the board oversees, it does not manage.
const BOARD_GROUP_DEFS = [
  { key: 'oversight', label: 'Enterprise Oversight' },
  { key: 'decisions', label: 'Top Decisions' },
  { key: 'accountability', label: 'Oversight & Accountability' },
  { key: 'investment', label: 'Investment & ROI' },
];
const BOARD_MEMBER_OF = {
  boardoversight: 'oversight',
  boarddecisions: 'decisions', decisionq: 'decisions',
  boardaccountability: 'accountability',
  boardinvestment: 'investment',
};
const BOARD_TABS = [
  ['boardoversight', 'Enterprise Oversight'],
  ['boarddecisions', 'Top Decisions for the Board'], ['decisionq', 'Decisions'],
  ['boardaccountability', 'Oversight & Accountability'],
  ['boardinvestment', 'Investment & ROI'],
];

export default function CisoSecurityPostureDashboard(props) {
  const role = props.role || 'CISO';
  // Every leader uses this SAME rich scaffold (hero, pillar strip, full tab set,
  // Current State cards). The backend re-lenses the hero, pillars, and the five
  // Current State questions to the role; the deeper shared tabs render the org's
  // security/risk truth. So all leader pages have an identical setup, populated
  // with their own corresponding information.
  const frame = ROLE_FRAME[role] || ROLE_FRAME.CISO;
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  // Everyone lands on the Exec Summary (qa) tab; each tab swaps content in the
  // same slot so pages stay short.
  const [tab, setTab] = useState('qa');
  const [showAllActions, setShowAllActions] = useState(false); // "View all" → focused window
  const voice = useAgentVoice();
  const [drawer, setDrawer] = useState(null);   // an executive answer
  const { token, orgId, api } = ctx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/ciso/dashboard?role=${encodeURIComponent(role)}&org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setD).catch((e) => setError(e.message));
  }, [api, orgId, token, role]);

  // When arrived from the CISO agent with a question, open the Q&A tab and the
  // matching answer's evidence drawer so the agent's answer is front-and-center.
  useEffect(() => {
    if (!d || !props.focusQuestion) return;
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const t = norm(props.focusQuestion);
    const a = d.questions.find((x) => norm(x.question) === t)
      || d.questions.find((x) => norm(x.question).includes(t) || t.includes(norm(x.question)));
    if (a) { setTab('qa'); setDrawer(a); }
  }, [d, props.focusQuestion]);

  // Auto-narrate the active tab (Michael explains the page). Respects mute.
  // The 'qa' tab hosts CisoAgentPanel, which does its own intro — skip here.
  const lastTabRef = React.useRef(tab);
  useEffect(() => {
    if (tab === lastTabRef.current) return; // data refreshed, not a tab change — don't auto-speak
    lastTabRef.current = tab;
    if (tab === 'qa') return;
    if (d && d.tabNarration && d.tabNarration[tab]) voice.speak(d.tabNarration[tab]);
    return () => voice.stop();
  }, [d, tab]); // eslint-disable-line

  if (error) return <div style={{ padding: 24, color: '#cf222e', fontSize: 13 }}>Could not load CISO dashboard: {error}</div>;
  if (!d) return <div style={{ padding: 24, color: INK3, fontSize: 13 }}>Composing CISO security posture…</div>;

  const p = d.overallPosture;
  const refreshed = new Date(d.generatedAt).toLocaleString();

  // CISO, CIO and CRO each have a bespoke 5-sub-tab lens (built on the shared
  // spine). Every other leader gets a tab layout tailored by the backend (d.roleTabs).
  const isCisoLayout = role === 'CISO';
  const isCioLayout = role === 'CIO';
  const isCroLayout = role === 'CRO';
  const isCloLayout = role === 'CLO';
  const isBoardLayout = role === 'Board';
  const roleTabs = (!isCisoLayout && !isCioLayout && !isCroLayout && !isCloLayout && !isBoardLayout && Array.isArray(d.roleTabs)) ? d.roleTabs : null;
  const labelFor = (t) => {
    if (t.kind === 'thresholds') return `Thresholds · ${d.thresholds.breaches} breached`;
    if (t.kind === 'hidden') return `Hidden Risk · ${d.hiddenRisks.length}`;
    if (t.kind === 'rolepanel') return props.rolePanelLabel || t.label;
    return t.label;
  };
  const TABS = isCioLayout ? CIO_TABS : isCroLayout ? CRO_TABS : isCloLayout ? CLO_TABS : isBoardLayout ? BOARD_TABS : roleTabs
    ? roleTabs.map((t) => [t.key, labelFor(t)])
    : [
      ['qa', 'Exec Summary'],
      // Key Risks (5)
      ['bizrisks', 'Business Risks'], ['decisionq', 'Projections & Decisions'],
      ['paths', 'Attack Pathways'], ['thresholds', `Thresholds · ${d.thresholds.breaches} breached`], ['processes', 'Process Protection'],
      // Control Efficacy
      ['controlefficacy', 'Control Efficacy'], ['fourlens', 'Four-Lens (CSF · 800-53 · CIS · ATT&CK)'], ['ai', 'AI Governance'], ['supplychain', 'Software Supply Chain'],
      // Key Projects & ROI
      ['readiness', 'Readiness & Investment'], ['projects', 'Projects & ROI'], ['actions', 'Action Now'],
    ];
  const activeRoleTab = roleTabs ? (roleTabs.find((t) => t.key === tab) || roleTabs[0]) : null;
  // The bespoke layouts start on their first tab, not the shared 'qa' default.
  const bespokeTab = isCioLayout ? (CIO_MEMBER_OF[tab] ? tab : 'cioposture')
    : isCroLayout ? (CRO_MEMBER_OF[tab] ? tab : 'croposition')
    : isCloLayout ? (CLO_MEMBER_OF[tab] ? tab : 'cloobligations')
    : isBoardLayout ? (BOARD_MEMBER_OF[tab] ? tab : 'boardoversight') : tab;

  // Collapse the flat TABS into top-level groups (only those with members) and
  // derive the active group from the active tab so the two stay in sync. CISO,
  // CIO, CRO, CLO and Board use bespoke group structures; other roles use generic.
  const groupDefs = isCisoLayout ? CISO_GROUP_DEFS : isCioLayout ? CIO_GROUP_DEFS : isCroLayout ? CRO_GROUP_DEFS : isCloLayout ? CLO_GROUP_DEFS : isBoardLayout ? BOARD_GROUP_DEFS : TAB_GROUPS;
  const memberOf = isCisoLayout ? ((k) => CISO_MEMBER_OF[k] || 'keyrisks')
    : isCioLayout ? ((k) => CIO_MEMBER_OF[k] || 'opstate')
    : isCroLayout ? ((k) => CRO_MEMBER_OF[k] || 'position')
    : isCloLayout ? ((k) => CLO_MEMBER_OF[k] || 'obligations')
    : isBoardLayout ? ((k) => BOARD_MEMBER_OF[k] || 'oversight') : groupOf;
  const groupsPresent = groupDefs
    .map((g) => ({ ...g, members: TABS.filter(([k]) => memberOf(k) === g.key) }))
    .filter((g) => g.members.length);
  const activeGroup = groupsPresent.find((g) => g.key === memberOf(bespokeTab)) || groupsPresent[0];

  return (
    <div style={{ background: COLORS.paper, borderRadius: 16, padding: 0, fontFamily: FONTS.body, boxShadow: ELEV.card, border: `1px solid ${COLORS.hair}`, overflow: 'hidden' }}>
      {/* Top executive nav (only when rendered as a standalone leader page). */}
      {props.navId && <div style={{ marginBottom: 12 }}><DashNav current={props.navId} go={props.go} /></div>}
      {/* ===== Hero: Overall Security Posture (Modern SaaS — light) ===== */}
      <div style={{ background: COLORS.white, padding: '22px 28px', borderBottom: `1px solid ${COLORS.hair}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <Ring value={p.current} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: ACCENT_TEXT, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{frame.tag}</div>
              <h2 className="crx-display" style={{ margin: '5px 0 8px', fontSize: 24, fontWeight: 650, letterSpacing: '-0.025em', color: INK }}>{frame.title}</h2>
              <div style={{ display: 'flex', gap: 13, alignItems: 'center', fontSize: 12.5, color: INK2, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor(p.current), background: SOFT[scoreColor(p.current)] || PANEL, borderRadius: 999, padding: '2px 9px' }}>{band(p.current)}</span>
                <span className="crx-figure" style={{ fontWeight: 600, color: p.delta >= 0 ? '#1a7f37' : '#cf222e' }}>{p.delta >= 0 ? '↑ +' : '↓ '}{p.delta} pts</span>
                <span>Last period <strong className="crx-figure" style={{ color: INK }}>{p.previous}</strong></span>
                <span style={{ textTransform: 'capitalize' }}>{p.trend}</span>
                <span>Confidence {p.confidence}</span>
              </div>
            </div>
          </div>
          {/* Config/coverage chips removed — connecting systems is handled by the
              platform during intake, not by the executive. Exports kept. */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={`${api}/api/ciso/report.pdf?org_id=${encodeURIComponent(orgId)}`} style={{ background: ACCENT, color: '#fff', border: `1px solid ${ACCENT}`, borderRadius: 7, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>⤓ PDF report</a>
            <a href={`${api}/api/ciso/report.pptx?org_id=${encodeURIComponent(orgId)}`} style={{ background: '#fff', color: INK2, border: `1px solid ${BORDERSTRONG}`, borderRadius: 7, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>⤓ PowerPoint</a>
          </div>
        </div>
        {!isCisoLayout && <div style={{ marginTop: 14, fontSize: 13.5, color: INK2, lineHeight: 1.6, maxWidth: 940 }}>{p.narrative}</div>}
        {/* KPI row (mockup layout) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 18 }}>
          {[
            { label: 'Posture score', value: p.current, unit: '/ 100', delta: p.delta, good: p.delta >= 0 },
            { label: 'Thresholds breached', value: d.thresholds.breaches, unit: `of ${d.thresholds.total}`, sub: `${d.thresholds.critical} critical`, bad: d.thresholds.breaches > 0 },
            { label: 'Readiness', value: d.readiness.overall, unit: '/ 100', sub: d.readiness.rating },
            { label: 'Action items', value: (d.actionQueue || []).length, unit: 'ranked', sub: `${(d.attentionItems || []).length} need your decision` },
          ].map((k) => (
            <div key={k.label} style={{ background: COLORS.white, border: `1px solid ${COLORS.hair}`, borderRadius: 10, boxShadow: ELEV.card, padding: '13px 15px' }}>
              <div style={{ fontSize: 12, color: INK3 }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 7 }}>
                <span className="crx-figure" style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>{k.value}</span>
                <span style={{ fontSize: 11.5, color: INK3 }}>{k.unit}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5 }}>
                {k.delta !== undefined
                  ? <span className="crx-figure" style={{ fontWeight: 600, color: k.good ? '#1a7f37' : '#cf222e' }}>{k.delta >= 0 ? '↑ +' : '↓ '}{k.delta} pts</span>
                  : <span style={{ color: k.bad ? '#cf222e' : INK3 }}>{k.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Primary navigation — sits directly below the Executive Posture ===== */}
      <div style={{ display: 'flex', gap: 0, background: '#fff', borderBottom: `1px solid ${COLORS.hair}`, overflowX: 'auto', position: 'sticky', top: 0, zIndex: 5 }}>
        {groupsPresent.map((g) => {
          const on = g.key === activeGroup.key;
          return (
            <button key={g.key} onClick={() => { if (g.members[0]) setTab(g.members[0][0]); }}
              style={{ background: 'transparent', border: 'none', borderBottom: `2.5px solid ${on ? COLORS.accent : 'transparent'}`, color: on ? COLORS.ink : COLORS.ink3, padding: '13px 20px', cursor: 'pointer', fontSize: 12.5, fontWeight: on ? 700 : 500, letterSpacing: on ? '0.005em' : 0, whiteSpace: 'nowrap' }}>{g.label}</button>
          );
        })}
      </div>
      {/* inner sub-nav for the active group (only when it holds more than one view) */}
      {activeGroup.members.length > 1 && (
        <div style={{ display: 'flex', gap: 6, background: COLORS.paper, borderBottom: `1px solid ${COLORS.hair}`, overflowX: 'auto', padding: '9px 12px' }}>
          {activeGroup.members.map(([k, label]) => {
            const on = bespokeTab === k;
            return (
              <button key={k} onClick={() => setTab(k)} style={{ background: on ? '#fff' : 'transparent', border: `1px solid ${on ? COLORS.hair : 'transparent'}`, boxShadow: on ? ELEV.card : 'none', borderRadius: 999, color: on ? COLORS.ink : COLORS.ink2, padding: '6px 14px', cursor: 'pointer', fontSize: 11.5, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap' }}>{label}</button>
            );
          })}
        </div>
      )}

      {/* ===== Tabs ===== */}
      {/* Persistent decision queue — visible across every sub-tab. */}
      <DecisionRail role={role} orgId={orgId} authToken={token} apiUrl={api} onOpenQueue={() => setTab('decisionq')} />

      <div style={{ background: '#fff', padding: '20px 24px' }}>
        {/* Voice-only narration: Michael speaks the page (autoplay on tab open,
            see the effect above). No on-screen transcript — just a discreet
            mute/replay control so the CISO can stop or hear it again. */}
        {tab !== 'qa' && d.tabNarration && d.tabNarration[tab] && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <VoiceControls voice={voice} onReplay={() => voice.speak(d.tabNarration[tab])} label="Replay" />
          </div>
        )}
        {isCioLayout
          ? (<>
            {bespokeTab === 'cioposture' && <CioOperationalPosture orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'resiliencerisks' && <CioResilience orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'decisionq' && <DecisionQueue role={role} orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'frictionmap' && <CioFrictionMap orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'supplychain' && <SoftwareSupplyChain orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'ciotransformation' && <CioTransformation orgId={orgId} authToken={token} apiUrl={api} />}
          </>)
          : isCroLayout
          ? (<>
            {bespokeTab === 'croposition' && <CroEnterprisePosition orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'croexposures' && <CroExposures orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'decisionq' && <DecisionQueue role={role} orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'croaggregation' && <CroAggregation orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'crotreatment' && <CroTreatment orgId={orgId} authToken={token} apiUrl={api} />}
          </>)
          : isCloLayout
          ? (<>
            {bespokeTab === 'cloobligations' && <CloObligationPosture orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'clotriggers' && <CloTriggerMap orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'clomateriality' && <CloMateriality orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'decisionq' && <DecisionQueue role={role} orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'clodefensibility' && <CloDefensibility orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'cloportfolio' && <CloPortfolio orgId={orgId} authToken={token} apiUrl={api} />}
          </>)
          : isBoardLayout
          ? (<>
            {bespokeTab === 'boardoversight' && <BoardOversight orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'boarddecisions' && <BoardDecisions orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'decisionq' && <DecisionQueue role={role} orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'boardaccountability' && <BoardAccountability orgId={orgId} authToken={token} apiUrl={api} />}
            {bespokeTab === 'boardinvestment' && <BoardInvestment orgId={orgId} authToken={token} apiUrl={api} />}
          </>)
          : roleTabs
          ? <RoleTabContent t={activeRoleTab} role={role} d={d} props={props} orgId={orgId} authToken={token} apiUrl={api} />
          : (<>
            {tab === 'qa' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <CurrentState view="brief" d={d} role={role} orgId={orgId} authToken={token} apiUrl={api} onOpenQueue={() => setTab('decisionq')} />
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
                  <div style={{ background: COLORS.white, border: `1px solid ${COLORS.hair}`, borderRadius: 12, boxShadow: ELEV.card, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: INK, letterSpacing: '-0.01em' }}>Posture by domain</h3>
                      <span style={{ fontSize: 11.5, color: INK3 }}>weighted</span>
                    </div>
                    <div style={{ display: 'grid', gap: 11 }}>
                      {d.domainMatrix.filter((x) => x.weight > 0).map((x) => (
                        <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 44px', alignItems: 'center', gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, color: INK, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</div>
                            <Bar value={x.current} />
                          </div>
                          <div className="crx-figure" style={{ fontSize: 14, fontWeight: 700, color: scoreColor(x.current), textAlign: 'right' }}>{x.current}</div>
                          <div style={{ textAlign: 'right' }}><Trend d={x.delta} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: COLORS.white, border: `1px solid ${COLORS.hair}`, borderRadius: 12, boxShadow: ELEV.card, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: INK, letterSpacing: '-0.01em' }}>Action queue</h3>
                      <button onClick={() => setShowAllActions(true)} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>View all →</button>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {(d.actionQueue || []).slice(0, 4).map((a) => {
                        const sv = a.escalation ? '#cf222e' : numSev(a.severity) === 'High' ? '#c2410c' : '#9a6700';
                        return (
                          <div key={a.id} style={{ display: 'flex', gap: 11, padding: '11px 12px', border: `1px solid ${COLORS.hair}`, borderRadius: 8 }}>
                            <div className="crx-figure" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: SOFT[sv] || PANEL, color: sv, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>{a.rank}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: INK, lineHeight: 1.35 }}>{a.action}</div>
                              <div style={{ fontSize: 11.5, color: INK2, marginTop: 3, lineHeight: 1.45 }}>{a.whyNow}</div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 7, flexWrap: 'wrap' }}>
                                <Pill text={numSev(a.severity)} color={sv} />
                                <span style={{ fontSize: 11, color: INK3 }}>{a.owner} · due {a.dueDate}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <CurrentState view="detail" d={d} role={role} orgId={orgId} authToken={token} apiUrl={api} onOpenQueue={() => setTab('decisionq')} />
              </div>
            )}
            {tab === 'decisionq' && <DecisionQueue role={role} orgId={orgId} authToken={token} apiUrl={api} />}
            {tab === 'linkage' && <BusinessRiskPanel />}
            {tab === 'domains' && <Domains matrix={d.domainMatrix} controlRisk={d.controlRisk} thresholds={d.thresholds} />}
            {tab === 'controls' && <Controls rows={d.controlRisk} />}
            {tab === 'controlefficacy' && <ControlEfficacy d={d} orgId={orgId} authToken={token} apiUrl={api} />}
            {tab === 'fourlens' && <CisoExecReport />}
            {tab === 'bizrisks' && <KeyRisks orgId={orgId} authToken={token} apiUrl={api} />}
            {tab === 'thresholds' && <Thresholds board={d.thresholds} />}
            {tab === 'actions' && <Actions queue={d.actionQueue} attention={d.attentionItems} />}
            {tab === 'processes' && <Processes procs={d.businessProcesses} />}
            {tab === 'paths' && <PathsTab attackGraph={props.attackGraph} />}
            {tab === 'readiness' && <Readiness readiness={d.readiness} investments={d.investments} peers={d.peerMaturity} emerging={d.emergingRisks} />}
            {tab === 'hidden' && <Hidden risks={d.hiddenRisks} />}
            {tab === 'ai' && <AiGovernance />}
            {tab === 'supplychain' && <SoftwareSupplyChain orgId={orgId} authToken={token} apiUrl={api} />}
            {tab === 'projects' && <SecurityProjects />}
          </>)}
        <div style={{ fontSize: 10.5, color: INK3, marginTop: 16, borderTop: `1px solid ${HAIR}`, paddingTop: 10 }}>
          Last refreshed {refreshed}. Mock/demo data — structured for live replacement via {d.evidenceSources.length} sources (Okta, Splunk, ServiceNow, CrowdStrike, Tenable, SailPoint, Prisma, Panorama, DLP, backup).
        </div>
      </div>

      {/* "View all" opens the full action/decision list in a focused window so the
          dashboard itself stays short — executives don't scroll a long page. */}
      {showAllActions && (
        <div onClick={() => setShowAllActions(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,12,14,0.45)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 20px', overflowY: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.paper, borderRadius: 14, boxShadow: '0 24px 64px -20px rgba(11,12,14,0.45)', border: `1px solid ${COLORS.hair}`, width: '100%', maxWidth: 900, maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: `1px solid ${COLORS.hair}`, background: COLORS.white, position: 'sticky', top: 0 }}>
              <h3 className="crx-display" style={{ margin: 0, fontSize: 16, fontWeight: 650, color: INK, letterSpacing: '-0.01em' }}>Actions &amp; decisions <span style={{ fontWeight: 400, color: INK3, fontSize: 12.5 }}>({(d.actionQueue || []).length + (d.attentionItems || []).length})</span></h3>
              <button onClick={() => setShowAllActions(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: INK3, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
              <Actions queue={d.actionQueue} attention={d.attentionItems} />
            </div>
          </div>
        </div>
      )}

      {drawer && <EvidenceDrawer a={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}

/* ---------------- Role tab dispatcher (non-CISO leaders) ----------------
 * Renders the active role tab using either a shared CISO scaffold component
 * (so the look is identical) or a role-specific data section. */
function RoleTabContent({ t, role, d, props, orgId, authToken, apiUrl }) {
  if (!t) return null;
  switch (t.kind) {
    case 'qa': return <CisoAgentPanel role={role} />;
    case 'summary': return <ExecutiveSummaryEditor />;
    case 'businessrisk': return <BusinessRiskPanel />;
    case 'domains': return <Domains matrix={d.domainMatrix} controlRisk={d.controlRisk} thresholds={d.thresholds} />;
    case 'controls': return <Controls rows={d.controlRisk} />;
    case 'thresholds': return <Thresholds board={d.thresholds} />;
    case 'processes': return <Processes procs={d.businessProcesses} />;
    case 'paths': return <PathsTab attackGraph={props.attackGraph} />;
    case 'hidden': return <Hidden risks={d.hiddenRisks} />;
    case 'rolepanel': return <div>{props.rolePanel}</div>;
    case 'projects': return <SecurityProjects />;
    case 'ai': return <AiGovernance />;
    case 'decisionq': return <DecisionQueue role={role} orgId={orgId} authToken={authToken} apiUrl={apiUrl} />;
    case 'section': return <RoleSection section={t.section} role={role} />;
    default: return null;
  }
}

/* ---------------- Executive Q&A ---------------- */
function ExecQA({ questions, onEvidence }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 12 }}>
      {questions.map((a) => (
        <div key={a.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${C[a.status]}`, borderRadius: 7, padding: '14px 16px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{a.n}. {a.question}</div>
            <Pill text={a.status} color={C[a.status]} />
          </div>
          <div style={{ fontSize: 13, color: INK, marginTop: 8, lineHeight: 1.5 }}>{a.answer}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 10.5, color: INK2, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>Confidence <strong style={{ color: conf(a.confidence) }}>{a.confidence}</strong></span>
            <span>Owner <strong>{a.owner}</strong></span>
            <span>Target <strong>{a.targetDate}</strong></span>
            <button onClick={() => onEvidence(a)} style={{ marginLeft: 'auto', background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 5, padding: '4px 10px', fontSize: 10.5, fontWeight: 600, color: INK, cursor: 'pointer' }}>Evidence & decision →</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceDrawer({ a, onClose }) {
  const Row = ({ label, children }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,12,14,0.45)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 92vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)', overflowY: 'auto', padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${HAIR}` }}>
          <div>
            <div style={{ fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CISO Question {a.n}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: INK }}>{a.question}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}><Pill text={a.status} color={C[a.status]} /><Pill text={`Confidence ${a.confidence}`} color={conf(a.confidence)} /></div>
        <Row label="Answer">{a.answer}</Row>
        <Row label="What changed">{a.whatChanged}</Row>
        <Row label="Why it matters">{a.whyItMatters}</Row>
        <Row label="Evidence">
          <ul style={{ margin: 0, paddingLeft: 16 }}>{a.evidence.map((e, i) => <li key={i} style={{ marginBottom: 3 }}>{e}</li>)}</ul>
        </Row>
        <Row label="Business / process impact">{a.businessImpact}</Row>
        <Row label="Key risk drivers">{(a.riskDrivers || []).join(' · ')}</Row>
        <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 6, padding: '10px 12px', margin: '10px 0' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1a7f37', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recommended action</div>
          <div style={{ fontSize: 12.5, color: INK, marginTop: 3 }}>{a.recommendedAction}</div>
        </div>
        <Row label="Remediation — open & track a ticket">
          <TicketControl sourceRef={`ciso:${a.id}`} title={`[CISO] ${a.question}`}
            recommendation={a.recommendedAction} severity={STATUS_SEV[a.status] || 'Medium'}
            owner={a.owner} dueDate={a.targetDate} />
        </Row>
        <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: INK2, flexWrap: 'wrap' }}>
          <span>Owner <strong>{a.owner}</strong></span><span>Target <strong>{a.targetDate}</strong></span>
        </div>
        <div style={{ fontSize: 10.5, color: INK3, marginTop: 12 }}>Data sources: {(a.dataSources || []).join(', ')} · Last refreshed {new Date(a.lastRefreshed).toLocaleString()}</div>
      </div>
    </div>
  );
}

/* ---------------- Domain Health Matrix ---------------- */
// Plain-English meaning of each domain + which control-risk areas and thresholds
// roll up into it. Lets a domain card expand into a real mini-dashboard sourced
// from data already in the payload (controlRisk + thresholds) — no extra fetch.
const DOMAIN_DETAIL = {
  iam: { blurb: 'Who can access what, and whether that access is right-sized. Compromised identity is the #1 way attackers get in — this domain governs MFA, privileged accounts, and joiner/mover/leaver hygiene.', controls: ['priv_access', 'mfa', 'access_recert', 'jml'], thresholds: ['mfa_cov', 'priv_review', 'orphan_accts'] },
  detection: { blurb: 'How fast you see an attack and how fast you contain it. Covers SIEM log coverage, detection engineering against MITRE ATT&CK, endpoint detection, alert triage, and incident-response readiness. Attacker dwell time is the risk this domain controls.', controls: ['logging', 'detection_eng', 'edr', 'email_sec', 'ir_readiness'], thresholds: ['triage_sla', 'mttd', 'mttr', 'edr_cov', 'log_cov'] },
  vuln: { blurb: 'Whether known weaknesses get fixed before they are exploited. Internet-facing and KEV-listed critical vulnerabilities are the ones adversaries weaponize first.', controls: ['vuln_remediation', 'patch'], thresholds: ['crit_vuln_age', 'inet_crit_age'] },
  cloud: { blurb: 'Whether your cloud estate is configured safely. Public exposure and misconfiguration are the leading causes of cloud data loss.', controls: ['cloud_config'], thresholds: ['cloud_misconfig'] },
  data: { blurb: 'Whether sensitive data (PHI) is encrypted and prevented from leaving. Egress through cloud and SaaS is the fastest-growing gap.', controls: ['dlp'], thresholds: ['dlp_incidents'] },
  thirdparty: { blurb: 'Risk inherited from vendors with access to your systems and data. Supply-chain compromise is a top industry trend.', controls: ['third_party_access'], thresholds: ['vendor_findings'] },
  recovery: { blurb: 'Whether you can actually recover from ransomware. Backups that succeed but were never restore-tested are a false sense of safety.', controls: ['backup_restore', 'ir_readiness'], thresholds: ['backup_success', 'restore_test'] },
  governance: { blurb: 'Policy currency, exception management, and oversight — what keeps the program defensible and audit-ready.', controls: ['access_recert'], thresholds: [] },
  appsec: { blurb: 'Security of the software you build and run — SAST/SCA coverage on member-facing applications.', controls: ['appsec_testing'], thresholds: [] },
  network: { blurb: 'Segmentation that limits how far an attacker can move once inside. Flat legacy zones enable lateral movement.', controls: ['net_seg'], thresholds: [] },
  endpoint: { blurb: 'Coverage and prevention posture on workstations and servers via EDR.', controls: ['edr'], thresholds: ['edr_cov'] },
  awareness: { blurb: 'Workforce resilience to phishing and social engineering — training completion and click-rate.', controls: ['awareness', 'email_sec'], thresholds: [] },
};

function Domains({ matrix, controlRisk = [], thresholds = {} }) {
  const [open, setOpen] = useState(null);
  const ctrlById = Object.fromEntries((controlRisk || []).map((c) => [c.id, c]));
  const thrById = Object.fromEntries(((thresholds && thresholds.rows) || []).map((t) => [t.id, t]));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
      {matrix.map((m) => {
        const det = DOMAIN_DETAIL[m.id] || { blurb: '', controls: [], thresholds: [] };
        const ctrls = det.controls.map((id) => ctrlById[id]).filter(Boolean).sort((a, b) => b.riskContribution - a.riskContribution);
        const thrs = det.thresholds.map((id) => thrById[id]).filter(Boolean);
        const breached = thrs.filter((t) => t.status === 'Breach');
        const expanded = open === m.id;
        // Recommended next move: act on the worst breached threshold, else the highest-risk control.
        const nextMove = (breached[0] && breached[0].action) || (ctrls[0] && ctrls[0].action)
          || (m.topDeteriorating ? `Address ${m.topDeteriorating.metric}.` : null);
        return (
          <div key={m.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${C[m.status]}`, borderRadius: 7, padding: '13px 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{m.name}{m.weight > 0 && <span style={{ fontSize: 9.5, color: INK3, fontWeight: 500 }}> · {m.weight}%</span>}</span>
              <Pill text={m.status} color={C[m.status]} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0' }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: sc(m.current) }}>{m.current}</span>
              <span style={{ fontSize: 11, color: INK3 }}>was {m.previous}</span>
              <Trend d={m.delta} />
              <span style={{ marginLeft: 'auto', fontSize: 10, color: m.trend === 'improving' ? '#1a7f37' : m.trend === 'deteriorating' ? '#cf222e' : INK3, fontWeight: 600, textTransform: 'capitalize' }}>{m.trend}</span>
            </div>
            <Bar value={m.current} />
            <div style={{ fontSize: 10.5, color: INK2, marginTop: 8, lineHeight: 1.5 }}>
              <div>▲ <span style={{ color: '#1a7f37' }}>{m.topImproving.metric} (+{m.topImproving.delta})</span></div>
              <div>▼ <span style={{ color: '#cf222e' }}>{m.topDeteriorating.metric} ({m.topDeteriorating.delta})</span></div>
            </div>
            {/* quick status line: breached metrics + risk contributors at a glance */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {breached.length > 0 && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#cf222e', background: '#fdecea', borderRadius: 4, padding: '2px 7px' }}>{breached.length} metric{breached.length > 1 ? 's' : ''} breached</span>}
              {ctrls.length > 0 && <span style={{ fontSize: 9.5, fontWeight: 700, color: INK2, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 4, padding: '2px 7px' }}>{ctrls.length} risk area{ctrls.length > 1 ? 's' : ''}</span>}
            </div>
            <button onClick={() => setOpen(expanded ? null : m.id)}
              style={{ marginTop: 9, background: 'transparent', border: 'none', color: ACCENT, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {expanded ? '▲ Hide detail' : '▼ What this means & what to do'}
            </button>

            {expanded && (
              <div style={{ marginTop: 9, borderTop: `1px solid ${HAIR}`, paddingTop: 10 }}>
                {det.blurb && <div style={{ fontSize: 11.5, color: INK2, lineHeight: 1.55, marginBottom: 10 }}>{det.blurb}</div>}

                {thrs.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Key metrics vs. target</div>
                    {thrs.map((t) => {
                      const breach = t.status === 'Breach';
                      return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '3px 0', fontSize: 11, borderBottom: '1px solid #f6f7f9' }}>
                          <span style={{ flex: 1, color: INK2 }}>{t.name}</span>
                          <span style={{ fontWeight: 700, color: breach ? SEV[t.breachSeverity] : '#1a7f37', fontVariantNumeric: 'tabular-nums' }}>{t.current}{t.unit === '%' ? '%' : ` ${t.unit}`}</span>
                          <span style={{ color: INK3, fontSize: 10 }}>/ {t.threshold}</span>
                          <Pill text={breach ? t.breachSeverity : 'Within'} color={breach ? SEV[t.breachSeverity] : '#1a7f37'} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {ctrls.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Top risk contributors</div>
                    {ctrls.slice(0, 4).map((c) => (
                      <div key={c.id} style={{ padding: '4px 0', borderBottom: '1px solid #f6f7f9' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: INK }}>{c.name}</span>
                          <span style={{ fontSize: 9.5, color: INK3 }}>{c.likelihood}×{c.impact}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: c.riskContribution >= 80 ? '#cf222e' : '#c2410c', fontVariantNumeric: 'tabular-nums', width: 24, textAlign: 'right' }}>{c.riskContribution}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: '#1a7f37', marginTop: 1 }}>→ {c.action}</div>
                      </div>
                    ))}
                  </div>
                )}

                {nextMove && (
                  <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 6, padding: '8px 11px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#1a7f37', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Recommended next move</div>
                    <div style={{ fontSize: 11.5, color: INK }}>{nextMove}</div>
                  </div>
                )}
              </div>
            )}
            <div style={{ fontSize: 9.5, color: INK3, marginTop: 8 }}>Source: {m.source}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Control Risk Contribution ---------------- */
function Controls({ rows }) {
  const [open, setOpen] = useState(null);
  const total = rows.length;
  const high = rows.filter((c) => c.riskContribution >= 80).length;
  const sum = rows.reduce((s, c) => s + c.riskContribution, 0) || 1;
  const top3 = rows.slice(0, 3).reduce((s, c) => s + c.riskContribution, 0);
  const concentration = Math.round((top3 / sum) * 100);
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {/* Concentration summary — where the risk actually sits, and where to start */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline', background: '#fbfcfe', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '9px 13px', marginBottom: 4, fontSize: 11.5, color: INK2 }}>
        <span><strong style={{ color: INK, fontSize: 13 }}>{total}</strong> control areas ranked by risk</span>
        <span><strong style={{ color: '#cf222e' }}>{high}</strong> in the high band (≥80)</span>
        <span>Top 3 drive <strong style={{ color: INK }}>{concentration}%</strong> of total risk</span>
        {rows[0] && <span style={{ marginLeft: 'auto', color: '#1a7f37', fontWeight: 600 }}>Start here → {rows[0].action}</span>}
      </div>
      {rows.map((c) => (
        <div key={c.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => setOpen(open === c.id ? null : c.id)} style={{ width: '100%', textAlign: 'left', background: open === c.id ? PANEL : '#fff', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: INK3, width: 22 }}>#{c.rank}</span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{c.name}<span style={{ fontSize: 9.5, color: INK3, fontWeight: 500, marginLeft: 8 }}>{c.csf} · {c.cis}</span></span>
            <span style={{ width: 120 }}><Bar value={c.riskContribution} color={c.riskContribution >= 80 ? '#cf222e' : c.riskContribution >= 60 ? '#c2410c' : '#9a6700'} /></span>
            <span style={{ fontSize: 13, fontWeight: 800, color: c.riskContribution >= 80 ? '#cf222e' : '#c2410c', width: 30, textAlign: 'right' }}>{c.riskContribution}</span>
          </button>
          {open === c.id && (
            <div style={{ padding: '4px 14px 14px 48px', background: PANEL, fontSize: 11.5, color: INK2, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                <span>Likelihood <strong style={{ color: INK }}>{c.likelihood}</strong></span>
                <span>Impact <strong style={{ color: INK }}>{c.impact}</strong></span>
                <span>Blast radius <strong style={{ color: INK }}>{c.blastRadius}</strong></span>
                <span>Process <strong style={{ color: INK }}>{c.processAffected}</strong></span>
              </div>
              <div>Threat relevance: {c.threatRelevance}</div>
              <div>Evidence: {c.evidence}</div>
              <div style={{ marginTop: 6, color: '#1a7f37', fontWeight: 600 }}>→ {c.action}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Thresholds ---------------- */
function Thresholds({ board }) {
  // Breaches first, worst severity first, so the appetite violations lead.
  const sevOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const sorted = [...board.rows].sort((a, b) => {
    const ab = a.status === 'Breach', bb = b.status === 'Breach';
    if (ab !== bb) return ab ? -1 : 1;
    if (ab && bb) return (sevOrder[a.breachSeverity] ?? 9) - (sevOrder[b.breachSeverity] ?? 9);
    return 0;
  });
  // Distance to the limit, in the threshold's own unit.
  const gap = (t) => {
    const over = t.direction === 'lte' ? t.current - t.limit : t.limit - t.current;
    const u = t.unit === '%' ? '%' : ` ${t.unit}`;
    return t.status === 'Breach' ? `${Math.abs(over)}${u} past limit` : `${Math.abs(over)}${u} of headroom`;
  };
  return (
    <div>
      <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>
        <strong style={{ color: board.breaches ? '#cf222e' : '#1a7f37' }}>{board.breaches} of {board.total}</strong> thresholds breached ({board.critical} critical). Breaches are risk-appetite violations — they lead the list below.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {sorted.map((t) => {
          const breach = t.status === 'Breach';
          return (
            <div key={t.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${breach ? SEV[t.breachSeverity] : '#1a7f37'}`, borderRadius: 6, padding: '10px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: INK, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{t.provenance && <Provenance prov={t.provenance} />}{t.name}</span>
                <Pill text={breach ? t.breachSeverity : 'Within'} color={breach ? SEV[t.breachSeverity] : '#1a7f37'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '5px 0' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: breach ? SEV[t.breachSeverity] : '#1a7f37' }}>{t.current}{t.unit === '%' ? '%' : ''}</span>
                <span style={{ fontSize: 11, color: INK3 }}>{t.unit !== '%' ? t.unit + ' · ' : ''}threshold {t.threshold}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: t.trend === 'improving' ? '#1a7f37' : t.trend === 'worsening' ? '#cf222e' : INK3, textTransform: 'capitalize' }}>{t.trend}</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: breach ? SEV[t.breachSeverity] : '#1a7f37' }}>{gap(t)}</div>
              {breach && <div style={{ fontSize: 10.5, color: INK2, marginTop: 4 }}>→ {t.action}</div>}
              <div style={{ fontSize: 9.5, color: INK3, marginTop: 4 }}>{t.policyRef}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Action-Now Queue + Attention ---------------- */
function Actions({ queue, attention }) {
  // One prioritized list instead of two parallel columns. Each item is tagged by
  // what it needs from you: "Action" = a remediation task you delegate/ticket;
  // "Decision" = needs your explicit executive sign-off.
  const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const items = [
    ...(queue || []).map((a) => ({
      key: `act:${a.id}`, kind: 'action', sev: numSev(a.severity), rank: a.rank,
      title: a.action, why: a.whyNow, protects: a.process, owner: a.owner, due: a.dueDate,
      automation: a.automation, escalation: a.escalation, raw: a,
    })),
    ...(attention || []).map((a) => ({
      key: `attn:${a.id}`, kind: 'decision', sev: a.severity, rank: null,
      title: a.title, why: a.businessImpact, decision: a.decision, owner: a.owner, due: a.targetDate,
      escalationPath: a.escalationPath, blockers: a.blockers, process: a.process, raw: a,
    })),
  ].sort((x, y) => (sevRank[x.sev] ?? 9) - (sevRank[y.sev] ?? 9) || (x.rank ?? 99) - (y.rank ?? 99));

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Actions &amp; decisions <span style={{ fontWeight: 400, textTransform: 'none' }}>(ranked by severity × urgency × impact)</span></div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((it) => {
          const c = it.sev === 'Critical' ? '#cf222e' : it.sev === 'High' ? '#c2410c' : it.sev === 'Medium' ? '#9a6700' : '#1a7f37';
          const isDecision = it.kind === 'decision';
          return (
            <div key={it.key} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${c}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ flexShrink: 0, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDecision ? '#5e6ad2' : INK3, background: isDecision ? (SOFT['#5e6ad2'] || PANEL) : PANEL, borderRadius: 999, padding: '2px 8px' }}>{isDecision ? 'Decision' : 'Action'}</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{it.title}</span>
                <Pill text={it.sev} color={c} />
              </div>
              <div style={{ fontSize: 11, color: INK2, marginTop: 6, lineHeight: 1.5 }}>{isDecision ? it.why : `Why now: ${it.why}`}</div>
              {it.decision && <div style={{ fontSize: 10.5, color: '#1a7f37', fontWeight: 600, marginTop: 5 }}>→ Decision needed: {it.decision}</div>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: INK3, marginTop: 6 }}>
                {it.protects && <span>Protects <strong style={{ color: INK2 }}>{it.protects}</strong></span>}
                <span>Owner <strong style={{ color: INK2 }}>{it.owner}</strong></span>
                <span>Due <strong style={{ color: INK2 }}>{it.due}</strong></span>
                {it.automation && it.automation !== 'n/a' && <span>⚙ {it.automation}</span>}
                {it.blockers && <span>blocker: {it.blockers}</span>}
              </div>
              <div style={{ marginTop: 9 }}>
                {isDecision || it.escalation
                  ? <RiskDecision sourceRef={it.key} title={it.title} recommendation={it.decision || `Authorize and assign: ${it.title}`} owner={it.owner} escalationPath={it.escalationPath || 'CISO → executive sponsor'} severity={it.sev} processName={it.process} />
                  : <TicketControl sourceRef={it.key} title={`[Action] ${it.title}`} recommendation={it.title} severity={it.sev} owner={it.owner} dueDate={it.due} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Business Process Protection ---------------- */
function Processes({ procs }) {
  const cols = ['identityRisk', 'vulnRisk', 'detectionCoverage', 'dataProtection', 'recoveryReadiness', 'thirdPartyRisk'];
  const labels = { identityRisk: 'Identity', vulnRisk: 'Vuln', detectionCoverage: 'Detection', dataProtection: 'Data', recoveryReadiness: 'Recovery', thirdPartyRisk: '3rd-party' };
  const cell = (v, isRisk) => {
    // risk fields: High = bad; coverage fields: High = good
    const good = isRisk ? (v === 'Low') : (v === 'High');
    const bad = isRisk ? (v === 'High') : (v === 'Low');
    return bad ? '#cf222e' : good ? '#1a7f37' : '#9a6700';
  };
  const isRisk = (k) => /Risk/.test(k);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead><tr style={{ color: INK3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px' }}>Critical Process</th>
          <th style={{ padding: '6px 8px' }}>Protection</th>
          {cols.map((c) => <th key={c} style={{ padding: '6px 6px' }}>{labels[c]}</th>)}
          <th style={{ padding: '6px 8px' }}>Resilience</th>
        </tr></thead>
        <tbody>
          {procs.map((p) => (
            <tr key={p.id} style={{ borderTop: `1px solid ${HAIR}` }}>
              <td style={{ padding: '9px 8px' }}>
                <div style={{ fontWeight: 700, color: INK, display: 'flex', alignItems: 'center', gap: 5 }}>{p.provenance && <Provenance prov={p.provenance} />}{p.name}</div>
                <div style={{ fontSize: 9.5, color: INK3 }}>{p.supportingSystems.join(' · ')}</div>
              </td>
              <td style={{ padding: '9px 8px', width: 110 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontWeight: 800, color: sc(p.protectionLevel) }}>{p.protectionLevel}</span><div style={{ flex: 1 }}><Bar value={p.protectionLevel} /></div></div>
              </td>
              {cols.map((c) => (
                <td key={c} style={{ padding: '9px 6px', textAlign: 'center' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: cell(p[c], isRisk(c)), borderRadius: 3, padding: '2px 7px' }}>{p[c]}</span>
                </td>
              ))}
              <td style={{ padding: '9px 8px', textAlign: 'center' }}><Pill text={p.resilienceRating} color={C[p.resilienceRating] || INK3} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: INK3, marginTop: 8 }}>Risk columns: red = high risk. Coverage columns: green = strong. Connects security controls to the business.</div>
    </div>
  );
}

/* ---------------- Attack Pathways ---------------- */
// Attack Path tab — the Azure-style security graph is the attack-pathway view.
function PathsTab({ attackGraph }) {
  return <div>{attackGraph || <div style={{ fontSize: 12, color: INK3 }}>Live threat graph unavailable.</div>}</div>;
}

/* ---------------- Readiness + Investment + Peers + Emerging ---------------- */
function Readiness({ readiness, investments, peers, emerging }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cyber-Event Readiness</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: sc(readiness.overall) }}>{readiness.overall}</span>
          <Pill text={readiness.rating} color={C[readiness.rating]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 6 }}>
          {readiness.items.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 5, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 11, color: INK, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{r.provenance && <Provenance prov={r.provenance} />}{r.name}</span><span style={{ fontSize: 12, fontWeight: 700, color: sc(r.score) }}>{r.score}</span></div>
              <div style={{ marginTop: 4 }}><Bar value={r.score} /></div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Investment → Measurable Risk Reduction</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: 8 }}>
          {investments.map((iv) => (
            <div key={iv.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '11px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, fontWeight: 700, color: INK, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{iv.provenance && <Provenance prov={iv.provenance} />}{iv.name}</span><span style={{ fontSize: 11, color: INK3 }}>{iv.spend}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0', fontSize: 11 }}>
                <span style={{ color: INK3 }}>risk {iv.baselineRisk}</span><span style={{ color: '#c2410c' }}>→</span><span style={{ fontWeight: 700, color: '#1a7f37' }}>{iv.currentRisk}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#1a7f37' }}>−{iv.riskReduction} pts</span>
              </div>
              <div style={{ fontSize: 10.5, color: INK2 }}>{iv.riskArea} · +{iv.futureReduction} expected{iv.blockers ? ` · blocker: ${iv.blockers}` : ''}</div>
              {/Approve|Fund|Mandate/.test(iv.decision) && <div style={{ fontSize: 10.5, color: '#cf222e', fontWeight: 600, marginTop: 4 }}>Decision: {iv.decision}</div>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Where We Trail Peer Maturity</div>
          {peers.map((p) => (
            <div key={p.domain} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 11.5, color: INK }}>{p.domain}</span>
              <span style={{ fontSize: 11, color: INK3 }}>us {p.us} · peer {p.peerMedian}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#cf222e', width: 36, textAlign: 'right' }}>{p.gap}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Emerging Faster Than We Adapt</div>
          {emerging.map((e) => (
            <div key={e.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 5, padding: '8px 10px', marginBottom: 6 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: INK }}>{e.risk}</div>
              <div style={{ fontSize: 10, color: INK2, marginTop: 2 }}>Velocity <strong style={{ color: '#cf222e' }}>{e.velocity}</strong> · our adaptation <strong>{e.ourAdaptation}</strong> — {e.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Hidden Risk ---------------- */
function Hidden({ risks }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px,1fr))', gap: 10 }}>
      {risks.map((h) => (
        <div key={h.id} style={{ border: `1px solid ${HAIR}`, borderLeft: '4px solid #7c3aed', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{h.risk}</div>
          <div style={{ fontSize: 11, color: INK2, marginTop: 5, lineHeight: 1.5 }}><strong>Why hidden:</strong> {h.whyHidden}</div>
          <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}><strong>Evidence:</strong> {h.evidence}</div>
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 6 }}>{h.domain} · {h.process}</div>
          <div style={{ fontSize: 11, color: INK, marginTop: 5 }}>Impact: {h.impact}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
            <Pill text={h.formalAcceptance === false ? 'No formal acceptance' : h.formalAcceptance === 'expired' ? 'Exception expired' : 'Accepted'} color={h.formalAcceptance === true ? '#1a7f37' : '#cf222e'} />
          </div>
          <div style={{ fontSize: 10.5, color: '#7c3aed', fontWeight: 600, marginTop: 6 }}>→ {h.escalation}</div>
          <RiskDecision sourceRef={`hidden:${h.id}`} title={h.risk} recommendation={h.escalation}
            severity={h.formalAcceptance === true ? 'Medium' : 'High'} processName={h.process}
            escalationPath="CISO → executive sponsor" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Export executive summary ---------------- */
function exportSummary(d) {
  const p = d.overallPosture;
  const L = [];
  L.push(`CISO SECURITY POSTURE — EXECUTIVE SUMMARY`);
  L.push(`Generated ${new Date(d.generatedAt).toLocaleString()}`);
  L.push(``);
  L.push(`OVERALL POSTURE: ${p.current}/100 (${band(p.current)}) — ${p.delta >= 0 ? '+' : ''}${p.delta} vs last period (${p.previous}). Trend: ${p.trend}. Confidence: ${p.confidence}.`);
  L.push(p.narrative);
  L.push(``);
  L.push(`THRESHOLDS: ${d.thresholds.breaches}/${d.thresholds.total} breached (${d.thresholds.critical} critical).`);
  L.push(`READINESS: ${d.readiness.overall}/100 (${d.readiness.rating}).`);
  L.push(``);
  L.push(`TOP ACTIONS NOW:`);
  d.actionQueue.slice(0, 5).forEach((a) => L.push(`  #${a.rank} ${a.action} — owner ${a.owner}, due ${a.dueDate}${a.escalation ? ' [ESCALATE]' : ''}`));
  L.push(``);
  L.push(`EXECUTIVE Q&A:`);
  d.questions.forEach((a) => {
    L.push(`Q${a.n}. ${a.question}`);
    L.push(`  Answer: ${a.answer}`);
    L.push(`  Confidence: ${a.confidence} | Status: ${a.status}`);
    L.push(`  Recommended: ${a.recommendedAction} (Owner: ${a.owner}, Target: ${a.targetDate})`);
    L.push(``);
  });
  const blob = new Blob([L.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `ciso-executive-summary-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

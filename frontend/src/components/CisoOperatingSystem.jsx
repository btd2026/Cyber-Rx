/**
 * CisoOperatingSystem — the executive "operating system" seat view, ported to
 * match design-reference/cyberrx-ciso-os.html EXACTLY (structure, copy, order,
 * behavior) on the design tokens (cyberrx-design-tokens.css). The MOCK is the
 * source of truth; this is a 1:1 reconstruction on the tokens, not a redesign.
 *
 * Kept from the app: auth, routing plumbing (go), data fetching, backend. Replaced:
 * everything the user sees. Copy that maps to real data should be bound where it
 * exists; everything here currently mirrors the mock's sample copy verbatim and is
 * marked (TODO real data) — no invented numbers beyond the mock's own samples.
 *
 * Fonts: Space Grotesk (display) · Public Sans (body) · JetBrains Mono (evidence).
 * Accent/brand = blue (--brand). Status: amber=exposure, green=pass, red=critical.
 * Light "Paper" default; dark "Command" via data-theme="dark". Reduced-motion respected.
 */

import { useRef, useState } from 'react';
import ThemeToggle from './ThemeToggle';

/* ---- "View as" seats — exact order from the mock --------------------------- */
const SEATS = ['CEO', 'CISO', 'CFO', 'CIO', 'CLO', 'CRO', 'Board'];

/* Deep-dive target (legacy analytical dashboard) per seat. */
const DEEP_KEY = { CISO: 'dashboard', CIO: 'cio', CFO: 'cfo', CRO: 'cro', CLO: 'clo', Board: 'boarddash' };

/* ---- CISO per-seat tabs — exact names/order/badges/questions from the mock -- */
const CISO_TABS = [
  { key: 'summary', name: 'Exec Summary', icon: '⌂' },
  { key: 'operational', name: 'Operational Status', badge: '1', q: 'Can we operate today?' },
  { key: 'exposure', name: 'Material Exposure', badge: '2', q: 'What could hurt the business?' },
  { key: 'action', name: 'Action Center', badge: '3', q: 'What needs action?' },
  { key: 'trajectory', name: 'Trajectory', badge: '4', q: 'Are we getting better?' },
  { key: 'response', name: 'Response & Investment', badge: '+', q: 'What are we doing about it?' },
];

/* ===========================================================================
 * Top-level component
 * ======================================================================== */
export default function CisoOperatingSystem({ go, initialSeat } = {}) {
  const startSeat = (initialSeat || 'ciso').toUpperCase();
  const [seat, setSeat] = useState(SEATS.includes(startSeat) ? startSeat : 'CISO');
  const [tab, setTab] = useState('summary');
  const tabRefs = useRef([]);

  // Switching seats resets to its Exec Summary (the only summarizing page).
  const selectSeat = (s) => { setSeat(s); setTab('summary'); };

  const tabs = CISO_TABS; // only CISO is fully ported in this step
  const onTabsKeyDown = (e) => {
    const n = tabs.length;
    const cur = tabs.findIndex((t) => t.key === tab);
    let next = null;
    if (e.key === 'ArrowRight') next = (cur + 1) % n;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next != null) { e.preventDefault(); setTab(tabs[next].key); const el = tabRefs.current[next]; if (el) el.focus(); }
  };

  const deep = DEEP_KEY[seat];

  return (
    <div className="crx-room crx-grain cos-app">
      <CosStyles />
      <div className="cos-shell">
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <header className="cos-topbar">
          <div className="cos-brand">
            <span className="cos-brandmark" aria-hidden="true">Rx</span>
            <span className="cos-brandname">CyberRx</span>
            <span className="cos-brandsep" aria-hidden="true" />
            <span className="cos-brandseat">{seat} · OPERATING SYSTEM</span>
          </div>
          <div className="cos-topright">
            <span className="cos-live"><span className="cos-live__dot" aria-hidden="true" />LIVE · 14:09</span>
            <ThemeToggle />
          </div>
        </header>

        {/* ── "View as" seat switcher ─────────────────────────────── */}
        <div className="cos-viewas" role="tablist" aria-label="View as">
          <span className="cos-viewas__label">View as</span>
          {SEATS.map((s) => (
            <button key={s} role="tab" aria-selected={seat === s}
              className={`cos-seat${seat === s ? ' is-on' : ''}`} onClick={() => selectSeat(s)}>
              {s}
            </button>
          ))}
        </div>

        {/* ── Per-seat tabs ───────────────────────────────────────── */}
        <div className="cos-tabsrow">
          <div className="cos-tabs" role="tablist" aria-label={`${seat} views`} onKeyDown={onTabsKeyDown}>
            {tabs.map((t, i) => {
              const on = t.key === tab;
              return (
                <button key={t.key} ref={(el) => { tabRefs.current[i] = el; }} role="tab"
                  id={`cos-tab-${t.key}`} aria-controls={`cos-panel-${t.key}`} aria-selected={on}
                  tabIndex={on ? 0 : -1} className={`cos-tab${on ? ' is-on' : ''}`} onClick={() => setTab(t.key)}>
                  <span className="cos-tab__top">
                    {t.icon && <span className="cos-tab__icon" aria-hidden="true">{t.icon}</span>}
                    {t.badge && <span className="cos-tab__badge" aria-hidden="true">{t.badge}</span>}
                    <span className="cos-tab__name">{t.name}</span>
                  </span>
                  {t.q && <span className="cos-tab__q">›&nbsp;{t.q}</span>}
                </button>
              );
            })}
          </div>
          {deep && (
            <button type="button" className="cos-deepdive" onClick={() => go && go(deep)}>
              Deep dive ▸
            </button>
          )}
        </div>

        {/* ── Tab panel ───────────────────────────────────────────── */}
        <div role="tabpanel" id={`cos-panel-${tab}`} aria-labelledby={`cos-tab-${tab}`} tabIndex={0} className="cos-panel">
          {seat === 'CISO'
            ? <CisoPanels tab={tab} goTab={setTab} />
            : <SeatPlaceholder seat={seat} />}
        </div>

        <footer className="cos-footer">
          CyberRx · executive operating system — illustrative mockup with sample data
        </footer>
      </div>
    </div>
  );
}

/* Seats other than CISO are ported in the next step. */
function SeatPlaceholder({ seat }) {
  return (
    <div className="cos-section">
      {/* TODO: real data — port the {seat} seat to match the mock, like CISO. */}
      <p className="cos-lede">The <strong>{seat}</strong> seat is being ported to the mock next. The CISO seat is fully live now.</p>
    </div>
  );
}

/* ===========================================================================
 * CISO panels
 * ======================================================================== */
function CisoPanels({ tab, goTab }) {
  if (tab === 'summary') return <CisoSummary goTab={goTab} />;
  if (tab === 'operational') return <CisoOperational goTab={goTab} />;
  if (tab === 'exposure') return <CisoExposure />;
  if (tab === 'action') return <CisoAction />;
  if (tab === 'trajectory') return <CisoTrajectory />;
  if (tab === 'response') return <CisoResponse />;
  return null;
}

/* Small building blocks ------------------------------------------------------ */
function Pill({ kind, children }) { return <span className={`pill ${kind}`}>{children}</span>; }

function PanelHead({ name, pill, pillKind, question, lede }) {
  return (
    <div className="cos-panelhead">
      <div className="cos-panelhead__top">
        <span className="cos-kicker">{name}</span>
        {pill && <Pill kind={pillKind}>{pill}</Pill>}
      </div>
      <h2 className="cos-verdict">{question}</h2>
      {lede && <p className="cos-lede">{lede}</p>}
    </div>
  );
}

/* ---- 1 · Exec Summary ------------------------------------------------------ */
const SUMMARY_METRICS = [
  { label: 'Overall posture', value: '82', delta: '↑+4', deltaKind: 'pass', to: 'trajectory' },
  { label: 'Risk exposure', value: 'Medium', to: 'exposure' },
  { label: 'Regulatory readiness', value: '91%', to: 'trajectory' },
  { label: 'Operational resilience', value: '78%', delta: '→', deltaKind: 'muted', to: 'operational' },
  { label: 'Critical actions', value: '3', to: 'action' },
  { label: 'Board attention', value: '1', to: 'action' },
];
const SUMMARY_QUESTIONS = [
  { n: '1', q: 'Can we operate today?', a: 'Yes — every critical service is running; claims is on a compensating control. Recovery within tolerance.', pill: 'OPERATING', kind: 'pass', to: 'operational' },
  { n: '2', q: 'What could hurt the business?', a: '5 critical processes at risk. Claims Processing High and rising; one open ransomware path to PHI.', pill: '1 HIGH ↑', kind: 'exposure', to: 'exposure' },
  { n: '3', q: 'What needs action?', a: '9 items: 3 decisions for you (2 critical), 6 owned by others. Nothing overdue.', pill: '2 CRITICAL', kind: 'critical', to: 'action' },
  { n: '4', q: 'Are we getting better?', a: 'Improving overall (+4). IAM, cloud, endpoint up. Third-party, recovery testing, AI governance down.', pill: 'IMPROVING ↑', kind: 'pass', to: 'trajectory' },
  { n: '+', q: 'What are we doing about it?', a: 'PAM rollout 60%; recovery modernization funded. 2 projects await your funding decision.', pill: 'ON TRACK', kind: 'pass', to: 'response' },
];

function CisoSummary({ goTab }) {
  return (
    <div className="cos-stack">
      <div className="cos-panelhead">
        <span className="cos-kicker">Executive summary · synced 14:09</span>
        <div className="cos-summaryverdict">
          <h2 className="cos-verdict">Cyber risk is understood, managed, and within tolerance today.</h2>
          <Pill kind="exposure">1 exposure contained</Pill>
        </div>
        <p className="cos-lede">One control failure on claims processing is contained and nothing requires the business to stop. Posture is up 4% this month; third-party risk is the one area drifting out of tolerance.</p>
      </div>

      {/* 6-tile metric band — every tile routes to the view that explains it */}
      <div className="cos-metricband">
        {SUMMARY_METRICS.map((m) => (
          <button key={m.label} type="button" className="cos-metric" onClick={() => goTab(m.to)}
            aria-label={`${m.label}: ${m.value}. Open detail.`}>
            <span className="cos-metric__label">{m.label}</span>
            <span className="cos-metric__valrow">
              <span className="cos-metric__value">{m.value}</span>
              {m.delta && <span className={`cos-metric__delta cos-delta--${m.deltaKind}`}>{m.delta}</span>}
            </span>
            <span className="cos-metric__arrow" aria-hidden="true">▸</span>
          </button>
        ))}
      </div>

      {/* The five questions, answered */}
      <section className="cos-section">
        <div className="cos-sectionhead">
          <h3>The five questions, answered</h3>
          <span className="cos-sectionhead__hint">click any to open its detail</span>
        </div>
        <div className="cos-qlist">
          {SUMMARY_QUESTIONS.map((row) => (
            <button key={row.n} type="button" className="cos-qrow" onClick={() => goTab(row.to)}>
              <span className="cos-qnum" aria-hidden="true">{row.n}</span>
              <span className="cos-qbody">
                <span className="cos-qq">{row.q}</span>
                <span className="cos-qa">{row.a}</span>
              </span>
              <span className="cos-qmeta">
                <Pill kind={row.kind}>{row.pill}</Pill>
                <span className="cos-qarrow" aria-hidden="true">▸</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---- 2 · Operational Status ----------------------------------------------- */
const OPS_LIVE = [
  { k: 'Active intrusions / confirmed compromise', v: 'None', mark: 'pass' },
  { k: 'Critical controls validated holding', sub: 'tested against live evidence', v: '1,238 / 1,240' },
  { k: 'Attacks blocked, last 24h', sub: 'identity + perimeter', v: '4,102 blocked' },
  { k: 'Highest live threat', sub: 'phishing → claims staff', v: 'Elevated', vkind: 'exposure' },
];
const OPS_EXPOSURE = [
  { k: 'Claims processing control failed; compensating control verified holding', v: 'Contained', vkind: 'pass' },
  { k: 'Ransomware path to claims DB open, contained, not yet closed', v: 'Open · watched', vkind: 'exposure' },
  { k: 'Internet-facing critical vulnerabilities', v: '0 unpatched', mark: 'pass' },
  { k: 'Privileged access gaps', sub: 'PAM 60% deployed', v: 'Gap remains', vkind: 'exposure' },
];
const OPS_READINESS = [
  { k: 'Mean time to detect / contain', v: '8 min / 41 min' },
  { k: 'Incidents requiring your decision right now', v: '0' },
  { k: 'Could any current exposure force a takedown of a critical service today?', v: 'No — all contained & monitored', vkind: 'pass' },
];

function OpsRows({ rows }) {
  return (
    <div className="cos-rows">
      {rows.map((r, i) => (
        <div key={i} className="cos-row">
          <span className="cos-row__k">{r.k}{r.sub && <span className="cos-row__sub">{r.sub}</span>}</span>
          <span className={`cos-row__v${r.vkind ? ` cos-v--${r.vkind}` : ''}`}>
            {r.mark === 'pass' && <span className="cos-check" aria-hidden="true">✓ </span>}{r.v}
          </span>
        </div>
      ))}
    </div>
  );
}

function CisoOperational({ goTab }) {
  return (
    <div className="cos-stack">
      <PanelHead name="Operational Status" pill="YES — NO ACTIVE COMPROMISE" pillKind="pass"
        question="Can we operate today?"
        lede={'Not “are the systems up” — that’s IT. The security answer: are we under attack, are our defenses holding right now, and is anything one step from forcing a service down?'} />

      <Section title="Live threat & defense status"><OpsRows rows={OPS_LIVE} /></Section>
      <Section title="Open exposure that could force us down"><OpsRows rows={OPS_EXPOSURE} /></Section>
      <Section title="Containment & response readiness"><OpsRows rows={OPS_READINESS} /></Section>

      <p className="cos-note">
        The one open path — ransomware to the claims database — is contained and under watch. If it were exploited,
        claims would resume in ~3.5 days; closing it (PAM rollout) is the top decision in{' '}
        <button type="button" className="cos-inlink" onClick={() => goTab('action')}>What needs action ▸</button>.
      </p>
    </div>
  );
}

/* ---- 3 · Material Exposure ------------------------------------------------- */
const PROCESSES = [
  { name: 'Claims Processing', sub: 'Core revenue engine', risk: 'High', trend: '↑', exposed: '$220M/day if down · open ransomware path to claims DB' },
  { name: 'AI-Assisted Claims Review', sub: 'New, fast-growing', risk: 'High', trend: '↑', exposed: 'Ungoverned model decisions touching PHI' },
  { name: 'Call Center Operations', risk: 'Medium', trend: '↑', exposed: 'Vendor-dependent; identity exposure' },
  { name: 'Member Portal', risk: 'Medium', trend: '→', exposed: 'Internet-facing; credential-stuffing pressure' },
  { name: 'Provider Payments', risk: 'Low', trend: '↓', exposed: 'Well-controlled; monitored' },
];
const RISK_KIND = { High: 'critical', Medium: 'exposure', Low: 'pass' };
const PATH_STEPS = ['Phishing email', 'Compromised user', 'Privilege escalation', 'Active Directory', 'Claims database', 'PHI exposure'];
const PATH_STATS = [
  { k: 'Likelihood', v: 'High' },
  { k: 'Control effectiveness', v: 'Medium' },
  { k: 'Blast radius', v: '2.4M records' },
  { k: 'Time to contain', v: '~6 hrs' },
];

function CisoExposure() {
  return (
    <div className="cos-stack">
      <PanelHead name="Material Exposure" pill="1 HIGH & RISING" pillKind="exposure"
        question="What could hurt the business?"
        lede="Exposure expressed as business processes, not servers — and the single most likely path to our crown jewels." />

      <Section title="Business processes at risk">
        <table className="cos-table">
          <thead>
            <tr><th>Process</th><th>Risk</th><th>Trend</th><th>What’s exposed</th></tr>
          </thead>
          <tbody>
            {PROCESSES.map((p) => (
              <tr key={p.name}>
                <td><span className="cos-td-name">{p.name}</span>{p.sub && <span className="cos-td-sub">{p.sub}</span>}</td>
                <td><Pill kind={RISK_KIND[p.risk]}>{p.risk}</Pill></td>
                <td><span className={`cos-trend cos-trend--${p.trend === '↑' ? 'up' : p.trend === '↓' ? 'down' : 'flat'}`}>{p.trend}</span></td>
                <td className="cos-td-exposed">{p.exposed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Most likely path to the crown jewels">
        <div className="cos-pathchain">
          {PATH_STEPS.map((s, i) => (
            <span key={s} className="cos-pathstep">
              <span className="cos-pathstep__box">{s}</span>
              {i < PATH_STEPS.length - 1 && <span className="cos-pathstep__arr" aria-hidden="true">→</span>}
            </span>
          ))}
        </div>
        <div className="cos-statgrid">
          {PATH_STATS.map((s) => (
            <div key={s.k} className="cos-stat">
              <span className="cos-stat__k">{s.k}</span>
              <span className="cos-stat__v">{s.v}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---- 4 · Action Center ----------------------------------------------------- */
const DECISIONS = [
  { sev: 'CRITICAL', kind: 'critical', title: 'Legacy claims platform — $220M/day revenue exposure.', owner: 'Owner: CIO · Fund modernization' },
  { sev: 'CRITICAL', kind: 'critical', title: 'Open ransomware path to the claims database.', owner: 'Owner: CISO · Accelerate PAM rollout' },
  { sev: 'HIGH', kind: 'exposure', title: 'Vendor access risk — PHI exposure via NASCO.', owner: 'Owner: CRO · Accept or mitigate' },
];
const OTHERS = [
  { task: 'Third-party risk report review', owner: 'Owner: Risk team', due: 'Due Thu' },
  { task: 'IAM onboarding budget approval', owner: 'Owner: Finance', due: 'Due Fri' },
  { task: 'Validate tabletop results', owner: 'Owner: SecOps', due: 'Due Fri' },
];
const INFO = [
  { k: 'MFA coverage', v: '↑ +8%' },
  { k: 'Mean time to detect', v: '↑ 15% faster' },
];

function CisoAction() {
  return (
    <div className="cos-stack">
      <PanelHead name="Action Center" pill="2 CRITICAL" pillKind="critical"
        question="What needs action?"
        lede="Sorted by who owns it, so nothing waits on the wrong person. Nothing here is overdue — yet." />

      <Section title="Your decisions — today">
        <div className="cos-decisions">
          {DECISIONS.map((d, i) => (
            <article key={i} className={`decision-card cos-dc cos-dc--${d.kind}`}>
              <Pill kind={d.kind}>{d.sev}</Pill>
              <p className="cos-dc__title">{d.title}</p>
              <p className="cos-dc__owner">{d.owner}</p>
            </article>
          ))}
        </div>
        <button type="button" className="btn-primary cos-btn">Generate board package →</button>
      </Section>

      <Section title="Others’ actions — this week">
        <div className="cos-rows">
          {OTHERS.map((o, i) => (
            <div key={i} className="cos-row cos-row--3">
              <span className="cos-row__k">{o.task}</span>
              <span className="cos-row__owner">{o.owner}</span>
              <span className="cos-due">{o.due}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Informational — no action">
        <div className="cos-rows">
          {INFO.map((it, i) => (
            <div key={i} className="cos-row">
              <span className="cos-row__k">{it.k}</span>
              <span className="cos-row__v cos-v--pass">{it.v}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---- 5 · Trajectory -------------------------------------------------------- */
/* TODO: real data — placeholder posture series mirroring the mock's "Improving". */
const POSTURE = {
  quarterly: [{ label: 'Q1', value: 70 }, { label: 'Q2', value: 74 }, { label: 'Q3', value: 78 }, { label: 'Q4', value: 82 }],
  monthly: [{ label: 'Mar', value: 76 }, { label: 'Apr', value: 78 }, { label: 'May', value: 80 }, { label: 'Jun', value: 82 }],
  target: 85,
};
const UP = ['Identity & access (IAM)', 'Cloud security', 'Endpoint protection'];
const DOWN = ['Third-party risk', 'Recovery testing', 'AI governance'];

function CisoTrajectory() {
  const [range, setRange] = useState('quarterly');
  const series = POSTURE[range];
  return (
    <div className="cos-stack">
      <PanelHead name="Trajectory" pill="IMPROVING" pillKind="pass"
        question="Are we getting better?"
        lede="Posture trend against the board-set target, and exactly where attention is needed." />

      <Section title="Posture vs. target"
        action={
          <div className="cos-seg" role="group" aria-label="Range">
            <button type="button" className={`cos-seg__b${range === 'quarterly' ? ' is-on' : ''}`} aria-pressed={range === 'quarterly'} onClick={() => setRange('quarterly')}>Quarterly</button>
            <button type="button" className={`cos-seg__b${range === 'monthly' ? ' is-on' : ''}`} aria-pressed={range === 'monthly'} onClick={() => setRange('monthly')}>Monthly</button>
          </div>
        }>
        <PostureChart series={series} target={POSTURE.target} />
        <p className="cos-chartcaption"><span className="pill pass">Improving</span></p>
      </Section>

      <div className="cos-twocol">
        <Section title="Up this quarter" tone="pass">
          <ul className="cos-trendlist cos-trendlist--up">
            {UP.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </Section>
        <Section title="Deteriorating — needs attention" tone="exposure">
          <ul className="cos-trendlist cos-trendlist--down">
            {DOWN.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </Section>
      </div>

      <Section title="Framework posture"
        action={<span className="cos-sectionhead__hint">click a function → category → control to see the evidence</span>}>
        <FrameworkExplorer />
      </Section>
    </div>
  );
}

function PostureChart({ series, target }) {
  // Minimal token-driven area chart (no chart lib). /* TODO: real data */
  const W = 720, H = 180, P = 24;
  const max = 100, min = 50;
  const x = (i) => P + (i * (W - 2 * P)) / (series.length - 1);
  const y = (v) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const pts = series.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const area = `${P},${H - P} ${pts} ${W - P},${H - P}`;
  const ty = y(target);
  return (
    <svg className="cos-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Posture trend versus target">
      <polygon points={area} fill="var(--brand-tint)" />
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
      {series.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="3.5" fill="var(--brand)" />)}
      <line x1={P} y1={ty} x2={W - P} y2={ty} stroke="var(--text-subtle)" strokeWidth="1" strokeDasharray="5 5" />
      <text x={W - P} y={ty - 6} textAnchor="end" className="cos-chart__tgt">target {target}</text>
      {series.map((d, i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="cos-chart__lab">{d.label}</text>)}
    </svg>
  );
}

/* ---- Framework posture explorer (function → category → control → evidence) -
 * Structure + evidence fields match the mock; the tree is placeholder sample
 * data pending real binding. (TODO real data) */
const FRAMEWORKS = ['NIST CSF 2.0', 'NIST 800-53', 'CIS v8', 'ISO 27001', 'SOC 2'];
const FW_TREE = {
  'NIST CSF 2.0': [
    { id: 'GV', fn: 'Govern', categories: [
      { id: 'GV.OC', name: 'Organizational Context', controls: [
        { id: 'GV.OC-01', name: 'Mission & stakeholders understood', result: 'Pass', verified: true,
          evidence: { source: 'GRC platform export', method: 'Policy attestation review', last: '2026-06-18', result: 'Documented & approved' } },
      ] },
      { id: 'GV.RM', name: 'Risk Management Strategy', controls: [
        { id: 'GV.RM-01', name: 'Risk appetite set by the board', result: 'Pass', verified: true,
          evidence: { source: 'Board minutes', method: 'Document review', last: '2026-05-30', result: 'Appetite ratified' } },
      ] },
    ] },
    { id: 'PR', fn: 'Protect', categories: [
      { id: 'PR.AA', name: 'Identity Mgmt & Access Control', controls: [
        { id: 'PR.AA-05', name: 'Privileged access managed (PAM)', result: 'Partial', verified: false,
          evidence: { source: 'PAM (CyberArk)', method: 'Config + coverage scan', last: '2026-06-20', result: '60% of privileged accounts onboarded' } },
      ] },
      { id: 'PR.DS', name: 'Data Security', controls: [
        { id: 'PR.DS-01', name: 'Data-at-rest protected', result: 'Pass', verified: true,
          evidence: { source: 'Cloud KMS', method: 'Automated control check', last: '2026-06-21', result: 'Encryption enforced' } },
      ] },
    ] },
    { id: 'DE', fn: 'Detect', categories: [
      { id: 'DE.CM', name: 'Continuous Monitoring', controls: [
        { id: 'DE.CM-01', name: 'Networks & services monitored', result: 'Pass', verified: true,
          evidence: { source: 'SIEM (Splunk)', method: 'Live telemetry', last: '2026-06-22', result: '4,102 events blocked / 24h' } },
      ] },
    ] },
  ],
};

function FrameworkExplorer() {
  const [fw, setFw] = useState('NIST CSF 2.0');
  const tree = FW_TREE[fw] || [];
  const [fnId, setFnId] = useState(null);
  const [catId, setCatId] = useState(null);
  const [ctrlId, setCtrlId] = useState(null);

  const fn = tree.find((f) => f.id === fnId);
  const cat = fn && fn.categories.find((c) => c.id === catId);
  const ctrl = cat && cat.controls.find((c) => c.id === ctrlId);

  const pickFw = (name) => { setFw(name); setFnId(null); setCatId(null); setCtrlId(null); };

  return (
    <div className="cos-fw">
      <div className="cos-fw__tabs" role="tablist" aria-label="Framework">
        {FRAMEWORKS.map((name) => (
          <button key={name} role="tab" aria-selected={fw === name}
            className={`cos-fw__tab${fw === name ? ' is-on' : ''}`} onClick={() => pickFw(name)}>{name}</button>
        ))}
      </div>

      {tree.length === 0 ? (
        <p className="cos-lede">{/* TODO: real data */}Framework tree pending data binding.</p>
      ) : (
        <div className="cos-fw__cols">
          <FwColumn label="Function" items={tree.map((f) => ({ id: f.id, label: f.fn }))}
            sel={fnId} onPick={(id) => { setFnId(id); setCatId(null); setCtrlId(null); }} />
          <FwColumn label="Category" items={fn ? fn.categories.map((c) => ({ id: c.id, label: c.name })) : []}
            sel={catId} onPick={(id) => { setCatId(id); setCtrlId(null); }} empty="Select a function" />
          <FwColumn label="Control" items={cat ? cat.controls.map((c) => ({ id: c.id, label: `${c.id} · ${c.name}` })) : []}
            sel={ctrlId} onPick={setCtrlId} empty="Select a category" />
        </div>
      )}

      {ctrl && (
        <div className="cos-evidence">
          <div className="cos-evidence__head">
            <span className="cos-evidence__id">{ctrl.id}</span>
            <span className="cos-evidence__name">{ctrl.name}</span>
            {ctrl.verified
              ? <span className="cos-verified">✓ verified</span>
              : <Pill kind="exposure">{ctrl.result}</Pill>}
          </div>
          <dl className="cos-evidence__dl">
            <div><dt>Source</dt><dd>{ctrl.evidence.source}</dd></div>
            <div><dt>Method</dt><dd>{ctrl.evidence.method}</dd></div>
            <div><dt>Last collected</dt><dd>{ctrl.evidence.last}</dd></div>
            <div><dt>Result</dt><dd>{ctrl.evidence.result}</dd></div>
            <div><dt>Verified</dt><dd>{ctrl.verified ? '✓ yes' : 'pending'}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}

function FwColumn({ label, items, sel, onPick, empty }) {
  return (
    <div className="cos-fw__col">
      <div className="cos-fw__collabel">{label}</div>
      {items.length === 0
        ? <div className="cos-fw__empty">{empty || '—'}</div>
        : items.map((it) => (
          <button key={it.id} type="button" className={`cos-fw__item${sel === it.id ? ' is-on' : ''}`} onClick={() => onPick(it.id)}>
            {it.label}<span className="cos-fw__chev" aria-hidden="true">›</span>
          </button>
        ))}
    </div>
  );
}

/* ---- 6 · Response & Investment -------------------------------------------- */
const PROJECTS = [
  { name: 'PAM rollout', sub: 'Privileged access mgmt', status: '60% · on track', invest: '$4.2M', ret: 'Closes the open ransomware path', decision: '—' },
  { name: 'Recovery modernization', status: 'Funded · starting', invest: '$6.0M', ret: 'Recovery readiness 78% → 90%+', decision: '—' },
  { name: 'Third-party monitoring', status: 'Proposed', invest: '$1.8M', ret: 'Stops vendor risk drift', decision: 'Needs funding', flag: true },
  { name: 'AI governance program', status: 'Proposed', invest: '$2.5M', ret: 'Governs AI claims decisions', decision: 'Needs funding', flag: true },
];
const READINESS = [
  { k: 'Committed this year', v: '$10.2M · 2 projects in flight' },
  { k: 'Awaiting your decision', v: '$4.3M · 2 projects', vkind: 'exposure' },
  { k: 'Projected posture lift if all funded', v: '82 → 89', vkind: 'pass' },
];

function CisoResponse() {
  return (
    <div className="cos-stack">
      <PanelHead name="Response & Investment" pill="ON TRACK" pillKind="pass"
        question="What are we doing about it?"
        lede="The roadmap closing the gaps above — what it costs, what it returns, and what’s waiting on your decision." />

      <Section title="Roadmap">
        <table className="cos-table">
          <thead>
            <tr><th>Project</th><th>Status</th><th>Investment</th><th>Expected return</th><th>Decision</th></tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => (
              <tr key={p.name}>
                <td><span className="cos-td-name">{p.name}</span>{p.sub && <span className="cos-td-sub">{p.sub}</span>}</td>
                <td>{p.status}</td>
                <td className="cos-mono">{p.invest}</td>
                <td className="cos-td-exposed">{p.ret}</td>
                <td>{p.flag ? <Pill kind="exposure">{p.decision}</Pill> : <span className="cos-dash">{p.decision}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Readiness & investment">
        <div className="cos-rows">
          {READINESS.map((r, i) => (
            <div key={i} className="cos-row">
              <span className="cos-row__k">{r.k}</span>
              <span className={`cos-row__v${r.vkind ? ` cos-v--${r.vkind}` : ''}`}>{r.v}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---- Section frame --------------------------------------------------------- */
function Section({ title, action, tone, children }) {
  return (
    <section className={`cos-section${tone ? ` cos-section--${tone}` : ''}`}>
      <div className="cos-sectionhead">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ===========================================================================
 * Scoped styles — token-driven (pseudo-states/hover need real CSS).
 * ======================================================================== */
function CosStyles() {
  return (
    <style>{`
      .cos-app { min-height:100%; }
      .cos-shell { max-width:1080px; margin:0 auto; padding:var(--space-5) var(--space-5) var(--space-7); position:relative; z-index:2; }

      /* Top bar */
      .cos-topbar { display:flex; justify-content:space-between; align-items:center; gap:var(--space-4); padding-bottom:var(--space-4); border-bottom:1px solid var(--border); }
      .cos-brand { display:flex; align-items:center; gap:var(--space-3); }
      .cos-brandmark { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:var(--radius-sm); background:var(--brand); color:#fff; font-family:var(--font-display); font-weight:700; font-size:14px; }
      .cos-brandname { font-family:var(--font-display); font-weight:700; font-size:17px; color:var(--text); letter-spacing:-.01em; }
      .cos-brandsep { width:1px; height:18px; background:var(--border-strong); }
      .cos-brandseat { font-family:var(--font-mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--text-muted); }
      .cos-topright { display:flex; align-items:center; gap:var(--space-3); }
      .cos-live { display:inline-flex; align-items:center; gap:6px; font-family:var(--font-mono); font-size:11px; letter-spacing:.06em; color:var(--text-muted); }
      .cos-live__dot { width:7px; height:7px; border-radius:50%; background:var(--pass); }
      @media (prefers-reduced-motion: no-preference){ .cos-live__dot{ animation:cosPulse 2s ease-in-out infinite; } }
      @keyframes cosPulse { 0%,100%{opacity:1} 50%{opacity:.3} }

      /* View as */
      .cos-viewas { display:flex; align-items:center; gap:var(--space-2); padding:var(--space-4) 0 var(--space-3); flex-wrap:wrap; }
      .cos-viewas__label { font-family:var(--font-mono); font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--text-subtle); margin-right:var(--space-2); }
      .cos-seat { font-family:var(--font-body); font-size:13px; font-weight:600; color:var(--text-muted); background:var(--surface); border:1px solid var(--border); border-radius:999px; padding:6px 14px; cursor:pointer; transition:all .15s ease; }
      .cos-seat:hover { color:var(--text); border-color:var(--border-strong); }
      .cos-seat.is-on { background:var(--brand); border-color:var(--brand); color:#fff; }
      .cos-seat:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }

      /* Tabs */
      .cos-tabsrow { display:flex; justify-content:space-between; align-items:flex-end; gap:var(--space-4); border-bottom:1px solid var(--border); }
      .cos-tabs { display:flex; gap:0; overflow-x:auto; }
      .cos-tab { display:flex; flex-direction:column; align-items:flex-start; gap:3px; background:transparent; border:none; border-bottom:2px solid transparent; padding:10px 16px; cursor:pointer; white-space:nowrap; text-align:left; }
      .cos-tab__top { display:flex; align-items:center; gap:7px; }
      .cos-tab__icon { font-size:13px; color:var(--text-muted); }
      .cos-tab__badge { display:inline-flex; align-items:center; justify-content:center; min-width:16px; height:16px; padding:0 4px; border-radius:5px; background:var(--surface-raised); color:var(--text-muted); font-family:var(--font-mono); font-size:10px; font-weight:700; }
      .cos-tab__name { font-family:var(--font-body); font-size:13.5px; font-weight:600; color:var(--text-muted); }
      .cos-tab__q { font-family:var(--font-display); font-size:11px; color:var(--text-subtle); }
      .cos-tab:hover .cos-tab__name { color:var(--text); }
      .cos-tab.is-on { border-bottom-color:var(--brand); }
      .cos-tab.is-on .cos-tab__name { color:var(--brand); font-weight:700; }
      .cos-tab.is-on .cos-tab__badge { background:var(--brand-tint); color:var(--brand); }
      .cos-tab.is-on .cos-tab__q { color:var(--text-muted); }
      .cos-tab:focus-visible { outline:2px solid var(--focus); outline-offset:-2px; border-radius:var(--radius-sm); }
      .cos-deepdive { flex-shrink:0; background:transparent; border:none; color:var(--brand); font-family:var(--font-body); font-size:13px; font-weight:600; cursor:pointer; padding:10px 4px; }
      .cos-deepdive:hover { text-decoration:underline; }
      .cos-deepdive:focus-visible { outline:2px solid var(--focus); outline-offset:2px; border-radius:var(--radius-sm); }

      /* Panel */
      .cos-panel { padding-top:var(--space-6); }
      .cos-panel:focus-visible { outline:2px solid var(--focus); outline-offset:3px; border-radius:var(--radius); }
      .cos-stack { display:grid; gap:var(--space-6); }

      .cos-panelhead { display:grid; gap:var(--space-3); }
      .cos-panelhead__top { display:flex; align-items:center; gap:var(--space-3); }
      .cos-kicker { font-family:var(--font-mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--text-subtle); }
      .cos-verdict { margin:0; font-family:var(--font-display); font-weight:500; font-size:27px; line-height:1.25; letter-spacing:-.015em; color:var(--text); }
      .cos-summaryverdict { display:flex; align-items:flex-start; gap:var(--space-4); flex-wrap:wrap; }
      .cos-summaryverdict .cos-verdict { flex:1; min-width:280px; }
      .cos-lede { margin:0; font-size:15px; line-height:1.6; color:var(--text-muted); max-width:760px; }

      /* Metric band */
      .cos-metricband { display:grid; grid-template-columns:repeat(6, 1fr); gap:var(--space-3); }
      .cos-metric { position:relative; display:flex; flex-direction:column; gap:6px; text-align:left; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow-1); padding:var(--space-4); cursor:pointer; transition:border-color .15s ease, transform .05s ease; }
      .cos-metric:hover { border-color:var(--brand); }
      .cos-metric:active { transform:translateY(.5px); }
      .cos-metric:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
      .cos-metric__label { font-family:var(--font-mono); font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:var(--text-subtle); }
      .cos-metric__valrow { display:flex; align-items:baseline; gap:6px; }
      .cos-metric__value { font-family:var(--font-display); font-weight:600; font-size:26px; color:var(--text); letter-spacing:-.01em; }
      .cos-metric__delta { font-family:var(--font-mono); font-size:12px; font-weight:600; }
      .cos-delta--pass { color:var(--pass); } .cos-delta--exposure { color:var(--exposure); } .cos-delta--muted { color:var(--text-subtle); }
      .cos-metric__arrow { position:absolute; top:var(--space-3); right:var(--space-3); color:var(--brand); opacity:0; transition:opacity .15s ease; }
      .cos-metric:hover .cos-metric__arrow, .cos-metric:focus-visible .cos-metric__arrow { opacity:1; }

      /* Section */
      .cos-section { display:grid; gap:var(--space-4); }
      .cos-sectionhead { display:flex; justify-content:space-between; align-items:baseline; gap:var(--space-3); flex-wrap:wrap; }
      .cos-sectionhead h3 { margin:0; font-family:var(--font-body); font-size:13px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--text-muted); }
      .cos-sectionhead__hint { font-size:12px; color:var(--text-subtle); font-style:italic; }

      /* Question list */
      .cos-qlist { display:grid; gap:var(--space-2); }
      .cos-qrow { display:flex; align-items:flex-start; gap:var(--space-3); text-align:left; background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--brand); border-radius:var(--radius); box-shadow:var(--shadow-1); padding:var(--space-4); cursor:pointer; transition:border-color .15s ease; }
      .cos-qrow:hover { border-color:var(--brand); border-left-color:var(--brand); }
      .cos-qrow:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
      .cos-qnum { flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:7px; background:var(--brand-tint); color:var(--brand); font-family:var(--font-mono); font-weight:700; font-size:13px; }
      .cos-qbody { flex:1; display:grid; gap:3px; }
      .cos-qq { font-family:var(--font-display); font-weight:500; font-size:16px; color:var(--text); }
      .cos-qa { font-size:13.5px; line-height:1.55; color:var(--text-muted); }
      .cos-qmeta { display:flex; align-items:center; gap:var(--space-2); flex-shrink:0; }
      .cos-qarrow { color:var(--brand); }

      /* Rows */
      .cos-rows { display:grid; }
      .cos-row { display:grid; grid-template-columns:1fr auto; gap:var(--space-4); align-items:center; padding:var(--space-3) 0; border-bottom:1px solid var(--border); }
      .cos-row--3 { grid-template-columns:1fr auto auto; }
      .cos-row:last-child { border-bottom:none; }
      .cos-row__k { font-size:14px; color:var(--text); display:flex; flex-direction:column; gap:2px; }
      .cos-row__sub { font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); }
      .cos-row__v { font-family:var(--font-mono); font-size:13.5px; color:var(--text); text-align:right; }
      .cos-row__owner { font-size:12.5px; color:var(--text-muted); }
      .cos-v--pass { color:var(--pass); } .cos-v--exposure { color:var(--exposure); } .cos-v--critical { color:var(--critical); }
      .cos-check { color:var(--pass); }
      .cos-due { font-family:var(--font-mono); font-size:11px; color:var(--exposure); background:var(--exposure-tint); padding:3px 8px; border-radius:999px; }

      .cos-note { margin:0; font-size:13.5px; line-height:1.6; color:var(--text-muted); background:var(--surface-raised); border-radius:var(--radius); padding:var(--space-4); }
      .cos-inlink { background:none; border:none; padding:0; color:var(--brand); font:inherit; font-weight:600; cursor:pointer; }
      .cos-inlink:hover { text-decoration:underline; }

      /* Table */
      .cos-table { width:100%; border-collapse:collapse; font-size:14px; }
      .cos-table th { text-align:left; font-family:var(--font-mono); font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--text-subtle); font-weight:700; padding:0 var(--space-3) var(--space-2); border-bottom:1px solid var(--border); }
      .cos-table td { padding:var(--space-3); border-bottom:1px solid var(--border); color:var(--text); vertical-align:top; }
      .cos-table tr:last-child td { border-bottom:none; }
      .cos-td-name { display:block; font-weight:600; color:var(--text); }
      .cos-td-sub { display:block; font-size:12px; color:var(--text-subtle); }
      .cos-td-exposed { color:var(--text-muted); font-size:13px; }
      .cos-mono { font-family:var(--font-mono); }
      .cos-dash { color:var(--text-subtle); }
      .cos-trend--up { color:var(--critical); } .cos-trend--down { color:var(--pass); } .cos-trend--flat { color:var(--text-subtle); }
      .cos-trend { font-weight:700; }

      /* Path chain + stats */
      .cos-pathchain { display:flex; flex-wrap:wrap; align-items:center; gap:var(--space-2); }
      .cos-pathstep { display:inline-flex; align-items:center; gap:var(--space-2); }
      .cos-pathstep__box { font-family:var(--font-mono); font-size:12px; color:var(--text); background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-sm); padding:6px 10px; }
      .cos-pathstep__arr { color:var(--text-subtle); }
      .cos-statgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--space-3); }
      .cos-stat { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:var(--space-4); display:grid; gap:6px; }
      .cos-stat__k { font-family:var(--font-mono); font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--text-subtle); }
      .cos-stat__v { font-family:var(--font-display); font-weight:600; font-size:20px; color:var(--text); }

      /* Decisions */
      .cos-decisions { display:grid; gap:var(--space-3); }
      .cos-dc { display:grid; gap:var(--space-2); }
      .cos-dc--critical { border-left-color:var(--critical); }
      .cos-dc--exposure { border-left-color:var(--exposure); }
      .cos-dc__title { margin:0; font-family:var(--font-display); font-weight:500; font-size:16px; color:var(--text); }
      .cos-dc__owner { margin:0; font-family:var(--font-mono); font-size:12px; color:var(--text-muted); }
      .cos-btn { justify-self:start; }

      /* Trajectory */
      .cos-twocol { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4); }
      .cos-section--pass .cos-sectionhead h3 { color:var(--pass); }
      .cos-section--exposure .cos-sectionhead h3 { color:var(--exposure); }
      .cos-trendlist { margin:0; padding:0; list-style:none; display:grid; gap:var(--space-2); }
      .cos-trendlist li { font-size:14px; color:var(--text); background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; }
      .cos-trendlist--up li { border-left:3px solid var(--pass); }
      .cos-trendlist--down li { border-left:3px solid var(--exposure); }
      .cos-seg { display:inline-flex; background:var(--surface-raised); border-radius:var(--radius-sm); padding:2px; }
      .cos-seg__b { border:none; background:transparent; font-family:var(--font-body); font-size:12px; font-weight:600; color:var(--text-muted); padding:5px 12px; border-radius:5px; cursor:pointer; }
      .cos-seg__b.is-on { background:var(--surface); color:var(--text); box-shadow:var(--shadow-1); }
      .cos-seg__b:focus-visible { outline:2px solid var(--focus); outline-offset:1px; }
      .cos-chart { width:100%; height:auto; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); }
      .cos-chart__tgt { fill:var(--text-subtle); font-family:var(--font-mono); font-size:11px; }
      .cos-chart__lab { fill:var(--text-subtle); font-family:var(--font-mono); font-size:11px; }
      .cos-chartcaption { margin:0; }

      /* Framework explorer */
      .cos-fw { display:grid; gap:var(--space-4); }
      .cos-fw__tabs { display:flex; flex-wrap:wrap; gap:var(--space-2); }
      .cos-fw__tab { font-family:var(--font-body); font-size:12.5px; font-weight:600; color:var(--text-muted); background:var(--surface); border:1px solid var(--border); border-radius:999px; padding:6px 13px; cursor:pointer; }
      .cos-fw__tab.is-on { background:var(--brand); border-color:var(--brand); color:#fff; }
      .cos-fw__tab:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
      .cos-fw__cols { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--space-3); }
      .cos-fw__col { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:var(--space-3); display:grid; gap:4px; align-content:start; min-height:120px; }
      .cos-fw__collabel { font-family:var(--font-mono); font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--text-subtle); padding:2px 6px var(--space-2); }
      .cos-fw__item { display:flex; justify-content:space-between; align-items:center; gap:var(--space-2); text-align:left; font-size:13px; color:var(--text); background:transparent; border:1px solid transparent; border-radius:var(--radius-sm); padding:8px 10px; cursor:pointer; }
      .cos-fw__item:hover { background:var(--surface-raised); }
      .cos-fw__item.is-on { background:var(--brand-tint); color:var(--brand); font-weight:600; }
      .cos-fw__item:focus-visible { outline:2px solid var(--focus); outline-offset:1px; }
      .cos-fw__chev { color:var(--text-subtle); }
      .cos-fw__empty { font-size:12.5px; color:var(--text-subtle); font-style:italic; padding:8px 10px; }
      .cos-evidence { background:var(--surface-raised); border:1px solid var(--border); border-radius:var(--radius); padding:var(--space-4); display:grid; gap:var(--space-3); }
      .cos-evidence__head { display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap; }
      .cos-evidence__id { font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--brand); }
      .cos-evidence__name { font-family:var(--font-display); font-size:15px; color:var(--text); flex:1; }
      .cos-verified { font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--pass); }
      .cos-evidence__dl { margin:0; display:grid; grid-template-columns:repeat(2,1fr); gap:var(--space-2) var(--space-5); }
      .cos-evidence__dl > div { display:grid; grid-template-columns:130px 1fr; gap:var(--space-3); padding:4px 0; border-bottom:1px solid var(--border); }
      .cos-evidence__dl dt { font-family:var(--font-mono); font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--text-subtle); }
      .cos-evidence__dl dd { margin:0; font-family:var(--font-mono); font-size:12.5px; color:var(--text); }

      .cos-footer { margin-top:var(--space-7); padding-top:var(--space-4); border-top:1px solid var(--border); font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); text-align:center; }

      @media (max-width: 900px){
        .cos-metricband { grid-template-columns:repeat(3,1fr); }
        .cos-statgrid { grid-template-columns:repeat(2,1fr); }
        .cos-fw__cols { grid-template-columns:1fr; }
        .cos-evidence__dl { grid-template-columns:1fr; }
      }
      @media (max-width: 620px){
        .cos-metricband { grid-template-columns:repeat(2,1fr); }
        .cos-twocol { grid-template-columns:1fr; }
        .cos-verdict { font-size:22px; }
      }
    `}</style>
  );
}

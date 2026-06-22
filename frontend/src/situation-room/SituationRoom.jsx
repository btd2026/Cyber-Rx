/**
 * SituationRoom — executive "situation room" UI built to the precise spec.
 * Self-contained: reads only --sr-* tokens (situation-room.css); keeps the app's
 * auth/routing/data/backend untouched (receives `go` for legacy "Deep dive" links).
 *
 * BLUE = brand/decision · GREEN = verified/holds/pass (always with ✓) · AMBER =
 * exposure/clock · RED = critical. Space Grotesk (headings/verdicts), Public Sans
 * (body), JetBrains Mono (ALL machine evidence). Light "warm" default; dark
 * "command" via the theme toggle. CISO is the fully-built reference seat.
 *
 * Sample copy/numbers come from the spec verbatim; anything not given is marked
 * (TODO real data) and bound to your API where it cleanly fits.
 */

import { useRef, useState } from 'react';
import { useTheme } from './useTheme';
import { CISO_SEAT } from './seats/ciso';

/* "View as" — exact order. */
const SEAT_ORDER = ['CEO', 'CISO', 'CFO', 'CIO', 'CLO', 'CRO', 'Board'];

/* Per-seat tab definitions (formal name + plain question). CISO is complete; the
   other six show their exact tab names and are authored next. */
const SEAT_TABS = {
  CEO: ['Exec Summary', 'Operating Status', 'Principal Business Risk', 'Board & Executive Attention', 'Trajectory'],
  CISO: CISO_SEAT.tabs.map((t) => t.name),
  CFO: ['Exec Summary', 'Financial Exposure', 'Materiality', 'Decisions Required', 'Return on Investment'],
  CIO: ['Exec Summary', 'Service Status', 'Operational Threats', 'Decisions Required', 'Reliability Trend'],
  CLO: ['Exec Summary', 'Regulatory Obligation', 'Disclosure & Timelines', 'Decisions Required', 'Defensibility'],
  CRO: ['Exec Summary', 'Risk Appetite Status', 'Tolerance & Concentration', 'Decisions Required', 'Risk Trajectory'],
  Board: ['Exec Summary', 'Control Assurance', 'Materiality', 'Board Decisions', 'Quarterly Oversight'],
};

/* Legacy deep-dive target per seat (kept routing). */
const DEEP = { CISO: 'dashboard', CIO: 'cio', CFO: 'cfo', CRO: 'cro', CLO: 'clo', Board: 'boarddash' };

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function SituationRoom({ go, initialSeat } = {}) {
  const start = (initialSeat || 'ciso').toUpperCase();
  const [seat, setSeat] = useState(SEAT_ORDER.includes(start) ? start : 'CISO');
  const [tabIdx, setTabIdx] = useState(0);
  const tabRefs = useRef([]);
  const { isDark, toggle } = useTheme();

  const tabs = seat === 'CISO' ? CISO_SEAT.tabs : SEAT_TABS[seat].map((name, i) => ({ key: i === 0 ? 'summary' : slug(name), name }));
  const activeTab = tabs[tabIdx] || tabs[0];
  const goTabKey = (key) => { const i = tabs.findIndex((t) => t.key === key); if (i >= 0) setTabIdx(i); };

  const selectSeat = (s) => { setSeat(s); setTabIdx(0); };

  const onTabsKey = (e) => {
    const n = tabs.length;
    let next = null;
    if (e.key === 'ArrowRight') next = (tabIdx + 1) % n;
    else if (e.key === 'ArrowLeft') next = (tabIdx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next != null) { e.preventDefault(); setTabIdx(next); const el = tabRefs.current[next]; if (el) el.focus(); }
  };

  const deep = DEEP[seat];

  return (
    <div className="sr-root sr-app">
      <SrStyles />
      <div className="sr-shell">
        {/* Top bar */}
        <header className="sr-top">
          <div className="sr-brand">
            <span className="sr-mark" aria-hidden="true">Rx</span>
            <span className="sr-name">CyberRx</span>
            <span className="sr-sep" aria-hidden="true" />
            <span className="sr-seatlabel">{seat} · OPERATING SYSTEM</span>
          </div>
          <div className="sr-topright">
            <span className="sr-live"><span className="sr-live__dot" aria-hidden="true" />LIVE · 14:09</span>
            <button type="button" className="sr-theme" onClick={toggle} aria-pressed={isDark}
              aria-label={`Switch to ${isDark ? 'light warm' : 'dark command'} theme`}>
              <span aria-hidden="true">◐</span> Theme
            </button>
          </div>
        </header>

        {/* View as */}
        <div className="sr-viewas" role="tablist" aria-label="View as">
          <span className="sr-viewas__label">View as</span>
          {SEAT_ORDER.map((s) => (
            <button key={s} role="tab" aria-selected={seat === s}
              className={`sr-seat${seat === s ? ' is-on' : ''}`} onClick={() => selectSeat(s)}>{s}</button>
          ))}
        </div>

        {/* Per-seat tabs */}
        <div className="sr-tabsrow">
          <div className="sr-tabs" role="tablist" aria-label={`${seat} views`} onKeyDown={onTabsKey}>
            {tabs.map((t, i) => {
              const on = i === tabIdx;
              return (
                <button key={t.key} ref={(el) => { tabRefs.current[i] = el; }} role="tab"
                  id={`sr-tab-${t.key}`} aria-controls={`sr-panel-${t.key}`} aria-selected={on}
                  tabIndex={on ? 0 : -1} className={`sr-tab${on ? ' is-on' : ''}`} onClick={() => setTabIdx(i)}>
                  <span className="sr-tab__name">{t.name}</span>
                  {t.q && <span className="sr-tab__q">›&nbsp;{t.q}</span>}
                </button>
              );
            })}
          </div>
          {deep && <button type="button" className="sr-deep" onClick={() => go && go(deep)}>Deep dive ▸</button>}
        </div>

        {/* Panel */}
        <div role="tabpanel" id={`sr-panel-${activeTab.key}`} aria-labelledby={`sr-tab-${activeTab.key}`} tabIndex={0} className="sr-panel">
          {seat === 'CISO'
            ? <CisoPanel tabKey={activeTab.key} goTabKey={goTabKey} />
            : <SeatPlaceholder seat={seat} tab={activeTab.name} />}
        </div>

        <footer className="sr-footer">CyberRx · executive operating system — illustrative, with sample data</footer>
      </div>
    </div>
  );
}

function SeatPlaceholder({ seat, tab }) {
  return (
    <div className="sr-stack">
      <PanelHead kicker={`${seat} · ${tab}`} verdict={`The ${seat} seat is being authored next, in the same shape as CISO.`} />
      {/* TODO: real data — author the {seat} seat (verdict, 6-tile band, briefing, per-tab detail). */}
      <p className="sr-lede">CISO is the fully-built reference. {seat} will reframe the same running incident in this executive’s lens.</p>
    </div>
  );
}

/* ============================ Reusable building blocks ===================== */
export function Pill({ kind = 'brand', verified, children }) {
  return <span className={`sr-pill sr-pill--${kind}`}>{verified ? '✓ ' : ''}{children}</span>;
}

export function PanelHead({ kicker, verdict, pill, pillKind, pillVerified, lede }) {
  return (
    <div className="sr-head">
      {kicker && <div className="sr-head__top"><span className="sr-kicker">{kicker}</span>{pill && <Pill kind={pillKind} verified={pillVerified}>{pill}</Pill>}</div>}
      {verdict && <h2 className="sr-verdict">{verdict}</h2>}
      {lede && <p className="sr-lede">{lede}</p>}
    </div>
  );
}

/* Exec-summary 6-tile band — every tile is a door (routes to its tab). */
export function MetricBand({ tiles, onGo }) {
  return (
    <div className="sr-band">
      {tiles.map((t) => (
        <button key={t.label} type="button" className="sr-tile" onClick={() => onGo(t.to)}
          aria-label={`${t.label}: ${t.value}. Open ${t.to}.`}>
          <span className="sr-tile__label">{t.label}</span>
          <span className="sr-tile__valrow">
            <span className={`sr-tile__value${t.valueKind ? ` sr-fg--${t.valueKind}` : ''}`}>{t.value}</span>
            {t.delta && <span className={`sr-tile__delta sr-fg--${t.deltaKind || 'muted'}`}>{t.delta}</span>}
          </span>
          <span className="sr-tile__arrow" aria-hidden="true">▸</span>
        </button>
      ))}
    </div>
  );
}

/* Exec-summary question briefing — one row per tab. */
export function Briefing({ rows, onGo }) {
  return (
    <section className="sr-section">
      <div className="sr-sectionhead"><h3>The questions, answered</h3><span className="sr-hint">click any to open its detail</span></div>
      <div className="sr-brief">
        {rows.map((r) => (
          <button key={r.to} type="button" className="sr-briefrow" onClick={() => onGo(r.to)}>
            <span className="sr-briefbody">
              <span className="sr-briefq">{r.q}</span>
              <span className="sr-briefa">{r.a}</span>
            </span>
            <span className="sr-briefmeta">
              <Pill kind={r.kind} verified={r.verified}>{r.pill}</Pill>
              <span className="sr-briefarrow" aria-hidden="true">▸</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Section({ title, action, children }) {
  return (
    <section className="sr-section">
      <div className="sr-sectionhead"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  );
}

/* Key→value rows (mono values carry status). */
export function Rows({ items }) {
  return (
    <div className="sr-rows">
      {items.map((r, i) => (
        <div key={i} className="sr-row">
          <span className="sr-row__k">{r.k}{r.sub && <span className="sr-row__sub">{r.sub}</span>}</span>
          <span className={`sr-row__v${r.kind ? ` sr-fg--${r.kind}` : ''}`}>{r.verified && <span className="sr-fg--pass">✓ </span>}{r.v}</span>
        </div>
      ))}
    </div>
  );
}

/* Evidence-on-demand — a claim that expands to its proof. Reusable everywhere. */
export function Evidence({ source, method, last, result, verified = true, defaultOpen = false }) {
  return (
    <details className="sr-ev" open={defaultOpen}>
      <summary className="sr-ev__sum">Evidence <span className="sr-ev__hint">source · method · last collected · result</span></summary>
      <dl className="sr-ev__dl">
        <div><dt>Source</dt><dd>{source}</dd></div>
        <div><dt>Method</dt><dd>{method}</dd></div>
        <div><dt>Last collected</dt><dd>{last}</dd></div>
        <div><dt>Result</dt><dd>{result}</dd></div>
      </dl>
      {verified && <div className="sr-ev__verified">✓ integrity verified</div>}
    </details>
  );
}

/* ============================ CISO seat panels ============================ */
function CisoPanel({ tabKey, goTabKey }) {
  const S = CISO_SEAT;
  if (tabKey === 'summary') {
    return (
      <div className="sr-stack">
        <PanelHead kicker="Executive summary · synced 14:09" verdict={S.summary.verdict}
          pill={S.summary.pill} pillKind={S.summary.pillKind} lede={S.summary.lede} />
        <MetricBand tiles={S.summary.tiles} onGo={goTabKey} />
        <Briefing rows={S.summary.briefing} onGo={goTabKey} />
      </div>
    );
  }
  const tab = S.tabs.find((t) => t.key === tabKey);
  if (!tab) return null;
  const head = (
    <PanelHead kicker={tab.name} verdict={tab.answer} pill={tab.pill} pillKind={tab.pillKind}
      pillVerified={tab.pillVerified} lede={tab.lede} />
  );

  if (tabKey === 'operational') {
    return (
      <div className="sr-stack">{head}
        {tab.panels.map((p) => <Section key={p.title} title={p.title}><Rows items={p.rows} /></Section>)}
      </div>
    );
  }
  if (tabKey === 'material-exposure') {
    return (
      <div className="sr-stack">{head}
        <Section title="Business processes at risk">
          <table className="sr-table">
            <thead><tr><th>Process</th><th>Risk</th><th>Trend</th><th>What’s exposed</th></tr></thead>
            <tbody>
              {tab.processes.map((p) => (
                <tr key={p.name}>
                  <td className="sr-td-name">{p.name}</td>
                  <td><Pill kind={p.riskKind}>{p.risk}</Pill></td>
                  <td><span className={`sr-trend sr-fg--${p.trendKind}`}>{p.trend}</span></td>
                  <td className="sr-td-exposed">{p.exposed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Most likely path to the crown jewels">
          <div className="sr-chain">
            {tab.path.map((s, i) => (
              <span key={s} className="sr-chain__step"><span className="sr-chain__box">{s}</span>{i < tab.path.length - 1 && <span className="sr-chain__arr" aria-hidden="true">→</span>}</span>
            ))}
          </div>
          <div className="sr-statgrid">
            {tab.pathStats.map((s) => <div key={s.k} className="sr-stat"><span className="sr-stat__k">{s.k}</span><span className="sr-stat__v">{s.v}</span></div>)}
          </div>
        </Section>
      </div>
    );
  }
  if (tabKey === 'action-center') {
    return (
      <div className="sr-stack">{head}
        <Section title="Your decisions — today">
          <div className="sr-decisions">
            {tab.decisions.map((d, i) => (
              <article key={i} className={`sr-dc sr-dc--${d.kind}`}>
                <Pill kind={d.kind}>{d.sev}</Pill>
                <p className="sr-dc__title">{d.title}</p>
                <p className="sr-dc__owner">{d.owner}</p>
              </article>
            ))}
          </div>
          <button type="button" className="sr-btn">Generate board package →</button>
        </Section>
        <Section title="Others’ actions — this week">
          <div className="sr-rows">
            {tab.others.map((o, i) => (
              <div key={i} className="sr-row sr-row--3"><span className="sr-row__k">{o.task}</span><span className="sr-row__owner">{o.owner}</span><span className="sr-due">{o.due}</span></div>
            ))}
          </div>
        </Section>
        <Section title="Informational — no action">
          <div className="sr-rows">
            {tab.info.map((it, i) => <div key={i} className="sr-row"><span className="sr-row__k">{it.k}</span><span className="sr-row__v sr-fg--pass">{it.v}</span></div>)}
          </div>
        </Section>
      </div>
    );
  }
  if (tabKey === 'trajectory') {
    return (
      <div className="sr-stack">{head}
        <PostureChart data={tab.posture} target={tab.target} />
        <div className="sr-twocol">
          <Section title="Improving"><ul className="sr-tl sr-tl--up">{tab.improving.map((x) => <li key={x}>{x}</li>)}</ul></Section>
          <Section title="Deteriorating — needs attention"><ul className="sr-tl sr-tl--down">{tab.deteriorating.map((x) => <li key={x}>{x}</li>)}</ul></Section>
        </div>
        <Section title="Framework posture" action={<span className="sr-hint">function → category → control → evidence</span>}>
          <FrameworkExplorer />
        </Section>
      </div>
    );
  }
  if (tabKey === 'response-investment') {
    return (
      <div className="sr-stack">{head}
        <Section title="Roadmap">
          <table className="sr-table">
            <thead><tr><th>Project</th><th>Status</th><th>Investment</th><th>Expected return</th><th>Decision</th></tr></thead>
            <tbody>
              {tab.projects.map((p) => (
                <tr key={p.name}>
                  <td className="sr-td-name">{p.name}</td>
                  <td>{p.status}</td>
                  <td className="sr-mono">{p.invest}</td>
                  <td className="sr-td-exposed">{p.ret}</td>
                  <td>{p.needs ? <Pill kind="exposure">{p.decision}</Pill> : <span className="sr-dash">{p.decision}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Readiness & investment"><Rows items={tab.readiness} /></Section>
      </div>
    );
  }
  return null;
}

/* Posture vs target — quarterly/monthly toggle + dashed board-target line. */
function PostureChart({ data, target }) {
  const [range, setRange] = useState('quarterly');
  const series = data[range];
  const W = 760, H = 200, P = 28, lo = 50, hi = 100;
  const x = (i) => P + (i * (W - 2 * P)) / (series.length - 1);
  const y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const line = series.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
  const ty = y(target);
  return (
    <Section title="Posture vs. target" action={
      <div className="sr-seg" role="group" aria-label="Range">
        <button type="button" className={`sr-seg__b${range === 'quarterly' ? ' is-on' : ''}`} aria-pressed={range === 'quarterly'} onClick={() => setRange('quarterly')}>Quarterly</button>
        <button type="button" className={`sr-seg__b${range === 'monthly' ? ' is-on' : ''}`} aria-pressed={range === 'monthly'} onClick={() => setRange('monthly')}>Monthly</button>
      </div>
    }>
      <svg className="sr-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Posture trend versus board target">
        <polygon points={area} fill="var(--sr-brand-tint)" />
        <polyline points={line} fill="none" stroke="var(--sr-brand)" strokeWidth="2.5" />
        {series.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="3.5" fill="var(--sr-brand)" />)}
        <line x1={P} y1={ty} x2={W - P} y2={ty} stroke="var(--sr-subtle)" strokeWidth="1" strokeDasharray="5 5" />
        <text x={W - P} y={ty - 6} textAnchor="end" className="sr-chart__t">board target {target}</text>
        {series.map((d, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="sr-chart__t">{d.label}</text>)}
      </svg>
    </Section>
  );
}

/* ---- Framework explorer (collect-once / map-to-many evidence) -------------- */
import { FRAMEWORKS, FW_ORDER, EVIDENCE } from './seats/frameworks';

function FrameworkExplorer() {
  const [fw, setFw] = useState(FW_ORDER[0]);
  const [fnId, setFnId] = useState(null);
  const [catId, setCatId] = useState(null);
  const [ctrlId, setCtrlId] = useState(null);

  const model = FRAMEWORKS[fw];
  const fns = model.functions;
  const fn = fns.find((f) => f.id === fnId);
  const cat = fn && fn.categories.find((c) => c.id === catId);
  const ctrl = cat && cat.controls.find((c) => c.id === ctrlId);
  const ev = ctrl && EVIDENCE[ctrl.evidence];

  const pickFw = (name) => { setFw(name); setFnId(null); setCatId(null); setCtrlId(null); };
  const STK = { Met: 'pass', Partial: 'exposure', Gap: 'critical' };

  return (
    <div className="sr-fw">
      <div className="sr-fw__tabs" role="tablist" aria-label="Framework">
        {FW_ORDER.map((name) => (
          <button key={name} role="tab" aria-selected={fw === name} className={`sr-fw__tab${fw === name ? ' is-on' : ''}`} onClick={() => pickFw(name)}>
            {name}<span className="sr-fw__score">{FRAMEWORKS[name].score}<span className={`sr-fg--${FRAMEWORKS[name].trend === '↑' ? 'pass' : FRAMEWORKS[name].trend === '↓' ? 'critical' : 'muted'}`}> {FRAMEWORKS[name].trend}</span></span>
          </button>
        ))}
      </div>

      <div className="sr-fw__cols">
        <FwCol label="Function" items={fns.map((f) => ({ id: f.id, label: `${f.id} · ${f.name}`, meta: `${f.score} ${f.trend}`, metaKind: f.trend === '↑' ? 'pass' : f.trend === '↓' ? 'critical' : 'muted' }))}
          sel={fnId} onPick={(id) => { setFnId(id); setCatId(null); setCtrlId(null); }} />
        <FwCol label="Category" items={fn ? fn.categories.map((c) => ({ id: c.id, label: `${c.id} · ${c.name}` })) : []}
          sel={catId} onPick={(id) => { setCatId(id); setCtrlId(null); }} empty="Select a function" />
        <FwCol label="Control" items={cat ? cat.controls.map((c) => ({ id: c.id, label: `${c.id} · ${c.name}`, meta: c.status, metaKind: STK[c.status] })) : []}
          sel={ctrlId} onPick={setCtrlId} empty="Select a category" />
      </div>

      {ctrl && ev && (
        <div className="sr-fwev">
          <div className="sr-fwev__head">
            <span className="sr-fwev__id">{ctrl.id}</span>
            <span className="sr-fwev__name">{ctrl.name}</span>
            <Pill kind={STK[ctrl.status]} verified={ctrl.status === 'Met'}>{ctrl.status}</Pill>
          </div>
          <dl className="sr-ev__dl">
            <div><dt>Source</dt><dd>{ev.source}</dd></div>
            <div><dt>Method</dt><dd>{ev.method}</dd></div>
            <div><dt>Last collected</dt><dd>{ev.last}</dd></div>
            <div><dt>Result</dt><dd>{ev.result}</dd></div>
          </dl>
          <div className="sr-fwev__foot">
            <span className="sr-ev__verified">✓ integrity verified</span>
            <span className="sr-fwev__maps">Satisfies: {ev.satisfies.join(' · ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FwCol({ label, items, sel, onPick, empty }) {
  return (
    <div className="sr-fw__col">
      <div className="sr-fw__collabel">{label}</div>
      {items.length === 0
        ? <div className="sr-fw__empty">{empty || '—'}</div>
        : items.map((it) => (
          <button key={it.id} type="button" className={`sr-fw__item${sel === it.id ? ' is-on' : ''}`} onClick={() => onPick(it.id)}>
            <span>{it.label}</span>{it.meta && <span className={`sr-fw__meta sr-fg--${it.metaKind || 'muted'}`}>{it.meta}</span>}
          </button>
        ))}
    </div>
  );
}

/* ============================ Scoped styles =============================== */
function SrStyles() {
  return (
    <style>{`
      .sr-app { font-family:var(--sr-font-body); color:var(--sr-text); }
      .sr-shell { position:relative; z-index:1; max-width:1080px; margin:0 auto; padding:var(--sr-5) var(--sr-5) var(--sr-7); }

      .sr-top { display:flex; justify-content:space-between; align-items:center; gap:var(--sr-4); padding-bottom:var(--sr-4); border-bottom:1px solid var(--sr-border); }
      .sr-brand { display:flex; align-items:center; gap:var(--sr-3); }
      .sr-mark { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:var(--sr-radius-sm); background:var(--sr-brand); color:#fff; font-family:var(--sr-font-display); font-weight:700; font-size:14px; }
      .sr-name { font-family:var(--sr-font-display); font-weight:700; font-size:17px; letter-spacing:-.01em; }
      .sr-sep { width:1px; height:18px; background:var(--sr-border-strong); }
      .sr-seatlabel { font-family:var(--sr-font-mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--sr-muted); }
      .sr-topright { display:flex; align-items:center; gap:var(--sr-3); }
      .sr-live { display:inline-flex; align-items:center; gap:6px; font-family:var(--sr-font-mono); font-size:11px; letter-spacing:.06em; color:var(--sr-muted); }
      .sr-live__dot { width:7px; height:7px; border-radius:50%; background:var(--sr-pass); }
      @media (prefers-reduced-motion: no-preference){ .sr-live__dot{ animation:srPulse 2s ease-in-out infinite; } }
      @keyframes srPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      .sr-theme { display:inline-flex; align-items:center; gap:7px; font-family:var(--sr-font-body); font-size:13px; font-weight:600; color:var(--sr-muted); background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:999px; padding:6px 13px; cursor:pointer; }
      .sr-theme:hover { color:var(--sr-text); border-color:var(--sr-border-strong); }
      .sr-theme:focus-visible { outline:2px solid var(--sr-focus); outline-offset:2px; }

      .sr-viewas { display:flex; align-items:center; gap:var(--sr-2); padding:var(--sr-4) 0 var(--sr-3); flex-wrap:wrap; }
      .sr-viewas__label { font-family:var(--sr-font-mono); font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--sr-subtle); margin-right:var(--sr-2); }
      .sr-seat { font-family:var(--sr-font-body); font-size:13px; font-weight:600; color:var(--sr-muted); background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:999px; padding:6px 14px; cursor:pointer; transition:all .15s ease; }
      .sr-seat:hover { color:var(--sr-text); border-color:var(--sr-border-strong); }
      .sr-seat.is-on { background:var(--sr-brand); border-color:var(--sr-brand); color:#fff; }
      .sr-seat:focus-visible { outline:2px solid var(--sr-focus); outline-offset:2px; }

      .sr-tabsrow { display:flex; justify-content:space-between; align-items:flex-end; gap:var(--sr-4); border-bottom:1px solid var(--sr-border); }
      .sr-tabs { display:flex; overflow-x:auto; }
      .sr-tab { display:flex; flex-direction:column; align-items:flex-start; gap:2px; background:transparent; border:none; border-bottom:2px solid transparent; padding:10px 16px; cursor:pointer; white-space:nowrap; text-align:left; }
      .sr-tab__name { font-family:var(--sr-font-body); font-size:13.5px; font-weight:600; color:var(--sr-muted); }
      .sr-tab__q { font-family:var(--sr-font-display); font-size:11px; color:var(--sr-subtle); }
      .sr-tab:hover .sr-tab__name { color:var(--sr-text); }
      .sr-tab.is-on { border-bottom-color:var(--sr-brand); }
      .sr-tab.is-on .sr-tab__name { color:var(--sr-brand); font-weight:700; }
      .sr-tab.is-on .sr-tab__q { color:var(--sr-muted); }
      .sr-tab:focus-visible { outline:2px solid var(--sr-focus); outline-offset:-2px; border-radius:var(--sr-radius-sm); }
      .sr-deep { flex-shrink:0; background:transparent; border:none; color:var(--sr-brand); font-family:var(--sr-font-body); font-size:13px; font-weight:600; cursor:pointer; padding:10px 4px; }
      .sr-deep:hover { text-decoration:underline; }
      .sr-deep:focus-visible { outline:2px solid var(--sr-focus); outline-offset:2px; border-radius:var(--sr-radius-sm); }

      .sr-panel { padding-top:var(--sr-6); }
      .sr-panel:focus-visible { outline:2px solid var(--sr-focus); outline-offset:3px; border-radius:var(--sr-radius); }
      .sr-stack { display:grid; gap:var(--sr-6); }

      .sr-head { display:grid; gap:var(--sr-3); }
      .sr-head__top { display:flex; align-items:center; gap:var(--sr-3); flex-wrap:wrap; }
      .sr-kicker { font-family:var(--sr-font-mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--sr-subtle); }
      .sr-verdict { margin:0; font-family:var(--sr-font-display); font-weight:500; font-size:27px; line-height:1.25; letter-spacing:-.015em; color:var(--sr-text); max-width:880px; }
      .sr-lede { margin:0; font-size:15px; line-height:1.6; color:var(--sr-muted); max-width:780px; }

      .sr-pill { font-family:var(--sr-font-mono); font-size:11px; letter-spacing:.06em; text-transform:uppercase; padding:4px 10px; border-radius:999px; white-space:nowrap; }
      .sr-pill--brand { color:var(--sr-brand); background:var(--sr-brand-tint); }
      .sr-pill--pass { color:var(--sr-pass); background:var(--sr-pass-tint); }
      .sr-pill--exposure { color:var(--sr-exposure); background:var(--sr-exposure-tint); }
      .sr-pill--critical { color:var(--sr-critical); background:var(--sr-critical-tint); }

      .sr-fg--pass{color:var(--sr-pass)} .sr-fg--exposure{color:var(--sr-exposure)} .sr-fg--critical{color:var(--sr-critical)} .sr-fg--brand{color:var(--sr-brand)} .sr-fg--muted{color:var(--sr-subtle)}

      .sr-band { display:grid; grid-template-columns:repeat(6,1fr); gap:var(--sr-3); }
      .sr-tile { position:relative; display:flex; flex-direction:column; gap:6px; text-align:left; padding:var(--sr-4); cursor:pointer; background:var(--sr-glass); border:1px solid var(--sr-border); border-radius:var(--sr-radius); box-shadow:var(--sr-shadow-1); backdrop-filter:saturate(1.1) blur(14px); -webkit-backdrop-filter:saturate(1.1) blur(14px); transition:border-color .15s ease, transform .05s ease; }
      .sr-tile:hover { border-color:var(--sr-brand); } .sr-tile:active { transform:translateY(.5px); }
      .sr-tile:focus-visible { outline:2px solid var(--sr-focus); outline-offset:2px; }
      .sr-tile__label { font-family:var(--sr-font-mono); font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:var(--sr-subtle); }
      .sr-tile__valrow { display:flex; align-items:baseline; gap:6px; }
      .sr-tile__value { font-family:var(--sr-font-display); font-weight:600; font-size:26px; letter-spacing:-.01em; }
      .sr-tile__delta { font-family:var(--sr-font-mono); font-size:12px; font-weight:600; }
      .sr-tile__arrow { position:absolute; top:var(--sr-3); right:var(--sr-3); color:var(--sr-brand); opacity:0; transition:opacity .15s ease; }
      .sr-tile:hover .sr-tile__arrow, .sr-tile:focus-visible .sr-tile__arrow { opacity:1; }

      .sr-section { display:grid; gap:var(--sr-4); }
      .sr-sectionhead { display:flex; justify-content:space-between; align-items:baseline; gap:var(--sr-3); flex-wrap:wrap; }
      .sr-sectionhead h3 { margin:0; font-family:var(--sr-font-body); font-size:13px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--sr-muted); }
      .sr-hint { font-size:12px; color:var(--sr-subtle); font-style:italic; }

      .sr-brief { display:grid; gap:var(--sr-2); }
      .sr-briefrow { display:flex; align-items:flex-start; gap:var(--sr-3); text-align:left; padding:var(--sr-4); cursor:pointer; background:var(--sr-glass); border:1px solid var(--sr-border); border-left:3px solid var(--sr-brand); border-radius:var(--sr-radius); box-shadow:var(--sr-shadow-1); backdrop-filter:saturate(1.1) blur(14px); -webkit-backdrop-filter:saturate(1.1) blur(14px); }
      .sr-briefrow:hover { border-color:var(--sr-brand); }
      .sr-briefrow:focus-visible { outline:2px solid var(--sr-focus); outline-offset:2px; }
      .sr-briefbody { flex:1; display:grid; gap:3px; }
      .sr-briefq { font-family:var(--sr-font-display); font-weight:500; font-size:16px; color:var(--sr-text); }
      .sr-briefa { font-size:13.5px; line-height:1.55; color:var(--sr-muted); }
      .sr-briefmeta { display:flex; align-items:center; gap:var(--sr-2); flex-shrink:0; }
      .sr-briefarrow { color:var(--sr-brand); }

      .sr-rows { display:grid; }
      .sr-row { display:grid; grid-template-columns:1fr auto; gap:var(--sr-4); align-items:center; padding:var(--sr-3) 0; border-bottom:1px solid var(--sr-border); }
      .sr-row--3 { grid-template-columns:1fr auto auto; }
      .sr-row:last-child { border-bottom:none; }
      .sr-row__k { font-size:14px; color:var(--sr-text); display:flex; flex-direction:column; gap:2px; }
      .sr-row__sub { font-family:var(--sr-font-mono); font-size:11px; color:var(--sr-subtle); }
      .sr-row__v { font-family:var(--sr-font-mono); font-size:13.5px; color:var(--sr-text); text-align:right; }
      .sr-row__owner { font-size:12.5px; color:var(--sr-muted); }
      .sr-due { font-family:var(--sr-font-mono); font-size:11px; color:var(--sr-exposure); background:var(--sr-exposure-tint); padding:3px 8px; border-radius:999px; }

      .sr-table { width:100%; border-collapse:collapse; font-size:14px; }
      .sr-table th { text-align:left; font-family:var(--sr-font-mono); font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--sr-subtle); font-weight:700; padding:0 var(--sr-3) var(--sr-2); border-bottom:1px solid var(--sr-border); }
      .sr-table td { padding:var(--sr-3); border-bottom:1px solid var(--sr-border); color:var(--sr-text); vertical-align:top; }
      .sr-table tr:last-child td { border-bottom:none; }
      .sr-td-name { font-weight:600; }
      .sr-td-exposed { color:var(--sr-muted); font-size:13px; }
      .sr-mono { font-family:var(--sr-font-mono); }
      .sr-dash { color:var(--sr-subtle); }
      .sr-trend { font-weight:700; }

      .sr-chain { display:flex; flex-wrap:wrap; align-items:center; gap:var(--sr-2); }
      .sr-chain__step { display:inline-flex; align-items:center; gap:var(--sr-2); }
      .sr-chain__box { font-family:var(--sr-font-mono); font-size:12px; background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:var(--sr-radius-sm); padding:6px 10px; }
      .sr-chain__arr { color:var(--sr-subtle); }
      .sr-statgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--sr-3); }
      .sr-stat { background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:var(--sr-radius); padding:var(--sr-4); display:grid; gap:6px; }
      .sr-stat__k { font-family:var(--sr-font-mono); font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--sr-subtle); }
      .sr-stat__v { font-family:var(--sr-font-display); font-weight:600; font-size:19px; }

      .sr-decisions { display:grid; gap:var(--sr-3); }
      .sr-dc { display:grid; gap:var(--sr-2); background:var(--sr-surface); border:1px solid var(--sr-border); border-left:3px solid var(--sr-brand); border-radius:var(--sr-radius); box-shadow:var(--sr-shadow-1); padding:var(--sr-4); }
      .sr-dc--critical { border-left-color:var(--sr-critical); } .sr-dc--high, .sr-dc--exposure { border-left-color:var(--sr-exposure); }
      .sr-dc__title { margin:0; font-family:var(--sr-font-display); font-weight:500; font-size:16px; }
      .sr-dc__owner { margin:0; font-family:var(--sr-font-mono); font-size:12px; color:var(--sr-muted); }
      .sr-btn { justify-self:start; background:var(--sr-brand); color:#fff; border:none; font-family:var(--sr-font-body); font-weight:600; font-size:14px; padding:11px 18px; border-radius:var(--sr-radius-sm); cursor:pointer; }
      .sr-btn:hover { filter:brightness(1.05); } .sr-btn:focus-visible { outline:2px solid var(--sr-focus); outline-offset:2px; }

      .sr-twocol { display:grid; grid-template-columns:1fr 1fr; gap:var(--sr-4); }
      .sr-tl { margin:0; padding:0; list-style:none; display:grid; gap:var(--sr-2); }
      .sr-tl li { font-size:14px; background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:var(--sr-radius-sm); padding:10px 12px; }
      .sr-tl--up li { border-left:3px solid var(--sr-pass); } .sr-tl--down li { border-left:3px solid var(--sr-exposure); }
      .sr-seg { display:inline-flex; background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:var(--sr-radius-sm); padding:2px; }
      .sr-seg__b { border:none; background:transparent; font-family:var(--sr-font-body); font-size:12px; font-weight:600; color:var(--sr-muted); padding:5px 12px; border-radius:6px; cursor:pointer; }
      .sr-seg__b.is-on { background:var(--sr-brand); color:#fff; }
      .sr-seg__b:focus-visible { outline:2px solid var(--sr-focus); outline-offset:1px; }
      .sr-chart { width:100%; height:auto; background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:var(--sr-radius); }
      .sr-chart__t { fill:var(--sr-subtle); font-family:var(--sr-font-mono); font-size:11px; }

      .sr-fw { display:grid; gap:var(--sr-4); }
      .sr-fw__tabs { display:flex; flex-wrap:wrap; gap:var(--sr-2); }
      .sr-fw__tab { display:inline-flex; align-items:center; gap:8px; font-family:var(--sr-font-body); font-size:12.5px; font-weight:600; color:var(--sr-muted); background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:999px; padding:6px 13px; cursor:pointer; }
      .sr-fw__tab.is-on { background:var(--sr-brand); border-color:var(--sr-brand); color:#fff; }
      .sr-fw__tab.is-on .sr-fw__score, .sr-fw__tab.is-on .sr-fg--pass, .sr-fw__tab.is-on .sr-fg--critical, .sr-fw__tab.is-on .sr-fg--muted { color:#fff; }
      .sr-fw__score { font-family:var(--sr-font-mono); font-size:11px; }
      .sr-fw__tab:focus-visible { outline:2px solid var(--sr-focus); outline-offset:2px; }
      .sr-fw__cols { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--sr-3); }
      .sr-fw__col { background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:var(--sr-radius); padding:var(--sr-3); display:grid; gap:4px; align-content:start; min-height:140px; }
      .sr-fw__collabel { font-family:var(--sr-font-mono); font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--sr-subtle); padding:2px 6px var(--sr-2); }
      .sr-fw__item { display:flex; justify-content:space-between; align-items:center; gap:var(--sr-2); text-align:left; font-size:13px; color:var(--sr-text); background:transparent; border:1px solid transparent; border-radius:var(--sr-radius-sm); padding:8px 10px; cursor:pointer; }
      .sr-fw__item:hover { background:var(--sr-bg); }
      .sr-fw__item.is-on { background:var(--sr-brand-tint); color:var(--sr-brand); font-weight:600; }
      .sr-fw__item:focus-visible { outline:2px solid var(--sr-focus); outline-offset:1px; }
      .sr-fw__meta { font-family:var(--sr-font-mono); font-size:11px; }
      .sr-fw__empty { font-size:12.5px; color:var(--sr-subtle); font-style:italic; padding:8px 10px; }
      .sr-fwev { background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:var(--sr-radius); padding:var(--sr-4); display:grid; gap:var(--sr-3); }
      .sr-fwev__head { display:flex; align-items:center; gap:var(--sr-3); flex-wrap:wrap; }
      .sr-fwev__id { font-family:var(--sr-font-mono); font-size:12px; font-weight:700; color:var(--sr-brand); }
      .sr-fwev__name { font-family:var(--sr-font-display); font-size:15px; flex:1; }
      .sr-fwev__foot { display:flex; justify-content:space-between; gap:var(--sr-3); flex-wrap:wrap; padding-top:var(--sr-2); border-top:1px solid var(--sr-border); }
      .sr-fwev__maps { font-family:var(--sr-font-mono); font-size:11px; color:var(--sr-subtle); }

      .sr-ev { background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:var(--sr-radius-sm); padding:var(--sr-2) var(--sr-3); }
      .sr-ev__sum { cursor:pointer; font-size:12.5px; font-weight:600; color:var(--sr-text); }
      .sr-ev__hint { font-family:var(--sr-font-mono); font-size:10px; color:var(--sr-subtle); margin-left:6px; }
      .sr-ev__dl { margin:var(--sr-2) 0 0; display:grid; gap:var(--sr-1); }
      .sr-ev__dl > div { display:grid; grid-template-columns:130px 1fr; gap:var(--sr-3); padding:4px 0; border-bottom:1px solid var(--sr-border); }
      .sr-ev__dl dt { font-family:var(--sr-font-mono); font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--sr-subtle); }
      .sr-ev__dl dd { margin:0; font-family:var(--sr-font-mono); font-size:12.5px; color:var(--sr-text); }
      .sr-ev__verified { font-family:var(--sr-font-mono); font-size:12px; font-weight:700; color:var(--sr-pass); }

      .sr-footer { margin-top:var(--sr-7); padding-top:var(--sr-4); border-top:1px solid var(--sr-border); font-family:var(--sr-font-mono); font-size:11px; color:var(--sr-subtle); text-align:center; }

      @media (max-width: 900px){
        .sr-band { grid-template-columns:repeat(3,1fr); }
        .sr-statgrid { grid-template-columns:repeat(2,1fr); }
        .sr-fw__cols { grid-template-columns:1fr; }
      }
      @media (max-width: 620px){
        .sr-band { grid-template-columns:repeat(2,1fr); }
        .sr-twocol { grid-template-columns:1fr; }
        .sr-verdict { font-size:22px; }
      }
    `}</style>
  );
}

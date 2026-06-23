/**
 * SituationRoom — executive "situation room" UI built to the precise spec.
 * Self-contained: reads only --rx-* tokens (situation-room.css); keeps the app's
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

import { useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './useTheme';
import { useCisoData, apiCtx } from './useCisoData';
import { useSeatData } from './useSeatData';
import AgentAsk from './AgentAsk';
import { CISO_SEAT } from './seats/ciso';
import SEATS_DATA from './seats/otherSeats';
import { useNow, getAudit, downloadBoardPack } from './trust';

/* "View as" — exact order. */
const SEAT_ORDER = ['CEO', 'CISO', 'CFO', 'CIO', 'CLO', 'CRO', 'Board'];

/* Per-seat tab definitions (formal name + plain question). CISO is complete; the
   other six show their exact tab names and are authored next. */
const SEAT_TABS = {
  CEO: ['Exec Summary', 'Operating Status', 'Principal Business Risk', 'Board & Executive Attention', 'Trajectory', '⚖ Liability'],
  CISO: CISO_SEAT.tabs.map((t) => t.name),
  CFO: ['Exec Summary', 'Financial Exposure', 'Materiality', 'Decisions Required', 'Return on Investment', '⚖ Liability'],
  CIO: ['Exec Summary', 'Service Status', 'Operational Threats', 'Decisions Required', 'Reliability Trend', '⚖ Liability'],
  CLO: ['Exec Summary', 'Regulatory Obligation', 'Disclosure & Timelines', 'Decisions Required', 'Defensibility', '⚖ Liability'],
  CRO: ['Exec Summary', 'Risk Appetite Status', 'Tolerance & Concentration', 'Decisions Required', 'Risk Trajectory', '⚖ Liability'],
  Board: ['Exec Summary', 'Control Assurance', 'Materiality', 'Board Decisions', 'Quarterly Oversight', '⚖ Liability'],
};

/* Legacy deep-dive target per seat (kept routing). */
const DEEP = { CISO: 'dashboard', CIO: 'cio', CFO: 'cfo', CRO: 'cro', CLO: 'clo', Board: 'boarddash' };

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* Tabs for a seat (CISO is the fully-modeled reference). */
const tabsForSeat = (s) => (s === 'CISO'
  ? CISO_SEAT.tabs
  : SEAT_TABS[s].map((name, i) => ({ key: i === 0 ? 'summary' : slug(name), name })));
const seatFromSlug = (sl) => SEAT_ORDER.find((s) => s.toLowerCase() === sl) || null;

/* Scoped router — owns ONLY the URL #fragment (#/<seat>/<tab>), so the legacy
   App.jsx state machine (which owns pathname) is left completely untouched.
   Exactly one Router instance, at the module root. */
export default function SituationRoom(props = {}) {
  return (
    <HashRouter>
      <Routes>
        <Route path="/:seat/:tab" element={<SeatView {...props} />} />
        <Route path="/:seat" element={<SeatView {...props} />} />
        <Route path="*" element={<DefaultRedirect initialSeat={props.initialSeat} />} />
      </Routes>
    </HashRouter>
  );
}

function DefaultRedirect({ initialSeat }) {
  const s = SEAT_ORDER.includes((initialSeat || '').toUpperCase()) ? initialSeat.toUpperCase() : 'CISO';
  return <Navigate to={`/${s.toLowerCase()}/summary`} replace />;
}

function SeatView(props = {}) {
  const { go, initialSeat } = props;
  const params = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const tabRefs = useRef([]);
  const { isDark, toggle } = useTheme();
  // Real CISO data, bound conservatively (verified fields only); null when offline.
  const bound = useCisoData(props);
  const now = useNow();                       // live "as-of" clock
  const [auditOpen, setAuditOpen] = useState(false);

  // Resolve seat + tab from the URL params (validated, with fallbacks).
  const seat = seatFromSlug((params.seat || '').toLowerCase())
    || (SEAT_ORDER.includes((initialSeat || '').toUpperCase()) ? initialSeat.toUpperCase() : 'CISO');
  const tabs = tabsForSeat(seat);
  const tabKey = tabs.some((t) => t.key === params.tab) ? params.tab : 'summary';
  const tabIdx = Math.max(0, tabs.findIndex((t) => t.key === tabKey));
  const activeTab = tabs[tabIdx] || tabs[0];
  const seatBound = useSeatData(seat, props);   // common spine for the other six seats

  // Trust layer: provenance + as-of are per-seat (CISO is live; others sample).
  const asOf = bound?.live ? bound.live.toLocaleString() : null;
  const provenance = bound?.provenance || null;
  const onBoardPack = () => {
    const data = seat === 'CISO' ? CISO_SEAT : SEATS_DATA[seat];
    // CISO: kick the server-side report builder (best-effort); then export the client
    // board pack and log the audit entry regardless.
    if (seat === 'CISO') {
      const { token, orgId, api } = apiCtx(props);
      const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId };
      if (token) h.Authorization = `Bearer ${token}`;
      fetch(`${api}/api/ciso/report/generate?org_id=${encodeURIComponent(orgId)}`, { method: 'POST', headers: h, body: '{}' }).catch(() => {});
    }
    if (data) downloadBoardPack({ seat, summary: data.summary, tabs: data.tabs, provenance, asOf });
  };

  // Navigation drives the router → browser back/forward + deep links come free.
  const navigate = (s, key) => nav(`/${s.toLowerCase()}/${key}`);
  const selectSeat = (s) => navigate(s, 'summary');
  // "Every number is a door": door clicks record their origin so the target can
  // offer "← Back to <origin>". Tab-bar / seat switches don't (no origin).
  const goTabKey = (key) => nav(`/${seat.toLowerCase()}/${key}`, { state: { from: activeTab.name } });
  const setTabByIndex = (i) => navigate(seat, tabs[i].key);
  const back = (loc.state && loc.state.from && activeTab.key !== 'summary')
    ? { label: loc.state.from, onClick: () => nav(-1) } : null;

  const onTabsKey = (e) => {
    const n = tabs.length;
    let next = null;
    if (e.key === 'ArrowRight') next = (tabIdx + 1) % n;
    else if (e.key === 'ArrowLeft') next = (tabIdx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next != null) { e.preventDefault(); setTabByIndex(next); const el = tabRefs.current[next]; if (el) el.focus(); }
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
            <span className="sr-live" title={asOf ? `Data as of ${asOf}` : 'Live'}>
              <span className="sr-live__dot" aria-hidden="true" />LIVE · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button type="button" className="sr-theme" onClick={() => setAuditOpen(true)} aria-haspopup="dialog">
              <span aria-hidden="true">▤</span> Audit log
            </button>
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
                  tabIndex={on ? 0 : -1} className={`sr-tab${on ? ' is-on' : ''}`} onClick={() => setTabByIndex(i)}>
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
            ? <CisoPanel tabKey={activeTab.key} goTabKey={goTabKey} bound={bound} onBoardPack={onBoardPack} back={back} />
            : <SeatPanel seat={seat} tabKey={activeTab.key} goTabKey={goTabKey} onBoardPack={onBoardPack} asOf={null} bound={seatBound} back={back} />}
          {/* The seat's Digital Twin — greets on entry, persists across this seat's tabs. */}
          <AgentAsk key={seat} seat={seat} apiProps={props} />
        </div>

        <footer className="sr-footer">CyberRx · executive operating system — illustrative, with sample data</footer>
      </div>
      {auditOpen && <AuditLogModal onClose={() => setAuditOpen(false)} />}
    </div>
  );
}

function SeatPlaceholder({ seat, tab }) {
  return (
    <div className="sr-stack">
      <PanelHead kicker={`${seat} · ${tab}`} verdict={`The ${seat} seat is being authored.`} />
      <p className="sr-lede">CISO is the fully-built reference. {seat} reframes the same running incident in this executive’s lens.</p>
    </div>
  );
}

/* Generic seat renderer — the six non-CISO seats share this one code path, driven
   by data blocks (see seats/otherSeats.js). Same shape as the CISO reference. */
function SeatPanel({ seat, tabKey, goTabKey, onBoardPack, asOf, back, bound }) {
  const S = SEATS_DATA[seat];
  if (!S) return <SeatPlaceholder seat={seat} tab={tabKey} />;
  if (tabKey === 'summary') {
    // Real verdict/lede/status ← agents brief; briefing ← key-questions (mapped to
    // this seat's tabs, in order). Tiles stay sample. Tagged-sample fallback.
    const b = bound?.brief;
    const tabKeys = Object.keys(S.tabs);
    const briefing = (bound?.briefingCards && bound.briefingCards.length)
      ? bound.briefingCards.slice(0, tabKeys.length).map((c, i) => ({ ...c, to: tabKeys[i] }))
      : S.summary.briefing;
    return (
      <div className="sr-stack">
        <PanelHead kicker={`${seat} · Executive summary`} tag={b ? 'live' : 'sample'}
          verdict={b ? b.verdict : S.summary.verdict}
          pill={b ? b.pill : S.summary.pill} pillKind={b ? b.pillKind : S.summary.pillKind}
          pillVerified={!b && S.summary.pillVerified} lede={b ? b.lede : S.summary.lede} />
        <ProvenanceStrip provenance={null} asOf={asOf} />
        <MetricBand tiles={S.summary.tiles} onGo={goTabKey} />
        <Briefing rows={briefing} onGo={goTabKey} />
      </div>
    );
  }
  const tab = S.tabs[tabKey];
  if (!tab) return null;
  return (
    <div className="sr-stack">
      <PanelHead verdict={tab.name} pill={tab.pill} pillKind={tab.pillKind}
        pillVerified={tab.pillVerified} qsub={tab.q} lede={tab.lede} back={back} />
      {(tab.sections || []).map((s, i) => <SeatSection key={i} s={s} onBoardPack={onBoardPack} />)}
    </div>
  );
}

function SeatSection({ s, onBoardPack }) {
  if (s.kind === 'rows') return <Section title={s.title}><Rows items={s.items} /></Section>;
  if (s.kind === 'note') return <p className="sr-note">{s.text}</p>;
  if (s.kind === 'bigstat') return <div className="sr-bigstat">{s.text}</div>;
  if (s.kind === 'panel') return <SeatMiniPanel p={s} full />;
  if (s.kind === 'cols') return <div className="sr-twocol">{s.panels.map((p, i) => <SeatMiniPanel key={i} p={p} />)}</div>;
  if (s.kind === 'decisions') {
    return (
      <Section title={s.title}>
        <div className="sr-decisions">
          {s.items.map((d, i) => (
            <article key={i} className={`sr-dc sr-dc--${d.kind}`}>
              <Pill kind={d.kind}>{d.sev}</Pill>
              <p className="sr-dc__title">{d.title}</p>
              <p className="sr-dc__owner">{d.owner}</p>
            </article>
          ))}
        </div>
        {s.button && <button type="button" className="sr-btn" onClick={onBoardPack}>{s.button}</button>}
      </Section>
    );
  }
  if (s.kind === 'twocol') {
    return (
      <div className="sr-twocol">
        <Section title={s.a.title}><ul className={`sr-tl sr-tl--${s.a.tone === 'pass' ? 'up' : 'down'}`}>{s.a.items.map((x) => <li key={x}>{x}</li>)}</ul></Section>
        <Section title={s.b.title}><ul className={`sr-tl sr-tl--${s.b.tone === 'pass' ? 'up' : 'down'}`}>{s.b.items.map((x) => <li key={x}>{x}</li>)}</ul></Section>
      </div>
    );
  }
  if (s.kind === 'chain') {
    return (
      <Section title={s.title}>
        <div className="sr-chain">{s.steps.map((x, i) => (<span key={x} className="sr-chain__step"><span className="sr-chain__box">{x}</span>{i < s.steps.length - 1 && <span className="sr-chain__arr" aria-hidden="true">→</span>}</span>))}</div>
        {s.stats && <div className="sr-statgrid">{s.stats.map((x) => <div key={x.k} className="sr-stat"><span className="sr-stat__k">{x.k}</span><span className="sr-stat__v">{x.v}</span></div>)}</div>}
      </Section>
    );
  }
  if (s.kind === 'chart') return <PostureChart data={s.posture} target={s.target} />;
  if (s.kind === 'table') {
    const table = (
      <table className="sr-table">
        <thead><tr>{s.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {s.rows.map((r, ri) => (
            <tr key={ri}>{r.cells.map((c, ci) => (
              <td key={ci} className={c.mono ? 'sr-mono' : c.exposed ? 'sr-td-exposed' : c.name ? 'sr-td-name' : ''}>
                {c.pill ? <Pill kind={c.kind}>{c.t}</Pill>
                  : c.fg ? <span className={`sr-trend sr-fg--${c.fg}`}>{c.t}</span>
                  : c.t}
              </td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    );
    return s.title
      ? <Section title={s.title} action={s.note ? <span className="sr-hint">{s.note}</span> : null}>{table}</Section>
      : <div className="sr-section">{table}</div>;
  }
  return null;
}

/* ============================ Reusable building blocks ===================== */
export function Pill({ kind = 'brand', verified, children }) {
  return <span className={`sr-pill sr-pill--${kind}`}>{verified ? '✓ ' : ''}{children}</span>;
}

export function PanelHead({ kicker, verdict, pill, pillKind, pillVerified, qsub, lede, tag, back }) {
  return (
    <div className="sr-head">
      {back && <button type="button" className="sr-back" onClick={back.onClick}>← Back to {back.label}</button>}
      {(kicker || tag) && <span className="sr-kicker">{kicker}{tag && <span className={`sr-srctag sr-srctag--${tag}`}>{tag}</span>}</span>}
      {verdict && <h2 className="sr-verdict">{verdict}{pill && <Pill kind={pillKind} verified={pillVerified}>{pill}</Pill>}</h2>}
      {qsub && <p className="sr-qsub">{qsub}</p>}
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
          {t.note && <span className={`sr-tile__note sr-note--${t.note}`}>{t.note}</span>}
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

/* The rich evidence box — source · method · last collected · result · ✓ verified. */
export function EvidenceBox({ ev }) {
  return (
    <div className="sr-evbox">
      <div className="sr-evbox__h">⛓ How this evidence was collected</div>
      <div className="sr-erow"><span className="sr-ek">Source</span><span className="sr-ev2">{ev.source}</span></div>
      <div className="sr-erow"><span className="sr-ek">Method</span><span className="sr-ev2">{ev.method}</span></div>
      <div className="sr-erow"><span className="sr-ek">Last collected</span><span className="sr-ev2">{ev.last}</span></div>
      <div className="sr-erow"><span className="sr-ek">Result</span><span className="sr-ev2">{ev.result}</span></div>
      <div className="sr-ev__verified">✓ Captured automatically · integrity-verified · evidence chain intact</div>
    </div>
  );
}

/* Key→value rows (mono values carry status). Rows with `ev` expand to their proof. */
export function Rows({ items }) {
  return (
    <div className="sr-rows">
      {items.map((r, i) => (r.ev ? (
        <details key={i} className="sr-row sr-row--ev">
          <summary className="sr-row__sum">
            <span className="sr-row__k">{r.k}{r.sub && <span className="sr-row__sub">{r.sub}</span>}</span>
            <span className={`sr-row__v${r.kind ? ` sr-fg--${r.kind}` : ''}`}>{r.verified && <span className="sr-fg--pass">✓ </span>}{r.v}</span>
            <span className="sr-row__chev" aria-hidden="true">▸</span>
          </summary>
          <EvidenceBox ev={r.ev} />
        </details>
      ) : (
        <div key={i} className="sr-row">
          <span className="sr-row__k">{r.k}{r.sub && <span className="sr-row__sub">{r.sub}</span>}</span>
          <span className={`sr-row__v${r.kind ? ` sr-fg--${r.kind}` : ''}`}>{r.verified && <span className="sr-fg--pass">✓ </span>}{r.v}</span>
        </div>
      )))}
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
function CisoPanel({ tabKey, goTabKey, bound, onBoardPack, back }) {
  const S = CISO_SEAT;
  if (tabKey === 'summary') {
    // Real verdict/lede/pill ← agents brief; tiles ← dashboard/coverage; briefing ←
    // key-questions. Each falls back to the seat's authored sample, tagged "sample".
    const synced = bound?.live ? bound.live.toLocaleString() : '14:09';
    const tiles = S.summary.tiles.map((t) => (bound?.tiles && bound.tiles[t.label] ? { ...t, ...bound.tiles[t.label] } : t));
    const b = bound?.brief;
    const briefing = (bound?.briefing && bound.briefing.length) ? bound.briefing : S.summary.briefing;
    return (
      <div className="sr-stack">
        <PanelHead kicker={`Executive summary · synced ${synced}`} tag={b ? 'live' : 'sample'}
          verdict={b ? b.verdict : S.summary.verdict}
          pill={b ? b.pill : S.summary.pill} pillKind={b ? b.pillKind : S.summary.pillKind}
          lede={b ? b.lede : S.summary.lede} />
        <ProvenanceStrip provenance={bound?.provenance} asOf={bound?.live ? bound.live.toLocaleString() : null} />
        <MetricBand tiles={tiles} onGo={goTabKey} />
        <Briefing rows={briefing} onGo={goTabKey} />
      </div>
    );
  }
  const tab = S.tabs.find((t) => t.key === tabKey);
  if (!tab) return null;
  const head = (
    <PanelHead verdict={tab.name} pill={tab.pill} pillKind={tab.pillKind}
      pillVerified={tab.pillVerified} qsub={tab.q} lede={tab.lede} back={back} />
  );

  if (tabKey === 'operational') {
    const inc = bound?.incident;
    const sigItems = bound?.signals?.items;
    return (
      <div className="sr-stack">{head}
        {inc && (
          <div className="sr-incident" role="note" aria-label="Active incident">
            <span className="sr-incident__dot" aria-hidden="true" />
            <div>
              <div className="sr-incident__kicker">Active incident · {inc.failedAt || '—'}{inc.phase ? ` · ${inc.phase}` : ''}</div>
              <div className="sr-incident__text">{inc.headline}</div>
            </div>
          </div>
        )}
        {tab.panels.map((p) => <Section key={p.title} title={p.title}><Rows items={p.rows} /></Section>)}
        {Array.isArray(sigItems) && sigItems.length > 0 && (
          <Section title="Live platform signals" action={<span className="sr-hint">live · {bound.signals.generatedAt ? new Date(bound.signals.generatedAt).toLocaleString() : 'now'}</span>}>
            <div className="sr-rows">
              {sigItems.map((s, i) => (
                <div key={i} className="sr-row">
                  <span className="sr-row__k">{s.label}{s.detail && <span className="sr-row__sub">{s.detail}</span>}</span>
                  <span className="sr-row__v">{s.live ? <span className="sr-fg--pass">✓ </span> : ''}{s.value}{s.source ? ` · ${s.source}` : ''}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }
  if (tabKey === 'liability') {
    return (
      <div className="sr-stack">{head}
        {(tab.panels || []).map((p) => <Section key={p.title} title={p.title}><Rows items={p.rows} /></Section>)}
        {tab.note && <p className="sr-bigstat">{tab.note}</p>}
      </div>
    );
  }
  if (tabKey === 'material-exposure') {
    const processes = bound?.processes || tab.processes;
    return (
      <div className="sr-stack">{head}
        <Section title="Business processes at risk"
          action={bound?.processes ? <span className="sr-hint">risk derived from control protection · live</span> : null}>
          <table className="sr-table">
            <thead><tr><th>Process</th><th>Risk</th><th>Trend</th><th>What’s exposed</th></tr></thead>
            <tbody>
              {processes.map((p) => (
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
            {[...tab.pathStats, ...(bound?.coverage != null ? [{ k: 'ATT&CK coverage (live)', v: `${bound.coverage}%` }] : [])]
              .map((s) => <div key={s.k} className="sr-stat"><span className="sr-stat__k">{s.k}</span><span className="sr-stat__v">{s.v}</span></div>)}
          </div>
        </Section>
      </div>
    );
  }
  if (tabKey === 'action-center') {
    const decisions = bound?.decisions || tab.decisions;
    const others = bound?.others || tab.others;
    return (
      <div className="sr-stack">{head}
        <Section title="Your decisions — today">
          <div className="sr-decisions">
            {decisions.map((d, i) => (
              <article key={i} className={`sr-dc sr-dc--${d.kind}`}>
                <Pill kind={d.kind}>{d.sev}</Pill>
                <p className="sr-dc__title">{d.title}</p>
                <p className="sr-dc__owner">{d.owner}</p>
              </article>
            ))}
          </div>
          <button type="button" className="sr-btn" onClick={onBoardPack}>Generate board package →</button>
        </Section>
        <Section title="Others’ actions — this week">
          <div className="sr-rows">
            {others.map((o, i) => (
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
        <div className="sr-fw__cap">
          {bound?.postureLive != null
            ? <>Current posture <strong>{bound.postureLive}</strong> (live · /api/metrics/ciso) · trend series illustrative (no history endpoint yet)</>
            : <>Trend series illustrative — sample</>}
        </div>
        <div className="sr-twocol">
          <Section title="Improving"><ul className="sr-tl sr-tl--up">{tab.improving.map((x) => <li key={x}>{x}</li>)}</ul></Section>
          <Section title="Deteriorating — needs attention"><ul className="sr-tl sr-tl--down">{tab.deteriorating.map((x) => <li key={x}>{x}</li>)}</ul></Section>
        </div>
        <Section title="Framework posture" action={<span className="sr-hint">function → category → control → evidence</span>}>
          <FrameworkExplorer bound={bound?.fw} />
        </Section>
      </div>
    );
  }
  if (tabKey === 'response-investment') {
    const projects = bound?.roadmap?.projects || tab.projects;
    const readiness = bound?.roadmap?.readiness || tab.readiness;
    return (
      <div className="sr-stack">{head}
        <Section title="Roadmap" action={bound?.roadmap ? <span className="sr-hint">live · /api/projects/portfolio</span> : null}>
          <table className="sr-table">
            <thead><tr><th>Project</th><th>Status</th><th>Investment</th><th>Expected return</th><th>Decision</th></tr></thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.name || i}>
                  <td className="sr-td-name">{p.name}</td>
                  <td>{p.status}</td>
                  <td className="sr-mono">{p.invest}</td>
                  <td className="sr-td-exposed">{p.ret}</td>
                  <td>{p.needs ? <Pill kind="exposure">{p.decision || 'Needs funding'}</Pill> : <span className="sr-dash">{p.decision || '—'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Readiness & investment"><Rows items={readiness} /></Section>
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
        <polygon points={area} fill="var(--rx-brand-tint)" />
        <polyline points={line} fill="none" stroke="var(--rx-brand)" strokeWidth="2.5" />
        {series.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="3.5" fill="var(--rx-brand)" />)}
        <line x1={P} y1={ty} x2={W - P} y2={ty} stroke="var(--rx-subtle)" strokeWidth="1" strokeDasharray="5 5" />
        <text x={W - P} y={ty - 6} textAnchor="end" className="sr-chart__t">board target {target}</text>
        {series.map((d, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="sr-chart__t">{d.label}</text>)}
      </svg>
    </Section>
  );
}

/* ---- Framework explorer (collect-once / map-to-many evidence) -------------- */
import { FRAMEWORKS, FW_ORDER, EVIDENCE } from './seats/frameworks';

function FrameworkExplorer({ bound }) {
  // Real cae data when bound; otherwise the sample model.
  const FWS = bound?.frameworks || FRAMEWORKS;
  const ORDER = (bound?.order && bound.order.length ? bound.order : FW_ORDER).filter((n) => FWS[n]);
  const [fw, setFw] = useState(ORDER[0]);
  const [fnId, setFnId] = useState(null);
  const [catId, setCatId] = useState(null);
  const [ctrlId, setCtrlId] = useState(null);

  const model = FWS[fw] || FWS[ORDER[0]];
  const fns = model.functions;
  const fn = fns.find((f) => f.id === fnId);
  const cat = fn && fn.categories.find((c) => c.id === catId);
  const ctrl = cat && cat.controls.find((c) => c.id === ctrlId);
  // Bound controls carry an inline evidence object; sample controls carry an id.
  const ev = ctrl && (typeof ctrl.evidence === 'object' ? ctrl.evidence : EVIDENCE[ctrl.evidence]);

  const pickFw = (name) => { setFw(name); setFnId(null); setCatId(null); setCtrlId(null); };
  const STK = { Met: 'pass', Partial: 'exposure', Gap: 'critical' };
  const scoreKind = (n) => (typeof n !== 'number' ? 'muted' : n >= 80 ? 'pass' : n >= 70 ? 'exposure' : 'critical');
  const trendKind = (t) => (t === '↑' ? 'pass' : t === '↓' ? 'critical' : 'muted');

  return (
    <div className="sr-fw">
      <div className="sr-fw__tabs" role="tablist" aria-label="Framework">
        {ORDER.map((name) => (
          <button key={name} role="tab" aria-selected={fw === name} className={`sr-fw__tab${fw === name ? ' is-on' : ''}`} onClick={() => pickFw(name)}>
            {name}<span className="sr-fw__score">{FWS[name].score}<span className={`sr-fg--${trendKind(FWS[name].trend)}`}> {FWS[name].trend}</span></span>
          </button>
        ))}
      </div>

      {(model.score != null || model.sub) && (
        <div className="sr-fw__cap"><strong>{fw}</strong>{model.score != null ? ` · overall ${model.score}` : ''}{model.sub ? ` · ${model.sub}` : ''}</div>
      )}

      <div className="sr-fw__cols">
        <FwCol label="Function" items={fns.map((f) => ({ id: f.id, label: f.name, meta: `${f.score} ${f.trend}`, metaKind: trendKind(f.trend) }))}
          sel={fnId} onPick={(id) => { setFnId(id); setCatId(null); setCtrlId(null); }} />
        <FwCol label="Category" items={fn ? fn.categories.map((c) => ({ id: c.id, label: c.name, meta: c.score != null ? String(c.score) : undefined, metaKind: scoreKind(c.score) })) : []}
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
          <EvidenceBox ev={ev} />
          {ev.satisfies && <div className="sr-fwev__maps">Satisfies: {ev.satisfies.join(' · ')}</div>}
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

/* A mini panel (srow / kv rows) — matches the mock's .panel blocks. Rows that
   carry `ev` expand to their evidence (source · method · last collected · result). */
function SeatMiniPanel({ p, full }) {
  return (
    <div className={`sr-panel${full ? ' sr-panel--full' : ''}`}>
      <h4 className="sr-panel__h">{p.title}</h4>
      {p.rows.map((r, i) => {
        const kv = p.rowsKind === 'kv';
        const inner = kv
          ? <><span className="sr-kv__k">{r.l}</span><span className={`sr-kv__v${r.vKind ? ` sr-fg--${r.vKind}` : ''}`}>{r.v}</span></>
          : <><span className="sr-srow__nm">{r.nm}{r.sub && <span className="sr-srow__sub">{r.sub}</span>}</span><span className={`sr-pill sr-pill--${r.statKind || 'brand'}`}>{r.stat}</span></>;
        if (r.ev) {
          return (
            <details key={i} className={`${kv ? 'sr-kv' : 'sr-srow'} sr-mini--ev`}>
              <summary className="sr-mini__sum">{inner}<span className="sr-row__chev" aria-hidden="true">▸</span></summary>
              <EvidenceBox ev={r.ev} />
            </details>
          );
        }
        return <div key={i} className={kv ? 'sr-kv' : 'sr-srow'}>{inner}</div>;
      })}
    </div>
  );
}

/* ---- Trust layer: provenance strip + audit log --------------------------- */
function ProvenanceStrip({ provenance, asOf }) {
  const p = provenance || {};
  const items = [
    ['Evidence', p.signals != null ? `${p.signals} signals` : 'sample'],
    ['Sources', 'Okta · PAM · SIEM · KMS · GRC'],
    ['Coverage', p.coverage != null ? `${Math.round(p.coverage)}%` : '—'],
    ['Last sync', asOf || '—'],
    ['Signed', 'CISO attestation'],
  ];
  return (
    <div className="sr-prov" role="note" aria-label="Provenance">
      {items.map(([k, v]) => (
        <span key={k} className="sr-prov__item"><span className="sr-prov__k">{k}</span><span className="sr-prov__v">{v}</span></span>
      ))}
      {!provenance && <span className="sr-prov__item"><span className="sr-prov__v sr-fg--exposure">sample provenance</span></span>}
    </div>
  );
}

function AuditLogModal({ onClose }) {
  const [entries, setEntries] = useState(getAudit());
  useEffect(() => {
    const refresh = () => setEntries(getAudit());
    window.addEventListener('cyberrx-audit', refresh);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('cyberrx-audit', refresh); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="sr-modal__backdrop" onClick={onClose}>
      <div className="sr-modal" role="dialog" aria-modal="true" aria-label="Audit log" onClick={(e) => e.stopPropagation()}>
        <div className="sr-modal__head">
          <h3 className="sr-modal__title">Audit log <span className="sr-modal__sub">who decided what · what changed</span></h3>
          <button type="button" className="sr-modal__close" onClick={onClose} aria-label="Close audit log">✕</button>
        </div>
        <div className="sr-modal__body">
          {entries.length === 0
            ? <p className="sr-lede">No recorded actions yet. Generating a board pack (or other tracked actions) will appear here.</p>
            : entries.map((e, i) => (
              <div key={i} className="sr-audit__row">
                <span className="sr-audit__ts">{new Date(e.ts).toLocaleString()}</span>
                <span className="sr-audit__actor">{e.actor}</span>
                <span className="sr-audit__act">{e.action}{e.detail ? ` · ${e.detail}` : ''}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ Scoped styles =============================== */
function SrStyles() {
  return (
    <style>{`
      .sr-app { font-family:var(--rx-font-body); color:var(--rx-text); }
      .sr-shell { position:relative; z-index:1; max-width:1080px; margin:0 auto; padding:var(--rx-5) var(--rx-5) var(--rx-7); }

      .sr-top { display:flex; justify-content:space-between; align-items:center; gap:var(--rx-4); padding-bottom:var(--rx-4); border-bottom:1px solid var(--rx-border); }
      .sr-brand { display:flex; align-items:center; gap:var(--rx-3); }
      .sr-mark { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:var(--rx-radius-sm); background:var(--rx-brand); color:#fff; font-family:var(--rx-font-display); font-weight:700; font-size:14px; }
      .sr-name { font-family:var(--rx-font-display); font-weight:700; font-size:17px; letter-spacing:-.01em; }
      .sr-sep { width:1px; height:18px; background:var(--rx-border-strong); }
      .sr-seatlabel { font-family:var(--rx-font-mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--rx-muted); }
      .sr-topright { display:flex; align-items:center; gap:var(--rx-3); }
      .sr-live { display:inline-flex; align-items:center; gap:6px; font-family:var(--rx-font-mono); font-size:11px; letter-spacing:.06em; color:var(--rx-muted); }
      .sr-live__dot { width:7px; height:7px; border-radius:50%; background:var(--rx-pass); }
      @media (prefers-reduced-motion: no-preference){ .sr-live__dot{ animation:srPulse 2s ease-in-out infinite; } }
      @keyframes srPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      .sr-theme { display:inline-flex; align-items:center; gap:7px; font-family:var(--rx-font-body); font-size:13px; font-weight:600; color:var(--rx-muted); background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:999px; padding:6px 13px; cursor:pointer; }
      .sr-theme:hover { color:var(--rx-text); border-color:var(--rx-border-strong); }
      .sr-theme:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; }

      .sr-viewas { display:flex; align-items:center; gap:var(--rx-2); padding:var(--rx-4) 0 var(--rx-3); flex-wrap:wrap; }
      .sr-viewas__label { font-family:var(--rx-font-mono); font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--rx-subtle); margin-right:var(--rx-2); }
      .sr-seat { font-family:var(--rx-font-body); font-size:13px; font-weight:600; color:var(--rx-muted); background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:999px; padding:6px 14px; cursor:pointer; transition:all .15s ease; }
      .sr-seat:hover { color:var(--rx-text); border-color:var(--rx-border-strong); }
      .sr-seat.is-on { background:var(--rx-brand); border-color:var(--rx-brand); color:#fff; }
      .sr-seat:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; }

      .sr-tabsrow { display:flex; justify-content:space-between; align-items:flex-end; gap:var(--rx-4); border-bottom:1px solid var(--rx-border); }
      .sr-tabs { display:flex; overflow-x:auto; }
      .sr-tab { display:flex; flex-direction:column; align-items:flex-start; gap:2px; background:transparent; border:none; border-bottom:2px solid transparent; padding:10px 16px; cursor:pointer; white-space:nowrap; text-align:left; }
      .sr-tab__name { font-family:var(--rx-font-body); font-size:13.5px; font-weight:600; color:var(--rx-muted); }
      .sr-tab__q { font-family:var(--rx-font-display); font-size:11px; color:var(--rx-subtle); }
      .sr-tab:hover .sr-tab__name { color:var(--rx-text); }
      .sr-tab.is-on { border-bottom-color:var(--rx-brand); }
      .sr-tab.is-on .sr-tab__name { color:var(--rx-brand); font-weight:700; }
      .sr-tab.is-on .sr-tab__q { color:var(--rx-muted); }
      .sr-tab:focus-visible { outline:2px solid var(--rx-focus); outline-offset:-2px; border-radius:var(--rx-radius-sm); }
      .sr-deep { flex-shrink:0; background:transparent; border:none; color:var(--rx-brand); font-family:var(--rx-font-body); font-size:13px; font-weight:600; cursor:pointer; padding:10px 4px; }
      .sr-deep:hover { text-decoration:underline; }
      .sr-deep:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; border-radius:var(--rx-radius-sm); }

      .sr-panel { padding-top:var(--rx-6); }
      .sr-panel:focus-visible { outline:2px solid var(--rx-focus); outline-offset:3px; border-radius:var(--rx-radius); }
      .sr-stack { display:grid; gap:var(--rx-6); }

      .sr-head { display:grid; gap:var(--rx-3); }
      .sr-head__top { display:flex; align-items:center; gap:var(--rx-3); flex-wrap:wrap; }
      .sr-kicker { font-family:var(--rx-font-mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--rx-subtle); }
      .sr-verdict { margin:0; font-family:var(--rx-font-display); font-weight:600; font-size:clamp(22px,3vw,30px); line-height:1.15; letter-spacing:-.018em; color:var(--rx-text); max-width:880px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
      .sr-qsub { margin:7px 0 0; font-size:14px; color:var(--rx-muted); }
      .sr-qsub::before { content:"› "; color:var(--rx-brand); }
      .sr-lede { margin:12px 0 0; font-size:16px; line-height:1.55; color:var(--rx-muted); max-width:760px; }
      .sr-back { display:inline-block; background:none; border:none; padding:0 0 6px; cursor:pointer; font-family:var(--rx-font-body); font-size:12.5px; font-weight:600; color:var(--rx-brand); }
      .sr-back:hover { text-decoration:underline; }
      .sr-back:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; border-radius:var(--rx-radius-sm); }
      .sr-srctag { margin-left:8px; font-family:var(--rx-font-mono); font-size:8.5px; letter-spacing:.06em; text-transform:uppercase; padding:1px 6px; border-radius:999px; vertical-align:middle; }
      .sr-srctag--live { color:var(--rx-pass); background:var(--rx-pass-tint); }
      .sr-srctag--sample { color:var(--rx-exposure); background:var(--rx-exposure-tint); }
      .sr-incident { display:flex; gap:12px; align-items:flex-start; background:var(--rx-surface); border:1px solid var(--rx-border); border-left:4px solid var(--rx-exposure); border-radius:var(--rx-radius); padding:12px 16px; }
      .sr-incident__dot { width:9px; height:9px; border-radius:50%; background:var(--rx-exposure); margin-top:5px; flex:none; }
      @media (prefers-reduced-motion: no-preference){ .sr-incident__dot{ animation:srPulse 2s ease-in-out infinite; } }
      .sr-incident__kicker { font-family:var(--rx-font-mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--rx-exposure); }
      .sr-incident__text { font-size:13.5px; line-height:1.55; color:var(--rx-text); margin-top:2px; }

      .sr-pill { font-family:var(--rx-font-mono); font-size:11px; letter-spacing:.06em; text-transform:uppercase; padding:4px 10px; border-radius:999px; white-space:nowrap; }
      .sr-pill--brand { color:var(--rx-brand); background:var(--rx-brand-tint); }
      .sr-pill--pass { color:var(--rx-pass); background:var(--rx-pass-tint); }
      .sr-pill--exposure { color:var(--rx-exposure); background:var(--rx-exposure-tint); }
      .sr-pill--critical { color:var(--rx-critical); background:var(--rx-critical-tint); }

      .sr-fg--pass{color:var(--rx-pass)} .sr-fg--exposure{color:var(--rx-exposure)} .sr-fg--critical{color:var(--rx-critical)} .sr-fg--brand{color:var(--rx-brand)} .sr-fg--muted{color:var(--rx-subtle)}

      .sr-band { display:grid; grid-template-columns:repeat(6,1fr); gap:var(--rx-3); }
      .sr-tile { position:relative; display:flex; flex-direction:column; gap:6px; text-align:left; padding:var(--rx-4); cursor:pointer; background:var(--rx-glass); border:1px solid var(--rx-border); border-radius:var(--rx-radius); box-shadow:var(--rx-shadow-1); backdrop-filter:saturate(1.1) blur(14px); -webkit-backdrop-filter:saturate(1.1) blur(14px); transition:border-color .15s ease, transform .05s ease; }
      .sr-tile:hover { border-color:var(--rx-brand); } .sr-tile:active { transform:translateY(.5px); }
      .sr-tile:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; }
      .sr-tile__label { font-family:var(--rx-font-mono); font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:var(--rx-subtle); }
      .sr-tile__valrow { display:flex; align-items:baseline; gap:6px; }
      .sr-tile__value { font-family:var(--rx-font-display); font-weight:600; font-size:26px; letter-spacing:-.01em; }
      .sr-tile__delta { font-family:var(--rx-font-mono); font-size:12px; font-weight:600; }
      .sr-tile__note { font-family:var(--rx-font-mono); font-size:8.5px; letter-spacing:.06em; text-transform:uppercase; padding:1px 6px; border-radius:999px; width:fit-content; }
      .sr-note--live { color:var(--rx-pass); background:var(--rx-pass-tint); }
      .sr-note--derived { color:var(--rx-exposure); background:var(--rx-exposure-tint); }
      .sr-tile__arrow { position:absolute; top:var(--rx-3); right:var(--rx-3); color:var(--rx-brand); opacity:0; transition:opacity .15s ease; }
      .sr-tile:hover .sr-tile__arrow, .sr-tile:focus-visible .sr-tile__arrow { opacity:1; }

      .sr-section { display:grid; gap:var(--rx-4); }
      .sr-sectionhead { display:flex; justify-content:space-between; align-items:baseline; gap:var(--rx-3); flex-wrap:wrap; }
      .sr-sectionhead h3 { margin:0; font-family:var(--rx-font-body); font-size:13px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--rx-muted); }
      .sr-hint { font-size:12px; color:var(--rx-subtle); font-style:italic; }

      .sr-brief { display:grid; gap:var(--rx-2); }
      .sr-briefrow { display:flex; align-items:flex-start; gap:var(--rx-3); text-align:left; padding:var(--rx-4); cursor:pointer; background:var(--rx-glass); border:1px solid var(--rx-border); border-left:3px solid var(--rx-brand); border-radius:var(--rx-radius); box-shadow:var(--rx-shadow-1); backdrop-filter:saturate(1.1) blur(14px); -webkit-backdrop-filter:saturate(1.1) blur(14px); }
      .sr-briefrow:hover { border-color:var(--rx-brand); }
      .sr-briefrow:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; }
      .sr-briefbody { flex:1; display:grid; gap:3px; }
      .sr-briefq { font-family:var(--rx-font-display); font-weight:500; font-size:16px; color:var(--rx-text); }
      .sr-briefa { font-size:13.5px; line-height:1.55; color:var(--rx-muted); }
      .sr-briefmeta { display:flex; align-items:center; gap:var(--rx-2); flex-shrink:0; }
      .sr-briefarrow { color:var(--rx-brand); }

      .sr-rows { display:grid; }
      .sr-row { display:grid; grid-template-columns:1fr auto; gap:var(--rx-4); align-items:center; padding:var(--rx-3) 0; border-bottom:1px solid var(--rx-border); }
      .sr-row--3 { grid-template-columns:1fr auto auto; }
      .sr-row:last-child { border-bottom:none; }
      .sr-row__k { font-size:14px; color:var(--rx-text); display:flex; flex-direction:column; gap:2px; }
      .sr-row__sub { font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-subtle); }
      .sr-row__v { font-family:var(--rx-font-mono); font-size:13.5px; color:var(--rx-text); text-align:right; }
      .sr-row__owner { font-size:12.5px; color:var(--rx-muted); }
      .sr-due { font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-exposure); background:var(--rx-exposure-tint); padding:3px 8px; border-radius:999px; }

      .sr-table { width:100%; border-collapse:collapse; font-size:14px; }
      .sr-table th { text-align:left; font-family:var(--rx-font-mono); font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--rx-subtle); font-weight:700; padding:0 var(--rx-3) var(--rx-2); border-bottom:1px solid var(--rx-border); }
      .sr-table td { padding:var(--rx-3); border-bottom:1px solid var(--rx-border); color:var(--rx-text); vertical-align:top; }
      .sr-table tr:last-child td { border-bottom:none; }
      .sr-td-name { font-weight:600; }
      .sr-td-exposed { color:var(--rx-muted); font-size:13px; }
      .sr-mono { font-family:var(--rx-font-mono); }
      .sr-dash { color:var(--rx-subtle); }
      .sr-trend { font-weight:700; }

      .sr-chain { display:flex; flex-wrap:wrap; align-items:center; gap:var(--rx-2); }
      .sr-chain__step { display:inline-flex; align-items:center; gap:var(--rx-2); }
      .sr-chain__box { font-family:var(--rx-font-mono); font-size:12px; background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius-sm); padding:6px 10px; }
      .sr-chain__arr { color:var(--rx-subtle); }
      .sr-statgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--rx-3); }
      .sr-stat { background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius); padding:var(--rx-4); display:grid; gap:6px; }
      .sr-stat__k { font-family:var(--rx-font-mono); font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--rx-subtle); }
      .sr-stat__v { font-family:var(--rx-font-display); font-weight:600; font-size:19px; }

      .sr-decisions { display:grid; gap:var(--rx-3); }
      .sr-dc { display:grid; gap:var(--rx-2); background:var(--rx-surface); border:1px solid var(--rx-border); border-left:3px solid var(--rx-brand); border-radius:var(--rx-radius); box-shadow:var(--rx-shadow-1); padding:var(--rx-4); }
      .sr-dc--critical { border-left-color:var(--rx-critical); } .sr-dc--high, .sr-dc--exposure { border-left-color:var(--rx-exposure); }
      .sr-dc__title { margin:0; font-family:var(--rx-font-display); font-weight:500; font-size:16px; }
      .sr-dc__owner { margin:0; font-family:var(--rx-font-mono); font-size:12px; color:var(--rx-muted); }
      .sr-btn { justify-self:start; background:var(--rx-brand); color:#fff; border:none; font-family:var(--rx-font-body); font-weight:600; font-size:14px; padding:11px 18px; border-radius:var(--rx-radius-sm); cursor:pointer; }
      .sr-btn:hover { filter:brightness(1.05); } .sr-btn:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; }

      .sr-twocol { display:grid; grid-template-columns:1fr 1fr; gap:var(--rx-4); }
      .sr-tl { margin:0; padding:0; list-style:none; display:grid; gap:var(--rx-2); }
      .sr-tl li { font-size:14px; background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius-sm); padding:10px 12px; }
      .sr-tl--up li { border-left:3px solid var(--rx-pass); } .sr-tl--down li { border-left:3px solid var(--rx-exposure); }
      .sr-seg { display:inline-flex; background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius-sm); padding:2px; }
      .sr-seg__b { border:none; background:transparent; font-family:var(--rx-font-body); font-size:12px; font-weight:600; color:var(--rx-muted); padding:5px 12px; border-radius:6px; cursor:pointer; }
      .sr-seg__b.is-on { background:var(--rx-brand); color:#fff; }
      .sr-seg__b:focus-visible { outline:2px solid var(--rx-focus); outline-offset:1px; }
      .sr-chart { width:100%; height:auto; background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius); }
      .sr-chart__t { fill:var(--rx-subtle); font-family:var(--rx-font-mono); font-size:11px; }

      .sr-fw { display:grid; gap:var(--rx-4); }
      .sr-fw__tabs { display:flex; flex-wrap:wrap; gap:var(--rx-2); }
      .sr-fw__tab { display:inline-flex; align-items:center; gap:8px; font-family:var(--rx-font-body); font-size:12.5px; font-weight:600; color:var(--rx-muted); background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:999px; padding:6px 13px; cursor:pointer; }
      .sr-fw__tab.is-on { background:var(--rx-brand); border-color:var(--rx-brand); color:#fff; }
      .sr-fw__tab.is-on .sr-fw__score, .sr-fw__tab.is-on .sr-fg--pass, .sr-fw__tab.is-on .sr-fg--critical, .sr-fw__tab.is-on .sr-fg--muted { color:#fff; }
      .sr-fw__score { font-family:var(--rx-font-mono); font-size:11px; }
      .sr-fw__tab:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; }
      .sr-fw__cols { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--rx-3); }
      .sr-fw__col { background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius); padding:var(--rx-3); display:grid; gap:4px; align-content:start; min-height:140px; }
      .sr-fw__collabel { font-family:var(--rx-font-mono); font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--rx-subtle); padding:2px 6px var(--rx-2); }
      .sr-fw__item { display:flex; justify-content:space-between; align-items:center; gap:var(--rx-2); text-align:left; font-size:13px; color:var(--rx-text); background:transparent; border:1px solid transparent; border-radius:var(--rx-radius-sm); padding:8px 10px; cursor:pointer; }
      .sr-fw__item:hover { background:var(--rx-bg); }
      .sr-fw__item.is-on { background:var(--rx-brand-tint); color:var(--rx-brand); font-weight:600; }
      .sr-fw__item:focus-visible { outline:2px solid var(--rx-focus); outline-offset:1px; }
      .sr-fw__meta { font-family:var(--rx-font-mono); font-size:11px; }
      .sr-fw__empty { font-size:12.5px; color:var(--rx-subtle); font-style:italic; padding:8px 10px; }
      .sr-fwev { background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius); padding:var(--rx-4); display:grid; gap:var(--rx-3); }
      .sr-fwev__head { display:flex; align-items:center; gap:var(--rx-3); flex-wrap:wrap; }
      .sr-fwev__id { font-family:var(--rx-font-mono); font-size:12px; font-weight:700; color:var(--rx-brand); }
      .sr-fwev__name { font-family:var(--rx-font-display); font-size:15px; flex:1; }
      .sr-fwev__foot { display:flex; justify-content:space-between; gap:var(--rx-3); flex-wrap:wrap; padding-top:var(--rx-2); border-top:1px solid var(--rx-border); }
      .sr-fwev__maps { font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-subtle); }

      .sr-ev { background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius-sm); padding:var(--rx-2) var(--rx-3); }
      .sr-ev__sum { cursor:pointer; font-size:12.5px; font-weight:600; color:var(--rx-text); }
      .sr-ev__hint { font-family:var(--rx-font-mono); font-size:10px; color:var(--rx-subtle); margin-left:6px; }
      .sr-ev__dl { margin:var(--rx-2) 0 0; display:grid; gap:var(--rx-1); }
      .sr-ev__dl > div { display:grid; grid-template-columns:130px 1fr; gap:var(--rx-3); padding:4px 0; border-bottom:1px solid var(--rx-border); }
      .sr-ev__dl dt { font-family:var(--rx-font-mono); font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--rx-subtle); }
      .sr-ev__dl dd { margin:0; font-family:var(--rx-font-mono); font-size:12.5px; color:var(--rx-text); }
      .sr-ev__verified { font-family:var(--rx-font-mono); font-size:12px; font-weight:700; color:var(--rx-pass); }

      /* Framework caption + evidence box + expandable rows */
      .sr-fw__cap { font-size:13px; color:var(--rx-muted); margin:2px 0 2px; }
      .sr-fw__cap strong { color:var(--rx-text); font-family:var(--rx-font-display); font-weight:600; }
      .sr-evbox { background:var(--rx-bg); border:1px solid var(--rx-border); border-radius:10px; padding:13px 15px; margin-top:6px; }
      .sr-evbox__h { font-family:var(--rx-font-mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--rx-brand); margin-bottom:10px; }
      .sr-erow { display:flex; gap:10px; padding:4px 0; font-size:12.5px; }
      .sr-ek { font-family:var(--rx-font-mono); color:var(--rx-subtle); width:118px; flex:none; font-size:10px; text-transform:uppercase; letter-spacing:.04em; padding-top:2px; }
      .sr-ev2 { color:var(--rx-text); }
      .sr-ev__verified { margin-top:10px; padding-top:9px; border-top:1px solid var(--rx-border); font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-pass); }
      .sr-fwev__maps { font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-subtle); margin-top:8px; }
      .sr-row--ev { border-top:1px solid var(--rx-border); }
      .sr-row--ev:first-of-type { border-top:none; }
      .sr-row--ev > summary { list-style:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 0; }
      .sr-row--ev > summary::-webkit-details-marker { display:none; }
      .sr-row__sum .sr-row__k { font-size:14px; color:var(--rx-text); display:flex; flex-direction:column; gap:2px; flex:1; }
      .sr-row__chev { font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-subtle); transition:transform .15s ease; flex:none; }
      .sr-row--ev[open] > summary .sr-row__chev { transform:rotate(90deg); color:var(--rx-brand); }
      .sr-row--ev:hover > summary .sr-row__chev { color:var(--rx-brand); }

      /* Expandable mini-panel rows */
      .sr-mini--ev { display:block; padding:0; }
      .sr-mini--ev > summary { display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer; list-style:none; }
      .sr-mini--ev.sr-kv > summary { padding:9px 0; font-size:13.5px; }
      .sr-mini--ev.sr-srow > summary { padding:11px 0; font-size:14px; }
      .sr-mini--ev > summary::-webkit-details-marker { display:none; }
      .sr-mini--ev[open] > summary .sr-row__chev { transform:rotate(90deg); color:var(--rx-brand); }
      .sr-mini--ev:hover > summary .sr-row__chev { color:var(--rx-brand); }
      .sr-mini--ev > .sr-evbox { margin-bottom:11px; }

      /* Mini panels (srow / kv) + bigstat — match the mock's .panel blocks */
      .sr-panel { background:var(--rx-glass); border:1px solid var(--rx-border); border-radius:var(--rx-radius); padding:18px 20px; }
      .sr-panel--full { grid-column:1 / -1; }
      .sr-panel__h { font-family:var(--rx-font-display); font-weight:600; font-size:13px; margin-bottom:13px; color:var(--rx-text); }
      .sr-srow { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 0; border-top:1px solid var(--rx-border); font-size:14px; }
      .sr-srow:first-of-type { border-top:none; }
      .sr-srow__nm { font-weight:600; }
      .sr-srow__sub { display:block; font-weight:400; color:var(--rx-muted); font-size:12px; margin-top:1px; }
      .sr-kv { display:flex; justify-content:space-between; gap:12px; padding:9px 0; border-top:1px solid var(--rx-border); font-size:13.5px; }
      .sr-kv:first-of-type { border-top:none; }
      .sr-kv__k { color:var(--rx-muted); }
      .sr-kv__v { font-family:var(--rx-font-mono); font-size:12.5px; }
      .sr-bigstat { margin-top:6px; background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:10px; padding:14px 16px; font-size:14px; color:var(--rx-muted); line-height:1.5; }

      /* Provenance strip */
      .sr-prov { display:flex; flex-wrap:wrap; gap:var(--rx-2) var(--rx-5); align-items:center; padding:var(--rx-3) var(--rx-4); background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius); }
      .sr-prov__item { display:inline-flex; align-items:baseline; gap:6px; }
      .sr-prov__k { font-family:var(--rx-font-mono); font-size:9.5px; letter-spacing:.07em; text-transform:uppercase; color:var(--rx-subtle); }
      .sr-prov__v { font-family:var(--rx-font-mono); font-size:11.5px; color:var(--rx-text); }

      /* Audit log modal */
      .sr-modal__backdrop { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; padding:6vh var(--rx-4); overflow-y:auto; }
      .sr-modal { width:100%; max-width:620px; background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius-lg); box-shadow:var(--rx-shadow-2); display:flex; flex-direction:column; max-height:84vh; }
      .sr-modal__head { display:flex; justify-content:space-between; align-items:center; gap:var(--rx-3); padding:var(--rx-4) var(--rx-5); border-bottom:1px solid var(--rx-border); }
      .sr-modal__title { margin:0; font-family:var(--rx-font-display); font-size:17px; font-weight:600; color:var(--rx-text); }
      .sr-modal__sub { font-family:var(--rx-font-mono); font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--rx-subtle); margin-left:var(--rx-2); }
      .sr-modal__close { background:none; border:none; font-size:17px; line-height:1; color:var(--rx-subtle); cursor:pointer; padding:2px 4px; }
      .sr-modal__close:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; border-radius:var(--rx-radius-sm); }
      .sr-modal__body { padding:var(--rx-4) var(--rx-5); overflow-y:auto; display:grid; gap:2px; }
      .sr-audit__row { display:grid; grid-template-columns:minmax(140px,180px) minmax(90px,140px) 1fr; gap:var(--rx-3); padding:var(--rx-2) 0; border-bottom:1px solid var(--rx-border); font-size:12.5px; }
      .sr-audit__ts { font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-subtle); }
      .sr-audit__actor { font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-muted); }
      .sr-audit__act { color:var(--rx-text); }

      .sr-footer { margin-top:var(--rx-7); padding-top:var(--rx-4); border-top:1px solid var(--rx-border); font-family:var(--rx-font-mono); font-size:11px; color:var(--rx-subtle); text-align:center; }

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

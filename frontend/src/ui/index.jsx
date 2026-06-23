/**
 * ui/ — the shared component kit for the app-wide design system.
 *
 * Reusable React primitives extracted from the approved mock (cyberrx-ciso-os),
 * styled by kit.css on the app-wide --rx-* tokens. Screens import these to adopt
 * the design system without re-implementing markup. Importing any component pulls
 * in kit.css automatically.
 *
 * Status `kind` prop is one of: 'ok' | 'warn' | 'crit' | 'info'.
 */
import './kit.css';

// Map a status kind → the shared tint class. Defaults to neutral (no tint).
const tint = (kind) => (kind ? ` rx-${kind}` : '');
const cx = (...c) => c.filter(Boolean).join(' ');

/* ---- View header ---------------------------------------------------------- */
export function ViewHead({ eyebrow, title, answer, answerKind, lead, qsub }) {
  return (
    <div className="rx-vhead">
      {eyebrow && <span className="rx-eyebrow">{eyebrow}</span>}
      <h2 className="rx-q">
        {title}
        {answer && <span className={cx('rx-ans', tint(answerKind).trim())}>{answer}</span>}
      </h2>
      {qsub && <div className="rx-qsub">{qsub}</div>}
      {lead && <div className="rx-lead">{lead}</div>}
    </div>
  );
}

/* ---- Metric band ---------------------------------------------------------- */
// items: [{ k, v, sub?, small?, valueKind?, trend?, trendKind?, onClick? }]
export function Band({ items = [] }) {
  return (
    <div className="rx-band">
      {items.map((m, i) => {
        const link = typeof m.onClick === 'function';
        const Tag = link ? 'button' : 'div';
        return (
          <Tag key={i} type={link ? 'button' : undefined}
            className={cx('rx-pm', link && 'is-link')} onClick={m.onClick || undefined}>
            <div className="k">{m.k}</div>
            <div className={cx('v', m.small && 'sm', m.valueKind === 'crit' && 'crit')}>
              {m.v}
              {m.trend && <span className={cx('tr', m.trendKind)}>{m.trend}</span>}
            </div>
            {link && <span className="pmgo">▸</span>}
          </Tag>
        );
      })}
    </div>
  );
}

/* ---- Brief (question rows) ------------------------------------------------ */
// items: [{ i, q, a, status, statusKind, onClick? }]
export function Brief({ items = [] }) {
  return (
    <div className="rx-brief">
      {items.map((q, idx) => {
        const link = typeof q.onClick === 'function';
        const Tag = link ? 'button' : 'div';
        return (
          <Tag key={idx} type={link ? 'button' : undefined}
            className={cx('rx-qrow', link && 'is-link')} onClick={q.onClick || undefined}>
            <span className="qi">{q.i}</span>
            <div className="qm">
              <div className="qq">{q.q}</div>
              {q.a && <div className="qa">{q.a}</div>}
            </div>
            {q.status && <span className={cx('rx-qs', tint(q.statusKind).trim())}>{q.status}</span>}
            {link && <span className="go">▸</span>}
          </Tag>
        );
      })}
    </div>
  );
}

/* ---- Layout: section header / columns / panel ----------------------------- */
export function Section({ title, meta }) {
  return (
    <div className="rx-sec-h">
      <h3>{title}</h3>
      {meta && <span className="meta">{meta}</span>}
    </div>
  );
}

export function Cols({ children }) {
  return <div className="rx-cols">{children}</div>;
}

export function Panel({ title, children, style }) {
  return (
    <div className="rx-panel" style={style}>
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}

/* ---- Rows ----------------------------------------------------------------- */
export function Srow({ name, sub, stat, statusKind }) {
  return (
    <div className="rx-srow">
      <div className="nm">{name}{sub && <small>{sub}</small>}</div>
      {stat != null && <span className={cx('rx-stat', tint(statusKind).trim())}>{stat}</span>}
    </div>
  );
}

export function KV({ k, v, kind }) {
  return (
    <div className="rx-kv">
      <span className="k">{k}</span>
      <span className={cx('v', kind)}>{v}</span>
    </div>
  );
}

export function BigStat({ children }) {
  return <div className="rx-bigstat">{children}</div>;
}

/* ---- Table ---------------------------------------------------------------- */
// head: [string]; rows: [[cell, …]] where cells may be strings or React nodes.
export function Table({ head = [], rows = [] }) {
  return (
    <table className="rx-tbl">
      <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
      </tbody>
    </table>
  );
}

/* ---- Inline tokens: pill / stat / risk / trend ---------------------------- */
export function Pill({ kind, children }) {
  return <span className={cx('rx-kpill', tint(kind).trim())}>{children}</span>;
}

export function Stat({ kind, children }) {
  return <span className={cx('rx-stat', tint(kind).trim())}>{children}</span>;
}

// level: 'high' | 'med' | 'low'
export function Rk({ level = 'med', children }) {
  return <span className={cx('rx-rk', level)}>{children}</span>;
}

// dir: 'up' | 'flat' | 'down' (semantics: up=worse/red, down=better/green)
export function Trend({ dir = 'flat', children }) {
  return <span className={cx('rx-trn', dir)}>{children || (dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→')}</span>;
}

/* ---- Decisions ------------------------------------------------------------ */
// items: [{ sev, sevKind, title, desc?, owner?, action? }]
export function Decisions({ title, items = [], button, onButton }) {
  return (
    <div className="rx-panel">
      {title && <h4>{title}</h4>}
      {items.map((d, i) => (
        <div key={i} className="rx-dec">
          <span className={cx('rx-sev', d.sevKind)}>{d.sev}</span>
          <div className="db">
            <b>{d.title}</b>{d.desc ? ` ${d.desc}` : ''}
            {(d.owner || d.action) && <span className="o">{d.owner}{d.action ? <> · <em>{d.action}</em></> : null}</span>}
          </div>
        </div>
      ))}
      {button && <Button primary style={{ marginTop: 14 }} onClick={onButton}>{button}</Button>}
    </div>
  );
}

/* ---- Button --------------------------------------------------------------- */
export function Button({ primary, children, style, ...rest }) {
  return (
    <button type="button" className={cx('rx-btn', primary && 'rx-btn--primary')} style={style} {...rest}>
      {children}
    </button>
  );
}

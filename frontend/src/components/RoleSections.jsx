/**
 * RoleSections — rich, executive-grade renderers for the role-specific sub-tabs
 * on the leader dashboards (CFO/CIO/CRO/CLO/Board). Each leader's tab layout
 * comes from the backend (roleTabs); tabs of kind 'section' carry a typed
 * payload (metrics | ranked | table | cards | actions) rendered here with
 * insight callouts, trend sparklines, delta chips, heat bars, and tone-coded
 * tables so the views feel decision-ready, not flat.
 */

import React from 'react';
import TicketControl from './TicketControl';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B' };
const toneColor = (t) => TONE[t] || '#475569';

const Pill = ({ text, color }) => (
  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{text}</span>
);

// Compact trend sparkline with a soft area fill.
function Sparkline({ values, color = INK3, w = 132, h = 34 }) {
  const vals = (values && values.length ? values : [50, 50]).map(Number);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const stepX = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * stepX, h - 4 - ((v - min) / span) * (h - 8)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const id = `sg${Math.round(pts[0][1] * 97 + vals.length)}-${color.replace('#', '')}`;
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}

function deltaChip(spark, tone) {
  if (!spark || spark.length < 2) return null;
  const a = spark[0], b = spark[spark.length - 1];
  const pct = Math.round(((b - a) / Math.max(1, Math.abs(a))) * 100);
  if (pct === 0) return null;
  const c = toneColor(tone);
  return <span style={{ fontSize: 10.5, fontWeight: 800, color: c }}>{b >= a ? '▲' : '▼'} {Math.abs(pct)}%</span>;
}

// Section header: title-less here (the tab provides the title); shows the
// insight callout + optional note so every tab leads with "so what".
function Insight({ section }) {
  if (!section.insight && !section.note) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      {section.insight && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'linear-gradient(135deg,#eef4fb,#f6f9fe)', border: '1px solid #d7e6f7', borderRadius: 10, padding: '11px 14px' }}>
          <span style={{ fontSize: 15, lineHeight: 1.3 }}>💡</span>
          <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.55, fontWeight: 500 }}>{section.insight}</div>
        </div>
      )}
      {section.note && <div style={{ fontSize: 11, color: INK3, marginTop: section.insight ? 7 : 0 }}>{section.note}</div>}
    </div>
  );
}

export default function RoleSection({ section, role = 'CISO' }) {
  if (!section) return null;
  switch (section.type) {
    case 'metrics': return <Metrics section={section} />;
    case 'ranked': return <Ranked section={section} />;
    case 'table': return <TableView section={section} />;
    case 'cards': return <CardsView section={section} />;
    case 'actions': return <ActionsView role={role} section={section} />;
    default: return null;
  }
}

function Metrics({ section }) {
  return (
    <div>
      <Insight section={section} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(212px, 1fr))', gap: 12 }}>
        {(section.items || []).map((m, i) => {
          const c = toneColor(m.tone);
          return (
            <div key={i} style={{ position: 'relative', border: `1px solid ${HAIR}`, borderRadius: 12, padding: '14px 16px 10px', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: m.tone ? c : '#e2e8f0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: INK2, fontWeight: 600 }}>{m.label}</div>
                {deltaChip(m.spark, m.tone)}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: m.tone ? c : INK, marginTop: 4, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{m.value}</div>
              {m.sub && <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{m.sub}</div>}
              <div style={{ marginTop: 8, marginLeft: -4, marginRight: -4 }}><Sparkline values={m.spark} color={m.tone ? c : '#94a3b8'} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Ranked({ section }) {
  const items = section.items || [];
  const max = Math.max(1, ...items.map((x) => Number(x.score) || 0));
  const medal = ['#C0392B', '#A85B2E', '#B07C2E'];
  return (
    <div>
      <Insight section={section} />
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>Nothing to rank yet.</div>}
      <div style={{ display: 'grid', gap: 9 }}>
        {items.map((x, i) => {
          const c = toneColor(x.tone);
          const pct = Math.round(((Number(x.score) || 0) / max) * 100);
          return (
            <div key={i} style={{ border: `1px solid ${HAIR}`, borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, background: i < 3 ? medal[i] : '#eef2f7', color: i < 3 ? '#fff' : INK3, fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</div>
                  {x.sub && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{x.sub}</div>}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: c, minWidth: 58, textAlign: 'right' }}>{x.scoreLabel || x.score}</span>
              </div>
              <div style={{ height: 8, background: '#eef2f6', borderRadius: 5, overflow: 'hidden', marginTop: 9 }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${c}aa, ${c})` }} />
              </div>
              {x.action && <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 7 }}>→ {x.action}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function badgeFor(val) {
  if (typeof val !== 'string') return null;
  const v = val.trim();
  if (/^critical$/i.test(v)) return SEV.Critical;
  if (/^high$/i.test(v)) return SEV.High;
  if (/^medium$/i.test(v)) return SEV.Medium;
  if (/^low$/i.test(v)) return SEV.Low;
  if (/unassigned/i.test(v)) return SEV.Critical;
  if (/end-of-life|expired|breached|overdue/i.test(v)) return SEV.High;
  if (/mitigating|supported|within|clear/i.test(v)) return SEV.Low;
  return null;
}

function TableView({ section }) {
  const cols = section.columns || [];
  const rows = section.rows || [];
  return (
    <div>
      <Insight section={section} />
      {!rows.length && <div style={{ fontSize: 12, color: INK3 }}>No rows yet.</div>}
      {rows.length > 0 && (
        <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead><tr style={{ background: PANEL, color: INK3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cols.map((c) => <th key={c.key} style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, borderBottom: `1px solid ${HAIR}` }}>{c.label}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 ? '#fff' : '#fcfdfe' }}>
                    {cols.map((c, ci) => {
                      const val = row[c.key];
                      const badge = ci > 0 ? badgeFor(val) : null;
                      return (
                        <td key={c.key} style={{ padding: '9px 12px', borderTop: ri ? `1px solid ${HAIR}` : 'none', color: INK, fontWeight: ci === 0 ? 700 : 500 }}>
                          {badge
                            ? <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: badge, borderRadius: 999, padding: '2px 9px' }}>{val}</span>
                            : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CardsView({ section }) {
  const items = section.items || [];
  return (
    <div>
      <Insight section={section} />
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>Nothing flagged.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 12 }}>
        {items.map((it, i) => {
          const c = toneColor(it.tagTone);
          return (
            <div key={i} style={{ border: `1px solid ${HAIR}`, borderTop: `3px solid ${it.tagTone ? c : '#cbd5e1'}`, borderRadius: 11, padding: '13px 15px', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{it.title}</div>
                {it.tag && <Pill text={it.tag} color={it.tagTone ? c : INK3} />}
              </div>
              {(it.fields || []).length > 0 && (
                <div style={{ marginTop: 10, display: 'grid', gap: 5 }}>
                  {it.fields.map((fld, fi) => (
                    <div key={fi} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, paddingBottom: 4, borderBottom: fi < it.fields.length - 1 ? `1px solid ${PANEL}` : 'none' }}>
                      <span style={{ color: INK3 }}>{fld.k}</span><strong style={{ color: INK, textAlign: 'right' }}>{fld.v}</strong>
                    </div>
                  ))}
                </div>
              )}
              {it.action && <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 10, paddingTop: 9, borderTop: `1px dashed ${HAIR}` }}>→ {it.action}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionsView({ role, section }) {
  const items = section.items || [];
  return (
    <div>
      <Insight section={section} />
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>No actions required right now.</div>}
      <div style={{ display: 'grid', gap: 9 }}>
        {items.map((a) => {
          const c = SEV[a.severity] || '#B07C2E';
          return (
            <div key={a.rank} style={{ position: 'relative', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '12px 14px 12px 16px', background: '#fff', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 5, height: '100%', background: c }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, background: a.rank <= 2 ? c : '#eef2f7', color: a.rank <= 2 ? '#fff' : INK3, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{a.rank}</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{a.action}</span>
                <Pill text={a.severity} color={c} />
              </div>
              <div style={{ fontSize: 11, color: INK2, marginTop: 6, lineHeight: 1.5 }}>Why now: {a.whyNow}</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: INK3, marginTop: 6 }}>
                {a.process && <span>Relates to <strong style={{ color: INK2 }}>{a.process}</strong></span>}
                <span>Owner <strong style={{ color: INK2 }}>{a.owner}</strong></span>
                <span>Due <strong style={{ color: INK2 }}>{a.dueDate}</strong></span>
              </div>
              <div style={{ marginTop: 9 }}>
                <TicketControl sourceRef={`${role.toLowerCase()}-act:${a.rank}`} title={`[${role}] ${a.action}`} recommendation={a.action} severity={a.severity} owner={a.owner} dueDate={a.dueDate} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

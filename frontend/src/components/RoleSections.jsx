/**
 * RoleSections — generic renderers for the role-specific sub-tabs on the
 * executive dashboards (CFO/CIO/CRO/CLO/Board). Each leader's tab layout comes
 * from the backend (roleTabs); tabs of kind 'section' carry a typed payload
 * (metrics | ranked | table | cards | actions) rendered here in the same visual
 * language as the CISO scaffold.
 */

import React from 'react';
import TicketControl from './TicketControl';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc';
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B' };

const Pill = ({ text, color }) => (
  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: color, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{text}</span>
);
function Bar({ value, color }) {
  return <div style={{ height: 6, background: '#eef2f6', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color || INK3, borderRadius: 3 }} /></div>;
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
      {section.note && <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>{section.note}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {(section.items || []).map((m, i) => (
          <div key={i} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${m.tone ? TONE[m.tone] : INK3}`, borderRadius: 7, padding: '13px 15px' }}>
            <div style={{ fontSize: 11, color: INK2 }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: m.tone ? TONE[m.tone] : INK, marginTop: 3 }}>{m.value}</div>
            {m.sub && <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{m.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Ranked({ section }) {
  const items = section.items || [];
  const max = Math.max(1, ...items.map((x) => Number(x.score) || 0));
  return (
    <div>
      {section.note && <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>{section.note}</div>}
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>Nothing to rank yet.</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((x, i) => (
          <div key={i} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '11px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: INK3, width: 22 }}>#{i + 1}</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{x.name}<span style={{ fontSize: 10, color: INK3, fontWeight: 500, marginLeft: 8 }}>{x.sub}</span></span>
              <span style={{ width: 120 }}><Bar value={Math.round(((Number(x.score) || 0) / max) * 100)} color={x.tone ? TONE[x.tone] : undefined} /></span>
              <span style={{ fontSize: 13, fontWeight: 800, color: x.tone ? TONE[x.tone] : INK, minWidth: 56, textAlign: 'right' }}>{x.scoreLabel || x.score}</span>
            </div>
            {x.action && <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 5, paddingLeft: 34 }}>→ {x.action}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TableView({ section }) {
  const cols = section.columns || [];
  const rows = section.rows || [];
  return (
    <div style={{ overflowX: 'auto' }}>
      {section.note && <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>{section.note}</div>}
      {!rows.length && <div style={{ fontSize: 12, color: INK3 }}>No rows yet.</div>}
      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead><tr style={{ color: INK3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {cols.map((c) => <th key={c.key} style={{ textAlign: 'left', padding: '6px 8px' }}>{c.label}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderTop: `1px solid ${HAIR}` }}>
                {cols.map((c) => {
                  const val = row[c.key];
                  const flag = typeof val === 'string' && (/unassigned/i.test(val) || /^critical$/i.test(val));
                  return <td key={c.key} style={{ padding: '9px 8px', color: flag ? '#C0392B' : INK, fontWeight: c.key === cols[0].key ? 700 : 500 }}>{val}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CardsView({ section }) {
  const items = section.items || [];
  return (
    <div>
      {section.note && <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>{section.note}</div>}
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>Nothing flagged.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${it.tagTone ? TONE[it.tagTone] : INK3}`, borderRadius: 7, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{it.title}</div>
              {it.tag && <Pill text={it.tag} color={it.tagTone ? TONE[it.tagTone] : INK3} />}
            </div>
            {(it.fields || []).length > 0 && (
              <div style={{ marginTop: 8, display: 'grid', gap: 3 }}>
                {it.fields.map((fld, fi) => <div key={fi} style={{ fontSize: 11, color: INK2 }}><span style={{ color: INK3 }}>{fld.k}: </span><strong style={{ color: INK }}>{fld.v}</strong></div>)}
              </div>
            )}
            {it.action && <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 8 }}>→ {it.action}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsView({ role, section }) {
  const items = section.items || [];
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Action-Now Queue <span style={{ fontWeight: 400, textTransform: 'none' }}>{section.note}</span></div>
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>No actions required right now.</div>}
      {items.map((a) => (
        <div key={a.rank} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${SEV[a.severity] || '#B07C2E'}`, borderRadius: 6, padding: '11px 13px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: a.rank <= 2 ? '#C0392B' : INK3, width: 24 }}>#{a.rank}</span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{a.action}</span>
            <Pill text={a.severity} color={SEV[a.severity] || INK3} />
          </div>
          <div style={{ fontSize: 11, color: INK2, marginTop: 5, lineHeight: 1.5 }}>Why now: {a.whyNow}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: INK3, marginTop: 6 }}>
            {a.process && <span>Relates to <strong style={{ color: INK2 }}>{a.process}</strong></span>}
            <span>Owner <strong style={{ color: INK2 }}>{a.owner}</strong></span>
            <span>Due <strong style={{ color: INK2 }}>{a.dueDate}</strong></span>
          </div>
          <div style={{ marginTop: 9 }}>
            <TicketControl sourceRef={`${role.toLowerCase()}-act:${a.rank}`} title={`[${role}] ${a.action}`} recommendation={a.action} severity={a.severity} owner={a.owner} dueDate={a.dueDate} />
          </div>
        </div>
      ))}
    </div>
  );
}

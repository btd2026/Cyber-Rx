/**
 * RedesignPrototype — a self-contained DESIGN PROTOTYPE of the CISO dashboard
 * in the "Modern SaaS" (Linear / Vercel) visual direction.
 *
 * This is NOT wired to the API. It renders realistic static data so the new
 * design language can be judged end-to-end — typography, color, spacing, and
 * component style — without the existing navy/brass/serif styling bleeding in.
 * Open it at /prototype. If approved, this system gets rolled into the real
 * components.
 *
 * Direction: near-monochrome neutrals, a single indigo accent, tight 4/8px
 * spacing, 1px hairline borders, soft shadows, Inter throughout (no serif),
 * tabular figures. Status colors stay semantic.
 */

import { useState } from 'react';

/* ---------------- design tokens (scoped to the prototype) ---------------- */
const UI = {
  canvas: '#fbfbfc', surface: '#ffffff', subtle: '#f6f7f9', sidebar: '#fafafb',
  border: '#ebecf0', borderStrong: '#dfe1e6',
  ink: '#0b0c0e', ink2: '#5c6066', ink3: '#8b9098',
  accent: '#5e6ad2', accentHover: '#4f5ac4', accentSoft: '#eef0fb', accentText: '#4a52b0',
  good: '#1a7f37', goodSoft: '#e6f4ea', warn: '#9a6700', warnSoft: '#fbf3da', bad: '#cf222e', badSoft: '#fdecec',
  rad: 10, radSm: 7, pill: 999,
  shadowSm: '0 1px 2px rgba(11,12,14,0.05)',
  shadow: '0 1px 3px rgba(11,12,14,0.06), 0 10px 28px -16px rgba(11,12,14,0.20)',
  font: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
};
const tnum = { fontVariantNumeric: 'tabular-nums' };

/* ---------------- realistic static data ---------------- */
const NAV = [
  { group: 'Overview', items: [['posture', 'Security Posture', 'grid'], ['decisions', 'Decisions', 'check'], ['actions', 'Action Queue', 'bolt']] },
  { group: 'Analysis', items: [['risks', 'Key Risks', 'alert'], ['controls', 'Control Efficacy', 'shield'], ['paths', 'Attack Pathways', 'route']] },
  { group: 'Program', items: [['ai', 'AI Governance', 'spark'], ['projects', 'Projects & ROI', 'chart']] },
];
const KPIS = [
  { label: 'Posture score', value: '72', unit: '/100', delta: +4, good: true, spark: [61, 63, 62, 66, 68, 67, 70, 72] },
  { label: 'Open decisions', value: '6', unit: 'awaiting you', delta: -2, good: true, spark: [11, 10, 9, 9, 8, 7, 8, 6] },
  { label: 'Thresholds breached', value: '3', unit: 'of 18', delta: +1, good: false, spark: [1, 1, 2, 2, 2, 3, 2, 3] },
  { label: 'Readiness', value: '81', unit: 'of 100', delta: +3, good: true, spark: [74, 75, 77, 76, 78, 79, 80, 81] },
];
const DOMAINS = [
  { name: 'Identity & Access', score: 84, delta: +5 },
  { name: 'Detection & Response', score: 68, delta: +2 },
  { name: 'Vulnerability Mgmt', score: 51, delta: -3 },
  { name: 'Cloud Security', score: 77, delta: +1 },
  { name: 'Data Protection', score: 73, delta: 0 },
  { name: 'Third-Party Risk', score: 46, delta: -4 },
];
const ACTIONS = [
  { rank: 1, action: 'Enforce MFA on 1,240 privileged accounts', why: '3 KEV-listed CVEs reachable via these identities; below 90% appetite.', sev: 'Critical', owner: 'IAM Team', due: 'Jun 27' },
  { rank: 2, action: 'Patch internet-facing Citrix (CVE-2026-1142)', why: 'Actively exploited; protects member-portal claims intake.', sev: 'Critical', owner: 'Vuln Mgmt', due: 'Jun 24' },
  { rank: 3, action: 'Restore-test ransomware backups for claims DB', why: 'Backups succeed but were never restore-validated.', sev: 'High', owner: 'Infra/BCP', due: 'Jul 02' },
  { rank: 4, action: 'Close 2 expired third-party access exceptions', why: 'Vendor access past formal acceptance window.', sev: 'High', owner: 'GRC', due: 'Jul 05' },
];
const CONTROLS = [
  { rank: 1, name: 'Privileged access management', fw: 'PR.AC · CIS 5', risk: 88 },
  { rank: 2, name: 'Vulnerability remediation SLA', fw: 'ID.RA · CIS 7', risk: 81 },
  { rank: 3, name: 'Third-party access governance', fw: 'ID.SC · CIS 15', risk: 74 },
  { rank: 4, name: 'Detection engineering coverage', fw: 'DE.CM · CIS 8', risk: 63 },
  { rank: 5, name: 'Data loss prevention (egress)', fw: 'PR.DS · CIS 3', risk: 57 },
];
const RISKS = [
  { title: 'Ransomware to claims adjudication', loss: '$24M', conf: 'High', sev: 'Critical' },
  { title: 'PHI egress via unmanaged SaaS', loss: '$11M', conf: 'Medium', sev: 'High' },
  { title: 'Vendor supply-chain compromise', loss: '$8M', conf: 'Medium', sev: 'High' },
];

/* ---------------- tiny primitives ---------------- */
const sevColor = (s) => (s === 'Critical' || s === 'High' ? UI.bad : s === 'Medium' ? UI.warn : UI.good);
const sevSoft = (s) => (s === 'Critical' || s === 'High' ? UI.badSoft : s === 'Medium' ? UI.warnSoft : UI.goodSoft);
const scoreColor = (n) => (n >= 80 ? UI.good : n >= 60 ? UI.warn : UI.bad);

function Icon({ name, size = 16, color = 'currentColor' }) {
  const P = {
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    check: 'M20 6 9 17l-5-5',
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    alert: 'M12 3 2 21h20zM12 9v5M12 18h.01',
    shield: 'M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6z',
    route: 'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 13V8a3 3 0 0 1 3-3h6M18 11v5a3 3 0 0 1-3 3H9',
    spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
    chart: 'M4 20V10M10 20V4M16 20v-6M22 20H2',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {(P[name] || P.grid).split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
    </svg>
  );
}

function Spark({ data, color, w = 72, h = 24 }) {
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ring({ value, size = 132 }) {
  const r = (size - 18) / 2, c = 2 * Math.PI * r, off = c * (1 - value / 100), col = scoreColor(value);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={UI.border} strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 38, fontWeight: 650, letterSpacing: '-0.03em', color: UI.ink, ...tnum }}>{value}</div>
        <div style={{ fontSize: 11, color: UI.ink3, marginTop: -2 }}>of 100</div>
      </div>
    </div>
  );
}

const Badge = ({ children, color, bg }) => (
  <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, borderRadius: UI.pill, padding: '2px 9px', whiteSpace: 'nowrap' }}>{children}</span>
);
const Delta = ({ d, invert }) => {
  const positive = invert ? d < 0 : d > 0;
  const col = d === 0 ? UI.ink3 : positive ? UI.good : UI.bad;
  return <span style={{ fontSize: 12, fontWeight: 600, color: col, ...tnum }}>{d > 0 ? '↑' : d < 0 ? '↓' : '→'} {d > 0 ? '+' : ''}{d}</span>;
};
function Bar({ value }) {
  return (
    <div style={{ height: 6, background: UI.subtle, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(2, Math.min(100, value))}%`, height: '100%', background: scoreColor(value), borderRadius: 999 }} />
    </div>
  );
}
const Card = ({ children, style }) => (
  <div style={{ background: UI.surface, border: `1px solid ${UI.border}`, borderRadius: UI.rad, boxShadow: UI.shadowSm, ...style }}>{children}</div>
);
const SectionTitle = ({ children, note }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
    <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: UI.ink, letterSpacing: '-0.01em' }}>{children}</h3>
    {note && <span style={{ fontSize: 11.5, color: UI.ink3 }}>{note}</span>}
  </div>
);

/* ---------------- buttons ---------------- */
const btnBase = { borderRadius: UI.radSm, padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: UI.font };
const PrimaryBtn = ({ children }) => <button style={{ ...btnBase, background: UI.accent, color: '#fff', border: `1px solid ${UI.accent}` }}>{children}</button>;
const GhostBtn = ({ children }) => <button style={{ ...btnBase, background: UI.surface, color: UI.ink2, border: `1px solid ${UI.borderStrong}` }}>{children}</button>;

/* ======================================================================== */
export default function RedesignPrototype() {
  const [active, setActive] = useState('posture');

  return (
    <div style={{ minHeight: '100vh', background: UI.canvas, color: UI.ink, fontFamily: UI.font, WebkitFontSmoothing: 'antialiased', display: 'flex' }}>
      {/* ---------- sidebar ---------- */}
      <aside style={{ width: 236, flexShrink: 0, background: UI.sidebar, borderRight: `1px solid ${UI.border}`, padding: '18px 12px', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 8px 18px' }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: UI.accent, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>R</div>
          <div style={{ fontSize: 14.5, fontWeight: 650, letterSpacing: '-0.02em' }}>CyberRX</div>
        </div>
        {NAV.map((sec) => (
          <div key={sec.group} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: UI.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px 6px' }}>{sec.group}</div>
            {sec.items.map(([key, label, icon]) => {
              const on = active === key;
              return (
                <button key={key} onClick={() => setActive(key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', marginBottom: 1, borderRadius: UI.radSm, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontFamily: UI.font, fontWeight: on ? 600 : 500, color: on ? UI.accentText : UI.ink2, background: on ? UI.accentSoft : 'transparent' }}>
                  <Icon name={icon} size={16} color={on ? UI.accent : UI.ink3} />
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* ---------- main ---------- */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {/* top bar */}
        <div style={{ height: 56, borderBottom: `1px solid ${UI.border}`, background: 'rgba(251,251,252,0.8)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: UI.ink3 }}>
            <span>CISO</span><span style={{ color: UI.border }}>/</span><span style={{ color: UI.ink, fontWeight: 600 }}>Security Posture</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GhostBtn><Icon name="spark" size={14} color={UI.ink2} /> Listen</GhostBtn>
            <GhostBtn>⤓ PowerPoint</GhostBtn>
            <PrimaryBtn>⤓ PDF report</PrimaryBtn>
            <div style={{ width: 30, height: 30, borderRadius: UI.pill, background: UI.subtle, border: `1px solid ${UI.border}`, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, color: UI.ink2 }}>MA</div>
          </div>
        </div>

        <div style={{ padding: '26px 28px', maxWidth: 1180, margin: '0 auto' }}>
          {/* prototype ribbon */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 600, color: UI.accentText, background: UI.accentSoft, border: `1px solid ${UI.border}`, borderRadius: UI.pill, padding: '4px 11px', marginBottom: 18 }}>
            Design prototype · Modern SaaS direction
          </div>

          {/* page header */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: UI.ink3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CISO · Security Posture</div>
            <h1 style={{ margin: '6px 0 6px', fontSize: 26, fontWeight: 650, letterSpacing: '-0.025em', color: UI.ink }}>Executive Security Posture</h1>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: UI.ink2, maxWidth: 760 }}>
              Posture is up <strong style={{ color: UI.ink }}>+4 points</strong> this quarter to a Moderate 72. Identity and cloud strengthened; vulnerability management and third-party risk regressed and now drive most of the open exposure. Six decisions await your judgment.
            </p>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
            {KPIS.map((k) => (
              <Card key={k.label} style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: UI.ink3, fontWeight: 500 }}>{k.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 28, fontWeight: 650, letterSpacing: '-0.02em', color: UI.ink, ...tnum }}>{k.value}</span>
                    <span style={{ fontSize: 11.5, color: UI.ink3 }}>{k.unit}</span>
                  </div>
                  <Spark data={k.spark} color={k.good ? UI.good : UI.bad} />
                </div>
                <div style={{ marginTop: 8 }}><Delta d={k.delta} invert={!k.good && k.label !== 'Thresholds breached' ? false : k.label === 'Thresholds breached'} /></div>
              </Card>
            ))}
          </div>

          {/* posture + actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginBottom: 22 }}>
            <Card style={{ padding: 18 }}>
              <SectionTitle note="weighted across 6 domains">Posture by domain</SectionTitle>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ flexShrink: 0 }}><Ring value={72} /></div>
                <div style={{ flex: 1, display: 'grid', gap: 11 }}>
                  {DOMAINS.map((d) => (
                    <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 38px', alignItems: 'center', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: UI.ink, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                        <Bar value={d.score} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 650, color: scoreColor(d.score), textAlign: 'right', ...tnum }}>{d.score}</div>
                      <div style={{ textAlign: 'right' }}><Delta d={d.delta} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <SectionTitle note="ranked">Action queue</SectionTitle>
              <div style={{ display: 'grid', gap: 10 }}>
                {ACTIONS.map((a) => (
                  <div key={a.rank} style={{ display: 'flex', gap: 11, padding: '11px 12px', border: `1px solid ${UI.border}`, borderRadius: UI.radSm, background: UI.surface }}>
                    <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: sevSoft(a.sev), color: sevColor(a.sev), display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, ...tnum }}>{a.rank}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: UI.ink, lineHeight: 1.35 }}>{a.action}</div>
                      <div style={{ fontSize: 11.5, color: UI.ink2, marginTop: 3, lineHeight: 1.45 }}>{a.why}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 7 }}>
                        <Badge color={sevColor(a.sev)} bg={sevSoft(a.sev)}>{a.sev}</Badge>
                        <span style={{ fontSize: 11, color: UI.ink3 }}>{a.owner} · due {a.due}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* control risk table */}
          <Card style={{ padding: 18, marginBottom: 22 }}>
            <SectionTitle note="top 5 of 24 control areas">Control risk contribution</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: 10.5, color: UI.ink3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ textAlign: 'left', fontWeight: 600, padding: '0 8px 9px', width: 34 }}>#</th>
                  <th style={{ textAlign: 'left', fontWeight: 600, padding: '0 8px 9px' }}>Control area</th>
                  <th style={{ textAlign: 'left', fontWeight: 600, padding: '0 8px 9px' }}>Framework</th>
                  <th style={{ textAlign: 'left', fontWeight: 600, padding: '0 8px 9px', width: 160 }}>Risk</th>
                  <th style={{ textAlign: 'right', fontWeight: 600, padding: '0 8px 9px', width: 50 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {CONTROLS.map((c) => (
                  <tr key={c.rank} style={{ borderTop: `1px solid ${UI.border}` }}>
                    <td style={{ padding: '11px 8px', fontSize: 12.5, color: UI.ink3, fontWeight: 600, ...tnum }}>{c.rank}</td>
                    <td style={{ padding: '11px 8px', fontSize: 13, fontWeight: 600, color: UI.ink }}>{c.name}</td>
                    <td style={{ padding: '11px 8px', fontSize: 12, color: UI.ink2, fontFamily: UI.mono }}>{c.fw}</td>
                    <td style={{ padding: '11px 8px' }}><Bar value={c.risk} /></td>
                    <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 14, fontWeight: 650, color: scoreColor(100 - c.risk), ...tnum }}>{c.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* key risks */}
          <SectionTitle note="quantified expected loss">Key business risks</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {RISKS.map((r) => (
              <Card key={r.title} style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: UI.ink, lineHeight: 1.35 }}>{r.title}</div>
                  <Badge color={sevColor(r.sev)} bg={sevSoft(r.sev)}>{r.sev}</Badge>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
                  <span style={{ fontSize: 24, fontWeight: 650, letterSpacing: '-0.02em', color: UI.ink, ...tnum }}>{r.loss}</span>
                  <span style={{ fontSize: 11.5, color: UI.ink3 }}>expected loss</span>
                </div>
                <div style={{ fontSize: 11.5, color: UI.ink2, marginTop: 8 }}>Confidence <strong style={{ color: UI.ink }}>{r.conf}</strong></div>
              </Card>
            ))}
          </div>

          <div style={{ fontSize: 11.5, color: UI.ink3, marginTop: 26, paddingTop: 14, borderTop: `1px solid ${UI.border}` }}>
            Prototype · static sample data · Modern SaaS (Linear / Vercel) design direction. Approve this look and it gets rolled into the live components.
          </div>
        </div>
      </main>
    </div>
  );
}

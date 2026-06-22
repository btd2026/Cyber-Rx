/**
 * TrendVsTarget — the shared executive trend chart (one metric over time against
 * an explicit appetite/target threshold line, with a Quarterly/Monthly toggle).
 *
 * Built once and reused by every executive seat's "Trend vs Target" layer. All
 * color/type comes from cyberrx-design-tokens.css via CSS custom properties — no
 * hard-coded hex. Respects prefers-reduced-motion (no draw animation).
 *
 * Props:
 *   label        — metric name (e.g. "Residual risk vs appetite")
 *   unit         — value suffix (e.g. "", "%", "$M")
 *   quarterly    — [{ label, value }]
 *   monthly      — [{ label, value }]
 *   target       — number: the appetite/target threshold
 *   targetLabel  — label for the threshold line (e.g. "Board appetite")
 *   goodWhen     — 'low' | 'high': which side of target is healthy (drives color)
 */

import { useState } from 'react';

const W = 560, H = 170, PAD_L = 36, PAD_R = 14, PAD_T = 14, PAD_B = 26;

export default function TrendVsTarget({ label, unit = '', quarterly = [], monthly = [], target, targetLabel = 'Target', goodWhen = 'low' }) {
  const [range, setRange] = useState('Q');
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const series = (range === 'Q' ? quarterly : monthly) || [];
  const pts = series.filter((p) => p && typeof p.value === 'number');

  if (!pts.length) {
    return <div style={{ fontSize: 12, color: 'var(--text-subtle)', fontStyle: 'italic' }}>Trend data not yet available — placeholder.</div>;
  }

  const vals = pts.map((p) => p.value).concat(typeof target === 'number' ? [target] : []);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  // Pad the domain a touch so the line and target aren't flush to the frame.
  const lo = min - span * 0.12, hi = max + span * 0.12, range01 = hi - lo || 1;
  const x = (i) => PAD_L + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * (W - PAD_L - PAD_R));
  const y = (v) => PAD_T + (1 - (v - lo) / range01) * (H - PAD_T - PAD_B);

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${(H - PAD_B).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD_B).toFixed(1)} Z`;
  const last = pts[pts.length - 1];
  // Health of the latest point relative to the appetite line.
  const within = typeof target !== 'number' ? true : (goodWhen === 'low' ? last.value <= target : last.value >= target);
  const lineColor = within ? 'var(--pass)' : 'var(--exposure)';
  const gradId = `tvt-${label ? label.replace(/[^a-z0-9]/gi, '') : 'm'}-${range}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{label}</div>
        <div role="group" aria-label="Time range" style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {[['Q', 'Quarterly'], ['M', 'Monthly']].map(([k, lbl]) => {
            const on = range === k;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => setRange(k)}
                style={{ border: 'none', cursor: 'pointer', padding: '4px 11px', fontSize: 11, fontWeight: on ? 700 : 500,
                  fontFamily: 'var(--font-body)', background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--accent-on)' : 'var(--text-muted)' }}>
                {lbl}
              </button>
            );
          })}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label={`${label}: latest ${last.value}${unit}${typeof target === 'number' ? `, ${targetLabel} ${target}${unit}, ${within ? 'within' : 'beyond'} appetite` : ''}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: lineColor, stopOpacity: 0.18 }} />
            <stop offset="100%" style={{ stopColor: lineColor, stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* frame baseline */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} style={{ stroke: 'var(--border)' }} strokeWidth="1" />

        {/* appetite / target threshold */}
        {typeof target === 'number' && (
          <>
            <line x1={PAD_L} y1={y(target)} x2={W - PAD_R} y2={y(target)} style={{ stroke: 'var(--text-subtle)' }} strokeWidth="1.25" strokeDasharray="5 4" />
            <text x={W - PAD_R} y={y(target) - 5} textAnchor="end" style={{ fill: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', fontSize: 9.5 }}>
              {targetLabel} {target}{unit}
            </text>
          </>
        )}

        {/* area + line */}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" style={{ stroke: lineColor }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {!prefersReduced && pts.length > 1 && (
            <animate attributeName="stroke-dasharray" from="0 1400" to="1400 0" dur="0.6s" fill="freeze" />
          )}
        </path>
        <circle cx={x(pts.length - 1)} cy={y(last.value)} r="3.4" style={{ fill: lineColor }} />

        {/* y bounds */}
        <text x={PAD_L - 6} y={y(max) + 3} textAnchor="end" style={{ fill: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>{max}{unit}</text>
        <text x={PAD_L - 6} y={y(min) + 3} textAnchor="end" style={{ fill: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>{min}{unit}</text>

        {/* x labels */}
        {pts.map((p, i) => (
          <text key={i} x={x(i)} y={H - PAD_B + 14} textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}
            style={{ fill: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>{p.label}</text>
        ))}
      </svg>

      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
        Latest <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{last.value}{unit}</strong>
        {typeof target === 'number' && (
          within
            ? <span style={{ color: 'var(--pass)', fontWeight: 700 }}> · ✓ within {targetLabel.toLowerCase()}</span>
            : <span style={{ color: 'var(--exposure)', fontWeight: 700 }}> · above {targetLabel.toLowerCase()}</span>
        )}
      </div>
    </div>
  );
}

/**
 * CsfRankings
 * -----------
 * Systemwide NIST CSF 2.0 outcomes — every organization's latest scorecard
 * plotted as maturity tier vs. inherent risk (the association/board view),
 * with a ranked table beneath.
 *
 * Data: GET /api/csf/rankings (latest snapshot per org from csf_scorecards;
 * ?refresh=1 recomputes every org from its live data).
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a';
const INK_2 = '#475569';
const INK_3 = '#94a3b8';
const HAIRLINE = '#e2e8f0';
const BLUE = '#2E75B6';      // at or above threshold
const RED = '#9E3B32';       // below threshold
const THRESHOLD = 3.0;
const THRESHOLD_COLOR = '#E8A33D';

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    'http://localhost:3001';
  return { token, organizationId, apiUrl };
}

export default function CsfRankings(props) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { token, organizationId, apiUrl } = resolveCtx(props);

  const load = useCallback((refresh) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    fetch(`${apiUrl}/api/csf/rankings${refresh ? '?refresh=1' : ''}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => setRows(d.rankings || []))
      .catch((e) => setError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [apiUrl, organizationId, token]);

  useEffect(() => { load(false); }, [load]);

  if (loading) return <div style={{ padding: 28, color: INK_3, fontSize: 13 }}>Loading systemwide outcomes…</div>;
  if (error || !rows) {
    return (
      <div style={{ padding: 28, color: RED, fontSize: 13 }}>
        Could not load rankings: {error || 'no data'}
        <button onClick={() => load(false)} style={{ ...ghostBtn, marginLeft: 12 }}>Retry</button>
      </div>
    );
  }

  const plotted = rows.filter((r) => r.overall != null && r.inherentRisk != null);
  const unplotted = rows.filter((r) => r.overall == null || r.inherentRisk == null);

  // ── Chart geometry ────────────────────────────────────────────────────────
  const W = 960, H = 500, M = { l: 64, r: 36, t: 24, b: 64 };
  const xMin = 0.5, xMax = 5;
  const yLo = plotted.length ? Math.min(...plotted.map((r) => r.overall)) : 2.5;
  const yMin = Math.min(2.5, Math.floor((yLo - 0.15) * 2) / 2);
  const yMax = 4;
  const X = (v) => M.l + ((Math.max(xMin, Math.min(xMax, v)) - xMin) / (xMax - xMin)) * (W - M.l - M.r);
  const Y = (v) => H - M.b - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * (H - M.t - M.b);

  const xTicks = []; for (let v = xMin; v <= xMax + 1e-9; v += 0.5) xTicks.push(Math.round(v * 10) / 10);
  const yTicks = []; for (let v = yMin; v <= yMax + 1e-9; v += 0.5) yTicks.push(Math.round(v * 10) / 10);

  // Stagger labels around dots to reduce collisions.
  const labelPos = (i) => [
    { dx: 10, dy: 4, anchor: 'start' }, { dx: -10, dy: 4, anchor: 'end' },
    { dx: 0, dy: -11, anchor: 'middle' }, { dx: 0, dy: 18, anchor: 'middle' },
  ][i % 4];

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>
            <span style={{ color: '#1c3a5e', fontWeight: 700 }}>Systemwide Cybersecurity</span>
            <span style={{ color: INK_3, fontWeight: 400 }}> | </span>
            <span style={{ color: INK_2, fontWeight: 500 }}>NIST CSF v2.0 Outcomes</span>
          </h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
            Each organization's overall CSF 2.0 maturity plotted against its inherent risk
            (scaled from PHI records held, premium revenue, and membership). The dotted line marks the
            {' '}{THRESHOLD.toFixed(1)} maturity threshold.
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} style={{ ...ghostBtn, flexShrink: 0 }}>
          {refreshing ? 'Recomputing…' : 'Recompute all'}
        </button>
      </div>

      {/* Scatter */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 12 }}>
        {/* Gridlines */}
        {xTicks.map((t) => (
          <line key={`gx${t}`} x1={X(t)} y1={M.t} x2={X(t)} y2={H - M.b} stroke="#eef1f5" strokeWidth="1" />
        ))}
        {yTicks.map((t) => (
          <line key={`gy${t}`} x1={M.l} y1={Y(t)} x2={W - M.r} y2={Y(t)} stroke="#eef1f5" strokeWidth="1" />
        ))}
        {/* Axes */}
        <line x1={M.l} y1={M.t} x2={M.l} y2={H - M.b} stroke="#cbd5e1" strokeWidth="1.25" />
        <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} stroke="#cbd5e1" strokeWidth="1.25" />
        {/* Tick labels */}
        {xTicks.map((t) => (
          <text key={`tx${t}`} x={X(t)} y={H - M.b + 20} textAnchor="middle" fontSize="12" fill={INK_2}>{t}</text>
        ))}
        {yTicks.map((t) => (
          <text key={`ty${t}`} x={M.l - 12} y={Y(t) + 4} textAnchor="end" fontSize="12" fill={INK_2}>{t}</text>
        ))}
        {/* Axis titles */}
        <text x={M.l + (W - M.l - M.r) / 2} y={H - 16} textAnchor="middle" fontSize="13" fill={INK_2} fontWeight="500">Inherent Risk</text>
        <text x={20} y={M.t + (H - M.t - M.b) / 2} textAnchor="middle" fontSize="13" fill={INK_2} fontWeight="500"
          transform={`rotate(-90 20 ${M.t + (H - M.t - M.b) / 2})`}>NIST CSF v2.0 Tiers</text>
        {/* Threshold */}
        {THRESHOLD >= yMin && THRESHOLD <= yMax && (
          <line x1={M.l} y1={Y(THRESHOLD)} x2={W - M.r} y2={Y(THRESHOLD)}
            stroke={THRESHOLD_COLOR} strokeWidth="2.5" strokeDasharray="3 4" />
        )}
        {/* Points */}
        {plotted.map((r, i) => {
          const cx = X(r.inherentRisk), cy = Y(r.overall);
          const color = r.overall >= THRESHOLD ? BLUE : RED;
          const lp = labelPos(i);
          return (
            <g key={r.organizationId}>
              <circle cx={cx} cy={cy} r="6" fill={color}>
                <title>{`${r.name}\nMaturity ${r.overall.toFixed(2)} (${r.tierLabel || ''})\nInherent risk ${r.inherentRisk.toFixed(2)}`}</title>
              </circle>
              <text x={cx + lp.dx} y={cy + lp.dy} textAnchor={lp.anchor} fontSize="12" fill={INK_2} fontWeight="500">
                {r.abbrev || r.name}
              </text>
            </g>
          );
        })}
        {plotted.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill={INK_3}>
            No organizations with computed scorecards yet — run an assessment or click Recompute all.
          </text>
        )}
      </svg>

      {/* Rankings table */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
          Rankings
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${HAIRLINE}` }}>
              {['Rank', 'Organization', 'Overall Maturity', 'Tier', 'Inherent Risk', 'Coverage', 'Last Computed'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.organizationId} style={{ borderBottom: `1px solid #f1f5f9` }}>
                <td style={{ padding: '9px 10px', color: INK, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.rank || '—'}</td>
                <td style={{ padding: '9px 10px', color: INK }}>
                  {r.name} <span style={{ color: INK_3, fontSize: 11 }}>({r.abbrev})</span>
                </td>
                <td style={{ padding: '9px 10px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: r.overall == null ? INK_3 : (r.overall >= THRESHOLD ? BLUE : RED) }}>
                  {r.overall == null ? 'Not assessed' : r.overall.toFixed(2)}
                </td>
                <td style={{ padding: '9px 10px', color: INK_2 }}>{r.tierLabel || '—'}</td>
                <td style={{ padding: '9px 10px', color: INK_2, fontVariantNumeric: 'tabular-nums' }}>
                  {r.inherentRisk == null ? '—' : r.inherentRisk.toFixed(2)}
                </td>
                <td style={{ padding: '9px 10px', color: INK_2, fontVariantNumeric: 'tabular-nums' }}>
                  {r.assessedCategories}/{r.totalCategories}
                </td>
                <td style={{ padding: '9px 10px', color: INK_3, fontSize: 11 }}>
                  {r.generatedAt ? new Date(r.generatedAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {unplotted.length > 0 && (
          <div style={{ color: INK_3, fontSize: 11, marginTop: 8 }}>
            {unplotted.length} organization(s) appear in the table but not the chart — missing a maturity score or
            the scale data (PHI records, revenue, membership) that drives inherent risk.
          </div>
        )}
      </div>
    </div>
  );
}

const ghostBtn = {
  background: '#fff', border: '1px solid #cbd5e1', color: '#334155',
  borderRadius: 3, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 500,
};

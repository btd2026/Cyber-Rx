/**
 * FrameworkScorecard
 * ------------------
 * Generic live compliance scorecard for the non-CSF frameworks (HIPAA,
 * NIST 800-53, CIS v8, NAIC, ISO 27001, SOC 2, CMS, PCI DSS, GDPR).
 *
 * Same enterprise language as the CSF profile, on a 0–100 compliance track:
 * each section is a band with its score; each control sits on the track at
 * its exact score with the 75% compliance threshold marked. Click a control
 * to see exactly which live signals and intake answers produced its score.
 *
 * Data: GET /api/csf/frameworks/:id
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a';
const INK_2 = '#475569';
const INK_3 = '#94a3b8';
const HAIRLINE = '#e2e8f0';
const PANEL_BG = '#0f1b2d';
const STATUS_COLORS = { Compliant: '#31604B', Partial: '#B07C2E', Gap: '#9E3B32', 'Not assessed': '#8B95A3' };
const THRESHOLD = 75;

const MODE_TAGS = {
  auto: { label: 'AUTO', title: 'Scored entirely from connected systems' },
  partial: { label: 'HYBRID', title: 'Live system signals blended with intake evidence' },
  manual: { label: 'MANUAL', title: 'Scored from intake evidence' },
};

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    'http://localhost:3001';
  return { token, organizationId, apiUrl };
}

export default function FrameworkScorecard(props) {
  const { frameworkId } = props;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null); // selected control ref
  const { token, organizationId, apiUrl } = resolveCtx(props);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    fetch(`${apiUrl}/api/csf/frameworks/${frameworkId}?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [apiUrl, organizationId, token, frameworkId]);

  useEffect(() => { setSel(null); load(); }, [load]);

  if (loading) return <div style={{ padding: 28, color: INK_3, fontSize: 13 }}>Computing live assessment…</div>;
  if (error || !data) {
    return (
      <div style={{ padding: 28, color: STATUS_COLORS.Gap, fontSize: 13 }}>
        Could not compute the assessment: {error || 'no data'}
        <button onClick={load} style={{ ...ghostBtn, marginLeft: 12 }}>Retry</button>
      </div>
    );
  }

  const sc = (s) => STATUS_COLORS[s] || INK_3;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            Live Compliance Assessment · {data.standard}
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>{data.label}</h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 640, lineHeight: 1.55 }}>
            {data.totalControls} controls scored from the same live signals as the CSF profile — {data.autoCount} automatic
            from connected systems, {data.partialCount} hybrid, {data.manualCount} from intake evidence. Controls without an
            available signal report "Not assessed".
            {data.lastToolSync && <> Last tool synchronization {new Date(data.lastToolSync).toLocaleString()}.</>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'stretch', background: PANEL_BG, borderRadius: 4, overflow: 'hidden' }}>
            <span style={{ background: sc(data.status), color: '#fff', fontWeight: 600, fontSize: 19, fontVariantNumeric: 'tabular-nums', padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
              {data.overall == null ? '—' : `${data.overall}%`}
            </span>
            <span style={{ color: '#e2e8f0', fontWeight: 500, fontSize: 12, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.35 }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, color: '#8fa3bd' }}>Overall Compliance</span>
              <span>{data.status}</span>
            </span>
          </div>
          <div style={{ color: INK_3, fontSize: 10, marginTop: 6 }}>
            {data.assessedControls} of {data.totalControls} controls assessed
          </div>
        </div>
      </div>

      {/* Sections */}
      {data.sections.map((s) => (
        <div key={s.id} style={{ borderBottom: `1px solid #f1f5f9`, padding: '16px 0' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{s.name}</span>
              <span style={{ fontSize: 10, color: INK_3, marginLeft: 10 }}>{s.assessed}/{s.total} controls assessed</span>
            </div>
            <div style={{ position: 'relative', width: 220, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'visible', flexShrink: 0 }}>
              {s.score != null && (
                <div style={{ position: 'absolute', inset: 0, width: `${s.score}%`, background: sc(s.status), borderRadius: 4, opacity: 0.85 }} />
              )}
              <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${THRESHOLD}%`, borderLeft: `2px dashed ${INK_3}88` }} />
            </div>
            <span style={{ width: 44, textAlign: 'right', fontSize: 14, fontWeight: 600, color: sc(s.status), fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {s.score == null ? '—' : `${s.score}%`}
            </span>
          </div>
          {/* Controls */}
          {s.controls.map((c) => {
            const active = sel === c.ref;
            return (
              <div key={c.ref}>
                <div onClick={() => setSel(active ? null : c.ref)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0 7px 14px', cursor: 'pointer', borderLeft: `2px solid ${active ? sc(c.status) : 'transparent'}` }}>
                  <span style={{ width: 96, flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: INK_2, fontVariantNumeric: 'tabular-nums' }}>{c.ref}</span>
                  <span style={{ flex: 1, fontSize: 12, color: INK }}>{c.name}</span>
                  <span title={MODE_TAGS[c.mode] ? MODE_TAGS[c.mode].title : ''}
                    style={{ fontSize: 8, fontWeight: 600, color: INK_3, letterSpacing: '0.1em', width: 50, flexShrink: 0 }}>
                    {MODE_TAGS[c.mode] ? MODE_TAGS[c.mode].label : ''}
                  </span>
                  <div style={{ position: 'relative', width: 150, height: 5, background: '#f1f5f9', borderRadius: 3, flexShrink: 0 }}>
                    {c.score != null && (
                      <div style={{ position: 'absolute', inset: 0, width: `${c.score}%`, background: sc(c.status), borderRadius: 3, opacity: 0.7 }} />
                    )}
                    <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${THRESHOLD}%`, borderLeft: `1.5px dashed ${INK_3}66` }} />
                  </div>
                  <span style={{ width: 38, textAlign: 'right', fontSize: 11.5, fontWeight: 600, color: sc(c.status), fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {c.score == null ? '—' : `${c.score}%`}
                  </span>
                  <span style={{ width: 88, textAlign: 'right', fontSize: 9.5, fontWeight: 600, color: sc(c.status), textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                    {c.status}
                  </span>
                </div>
                {active && (
                  <div style={{ margin: '4px 0 10px 110px', border: `1px solid ${HAIRLINE}`, borderRadius: 4, background: '#fafbfc', padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
                      Score derivation
                    </div>
                    {c.sources.map((src) => (
                      <div key={src.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid #f1f5f9`, fontSize: 11.5 }}>
                        <span style={{ color: INK_2 }}>
                          {src.label}
                          <span style={{ fontSize: 8.5, fontWeight: 600, color: INK_3, letterSpacing: '0.08em', marginLeft: 8 }}>
                            {src.kind === 'live' ? 'LIVE' : 'INTAKE'}
                          </span>
                        </span>
                        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: src.value == null ? INK_3 : INK }}>
                          {src.value == null ? 'no data' : `${src.value}%`}
                        </span>
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: INK_3, marginTop: 6 }}>
                      Control score is the average of available signals. Missing intake signals can be answered on the
                      NIST CSF profile or during setup.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${HAIRLINE}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Status</span>
        {Object.entries(STATUS_COLORS).map(([name, color]) => (
          <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: INK_2 }}>
            <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block' }} />
            {name}{name === 'Compliant' ? ' ≥75%' : name === 'Partial' ? ' 50–74%' : name === 'Gap' ? ' <50%' : ''}
          </span>
        ))}
        <span style={{ fontSize: 10.5, color: INK_3, marginLeft: 'auto' }}>┊ 75% compliance threshold</span>
      </div>
    </div>
  );
}

const ghostBtn = {
  background: '#fff', border: '1px solid #cbd5e1', color: '#334155',
  borderRadius: 3, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500,
};

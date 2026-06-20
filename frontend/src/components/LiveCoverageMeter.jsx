/**
 * LiveCoverageMeter — the hero "how much of this is real telemetry?" indicator.
 * A compact donut + "X% live data" that opens a Data Trust drawer: per-domain
 * coverage, every signal's provenance, and the "connect this to go live" list.
 * Fetches GET /api/ciso/coverage.
 */

import React, { useState, useEffect, useCallback } from 'react';

const COLORS = { live: '#1f8a4c', derived: '#0e7490', modeled: '#B07C2E', demo: '#94a3b8' };
const LABEL = { live: 'Live', derived: 'Derived', modeled: 'Modeled', demo: 'Demo' };
const ORDER = ['live', 'derived', 'modeled', 'demo'];

export default function LiveCoverageMeter({ orgId, authToken, apiUrl }) {
  const [cov, setCov] = useState(null);
  const [open, setOpen] = useState(false);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (authToken) h.Authorization = `Bearer ${authToken}`; return h; }, [orgId, authToken]);

  useEffect(() => {
    let live = true;
    fetch(`${apiUrl}/api/ciso/coverage?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j) setCov(j); }).catch(() => {});
    return () => { live = false; };
  }, [apiUrl, orgId, headers]);

  if (!cov || !cov.pct) return null;
  const pct = cov.pct;
  let acc = 0;
  const stops = ORDER.map((m) => { const start = acc; acc += pct[m]; return `${COLORS[m]} ${start}% ${acc}%`; });
  const donut = (size) => (
    <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `conic-gradient(${stops.join(',')})`,
      WebkitMask: 'radial-gradient(circle 4px at center, transparent 98%, #000 100%)',
      mask: 'radial-gradient(circle calc(50% - 5px) at center, transparent 98%, #000 100%)' }} />
  );

  return (
    <>
      <button onClick={() => setOpen(true)} title="Data trust — live vs. modeled coverage"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1e3a5f', color: '#fff',
          border: '1px solid #2c4f7c', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        {donut(20)}
        <span><strong>{pct.live}%</strong> live data</span>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,15,28,0.45)', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 'min(440px, 92vw)',
            background: '#fff', boxShadow: '-12px 0 40px rgba(0,0,0,0.25)', overflowY: 'auto', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Data Trust</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              Where every posture signal comes from. Connect a source to upgrade it from modeled to live.
            </p>

            {/* headline mix */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid #e6ebf2', borderBottom: '1px solid #e6ebf2' }}>
              {donut(56)}
              <div style={{ flex: 1 }}>
                {ORDER.map((m) => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#334155', padding: '1px 0' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS[m] }} />{LABEL[m]}
                    </span>
                    <strong>{pct[m]}%</strong>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{cov.total} signals · avg confidence {cov.confidence}%</div>
              </div>
            </div>

            {/* upgrade nudges */}
            {cov.upgrades && cov.upgrades.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 7 }}>Go live — connect these sources</div>
                {cov.upgrades.map((u, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12,
                    background: '#f8fafc', border: '1px solid #e6ebf2', borderRadius: 7, padding: '8px 10px', marginBottom: 6 }}>
                    <span style={{ color: '#334155' }}><strong>{u.source}</strong> <span style={{ color: '#94a3b8' }}>→ {u.signal}</span></span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#0e7490', whiteSpace: 'nowrap' }}>Connect</span>
                  </div>
                ))}
              </div>
            )}

            {/* per-domain coverage */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 7 }}>By domain</div>
              {(cov.byDomain || []).map((d) => (
                <div key={d.id} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
                    <span>{d.name}</span><span style={{ color: COLORS[d.mode] || '#94a3b8', fontWeight: 700 }}>{LABEL[d.mode]}</span>
                  </div>
                  <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 3, background: '#eef2f6' }}>
                    {ORDER.map((m) => (d.pct && d.pct[m] ? <span key={m} style={{ width: `${d.pct[m]}%`, background: COLORS[m] }} /> : null))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

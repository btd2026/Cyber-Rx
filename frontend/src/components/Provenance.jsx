/**
 * Provenance — a small colored dot that declares where a number came from, with a
 * hover popover (source · confidence · freshness). One visual language across the
 * dashboard so a CISO can trust-check any figure at a glance.
 *   live (green) · derived (teal) · modeled (amber) · demo (gray)
 */

import React, { useState } from 'react';

const COLORS = { live: '#1f8a4c', derived: '#0e7490', modeled: '#B07C2E', demo: '#94a3b8' };
const LABEL = { live: 'Live', derived: 'Derived', modeled: 'Modeled', demo: 'Demo' };
const DESC = {
  live: 'Directly measured from a connected system or attested intake.',
  derived: 'Computed from other live signals.',
  modeled: 'Produced by a CyberRX model.',
  demo: 'Sample data — connect your sources to make this live.',
};

export default function Provenance({ prov, size = 9, dark = false }) {
  const [open, setOpen] = useState(false);
  if (!prov || !prov.mode) return null;
  const color = COLORS[prov.mode] || COLORS.demo;
  const asOf = prov.asOf ? new Date(prov.asOf).toLocaleDateString() : null;
  const mix = prov.pct && (prov.pct.live + prov.pct.derived + prov.pct.modeled + prov.pct.demo) > 0 ? prov.pct : null;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span role="img" aria-label={`Data source: ${LABEL[prov.mode]}, ${prov.confidence}% confidence`}
        style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block',
          border: dark ? '1px solid rgba(255,255,255,0.45)' : '1px solid rgba(0,0,0,0.08)', cursor: 'help', flexShrink: 0 }} />
      {open && (
        <span style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', zIndex: 60,
          width: 222, background: '#0f172a', color: '#e2e8f0', borderRadius: 8, padding: '9px 11px', fontSize: 11, lineHeight: 1.45,
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)', textAlign: 'left', fontWeight: 400, whiteSpace: 'normal' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#fff' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {LABEL[prov.mode]} · {prov.confidence}% confidence
          </span>
          <div style={{ marginTop: 4, color: '#cbd5e1' }}>{DESC[prov.mode]}</div>
          <div style={{ marginTop: 5, color: '#94a3b8' }}>Source: <strong style={{ color: '#e2e8f0' }}>{prov.source}</strong></div>
          {prov.lineage && <div style={{ color: '#94a3b8' }}>{prov.lineage}</div>}
          {asOf && <div style={{ color: '#94a3b8' }}>As of {asOf}</div>}
          {mix && <div style={{ marginTop: 5, color: '#94a3b8' }}>{mix.live}% live · {mix.derived}% derived · {mix.modeled}% modeled · {mix.demo}% demo</div>}
        </span>
      )}
    </span>
  );
}

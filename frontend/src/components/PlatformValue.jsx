/**
 * PlatformValue — the "value realized" modal a CISO uses to justify renewal.
 * Opens from the hero; reads GET /api/value (decisions governed, exposure under
 * treatment, blind spots surfaced, live coverage, ledger integrity, materiality).
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B', flat: '#475569' };

export default function PlatformValue({ orgId, authToken, apiUrl }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (authToken) h.Authorization = `Bearer ${authToken}`; return h; }, [orgId, authToken]);

  useEffect(() => {
    if (!open) return;
    fetch(`${apiUrl}/api/value?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [open, apiUrl, orgId, headers]);

  return (
    <>
      <button onClick={() => setOpen(true)} title="What CyberRX has delivered to date"
        style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid #2c4f7c', borderRadius: 6, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📈 Value realized</button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,15,28,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 16px', overflowY: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(720px, 96vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: INK }}>Value realized</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: INK3, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {!d ? <div style={{ fontSize: 12, color: INK3 }}>Loading…</div> : (
              <>
                <p style={{ margin: '0 0 14px', fontSize: 12.5, color: INK2, lineHeight: 1.6 }}>{d.narrative}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px,1fr))', gap: 10 }}>
                  {d.cards.map((c) => (
                    <div key={c.key} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${TONE[c.tone] || INK3}`, borderRadius: 9, background: '#fff', padding: '11px 13px' }}>
                      <div style={{ fontSize: 10.5, color: INK2 }}>{c.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: TONE[c.tone] || INK, marginTop: 2 }}>{c.value}</div>
                      <div style={{ fontSize: 10, color: INK3, marginTop: 3, lineHeight: 1.4 }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: INK3, marginTop: 12, background: PANEL, borderRadius: 8, padding: '8px 12px' }}>{d.note}</div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

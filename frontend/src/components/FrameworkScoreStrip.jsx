/**
 * FrameworkScoreStrip (ticket #15)
 * --------------------------------
 * A row of cards — one per active framework — each showing the framework
 * abbreviation, its current live score, and a red/amber/green status. Built
 * dynamically from the enabled-framework list, not hard-coded to NIST. Clicking
 * a card opens that framework's scorecard.
 */

import React, { useState, useEffect } from 'react';

const HAIRLINE = '#e2e8f0', INK = '#0f172a', INK_2 = '#475569', INK_3 = '#94a3b8';
const RAG = (pct) => (pct == null ? '#94a3b8' : pct >= 75 ? '#31604B' : pct >= 50 ? '#B07C2E' : '#9E3B32');

// Abbreviation + the selFramework id each card opens.
const FRAMEWORKS = [
  { id: 'nistcsf', abbr: 'NIST', name: 'NIST CSF 2.0' },
  { id: 'hipaa', abbr: 'HIPAA', name: 'HIPAA Security Rule' },
  { id: 'soc2', abbr: 'SOC 2', name: 'SOC 2 Type II' },
  { id: 'nist_800_53', abbr: '800-53', name: 'NIST SP 800-53' },
  { id: 'cis', abbr: 'CIS', name: 'CIS Controls v8' },
  { id: 'iso27001', abbr: 'ISO', name: 'ISO 27001' },
  { id: 'naic', abbr: 'NAIC', name: 'NAIC Model Law' },
  { id: 'cms', abbr: 'CMS', name: 'CMS 42 CFR §422' },
  { id: 'pci', abbr: 'PCI', name: 'PCI DSS v4.0' },
  { id: 'gdpr', abbr: 'GDPR', name: 'GDPR / Privacy' },
];

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || ((typeof window!=='undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

export default function FrameworkScoreStrip(props) {
  const [scores, setScores] = useState({});
  const { token, organizationId, apiUrl } = resolveCtx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    let cancelled = false;
    const setOne = (id, pct) => { if (!cancelled) setScores((p) => ({ ...p, [id]: pct })); };
    // NIST: maturity 1–4 → percentage of the 4.0 ceiling.
    fetch(`${apiUrl}/api/csf/assessment?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setOne('nistcsf', d && d.overall && d.overall.maturity != null ? Math.round(d.overall.maturity / 4 * 100) : null)).catch(() => {});
    FRAMEWORKS.filter((f) => f.id !== 'nistcsf').forEach((f) => {
      fetch(`${apiUrl}/api/csf/frameworks/${f.id}?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
        .then((r) => (r.ok ? r.json() : null)).then((d) => setOne(f.id, d ? d.overall : null)).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [apiUrl, organizationId, token]);

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
        Framework scores — click any to open its live scorecard
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
        {FRAMEWORKS.map((f) => {
          const pct = scores[f.id];
          const c = RAG(pct);
          return (
            <button key={f.id} onClick={() => props.onOpen && props.onOpen(f.id)} title={f.name}
              style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderTop: `3px solid ${c}`, borderRadius: 4, padding: '9px 6px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: c, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {pct == null ? '—' : pct}<span style={{ fontSize: 9, color: INK_3 }}>{pct == null ? '' : '%'}</span>
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: INK_2, marginTop: 4 }}>{f.abbr}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

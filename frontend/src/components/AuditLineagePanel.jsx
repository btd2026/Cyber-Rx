/**
 * AuditLineagePanel (CLO) — audit-ready control lineage: each unified result
 * with its evidence trace and cross-framework peers. Backend: /api/audit/*.
 */
import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc';
const GREEN = '#1f8a4c', AMBER = '#B07C2E', RED = '#C0392B';
const sc = (s) => (s >= 80 ? GREEN : s >= 50 ? AMBER : RED);
const fwName = (id) => ({ nist_csf_2: 'CSF 2.0', nist_800_53_r5: '800-53', cis_v8_1: 'CIS' }[id] || id);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function AuditLineagePanel(props) {
  const { token, orgId, api } = ctx(props);
  const [sum, setSum] = useState(null);
  const [rows, setRows] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  useEffect(() => {
    if (!orgId) return;
    const q = `org_id=${encodeURIComponent(orgId)}`;
    fetch(`${api}/api/audit/summary?${q}`, { headers: headers() }).then((r) => r.json()).then(setSum).catch(() => {});
    fetch(`${api}/api/audit/lineage?${q}`, { headers: headers() }).then((r) => r.json()).then((d) => setRows(d.lineage || [])).catch(() => {});
  }, [api, orgId, headers]);

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>Audit-ready control lineage</div>
      <div style={{ fontSize: 11.5, color: INK2, margin: '4px 0 10px', maxWidth: 720 }}>One assessment across CSF / 800-53 / CIS, each result traced to its evidence and cross-framework peers — the oversight pack for disclosure.</div>
      {sum && <div style={{ fontSize: 12, color: INK2, marginBottom: 10 }}><strong style={{ color: INK }}>{sum.total}</strong> controls assessed · <strong style={{ color: GREEN }}>{sum.met}</strong> met · <strong>{sum.reviewed}</strong> reviewed</div>}
      {!rows ? <div style={{ color: INK3, fontSize: 12 }}>Loading…</div> : !rows.length ? <div style={{ color: INK3, fontSize: 12 }}>No assessment yet — run the unified assessment first.</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr style={{ color: INK3, textTransform: 'uppercase', fontSize: 9.5, letterSpacing: '0.05em' }}>
              {['Control', 'Framework', 'Type', 'Status', 'Score', 'Evidence', 'Crosswalk'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '5px 8px' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.slice(0, 40).map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${HAIR}` }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: INK }}>{r.requirement_id}<div style={{ fontSize: 9.5, color: INK3, fontWeight: 400 }}>{r.title}</div></td>
                  <td style={{ padding: '6px 8px', color: INK2 }}>{fwName(r.framework_id)}</td>
                  <td style={{ padding: '6px 8px', color: INK3 }}>{r.assessment_type}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 700, color: sc(Number(r.score)) }}>{r.status}</td>
                  <td style={{ padding: '6px 8px', color: sc(Number(r.score)) }}>{r.score}</td>
                  <td style={{ padding: '6px 8px', color: INK2 }}>{(r.evidence || []).map((e) => e.type).join(', ') || '—'}</td>
                  <td style={{ padding: '6px 8px', color: INK3 }}>{(r.crosswalk || []).length} peer{(r.crosswalk || []).length === 1 ? '' : 's'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

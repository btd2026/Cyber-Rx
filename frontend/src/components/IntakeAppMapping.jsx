/**
 * IntakeAppMapping — Intake Step 3: Applications ↔ Processes (process-centric
 * validation). Runs the 3-tier confidence cascade, renders per-process mapped
 * apps (low-confidence first) for ACCEPT / DELETE / EDIT, surfaces coverage gaps
 * (uncovered processes / orphan apps), and supports a ServiceNow CMDB pull. Every
 * validation writes to the intake ledger; criticality propagates on accept.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const SRC = { inventory: COLORS.good, llm: '#1d4ed8', heuristic: COLORS.warn, user: COLORS.ink };
const confColor = (c) => (c >= 0.75 ? TONE.good : c >= 0.5 ? TONE.warn : TONE.bad);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl || props.api_url ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function IntakeAppMapping(props) {
  const { token, orgId, api } = ctx(props);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [cmdb, setCmdb] = useState(null); // null | {instance,username,password,query}
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const loadReview = useCallback(() => {
    fetch(`${api}/api/intake/apps/review?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setReview(d); }).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { loadReview(); }, [loadReview]);

  function runCascade() {
    setBusy('map'); setErr('');
    fetch(`${api}/api/intake/apps/map`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId }) })
      .then((r) => r.json()).then((d) => { if (d.error) setErr(d.error); else setReview(d); }).catch((e) => setErr(e.message)).finally(() => setBusy(''));
  }
  function pullCmdb() {
    setBusy('cmdb'); setErr('');
    fetch(`${api}/api/intake/cmdb/pull`, { method: 'POST', headers: headers(), body: JSON.stringify({ system: 'servicenow', config: cmdb }) })
      .then((r) => r.json()).then((d) => {
        if (d.error) { setErr(d.error); return null; }
        // persist pulled apps + run cascade with their inventory linkage
        return fetch(`${api}/api/intake/apps/ingest`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, apps: d.applications || [] }) })
          .then((r2) => r2.json()).then((rv) => { if (rv.error) setErr(rv.error); else { setReview(rv); setCmdb(null); } });
      }).catch((e) => setErr(e.message)).finally(() => setBusy(''));
  }
  function validate(applicationId, processId, action, relationshipType) {
    fetch(`${api}/api/intake/apps/validate`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, applicationId, processId, action, relationshipType, decidedBy: 'intake user' }) })
      .then((r) => r.json()).then((d) => { if (!d.error) loadReview(); }).catch(() => {});
  }

  if (!review) return <div style={{ fontSize: 12, color: INK3, padding: '8px 0' }}>Loading process ↔ application mapping…</div>;
  const c = review.counts || {}, f = review.findings || {};

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* actions + coverage */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11.5, color: INK2 }}>
          <strong style={{ fontFamily: FONTS.mono }}>{c.mapped || 0}</strong>/<span style={{ fontFamily: FONTS.mono }}>{c.applications || 0}</span> apps mapped · <strong style={{ fontFamily: FONTS.mono }}>{c.pctMapped || 0}%</strong> of <span style={{ fontFamily: FONTS.mono }}>{c.processes || 0}</span> processes covered
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setCmdb(cmdb ? null : { instance: '', username: '', password: '', query: '' })} style={btn('#fff', INK)}>⤵ Pull from ServiceNow CMDB</button>
          <button onClick={runCascade} disabled={busy === 'map'} style={btn('#4f46e5', '#fff')}>{busy === 'map' ? 'Mapping…' : '✨ Run intelligent mapping'}</button>
        </div>
      </div>
      {err && <div style={{ color: TONE.bad, fontSize: 12 }}>{err}</div>}

      {/* CMDB connector form */}
      {cmdb && (
        <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, background: PANEL, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: INK, marginBottom: 8, fontFamily: FONTS.display }}>ServiceNow CMDB (read-only pull of cmdb_ci_appl + business-service links)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['instance', 'Instance URL (https://acme.service-now.com)'], ['username', 'Username'], ['password', 'Password / token'], ['query', 'sysparm_query (optional)']].map(([k, ph]) => (
              <input key={k} type={k === 'password' ? 'password' : 'text'} placeholder={ph} value={cmdb[k]} onChange={(e) => setCmdb(Object.assign({}, cmdb, { [k]: e.target.value }))}
                style={{ border: `1px solid ${HAIR}`, borderRadius: 7, padding: '7px 9px', fontSize: 12, outline: 'none', gridColumn: k === 'query' ? '1 / span 2' : 'auto' }} />
            ))}
          </div>
          <button onClick={pullCmdb} disabled={busy === 'cmdb' || !cmdb.instance} style={{ ...btn('#4f46e5', '#fff'), marginTop: 8, opacity: cmdb.instance ? 1 : 0.6 }}>{busy === 'cmdb' ? 'Pulling…' : 'Pull & map'}</button>
        </div>
      )}

      {/* gap findings */}
      {(f.uncoveredProcesses > 0 || f.orphanApps > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Finding tone="bad" title={`${f.uncoveredProcesses} process(es) with no application`} detail="Coverage holes — potential shadow IT or unmapped systems." items={(review.uncoveredProcesses || []).map((p) => p.name)} />
          <Finding tone="warn" title={`${f.orphanApps} orphan application(s)`} detail="Apps not mapped to any process — confirm ownership or retire." items={(review.orphanApps || []).map((a) => a.name)} />
        </div>
      )}

      {/* process-centric review */}
      <div style={{ display: 'grid', gap: 9 }}>
        {review.processes.map((p) => (
          <div key={p.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 10, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '9px 13px', background: PANEL, borderBottom: p.apps.length ? `1px solid ${HAIR}` : 'none' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: INK, fontFamily: FONTS.display }}>{p.name}{p.criticality ? <span style={{ fontSize: 10, color: INK3, fontFamily: FONTS.body }}> · {p.criticality}</span> : null}</span>
              <span style={{ fontSize: 10.5, color: p.apps.length ? INK3 : TONE.bad }}>{p.apps.length ? `${p.apps.length} app(s)` : 'no apps — coverage hole'}</span>
            </div>
            {p.apps.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderTop: `1px solid ${PANEL}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: INK, fontWeight: 600 }}>{a.name}
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: SRC[a.source] || INK3, borderRadius: 10, padding: '1px 7px', marginLeft: 7 }}>{a.source}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, fontFamily: FONTS.mono, color: confColor(a.confidence || 0), border: `1px solid ${HAIR}`, borderRadius: 10, padding: '1px 7px', marginLeft: 5 }}>{Math.round((a.confidence || 0) * 100)}%</span>
                    {a.status === 'validated' && <span style={{ fontSize: 9, fontWeight: 700, color: TONE.good, marginLeft: 6 }}>✓ validated</span>}
                  </div>
                  {a.rationale && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{a.rationale}</div>}
                </div>
                <select value={a.relationshipType || 'supporting'} onChange={(e) => validate(a.id, p.id, 'edit', e.target.value)} title="Relationship"
                  style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '4px 6px', fontSize: 10.5, color: INK2 }}>
                  <option value="primary">primary</option>
                  <option value="supporting">supporting</option>
                </select>
                {a.status !== 'validated' && <button onClick={() => validate(a.id, p.id, 'accept')} title="Accept" style={btn(TONE.good, '#fff', true)}>✓</button>}
                <button onClick={() => validate(a.id, p.id, 'reject')} title="Delete mapping" style={btn('#fff', TONE.bad, true)}>✕</button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: INK3 }}>Mappings are proposed by the 3-tier cascade (inventory → semantic → corroboration) and persist as the canonical process↔application join only after you validate. Low-confidence rows are listed first within each process.</div>
    </div>
  );
}

function Finding({ tone, title, detail, items }) {
  return (
    <div style={{ borderLeft: `4px solid ${TONE[tone]}`, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 9, padding: '9px 12px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>{title}</div>
      <div style={{ fontSize: 10.5, color: INK2, marginTop: 2 }}>{detail}</div>
      {items && items.length > 0 && <div style={{ fontSize: 10.5, color: INK3, marginTop: 4 }}>{items.slice(0, 8).join(' · ')}{items.length > 8 ? ` +${items.length - 8}` : ''}</div>}
    </div>
  );
}
const btn = (bg, fg, sq) => ({ background: bg, color: fg, border: `1px solid ${bg === '#fff' ? HAIR : bg}`, borderRadius: 7, padding: sq ? '5px 9px' : '7px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' });

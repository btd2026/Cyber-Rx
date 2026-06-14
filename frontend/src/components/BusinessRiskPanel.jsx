/**
 * BusinessRiskPanel — surfaces the linkage/assessment engine in the CISO
 * dashboard, making the deck's promises visible:
 *   - Unified framework scores      GET  /api/assessment/rollup   (+ POST /run)
 *   - Crown-jewel applications       GET  /api/risk/crown-jewels   (+ blast radius)
 *   - RTO bridge (process crit.)     GET  /api/risk/process-criticality
 *   - Top control gaps               GET  /api/risk/control-gaps
 *   - ATT&CK coverage by tactic      GET  /api/risk/attack-coverage
 *
 * Every figure traces to the function → process → application → control chain.
 */

import React, { useState, useEffect, useCallback } from 'react';
import WorkloadMixPanel from './WorkloadMixPanel';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc', NAVY = '#0f1b2d';
const GREEN = '#1f8a4c', AMBER = '#B07C2E', RED = '#C0392B', BLUE = '#1d4ed8';
const sc = (s) => (s >= 80 ? GREEN : s >= 50 ? AMBER : RED);
const tierColor = (t) => (Number(t) === 1 ? RED : Number(t) === 2 ? AMBER : INK3);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const Section = ({ title, hint, children, right }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</div>
        {hint && <div style={{ fontSize: 11, color: INK3, marginTop: 2 }}>{hint}</div>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

export default function BusinessRiskPanel(props) {
  const { token, orgId, api } = ctx(props);
  const [data, setData] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [blast, setBlast] = useState(null);

  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  const get = useCallback((path) => fetch(`${api}${path}${path.includes('?') ? '&' : '?'}org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.json()).catch(() => null), [api, orgId, headers]);

  const load = useCallback(() => {
    if (!orgId) { setError('No organization selected yet.'); return; }
    Promise.all([
      get('/api/assessment/rollup'), get('/api/risk/crown-jewels'), get('/api/risk/process-criticality'),
      get('/api/risk/control-gaps'), get('/api/risk/attack-coverage'),
    ]).then(([rollup, crown, procs, gaps, attack]) => {
      setData({ rollup: rollup && rollup.frameworks, crown: crown && crown.apps, procs: procs && procs.processes, gaps: gaps && gaps.gaps, attack });
    });
  }, [orgId, get]);

  useEffect(() => { load(); }, [load]);

  const runAssessment = () => {
    setBusy(true);
    fetch(`${api}/api/assessment/run`, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId }) })
      .then((r) => r.json()).then(() => load()).catch((e) => setError(e.message)).finally(() => setBusy(false));
  };
  const showBlast = (appId, name) => {
    setBlast({ name, loading: true });
    get(`/api/risk/blast-radius?app_id=${encodeURIComponent(appId)}`).then((b) => setBlast({ ...b, name }));
  };

  if (error) return <div style={{ padding: 16, color: RED, fontSize: 13 }}>{error}</div>;
  const fwName = (id) => ({ nist_csf_2: 'NIST CSF 2.0', nist_800_53_r5: 'NIST 800-53', cis_v8_1: 'CIS Controls' }[id] || id);

  return (
    <div>
      <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5, marginBottom: 16, maxWidth: 760 }}>
        Risk as business impact — every score traces the <strong>function → process → application → control</strong> chain, weighted by Tier and RTO. Automated and document evidence merged into one defensible result.
      </div>

      <WorkloadMixPanel orgId={orgId} authToken={token} apiUrl={api} />

      {/* Unified framework scores */}
      <Section title="Unified framework scores" hint="One assessment across frameworks (automated + document evidence merged)."
        right={<button onClick={runAssessment} disabled={busy} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 13px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Running…' : '↻ Run assessment'}</button>}>
        {!data.rollup ? <Empty text="Loading…" /> : !data.rollup.length ? <Empty text="No assessment yet — run it after evidence is in." /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
            {data.rollup.map((f) => (
              <div key={f.framework_id} style={{ border: `1px solid ${HAIR}`, borderTop: `3px solid ${sc(Number(f.avg_score))}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{fwName(f.framework_id)}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: sc(Number(f.avg_score)), lineHeight: 1.1, margin: '4px 0' }}>{f.avg_score}</div>
                <div style={{ fontSize: 10.5, color: INK2 }}>{f.met} met · {f.partially_met} partial · <span style={{ color: RED }}>{f.not_met} not met</span></div>
                <div style={{ fontSize: 9.5, color: INK3, marginTop: 2 }}>{f.reviewed} reviewed · {f.total} controls</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Crown jewels */}
      <Section title="Crown-jewel applications" hint="Ranked by inherited business criticality (Tier + RTO + Tier-1 processes). Click for blast radius.">
        {!data.crown ? <Empty text="Loading…" /> : !data.crown.length ? <Empty text="No applications crosswalked yet (Intake → Map Applications)." /> : (
          <div style={{ display: 'grid', gap: 6 }}>
            {data.crown.slice(0, 8).map((a) => (
              <button key={a.id} onClick={() => showBlast(a.id, a.name)} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '9px 13px', background: '#fff', cursor: 'pointer' }}>
                <span style={{ width: 30, fontSize: 15, fontWeight: 800, color: sc(a.score) }}>{a.score}</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{a.name}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: tierColor(a.tier), borderRadius: 4, padding: '2px 7px' }}>TIER {a.tier ?? '—'}</span>
                <span style={{ fontSize: 11, color: INK3 }}>RTO {a.rto || '—'}</span>
                <span style={{ fontSize: 10.5, color: BLUE }}>blast radius →</span>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* RTO bridge */}
      <Section title="RTO bridge — process criticality" hint="Processes by Tier and recovery objective, with how many apps support each.">
        {!data.procs ? <Empty text="Loading…" /> : !data.procs.length ? <Empty text="No processes yet (Intake → Process, or load a process inventory)." /> : (
          <div style={{ display: 'grid', gap: 4 }}>
            {data.procs.slice(0, 10).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '6px 11px', border: `1px solid ${HAIR}`, borderRadius: 6 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: tierColor(p.tier), borderRadius: 4, padding: '2px 7px' }}>T{p.tier ?? '—'}</span>
                <span style={{ flex: 1, color: INK, fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: INK3 }}>RTO {p.rto || '—'}</span>
                <span style={{ color: INK3 }}>{p.app_count} app{p.app_count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Control gaps + ATT&CK side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
        <Section title="Top control gaps" hint="Lowest-scoring controls first.">
          {!data.gaps ? <Empty text="Loading…" /> : !data.gaps.length ? <Empty text="No gaps — or run the assessment first." /> : (
            <div style={{ display: 'grid', gap: 5 }}>
              {data.gaps.slice(0, 8).map((g, i) => (
                <div key={i} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${sc(Number(g.score))}`, borderRadius: 6, padding: '7px 11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: INK }}>{g.requirement_id} <span style={{ color: INK3, fontWeight: 400 }}>{fwName(g.framework_id)}</span></span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sc(Number(g.score)) }}>{g.score} · {g.status}</span>
                  </div>
                  {g.gap && <div style={{ fontSize: 10.5, color: INK2, marginTop: 2 }}>{g.gap}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="ATT&CK coverage by tactic" hint="Weakest tactics first.">
          {!data.attack ? <Empty text="Loading…" /> : !data.attack.total ? <Empty text="No technique coverage yet (run a validation run)." /> : (
            <div>
              <div style={{ fontSize: 12, color: INK2, marginBottom: 6 }}>Overall <strong style={{ color: sc(data.attack.coveragePct) }}>{data.attack.coveragePct}%</strong> ({data.attack.covered}/{data.attack.total})</div>
              {(data.attack.tactics || []).slice(0, 8).map((t) => (
                <div key={t.tactic} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '3px 0' }}>
                  <span style={{ flex: 1, color: INK2 }}>{t.tactic}</span>
                  <div style={{ width: 80, height: 5, background: '#eef2f6', borderRadius: 3 }}><div style={{ width: `${t.coveragePct}%`, height: '100%', background: sc(t.coveragePct), borderRadius: 3 }} /></div>
                  <span style={{ width: 34, textAlign: 'right', color: sc(t.coveragePct), fontWeight: 700 }}>{t.coveragePct}%</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {blast && (
        <div onClick={() => setBlast(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.45)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px,92vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)', overflowY: 'auto', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Blast radius</div>
                <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color: INK }}>{blast.name}</h3>
              </div>
              <button onClick={() => setBlast(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer' }}>✕</button>
            </div>
            {blast.loading ? <div style={{ marginTop: 16, color: INK3, fontSize: 13 }}>Loading…</div> : (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <Stat label="Processes" value={blast.processCount} />
                  <Stat label="Tier-1" value={blast.tier1Count} color={RED} />
                  <Stat label="Tightest RTO" value={blast.tightestRto || '—'} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Affected functions</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {(blast.functions || []).map((f) => <span key={f.id} style={{ fontSize: 11, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 14, padding: '4px 10px', color: INK }}>{f.name}</span>)}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Affected processes</div>
                {(blast.processes || []).map((p) => (
                  <div key={p.id} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: tierColor(p.tier), borderRadius: 4, padding: '2px 6px' }}>T{p.tier ?? '—'}</span>
                    <span style={{ flex: 1, color: INK }}>{p.name}</span><span style={{ color: INK3 }}>{p.rto || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const Empty = ({ text }) => <div style={{ fontSize: 12, color: INK3, padding: '10px 0' }}>{text}</div>;
const Stat = ({ label, value, color }) => (
  <div><div style={{ fontSize: 20, fontWeight: 800, color: color || INK }}>{value}</div><div style={{ fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div></div>
);

/**
 * OsConsole — the "operating system" surface over the decision spine.
 * Six panels for the six backend subsystems:
 *   Track Record  — /api/forecast/accuracy   (Brier score + calibration curve)
 *   Actions       — /api/actuation           (closed-loop execution + verify)
 *   Allocate      — /api/allocation/optimize  (ROI-ranked spend + frontier)
 *   Simulate      — /api/simulate/what-if     (counterfactual chain-collapse)
 *   Operators     — /api/operators            (autonomous role-agents + mandates)
 *   Peers         — /api/outcomes/insights    (cross-tenant base rates)
 * These make the engine's track record, actuation, and economics visible —
 * the distinction from a GRC register.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, SUBTLE = COLORS.subtle;
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}
const mkHeaders = (orgId, token) => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; };

const TABS = [
  { id: 'track', label: 'Track Record' },
  { id: 'actions', label: 'Actions' },
  { id: 'allocate', label: 'Allocate' },
  { id: 'simulate', label: 'Simulate' },
  { id: 'operators', label: 'Operators' },
  { id: 'peers', label: 'Peers' },
];
const ROLES = ['CISO', 'CFO', 'CIO', 'CRO', 'CLO', 'Board'];

const card = { border: `1px solid ${HAIR}`, borderRadius: 12, background: '#fff', padding: 18, boxShadow: '0 1px 3px rgba(11,12,14,0.05)' };
const label = { fontSize: 9, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 };
const btn = (bg, on) => ({ background: on === false ? '#e6e6e6' : bg, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: on === false ? 'default' : 'pointer' });
const bigNum = (color) => ({ fontSize: 30, fontWeight: 800, color, fontFamily: FONTS.mono, lineHeight: 1.1 });

export default function OsConsole(props) {
  const { token, orgId, api } = ctx(props);
  const [tab, setTab] = useState('track');
  const headers = useCallback(() => mkHeaders(orgId, token), [orgId, token]);
  const shared = { api, orgId, headers };

  return (
    <div style={{ padding: '20px 26px', maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ marginBottom: 4, fontSize: 22, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>Operating System</div>
      <div style={{ fontSize: 12.5, color: INK2, marginBottom: 16, maxWidth: 760, lineHeight: 1.6 }}>
        The layer that makes CyberRX an operating system, not a register: a self-scoring forecast track record, closed-loop
        actuation that verifies the fix worked, capital allocation, counterfactual simulation, autonomous operators, and a
        cross-tenant outcome network.
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${HAIR}`, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? COLORS.accentText : 'transparent'}`,
            color: tab === t.id ? COLORS.accentText : INK2, fontWeight: 700, fontSize: 13, padding: '8px 12px', cursor: 'pointer', marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'track' && <TrackRecord {...shared} />}
      {tab === 'actions' && <Actions {...shared} />}
      {tab === 'allocate' && <Allocate {...shared} />}
      {tab === 'simulate' && <Simulate {...shared} />}
      {tab === 'operators' && <Operators {...shared} />}
      {tab === 'peers' && <Peers {...shared} />}
    </div>
  );
}

function useLoad(fn, deps) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(() => { setBusy(true); return fn().then((d) => { setData(d); setErr(null); return d; }).catch((e) => setErr(e.message)).finally(() => setBusy(false)); }, deps); // eslint-disable-line
  useEffect(() => { run(); }, [run]);
  return { data, err, busy, reload: run, setData };
}
const j = (api, path, headers, opts) => fetch(`${api}${path}`, { headers: headers(), ...(opts || {}) }).then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(new Error(e.error || 'Request failed')))));
const withOrg = (path, orgId) => `${path}${path.includes('?') ? '&' : '?'}org_id=${encodeURIComponent(orgId)}`;

// ---- Track Record: Brier + calibration -------------------------------------
function TrackRecord({ api, orgId, headers }) {
  const { data, err, busy, reload } = useLoad(() => j(api, withOrg('/api/forecast/accuracy', orgId), headers), [api, orgId]);
  const post = (path) => j(api, withOrg(path, orgId), headers, { method: 'POST', body: JSON.stringify({ org_id: orgId }) }).then(reload).catch(() => {});
  if (err) return <Err msg={err} />;
  if (!data) return <Loading />;
  const brierColor = data.brier == null ? INK3 : data.brier <= 0.15 ? COLORS.good : data.brier <= 0.25 ? COLORS.warn : COLORS.bad;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <Stat label="Brier score" value={data.brier == null ? '—' : data.brier} color={brierColor} sub="lower is better · 0.25 = coin flip" />
        <Stat label="Resolved" value={data.resolved} sub={`${data.pending} pending`} />
        <Stat label="Occurred" value={data.occurred} sub={`base rate ${data.baseRate == null ? '—' : data.baseRate + '%'}`} />
        <Stat label="Live vs modeled" value={`${data.brierBySource?.live ?? '—'} / ${data.brierBySource?.modeled ?? '—'}`} sub="Brier by signal source" />
      </div>
      <div style={card}>
        <div style={{ ...label, marginBottom: 4 }}>Interpretation</div>
        <div style={{ fontSize: 13, color: INK, lineHeight: 1.6 }}>{data.interpretation}</div>
      </div>
      <div style={card}>
        <div style={{ ...label, marginBottom: 10 }}>Calibration curve — predicted vs. observed</div>
        {(!data.calibration || !data.calibration.length) && <div style={{ fontSize: 12, color: INK3 }}>No resolved predictions yet. Snapshot the queue, then reconcile after the horizon elapses.</div>}
        {(data.calibration || []).map((b) => (
          <div key={b.range} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 78, fontSize: 11, color: INK2 }}>{b.range}</div>
            <div style={{ flex: 1, position: 'relative', height: 18, background: SUBTLE, borderRadius: 5 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${b.predicted}%`, background: '#8b93e0', borderRadius: 5, opacity: 0.5 }} />
              <div style={{ position: 'absolute', left: `calc(${b.observed}% - 1px)`, top: -2, bottom: -2, width: 2, background: COLORS.bad }} title={`observed ${b.observed}%`} />
            </div>
            <div style={{ width: 120, fontSize: 10.5, color: INK3 }}>pred {b.predicted}% · obs {b.observed}% (n={b.n})</div>
          </div>
        ))}
        <div style={{ fontSize: 10, color: INK3, marginTop: 6 }}>Bar = mean predicted probability; red line = observed frequency. Aligned = well-calibrated.</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => post('/api/forecast/snapshot')} style={btn(COLORS.accentText, !busy)}>Snapshot the queue</button>
        <button onClick={() => post('/api/forecast/reconcile')} style={btn('#0b0c0e', !busy)}>Reconcile elapsed</button>
      </div>
    </div>
  );
}

// ---- Actions: closed-loop actuation + verify -------------------------------
function Actions({ api, orgId, headers }) {
  const { data, err, reload } = useLoad(() => j(api, withOrg('/api/actuation', orgId), headers), [api, orgId]);
  const verify = (id) => j(api, withOrg(`/api/actuation/${id}/verify`, orgId), headers, { method: 'POST', body: JSON.stringify({ org_id: orgId }) }).then(reload).catch(() => {});
  if (err) return <Err msg={err} />;
  if (!data) return <Loading />;
  const acts = data.actuations || [];
  const statusColor = (s) => s === 'verified' ? COLORS.good : s === 'unverified' ? COLORS.warn : INK2;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.6 }}>
        Every executed decision option and whether telemetry has <strong>verified</strong> the residual-risk drop. Actuations are
        created from the decision queue (per-card “Actuate &amp; verify”) or by the autonomous operators. A dispatch with no
        connected tool is flagged <em>simulated</em> — the loop never claims a fix shipped on assertion alone.
      </div>
      {acts.length === 0 && <div style={{ ...card, fontSize: 12.5, color: INK3 }}>No actuations yet. Actuate a decision from a role’s Decisions tab, or run the operators.</div>}
      {acts.map((a) => (
        <div key={a.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{a.action}</div>
              <div style={{ fontSize: 11, color: INK3, marginTop: 3 }}>{a.actuator} · {a.channel} · ref {a.external_ref}{a.simulated ? ' · simulated' : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: statusColor(a.status), textTransform: 'uppercase', letterSpacing: '0.04em' }}>{a.status}</div>
              {a.post_residual_risk != null
                ? <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>{usd(a.pre_residual_risk)} → <strong style={{ color: COLORS.good }}>{usd(a.post_residual_risk)}</strong> (−{usd(a.verified_delta)})</div>
                : <div style={{ fontSize: 11, color: INK3, marginTop: 3 }}>residual {usd(a.pre_residual_risk)}</div>}
            </div>
          </div>
          {a.verification_note && <div style={{ fontSize: 11, color: INK2, marginTop: 8, lineHeight: 1.5 }}>{a.verification_note}</div>}
          {a.status !== 'verified' && <button onClick={() => verify(a.id)} style={{ ...btn(COLORS.accentText), marginTop: 10 }}>Re-read telemetry &amp; verify</button>}
        </div>
      ))}
    </div>
  );
}

// ---- Allocate: ROI-ranked spend + frontier ---------------------------------
function Allocate({ api, orgId, headers }) {
  const [budget, setBudget] = useState(2000000);
  const { data, err, busy, reload } = useLoad(() => j(api, withOrg(`/api/allocation/optimize?budget=${budget}`, orgId), headers), [api, orgId]); // eslint-disable-line
  if (err) return <Err msg={err} />;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: INK2 }}>Budget</span>
        <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: 160, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, fontFamily: FONTS.mono }} />
        <button onClick={reload} style={btn(COLORS.accentText, !busy)}>Optimize</button>
      </div>
      {!data ? <Loading /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            <Stat label="Funded" value={`${data.funded}/${data.funded + (data.unfundedItems || []).length}`} sub="actions" />
            <Stat label="Spend" value={usd(data.totalSpend)} />
            <Stat label="Risk removed" value={usd(data.totalRiskReduced)} color={COLORS.good} />
            <Stat label="Coverage" value={data.coverage == null ? '—' : data.coverage + '%'} sub="of reducible risk" />
          </div>
          <div style={{ ...card }}>
            <div style={{ ...label, marginBottom: 4 }}>Plan</div>
            <div style={{ fontSize: 13, color: INK, lineHeight: 1.6 }}>{data.narrative}</div>
          </div>
          <div style={card}>
            <div style={{ ...label, marginBottom: 10 }}>Efficient frontier — cumulative risk removed per dollar</div>
            {(data.frontier || []).map((f, i) => {
              const max = data.frontier[data.frontier.length - 1].riskReduced || 1;
              const funded = i < data.funded;
              return (
                <div key={f.cardId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 70, fontSize: 10.5, color: INK3, fontFamily: FONTS.mono }}>{usd(f.spend)}</div>
                  <div style={{ flex: 1, height: 14, background: SUBTLE, borderRadius: 4 }}>
                    <div style={{ width: `${Math.round((f.riskReduced / max) * 100)}%`, height: '100%', background: funded ? COLORS.good : '#c9ccd1', borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 90, fontSize: 10.5, color: INK3, fontFamily: FONTS.mono }}>{usd(f.riskReduced)}</div>
                </div>
              );
            })}
            <div style={{ fontSize: 10, color: INK3, marginTop: 6 }}>Green = funded within budget. The knee of the curve is where marginal ROI drops.</div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Simulate: counterfactual what-if --------------------------------------
function Simulate({ api, orgId, headers }) {
  const { data: q, err } = useLoad(() => j(api, withOrg('/api/decisions', orgId), headers), [api, orgId]);
  const [fix, setFix] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  if (err) return <Err msg={err} />;
  if (!q) return <Loading />;
  const cards = q.cards || [];
  const run = () => {
    const fixIds = Object.keys(fix).filter((k) => fix[k]);
    setBusy(true);
    j(api, withOrg('/api/simulate/what-if', orgId), headers, { method: 'POST', body: JSON.stringify({ org_id: orgId, fix: fixIds }) })
      .then(setResult).catch(() => {}).finally(() => setBusy(false));
  };
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.6 }}>Pick risks to hypothetically fix. The engine recomputes the portfolio and shows which compound chains <strong>collapse</strong> when a shared link breaks — something a register can’t do.</div>
      <div style={card}>
        <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {cards.filter((c) => c.type !== 'compound').map((c) => (
            <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: INK, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!fix[c.id]} onChange={(e) => setFix((p) => ({ ...p, [c.id]: e.target.checked }))} />
              <span style={{ flex: 1 }}>{c.event.title}</span>
              <span style={{ fontSize: 11, color: INK3, fontFamily: FONTS.mono }}>{usd(c.event.loss?.expected)}</span>
            </label>
          ))}
        </div>
        <button onClick={run} style={{ ...btn(COLORS.accentText, !busy), marginTop: 12 }}>Run what-if</button>
      </div>
      {result && (
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 12 }}>
            <Stat label="Expected loss" value={`${usd(result.before.expectedLoss)} → ${usd(result.after.expectedLoss)}`} />
            <Stat label="Loss removed" value={usd(result.lossReduced)} color={COLORS.good} />
            <Stat label="Above appetite" value={`${result.before.aboveAppetite} → ${result.after.aboveAppetite}`} />
            <Stat label="Spend / ROI" value={`${usd(result.spend)}${result.roi ? ` · ${result.roi}×` : ''}`} />
          </div>
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.6, marginBottom: result.collapsedChains?.length ? 10 : 0 }}>{result.narrative}</div>
          {(result.collapsedChains || []).map((c) => (
            <div key={c.id} style={{ fontSize: 12, color: '#7c3aed', background: '#f5f0fd', border: '1px solid #e3d5f5', borderRadius: 8, padding: '8px 11px', marginTop: 6 }}>
              ⛓ Chain collapses: <strong>{c.title}</strong> (removes {usd(c.loss)})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Operators: autonomous role-agents + mandates --------------------------
function Operators({ api, orgId, headers }) {
  const { data, err, reload } = useLoad(() => j(api, withOrg('/api/operators/runs', orgId), headers), [api, orgId]);
  const [tickResult, setTickResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const tick = () => { setBusy(true); j(api, withOrg('/api/operators/tick', orgId), headers, { method: 'POST', body: JSON.stringify({ org_id: orgId }) }).then((r) => { setTickResult(r); reload(); }).catch(() => {}).finally(() => setBusy(false)); };
  if (err) return <Err msg={err} />;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.6 }}>Standing per-role operators tick their decision queue, act within a mandate (autonomy + spend cap), and escalate above it. Every action is logged to the tamper-evident ledger.</div>
      <MandateEditor api={api} orgId={orgId} headers={headers} />
      <button onClick={tick} style={btn(COLORS.accentText, !busy)}>Run all operators now</button>
      {tickResult && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 6 }}>Last heartbeat</div>
          <div style={{ fontSize: 13, color: INK }}>Drafted <strong>{tickResult.totals.drafted}</strong> · Acted <strong style={{ color: COLORS.good }}>{tickResult.totals.acted}</strong> · Escalated <strong style={{ color: COLORS.warn }}>{tickResult.totals.escalated}</strong>{tickResult.forecast?.snapshot ? ` · ${tickResult.forecast.snapshot.recorded} forecasts recorded` : ''}</div>
        </div>
      )}
      <div style={card}>
        <div style={{ ...label, marginBottom: 10 }}>Recent runs</div>
        {(!data || !(data.runs || []).length) && <div style={{ fontSize: 12, color: INK3 }}>No runs yet.</div>}
        {(data?.runs || []).map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 12, fontSize: 11.5, color: INK2, padding: '5px 0', borderBottom: `1px solid ${SUBTLE}` }}>
            <span style={{ width: 54, fontWeight: 700, color: INK }}>{r.role}</span>
            <span>considered {r.considered}</span><span>acted {r.acted}</span><span>escalated {r.escalated}</span>
            <span style={{ marginLeft: 'auto', color: INK3 }}>{new Date(r.ran_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MandateEditor({ api, orgId, headers }) {
  const [role, setRole] = useState('CISO');
  const { data, reload, setData } = useLoad(() => j(api, withOrg(`/api/operators/mandate/${role}`, orgId), headers), [api, orgId, role]);
  const save = () => j(api, withOrg(`/api/operators/mandate/${role}`, orgId), headers, { method: 'PUT', body: JSON.stringify({ org_id: orgId, autonomy: data.autonomy, costCap: data.costCap, enabled: data.enabled }) }).then(reload).catch(() => {});
  return (
    <div style={card}>
      <div style={{ ...label, marginBottom: 10 }}>Mandate</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={sel}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        {data && <>
          <select value={data.autonomy} onChange={(e) => setData({ ...data, autonomy: e.target.value })} style={sel}>
            <option value="observe">observe</option><option value="draft">draft</option><option value="act">act</option>
          </select>
          <label style={{ fontSize: 12, color: INK2 }}>cap <input type="number" value={data.costCap} onChange={(e) => setData({ ...data, costCap: Number(e.target.value) })} style={{ width: 120, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 8px', fontFamily: FONTS.mono }} /></label>
          <label style={{ fontSize: 12, color: INK2, display: 'flex', gap: 5, alignItems: 'center' }}><input type="checkbox" checked={data.enabled} onChange={(e) => setData({ ...data, enabled: e.target.checked })} />enabled</label>
          <button onClick={save} style={btn('#0b0c0e')}>Save</button>
        </>}
      </div>
      <div style={{ fontSize: 10.5, color: INK3, marginTop: 8 }}>observe = watch only · draft = propose · act = auto-execute within the cap (never auto-accepts risk).</div>
    </div>
  );
}
const sel = { border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 8px', fontSize: 12, background: '#fff', color: INK };

// ---- Peers: cross-tenant outcome network -----------------------------------
function Peers({ api, orgId, headers }) {
  const { data, err, reload } = useLoad(() => j(api, withOrg('/api/outcomes/insights', orgId), headers), [api, orgId]);
  const contribute = () => j(api, withOrg('/api/outcomes/contribute', orgId), headers, { method: 'POST', body: JSON.stringify({ org_id: orgId }) }).then(reload).catch(() => {});
  if (err) return <Err msg={err} />;
  if (!data) return <Loading />;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.6 }}>Anonymized, consent-gated outcomes across comparable orgs (cohort = industry + size). No org identity is stored — only opaque cohort keys.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <Stat label="Cohort" value={data.cohort} />
        <Stat label="Base rate" value={data.baseRate == null ? '—' : data.baseRate + '%'} sub="how often it happened" />
        <Stat label="Observations" value={data.n} />
        <Stat label="Best control" value={data.topControl ? `${data.topControl.workedPct}%` : '—'} sub={data.topControl ? data.topControl.control : 'none yet'} />
      </div>
      <div style={{ ...card, fontSize: 12.5, color: INK2 }}>{data.caveat}</div>
      <button onClick={contribute} style={btn('#0b0c0e')}>Contribute my anonymized outcomes</button>
    </div>
  );
}

// ---- shared bits -----------------------------------------------------------
function Stat({ label: l, value, sub, color }) {
  return (
    <div style={card}>
      <div style={label}>{l}</div>
      <div style={{ ...bigNum(color || INK), marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: INK3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
const Loading = () => <div style={{ fontSize: 12.5, color: INK3, padding: 12 }}>Loading…</div>;
const Err = ({ msg }) => <div style={{ fontSize: 12.5, color: COLORS.bad, padding: 12 }}>{msg}</div>;

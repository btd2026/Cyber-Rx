/**
 * DecisionQueue — the cross-role "decisions, not dashboards" surface.
 * Every leader sees the SAME predicted events (one shared DecisionCard each),
 * rendered through their own lens, with structured response options (cost,
 * time-to-effect, residual-risk reduction, friction) and an "Accept & monitor"
 * action that requires a logged rationale. Decisions are written to the ledger.
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc', NAVY = '#0f1b2d';
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const FRIC = { None: '#1f8a4c', Low: '#1f8a4c', Medium: '#B07C2E', High: '#C0392B' };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const Pill = ({ text, color }) => (
  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{text}</span>
);

export default function DecisionQueue(props) {
  const role = props.role || 'CISO';
  const { token, orgId, api } = ctx(props);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    fetch(`${api}/api/decisions?role=${encodeURIComponent(role)}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setData(d); }).catch((e) => setErr(e.message));
  }, [api, orgId, role, headers]);
  useEffect(() => { load(); }, [load]);

  function decide(card, opt, rationale) {
    const action = opt.id === 'accept' ? 'accept' : 'select';
    fetch(`${api}/api/decisions/${encodeURIComponent(card.id)}/decision`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ org_id: orgId, role, action, optionId: opt.id, rationale: rationale || null, decidedBy: role, engineState: { event: card.event, options: card.options, recommended: card.recommended } }),
    }).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!ok) { setErr(j.error || 'Could not record decision.'); } else { setErr(null); load(); } })
      .catch((e) => setErr(e.message));
  }

  if (err && !data) return <div style={{ padding: 12, color: '#C0392B', fontSize: 12 }}>{err}</div>;
  if (!data) return <div style={{ fontSize: 12, color: INK3 }}>Building the decision queue…</div>;

  return (
    <div>
      <div style={{ background: NAVY, color: '#e6ecf5', borderRadius: 10, padding: '13px 16px', marginBottom: 14, fontSize: 12.5, lineHeight: 1.6 }}>
        These are the <strong style={{ color: '#9bc0ff' }}>same predicted events every executive sees</strong> — each rendered for the <strong>{role}</strong>. Pick a response, or accept &amp; monitor with a documented rationale. Every decision is logged.
      </div>
      {err && <div style={{ color: '#C0392B', fontSize: 12, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        {data.cards.map((card) => <Card key={card.id} card={card} role={role} onDecide={decide} />)}
      </div>
    </div>
  );
}

function Card({ card, role, onDecide }) {
  const e = card.event, lens = card.lens || {};
  const [accepting, setAccepting] = useState(false);
  const [rationale, setRationale] = useState('');
  const sev = SEV[e.severity] || '#B07C2E';
  const decided = card.decision;

  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 12, background: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
      {/* event + role lens header */}
      <div style={{ padding: '14px 16px', borderLeft: `5px solid ${sev}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#1d4ed8', background: '#eef4fb', border: '1px solid #cfe0f3', borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lens.framing || role} lens</span>
              <Pill text={e.severity} color={sev} />
              {decided && <Pill text={decided.action === 'accept' ? 'Accepted & monitoring' : 'Decided'} color="#1f8a4c" />}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginTop: 7, lineHeight: 1.3 }}>{lens.headline || e.title}</div>
            <div style={{ fontSize: 11, color: INK3, marginTop: 2 }}>Event: {e.title}</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 130 }}>
            {lens.primary && <><div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lens.primary.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: sev }}>{lens.primary.value}</div></>}
            {lens.secondary && <div style={{ fontSize: 10.5, color: INK2, marginTop: 2 }}>{lens.secondary.label}: <strong>{lens.secondary.value}</strong></div>}
          </div>
        </div>
        {lens.narrative && <div style={{ fontSize: 12, color: INK2, marginTop: 8, lineHeight: 1.55 }}>{lens.narrative}</div>}
        {lens.questionToAsk && <div style={{ fontSize: 11.5, color: '#7c3aed', fontWeight: 600, marginTop: 6 }}>Question to ask: {lens.questionToAsk}</div>}
      </div>

      {/* shared event facts — same for every role */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '10px 16px', background: PANEL, borderTop: `1px solid ${HAIR}`, fontSize: 11 }}>
        <span title={e.timing.basis}>Exploit likelihood (modeled · {e.timing.confidence} conf): <strong>{e.timing.p7}%</strong>/7d · <strong>{e.timing.p30}%</strong>/30d · <strong>{e.timing.p90}%</strong>/90d</span>
        <span>Loss: P50 <strong>{usd(e.loss.p50)}</strong> · P90 <strong style={{ color: '#C0392B' }}>{usd(e.loss.p90)}</strong></span>
      </div>
      <div style={{ padding: '8px 16px', fontSize: 10.5, color: INK3 }}>
        Attack path: {e.attackPath.map((s) => s.label).join('  →  ')}
      </div>

      {/* options — the shared contract */}
      <div style={{ padding: '6px 16px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 9 }}>
          {card.options.map((o) => {
            const isRec = o.id === card.recommended;
            const isChosen = decided && decided.optionId === o.id;
            return (
              <div key={o.id} style={{ border: `1px solid ${isChosen ? '#1f8a4c' : isRec ? '#4f46e5' : HAIR}`, borderRadius: 9, padding: '10px 12px', background: isChosen ? '#f0f7f2' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{o.label}</span>
                  {isRec && !decided && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: '#4f46e5', borderRadius: 999, padding: '2px 7px', textTransform: 'uppercase' }}>Rec</span>}
                </div>
                <div style={{ display: 'grid', gap: 2, marginTop: 7, fontSize: 10.5, color: INK2 }}>
                  <div>Cost <strong style={{ color: INK }}>{o.costLabel}</strong></div>
                  <div>Time to effect <strong style={{ color: INK }}>{o.timeToEffectDays}d</strong></div>
                  <div>Residual risk <strong style={{ color: o.residualRiskReductionPct >= 60 ? '#1f8a4c' : INK }}>−{o.residualRiskReductionPct}%</strong></div>
                  <div>Friction <strong style={{ color: FRIC[o.friction] || INK }}>{o.friction}</strong></div>
                </div>
                {o.note && <div style={{ fontSize: 10, color: INK3, marginTop: 6, lineHeight: 1.4 }}>{o.note}</div>}
                {!decided && (o.acceptsRationale
                  ? <button onClick={() => setAccepting(!accepting)} style={btn(INK3)}>Accept &amp; monitor…</button>
                  : <button onClick={() => onDecide(card, o)} style={btn(isRec ? '#4f46e5' : '#0f172a')}>Choose</button>)}
              </div>
            );
          })}
        </div>

        {accepting && !decided && (
          <div style={{ marginTop: 10, border: `1px solid ${HAIR}`, borderRadius: 9, padding: '10px 12px', background: PANEL }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 6 }}>Document why you're accepting this risk (required, logged)</div>
            <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} placeholder="Business justification, compensating factors, and review date…"
              style={{ width: '100%', border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'vertical' }} />
            <button onClick={() => onDecide(card, card.options.find((x) => x.id === 'accept'), rationale)} disabled={!rationale.trim()}
              style={{ ...btn('#1f8a4c'), opacity: rationale.trim() ? 1 : 0.5, marginTop: 8 }}>Record acceptance</button>
          </div>
        )}

        {decided && (
          <div style={{ marginTop: 10, fontSize: 11, color: INK2, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 8, padding: '8px 12px' }}>
            <strong style={{ color: '#1f8a4c' }}>Logged:</strong> {decided.action === 'accept' ? 'Accepted & monitoring' : 'Option selected'} by {decided.decidedBy || role}{decided.rationale ? ` — "${decided.rationale}"` : ''} ({new Date(decided.at).toLocaleString()}).
          </div>
        )}
      </div>
    </div>
  );
}

const btn = (bg) => ({ marginTop: 9, width: '100%', background: bg, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' });

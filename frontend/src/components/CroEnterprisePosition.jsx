/**
 * CroEnterprisePosition — CRO Sub-tab 1: Enterprise Risk Position (Current State).
 * Cyber normalized into the enterprise risk portfolio beside other categories,
 * plotted on a likelihood × impact heatmap against the centrally-AUTHORED appetite
 * bands, with what-changed, a brief + voice, and visibility confidence. The
 * appetite editor here is the single source — saving propagates to every lens.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS, HERO_BG } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, NAVY = COLORS.navy1;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const bandColor = (b) => (b === 'Above appetite' ? TONE.bad : b === 'At appetite' ? TONE.warn : TONE.good);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CroEnterprisePosition(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  const load = useCallback(() => {
    fetch(`${api}/api/cro/position?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Composing the enterprise risk position…</div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: HERO_BG, color: '#e6ecf5', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>{d.provenance && <Provenance prov={d.provenance} dark />}<span>{d.brief}</span></div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration || d.brief)} label="Listen" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
        {/* heatmap */}
        <Panel title="Enterprise risk heatmap (likelihood × impact vs appetite)">
          <Heatmap categories={d.categories} tolerance={d.tolerance} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: INK3, flexWrap: 'wrap' }}>
            <Legend c={TONE.good} t="Within appetite" /><Legend c={TONE.warn} t="At appetite" /><Legend c={TONE.bad} t="Above appetite" />
          </div>
        </Panel>
        {/* category list */}
        <Panel title="Risk categories">
          <div style={{ display: 'grid', gap: 7 }}>
            {d.categories.map((c) => (
              <div key={c.name} style={{ borderLeft: `4px solid ${bandColor(c.band)}`, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{c.name}{c.modeled ? <span style={{ fontSize: 9, color: INK3, fontWeight: 500 }}> · modeled</span> : null}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: bandColor(c.band) }}><span style={{ fontFamily: FONTS.mono }}>{c.score}</span> · {c.band}</span>
                </div>
                <div style={{ fontSize: 10.5, color: INK2, marginTop: 2 }}>L{c.likelihood} × I{c.impact} — {c.basis}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* appetite authoring */}
      <AppetiteEditor api={api} orgId={orgId} headers={headers} appetite={d.appetite} onSaved={load} />

      {/* what changed */}
      <Panel title="What changed">
        <div style={{ display: 'grid', gap: 6 }}>
          {d.whatChanged.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12, color: INK2 }}>
              <span style={{ color: w.dir === 'up' ? TONE.good : w.dir === 'down' ? TONE.bad : INK3, fontWeight: 800 }}>{w.dir === 'up' ? '▲' : w.dir === 'down' ? '▼' : '▬'}</span>
              <span>{w.text}</span>
            </div>
          ))}
        </div>
      </Panel>

      {d.visibility && (
        <Panel title="Visibility confidence">
          <div style={{ fontSize: 12, color: INK2 }}>Overall <strong style={{ color: INK }}>{d.visibility.overall || d.visibility.band}</strong>{d.visibility.caveat ? <span style={{ color: INK3 }}> — {d.visibility.caveat}</span> : null}</div>
        </Panel>
      )}
      <div style={{ fontSize: 10, color: INK3 }}>{d.note}</div>
    </div>
  );
}

const THRESHOLDS = ['Low', 'Medium', 'High', 'Critical'];
function AppetiteEditor({ api, orgId, headers, appetite, onSaved }) {
  const [a, setA] = useState(appetite);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setA(appetite); }, [appetite]);
  const num = (k, v) => setA(Object.assign({}, a, { [k]: Number(v) }));
  function save() {
    setBusy(true); setSaved(false);
    fetch(`${api}/api/cro/appetite`, { method: 'PUT', headers: headers(), body: JSON.stringify({ org_id: orgId, appetite: a }) })
      .then((r) => r.json()).then(() => { setSaved(true); onSaved && onSaved(); }).catch(() => {}).finally(() => setBusy(false));
  }
  return (
    <div style={{ border: `1px solid #cfe0f5`, borderRadius: 11, background: '#f4f8fe', padding: '13px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>⚖️ Central risk appetite — authored here</div>
        <div style={{ fontSize: 10.5, color: '#1d4ed8' }}>Saving propagates to every lens (CISO, CIO, CFO, Board).</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10, marginTop: 8 }}>
        <Field label="Risk threshold (above = breach)">
          <select value={a.riskThreshold} onChange={(e) => setA(Object.assign({}, a, { riskThreshold: e.target.value }))} style={inp}>
            {THRESHOLDS.map((t) => <option key={t} value={t}>{t}+</option>)}
          </select>
        </Field>
        <Field label="Max critical open"><input type="number" value={a.maxCriticalOpen ?? 0} onChange={(e) => num('maxCriticalOpen', e.target.value)} style={inp} /></Field>
        <Field label="Max high open"><input type="number" value={a.maxHighOpen ?? 3} onChange={(e) => num('maxHighOpen', e.target.value)} style={inp} /></Field>
        <Field label="Max overdue remediation"><input type="number" value={a.maxOverdueRemediation ?? 3} onChange={(e) => num('maxOverdueRemediation', e.target.value)} style={inp} /></Field>
        <Field label="Decision likelihood % (surface ≥)"><input type="number" value={a.decisionLikelihoodPct ?? 25} onChange={(e) => num('decisionLikelihoodPct', e.target.value)} style={inp} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
        <button onClick={save} disabled={busy} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save appetite'}</button>
        {saved && <span style={{ fontSize: 11.5, color: TONE.good, fontWeight: 600 }}>✓ Saved — now in effect across all lenses.</span>}
      </div>
    </div>
  );
}
const inp = { width: '100%', border: `1px solid ${HAIR}`, borderRadius: 7, padding: '7px 9px', fontSize: 12, outline: 'none', background: '#fff' };
function Field({ label, children }) { return <div><div style={{ fontSize: 10, color: INK2, marginBottom: 3 }}>{label}</div>{children}</div>; }

function Heatmap({ categories, tolerance }) {
  // 5×5 grid: impact rows (5 top → 1 bottom), likelihood cols (1 → 5).
  const at = {};
  categories.forEach((c) => { const k = `${c.likelihood}_${c.impact}`; (at[k] = at[k] || []).push(c); });
  const rows = [5, 4, 3, 2, 1];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 3 }}>
        {rows.map((imp) => (
          <React.Fragment key={imp}>
            <div style={{ fontSize: 9, color: INK3, alignSelf: 'center', textAlign: 'right', paddingRight: 4 }}>{imp === 5 ? 'Impact ▲' : imp}</div>
            {[1, 2, 3, 4, 5].map((lik) => {
              const score = lik * imp; const over = score > tolerance; const at60 = score >= tolerance * 0.6;
              const bg = over ? '#fbe4e0' : at60 ? '#fbf2e0' : '#eaf6ee';
              const here = at[`${lik}_${imp}`] || [];
              return (
                <div key={lik} style={{ aspectRatio: '1.6', minHeight: 30, background: bg, borderRadius: 4, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap', padding: 2 }}>
                  {here.map((c) => (
                    <span key={c.name} title={`${c.name} (${c.score})`} style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: c.name === 'Cyber' ? '#0f172a' : bandColor(c.band), borderRadius: 999, padding: '1px 6px', whiteSpace: 'nowrap' }}>{c.name === 'Cyber' ? 'CYBER' : c.name.split(' ')[0].slice(0, 4)}</span>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
        <div /><div style={{ gridColumn: '2 / span 5', fontSize: 9, color: INK3, textAlign: 'center', marginTop: 2 }}>Likelihood ▶ · appetite tolerance {tolerance}</div>
      </div>
    </div>
  );
}
function Panel({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}><div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 9, fontFamily: FONTS.display }}>{title}</div>{children}</div>;
}
const Legend = ({ c, t }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, background: c, borderRadius: 2, display: 'inline-block' }} />{t}</span>;

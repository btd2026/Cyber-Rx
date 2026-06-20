/**
 * BusinessContext — org self-authoring of the business context every lens computes
 * against: crown jewels, the primary sensitive-data descriptor, risk appetite,
 * and the SEC materiality threshold. Replaces the inferred crown jewel. Opens
 * from the hero; reads/writes /api/business-context (propagates to all lenses).
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const THRESHOLDS = ['Critical', 'High', 'Medium', 'Low'];

export default function BusinessContext({ orgId, authToken, apiUrl }) {
  const [open, setOpen] = useState(false);
  const [bc, setBc] = useState(null);
  const [appetite, setAppetite] = useState('High');
  const [matUSD, setMatUSD] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (authToken) h.Authorization = `Bearer ${authToken}`; return h; }, [orgId, authToken]);

  useEffect(() => {
    if (!open) return;
    fetch(`${apiUrl}/api/business-context?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => {
        if (!j) return;
        const b = j.businessContext || {};
        setBc({ crownJewelData: b.crownJewelData || '', revenueUSD: b.revenueUSD || '', crownJewels: Array.isArray(b.crownJewels) ? b.crownJewels : [] });
        setAppetite((j.appetite && j.appetite.riskThreshold) || 'High');
        setMatUSD(j.materialityThresholdUSD == null ? '' : String(j.materialityThresholdUSD));
      }).catch(() => {});
  }, [open, apiUrl, orgId, headers]);

  const setCJ = (i, k, v) => setBc((s) => { const cj = s.crownJewels.slice(); cj[i] = { ...cj[i], [k]: v }; return { ...s, crownJewels: cj }; });
  const addCJ = () => setBc((s) => ({ ...s, crownJewels: [...s.crownJewels, { name: '', dataTypes: '', why: '' }] }));
  const rmCJ = (i) => setBc((s) => ({ ...s, crownJewels: s.crownJewels.filter((_, j) => j !== i) }));

  function save() {
    setBusy(true); setSaved(false);
    const body = {
      businessContext: { crownJewelData: bc.crownJewelData, revenueUSD: bc.revenueUSD === '' ? null : Number(bc.revenueUSD), crownJewels: bc.crownJewels.filter((c) => c.name && c.name.trim()) },
      appetite: { riskThreshold: appetite },
      materialityThresholdUSD: matUSD === '' ? null : Number(matUSD),
    };
    fetch(`${apiUrl}/api/business-context`, { method: 'PUT', headers: headers(), body: JSON.stringify(Object.assign({ org_id: orgId }, body)) })
      .then((r) => r.json()).then(() => { setSaved(true); }).catch(() => {}).finally(() => setBusy(false));
  }

  const inp = { border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <>
      <button onClick={() => setOpen(true)} title="Author crown jewels, appetite and materiality"
        style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid #2c4f7c', borderRadius: 6, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⚙ Business context</button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,15,28,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 16px', overflowY: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(640px, 96vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: INK }}>Business context</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: INK3, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: INK2, lineHeight: 1.5 }}>Author your own crown jewels and thresholds — these replace inferred defaults and propagate to every lens (Key Risks, attack paths, materiality, the decision spine).</p>
            {!bc ? <div style={{ fontSize: 12, color: INK3 }}>Loading…</div> : (
              <>
                <Label>Primary sensitive-data descriptor</Label>
                <input style={inp} placeholder="e.g. member PHI and claims data" value={bc.crownJewelData} onChange={(e) => setBc({ ...bc, crownJewelData: e.target.value })} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <Label nomargin>Crown jewels</Label>
                  <button onClick={addCJ} style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
                </div>
                {bc.crownJewels.length === 0 && <div style={{ fontSize: 11, color: INK3 }}>None yet — add the business processes/data an attacker would target.</div>}
                {bc.crownJewels.map((cj, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <input style={inp} placeholder="Name (e.g. Claims platform)" value={cj.name || ''} onChange={(e) => setCJ(i, 'name', e.target.value)} />
                    <input style={inp} placeholder="Data types (e.g. PHI)" value={cj.dataTypes || ''} onChange={(e) => setCJ(i, 'dataTypes', e.target.value)} />
                    <button onClick={() => rmCJ(i)} style={{ background: 'none', border: 'none', color: '#C0392B', fontSize: 16, cursor: 'pointer' }}>×</button>
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div>
                    <Label>Risk appetite (above this = above appetite)</Label>
                    <select style={inp} value={appetite} onChange={(e) => setAppetite(e.target.value)}>{THRESHOLDS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div>
                    <Label>SEC materiality threshold ($)</Label>
                    <input style={inp} type="number" placeholder="e.g. 1000000" value={matUSD} onChange={(e) => setMatUSD(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Label>Annual revenue ($, optional)</Label>
                  <input style={inp} type="number" placeholder="informs materiality framing" value={bc.revenueUSD} onChange={(e) => setBc({ ...bc, revenueUSD: e.target.value })} />
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
                  <button onClick={save} disabled={busy} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save business context'}</button>
                  {saved && <span style={{ fontSize: 11.5, color: '#1f8a4c', fontWeight: 700 }}>Saved · propagated to all lenses ✓</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Label({ children, nomargin }) {
  return <div style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, marginTop: nomargin ? 0 : 2 }}>{children}</div>;
}

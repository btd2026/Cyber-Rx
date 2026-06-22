/**
 * useCisoData — adapter binding the CISO seat to the real backend.
 *
 * Per the approved approach ("adapt existing fields / derive, labeled" + "bind the
 * framework explorer to /api/cae now"), this fetches the canonical endpoints the
 * legacy dashboards already use and RESHAPES their verified fields into the new
 * seat's panels. Values that are derived (not a direct field) carry note:'derived';
 * directly-bound values carry note:'live'. Anything with no real source stays absent
 * so the seat falls back to its marked-sample copy. Resilient + offline-safe.
 *
 * Sources (verified against existing consumers):
 *   GET /api/ciso/dashboard?role=CISO  → overallPosture{current,delta,trend},
 *       generatedAt, businessProcesses[], actionQueue[], attentionItems[],
 *       thresholds{breaches,critical,total}, readiness{overall,rating}
 *   GET /api/cae/assessment/summary    → control results (framework, control_id,
 *       status, score, confidence, evidence_source) for the framework explorer
 *   GET /api/ciso/coverage             → { pct, total, confidence } (provenance)
 */
import { useEffect, useState } from 'react';

export function apiCtx(props = {}) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

// protectionLevel (0–100) → business risk (inverted). Derived, labeled in UI.
function riskFromProtection(p) {
  if (typeof p !== 'number') return null;
  if (p >= 80) return { risk: 'Low', riskKind: 'pass' };
  if (p >= 60) return { risk: 'Medium', riskKind: 'exposure' };
  return { risk: 'High', riskKind: 'critical' };
}
const isCrit = (s) => /crit/i.test(String(s || ''));
function caeStatus(s) {
  const v = String(s || '').toLowerCase();
  if (/met|pass|compl/.test(v)) return 'Met';
  if (/partial|progress/.test(v)) return 'Partial';
  return 'Gap';
}

export function useCisoData(props = {}) {
  const { token, orgId, api } = apiCtx(props);
  const [d, setD] = useState(null);
  const [cae, setCae] = useState(null);
  const [cov, setCov] = useState(null);

  useEffect(() => {
    let alive = true;
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    const q = `org_id=${encodeURIComponent(orgId)}`;
    const grab = (path, set) => fetch(`${api}${path}${path.includes('?') ? '&' : '?'}${q}`, { headers: h })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j) set(j); }).catch(() => {});
    grab('/api/ciso/dashboard?role=CISO', setD);
    grab('/api/cae/assessment/summary', setCae);
    grab('/api/ciso/coverage', setCov);
    return () => { alive = false; };
  }, [api, orgId, token]);

  if (!d && !cae && !cov) return null;
  const out = {};

  // ---- live timestamp ------------------------------------------------------
  if (d && d.generatedAt) out.live = new Date(d.generatedAt);

  // ---- 6 metric tiles (label-keyed overrides) ------------------------------
  const tiles = {};
  if (d && d.overallPosture && typeof d.overallPosture.current !== 'undefined') {
    tiles['Overall posture'] = { value: String(d.overallPosture.current), note: 'live' };
  }
  if (d && Array.isArray(d.actionQueue) || (d && Array.isArray(d.attentionItems))) {
    const crit = [...(d.actionQueue || []), ...(d.attentionItems || [])].filter((a) => isCrit(a.severity)).length;
    tiles['Critical actions'] = { value: String(crit), valueKind: crit > 0 ? 'critical' : undefined, note: 'live' };
  }
  if (d && Array.isArray(d.attentionItems)) {
    tiles['Board attention'] = { value: String(d.attentionItems.length), note: 'live' };
  }
  if (d && d.overallPosture && typeof d.overallPosture.current === 'number') {
    const c = d.overallPosture.current;
    tiles['Risk exposure'] = { value: c >= 80 ? 'Low' : c >= 60 ? 'Medium' : 'High', note: 'derived' };
  }
  if (d && d.readiness && typeof d.readiness.overall !== 'undefined') {
    tiles['Operational resilience'] = { value: `${d.readiness.overall}%`, note: 'derived' };
  }
  if (cov && typeof cov.pct === 'number') {
    tiles['Regulatory readiness'] = { value: `${Math.round(cov.pct)}%`, note: 'derived' };
  }
  if (Object.keys(tiles).length) out.tiles = tiles;

  // ---- Material Exposure: process table (derived) --------------------------
  if (d && Array.isArray(d.businessProcesses) && d.businessProcesses.length) {
    out.processes = d.businessProcesses.map((bp) => {
      const r = riskFromProtection(bp.protectionLevel) || { risk: '—', riskKind: 'muted' };
      return {
        name: bp.name,
        risk: r.risk, riskKind: r.riskKind,
        trend: '—', trendKind: 'muted', // no per-process trend in source
        exposed: Array.isArray(bp.supportingSystems) ? bp.supportingSystems.join(' · ') : '—',
        derived: true,
      };
    });
  }

  // ---- Action Center: decisions (attention) + others (queue) ---------------
  if (d && Array.isArray(d.attentionItems) && d.attentionItems.length) {
    out.decisions = d.attentionItems.map((a) => ({
      sev: isCrit(a.severity) ? 'CRITICAL' : /high/i.test(String(a.severity)) ? 'HIGH' : String(a.severity || '').toUpperCase(),
      kind: isCrit(a.severity) ? 'critical' : 'exposure',
      title: a.title,
      owner: `Owner: ${a.owner || '—'}${a.decision ? ` → ${a.decision}` : ''}`,
    }));
  }
  if (d && Array.isArray(d.actionQueue) && d.actionQueue.length) {
    out.others = d.actionQueue.map((a) => ({
      task: a.action, owner: a.owner || '—', due: a.dueDate ? `Due ${a.dueDate}` : '—',
    }));
  }

  // ---- Framework explorer ← /api/cae assessment results --------------------
  // Find an array of control rows anywhere in the response (defensive — shape varies).
  const rows = (() => {
    if (!cae) return null;
    const cand = Array.isArray(cae) ? cae : (cae.results || cae.controls || cae.rows
      || (Array.isArray(cae.frameworks) ? cae.frameworks.flatMap((f) => f.controls || f.results || []) : null));
    return Array.isArray(cand) && cand.some((r) => r && (r.control_id || r.controlId)) ? cand : null;
  })();
  if (rows) {
    const byFw = {};
    rows.forEach((r) => {
      const fw = r.framework || r.framework_name || 'Controls';
      const id = r.control_id || r.controlId;
      (byFw[fw] = byFw[fw] || []).push({
        id, name: r.name || r.control_name || id, status: caeStatus(r.status),
        evidence: {
          source: r.evidence_source || r.source || '—',
          method: r.method || 'Automated control assessment',
          last: r.last_collected || r.collected_at || '—',
          result: `score ${r.score ?? '—'}/5 · ${r.confidence ?? '—'}% confidence`,
        },
      });
    });
    out.fw = {
      order: Object.keys(byFw),
      frameworks: Object.fromEntries(Object.entries(byFw).map(([name, controls]) => [name, {
        score: '—', trend: '→',
        // No function/category hierarchy in the source → one synthesized group.
        functions: [{ id: 'ASSESSED', name: 'Assessed controls', score: '—', trend: '→',
          categories: [{ id: 'ALL', name: 'Controls', controls }] }],
      }])),
    };
  }

  return Object.keys(out).length ? out : null;
}

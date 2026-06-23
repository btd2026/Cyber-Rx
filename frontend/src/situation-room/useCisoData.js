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
const sevKind = (s) => (isCrit(s) ? 'critical' : /high/i.test(String(s || '')) ? 'exposure' : /med/i.test(String(s || '')) ? 'exposure' : 'pass');
const statusKind = (s) => (s === 'red' ? 'critical' : s === 'amber' ? 'exposure' : 'pass');
const statusLabel = (s) => (s === 'red' ? 'Action required' : s === 'amber' ? 'Attention' : 'Within tolerance');
// CISO briefing rows map, in order, to the seat's tabs after Exec Summary.
const CISO_BRIEFING_TO = ['operational', 'material-exposure', 'action-center', 'trajectory', 'response-investment'];
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const tierRisk = (t) => { const n = Number(t); if (n === 1) return { risk: 'High', riskKind: 'critical' }; if (n === 2) return { risk: 'Medium', riskKind: 'exposure' }; if (n >= 3) return { risk: 'Low', riskKind: 'pass' }; return { risk: '—', riskKind: 'muted' }; };
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
  const [brief, setBrief] = useState(null);   // GET /api/agents/briefs/ciso
  const [kq, setKq] = useState(null);         // GET /api/agents/key-questions/ciso
  const [sig, setSig] = useState(null);       // GET /api/exec/signals
  const [inc, setInc] = useState(null);       // GET /api/exec/incident
  const [pc, setPc] = useState(null);         // GET /api/risk/process-criticality
  const [ac, setAc] = useState(null);         // GET /api/risk/attack-coverage
  const [pf, setPf] = useState(null);         // GET /api/projects/portfolio
  const [met, setMet] = useState(null);       // GET /api/metrics/ciso

  useEffect(() => {
    let alive = true;
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    const q = `org_id=${encodeURIComponent(orgId)}`;
    const grab = (path, set) => fetch(`${api}${path}${path.includes('?') ? '&' : '?'}${q}`, { headers: h })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j) set(j); }).catch(() => {});
    grab('/api/ciso/dashboard?role=CISO', setD);
    grab('/api/cae/assessment/summary', setCae);
    grab('/api/ciso/coverage', setCov);
    grab('/api/agents/briefs/ciso', setBrief);
    grab('/api/agents/key-questions/ciso', setKq);
    grab('/api/exec/signals', setSig);
    grab('/api/exec/incident', setInc);
    grab('/api/risk/process-criticality', setPc);
    grab('/api/risk/attack-coverage', setAc);
    grab('/api/projects/portfolio', setPf);
    grab('/api/metrics/ciso', setMet);
    return () => { alive = false; };
  }, [api, orgId, token]);

  if (!d && !cae && !cov && !brief && !kq && !sig && !inc && !pc && !ac && !pf && !met) return null;
  const out = {};

  // ---- live timestamp ------------------------------------------------------
  if (d && d.generatedAt) out.live = new Date(d.generatedAt);
  else if (sig && sig.generatedAt) out.live = new Date(sig.generatedAt);

  // ---- provenance (for the trust strip) ------------------------------------
  if (cov && (typeof cov.pct === 'number' || cov.total != null)) {
    out.provenance = { coverage: cov.pct, signals: cov.total, confidence: cov.confidence };
  }

  // ---- Exec Summary verdict + status + lede ← /api/agents/briefs/ciso -------
  if (brief && brief.headline) {
    out.brief = {
      verdict: brief.headline,
      lede: brief.summary || null,
      pill: statusLabel(brief.status),
      pillKind: statusKind(brief.status),
      actions: Array.isArray(brief.actions) ? brief.actions : [],
      note: 'live',
    };
  }

  // ---- Briefing rows ← /api/agents/key-questions/ciso ----------------------
  const cards = (kq && (kq.cards || kq.questions)) || null;
  if (Array.isArray(cards) && cards.length) {
    out.briefing = cards.slice(0, CISO_BRIEFING_TO.length).map((c, i) => ({
      q: c.question, a: c.answer, pill: c.severity || '', kind: sevKind(c.severity),
      to: CISO_BRIEFING_TO[i] || 'operational',
    }));
  }

  // ---- Live platform signals ← /api/exec/signals (Operational evidence) ----
  if (sig && Array.isArray(sig.signals)) {
    out.signals = { items: sig.signals, generatedAt: sig.generatedAt };
  }

  // ---- The running incident ← /api/exec/incident (the shared spine) --------
  if (inc && inc.headline) out.incident = inc;

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

  // ---- Material Exposure processes ← /api/risk/process-criticality ---------
  const pcRows = pc && Array.isArray(pc.processes) ? pc.processes : null;
  if (pcRows && pcRows.length) {
    out.processes = pcRows.map((p) => {
      const r = tierRisk(p.tier);
      return {
        name: p.name, risk: r.risk, riskKind: r.riskKind, trend: '—', trendKind: 'muted',
        exposed: `Tier ${p.tier ?? '—'} · RTO ${p.rto ?? '—'}${p.app_count != null ? ` · ${p.app_count} apps` : ''}`,
        derived: true,
      };
    });
  }
  if (ac && typeof ac.coveragePct === 'number') out.coverage = ac.coveragePct;

  // ---- Response & Investment ← /api/projects/portfolio ---------------------
  if (pf && Array.isArray(pf.projects) && pf.projects.length) {
    out.roadmap = {
      projects: pf.projects.slice(0, 8).map((p) => ({
        name: p.name,
        status: p.status || (p.percentComplete != null ? `${p.percentComplete}%` : '—'),
        invest: p.budget != null ? usd(p.budget) : '—',
        ret: (p.analysis && p.analysis.postureLift != null) ? `+${p.analysis.postureLift} posture` : (p.expectedReturn || '—'),
        needs: /propos|hold|blocked|unfunded/i.test(p.status || ''),
      })),
      readiness: [
        { k: 'Committed (portfolio budget)', v: pf.totalBudget != null ? usd(pf.totalBudget) : '—' },
        { k: 'At-risk projects', v: pf.counts ? String(pf.counts.atRisk) : '—', kind: (pf.counts && pf.counts.atRisk) ? 'exposure' : 'pass' },
        { k: 'Projected posture lift', v: pf.totalLift != null ? `+${pf.totalLift}` : '—', kind: 'pass' },
      ],
    };
  }

  // ---- Current posture (live) ← /api/metrics/ciso (no time-series available) -
  const ps = met && met.metrics && (met.metrics.postureScore != null ? met.metrics.postureScore
    : (met.metrics.posture != null ? met.metrics.posture : null));
  if (ps != null) out.postureLive = ps;

  return Object.keys(out).length ? out : null;
}

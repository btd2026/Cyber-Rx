'use strict';

/**
 * EvidenceAdapterService — turns connector signals into control evidence.
 * ----------------------------------------------------------------------
 * Connectors (src/services/connectors/*) emit normalized signals like
 * { key:'mfa_pct', value:94, asOf:'...' }. Until now those landed only as
 * raw inputs/metrics; they never became *evidence* against framework
 * requirements. This adapter closes that gap:
 *
 *   1. Crosswalk  — each signal key maps to NIST CSF 2.0 requirement refs.
 *      The mapping is derived from the security-tool catalog
 *      (src/data/securityToolCatalog.js), which already declares
 *      `signal -> controls` per vendor API, unioned by signal key so it is
 *      vendor-independent, plus a few explicit additions for signals the
 *      catalog leaves unmapped.
 *   2. Policy     — each signal key has a directionality + thresholds that
 *      turn its numeric value into a met / partial / not_met verdict, a
 *      0–1 confidence, and a human-readable excerpt.
 *   3. Record     — for every (signal -> requirement) pair we call
 *      EvidenceLedgerService.recordForRequirement, which fans the verdict
 *      out to the mapped library controls and rolls up across every
 *      in-scope framework. Idempotent on a stable sourceRef.
 *
 * The result: connecting Okta/Sentinel/SailPoint/Tenable/etc. produces real,
 * dated, attributable evidence behind the exact requirements those tools
 * support — the same grain an auditor asks for.
 */

const ledger = require('./EvidenceLedgerService');
const { TOOLS } = require('../data/securityToolCatalog');

const FRAMEWORK = 'nist_csf_2'; // catalog control refs are NIST CSF 2.0

// --- 1. Signal -> CSF requirement refs ------------------------------------
// Union the catalog's per-API `signal -> controls` across every tool, keyed by
// signal so the mapping is vendor-independent (any connector emitting mfa_pct
// supports the same requirements). Then layer explicit additions for signals
// the catalog declares with signal:null but whose evidence value is clear.
function buildCrosswalk() {
  const map = {};
  const add = (signal, refs) => {
    if (!signal || !refs || !refs.length) return;
    const set = (map[signal] = map[signal] || new Set());
    refs.forEach((r) => set.add(r));
  };
  for (const tool of TOOLS || []) {
    for (const api of tool.apis || []) add(api.signal, api.controls);
  }
  // Explicit additions (catalog leaves these signal:null but the control is named).
  add('access_review_pct', ['PR.AA-05']); // SailPoint certification campaigns
  add('open_incidents', ['DE.AE-06', 'RS.MA-02']); // Sentinel open incident backlog
  // Freeze to plain arrays.
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
}

const SIGNAL_CONTROLS = buildCrosswalk();

// --- 2. Signal value -> verdict -------------------------------------------
// direction 'up'   : higher is better (coverage %, retention days)
// direction 'down' : lower is better  (latency hours, open backlog)
// met/partial are the thresholds; below partial (up) / above partial (down)
// is not_met. Units only drive the excerpt wording.
const PCT = { unit: '%' };
const SIGNAL_POLICY = {
  mfa_pct: { dir: 'up', met: 90, partial: 60, ...PCT },
  pam_pct: { dir: 'up', met: 90, partial: 60, ...PCT },
  edr_pct: { dir: 'up', met: 95, partial: 80, ...PCT },
  patch_pct: { dir: 'up', met: 90, partial: 70, ...PCT },
  vuln_sla_pct: { dir: 'up', met: 90, partial: 70, ...PCT },
  training_pct: { dir: 'up', met: 90, partial: 70, ...PCT },
  access_review_pct: { dir: 'up', met: 90, partial: 60, ...PCT },
  siem_days: { dir: 'up', met: 90, partial: 30, unit: ' days log retention' },
  mttd_hrs: { dir: 'down', met: 24, partial: 72, unit: 'h mean time to detect' },
  mttr_hrs: { dir: 'down', met: 8, partial: 24, unit: 'h mean time to respond' },
  open_incidents: { dir: 'down', met: 5, partial: 20, unit: ' open incidents' },
};

function verdict(policy, value) {
  if (policy.dir === 'up') return value >= policy.met ? 'met' : value >= policy.partial ? 'partial' : 'not_met';
  return value <= policy.met ? 'met' : value <= policy.partial ? 'partial' : 'not_met';
}

// Confidence: connected, machine-collected signals are high-trust but not
// absolute (sampling, scope). Slightly higher for a clean met/not_met than for
// a borderline partial.
function confidenceFor(status) {
  return status === 'partial' ? 0.8 : 0.9;
}

/**
 * Map one connector signal to an evidence verdict, or null if the signal has no
 * crosswalk or no policy (e.g. informational counts like priv_accts/endpoints).
 * Exposed for unit testing and previews.
 */
function evidenceForSignal(signal) {
  if (!signal || signal.key == null) return null;
  const refs = SIGNAL_CONTROLS[signal.key];
  const policy = SIGNAL_POLICY[signal.key];
  const value = Number(signal.value);
  if (!refs || !refs.length || !policy || !Number.isFinite(value)) return null;
  const status = verdict(policy, value);
  return {
    refs,
    status,
    confidence: confidenceFor(status),
    value,
    excerpt: `${Math.round(value * 10) / 10}${policy.unit}`,
  };
}

/**
 * Record ledger evidence for a connector's freshly-fetched signals.
 *
 * @param {string} orgId
 * @param {{connectorKey:string,label:string,signals:Array}} args
 * @returns {Promise<{recorded:number, perSignal:Array}>}
 */
async function recordSignals(orgId, { connectorKey, label, signals }) {
  if (!orgId || !connectorKey || !Array.isArray(signals)) {
    throw new Error('recordSignals requires orgId, connectorKey and a signals array');
  }
  let recorded = 0;
  const perSignal = [];
  for (const signal of signals) {
    const ev = evidenceForSignal(signal);
    if (!ev) { perSignal.push({ key: signal && signal.key, mapped: false }); continue; }
    let rows = 0;
    for (const requirementId of ev.refs) {
      const posted = await ledger.recordForRequirement(orgId, FRAMEWORK, requirementId, {
        status: ev.status,
        evidenceKind: 'connector',
        dimension: 'system',
        sourceRef: `connector:${connectorKey}:${signal.key}:${requirementId}`,
        excerpt: `${label || connectorKey}: ${ev.excerpt}`,
        confidence: ev.confidence,
        freshnessDate: signal.asOf || null,
      });
      rows += (posted && posted.length) || 0;
    }
    recorded += rows;
    perSignal.push({ key: signal.key, mapped: true, status: ev.status, requirements: ev.refs, ledgerRows: rows });
  }
  return { recorded, perSignal };
}

module.exports = {
  FRAMEWORK,
  SIGNAL_CONTROLS,
  SIGNAL_POLICY,
  evidenceForSignal,
  recordSignals,
};

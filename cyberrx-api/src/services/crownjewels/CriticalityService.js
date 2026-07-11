'use strict';

/**
 * CriticalityService — deterministic, EXPLAINABLE crown-jewel scoring (§2.4, §4).
 * Every score carries a per-factor breakdown and a plain-English rationale.
 * Pure functions; no LLM, no DB. Industry-agnostic.
 */

const cfg = require('../../config/criticality');

const PROC_CRIT = { critical: 1, high: 0.75, medium: 0.5, low: 0.25 };
function procCritValue(c) { return PROC_CRIT[String(c || '').toLowerCase()] != null ? PROC_CRIT[String(c || '').toLowerCase()] : 0.5; }

// Max data-sensitivity over an asset's classifications.
function dataSensitivity(classes) {
  const arr = Array.isArray(classes) ? classes : (classes ? [classes] : []);
  let best = 0;
  for (const d of arr) {
    const u = String(d).toUpperCase();
    let v = 0.2;
    if (/PHI|PCI|CLASSIFIED|CUI|SECRET|CREDENTIAL|IDENTITY/.test(u)) v = 1;
    else if (/FINANCIAL|PII|CARDHOLDER|REGULATED/.test(u)) v = 0.7;
    else if (/CONFIDENTIAL|IP|PROPRIETARY/.test(u)) v = 0.5;
    else if (/INTERNAL/.test(u)) v = 0.2;
    else if (/PUBLIC/.test(u)) v = 0;
    if (v > best) best = v;
  }
  return best;
}

function exposureValue(asset) {
  const e = String(asset.exposure || '').toLowerCase();
  if (e.includes('internet')) return 1;
  if (e.includes('internal')) return 0.3;
  // derive from hints when exposure not an explicit column (assets table stores
  // the host string in description/hostname).
  const hint = `${asset.environment || ''} ${asset.cloud_provider || ''} ${asset.description || ''} ${asset.hostname || ''} ${(asset.attributes && asset.attributes.host) || ''} ${asset.type || ''}`.toLowerCase();
  if (/internet|public|saas|cloud|aws|azure|gcp|api/.test(hint)) return 1;
  if (/on-?prem|internal|datacenter|lan/.test(hint)) return 0.3;
  return 0.5; // unknown
}

const TIERS = (s) => (s >= cfg.tier1 ? 'tier1' : s >= cfg.tier2 ? 'tier2' : s >= cfg.tier3 ? 'tier3' : 'none');

/**
 * @param {object} asset  { data_classification, exposure, attributes, type, ... }
 * @param {object} ctx    { processes: [{criticality}], isSpof: bool }
 * @returns {{score, breakdown, crown_jewel, crown_jewel_tier, rationale, factors}}
 */
// Whether a process counts as revenue-CONFIRMED. Backward-compatible: a process that carries no
// confirmation field at all is treated as confirmed (legacy callers pre-Phase-B), so only callers
// that pass the flag opt into gating. Explicit false => unconfirmed (provisional only).
function isConfirmed(p) {
  const v = (p && (p.criticality_confirmed !== undefined ? p.criticality_confirmed : p.confirmed));
  return v === undefined ? true : !!v;
}

// Score the process-criticality factors over a given set of processes.
function procFactors(procs) {
  const maxProc = procs.length ? Math.max(...procs.map((p) => procCritValue(p.criticality))) : 0;
  const criticalCount = procs.filter((p) => procCritValue(p.criticality) >= 0.75).length;
  const concentration = Math.min(1, criticalCount / Math.max(1, cfg.concentrationCap));
  return { maxProc, concentration };
}

/**
 * @param {object} asset  { data_classification, exposure, attributes, type, ... }
 * @param {object} ctx    { processes: [{criticality, criticality_confirmed?}], isSpof }
 * The GATE (spec §3): crown jewels derive ONLY from revenue-CONFIRMED processes. A jewel that would
 * qualify only on unconfirmed processes is returned crown_jewel:false + provisional:true, so it is
 * never propagated as a confirmed crown jewel in a production/report view.
 */
function scoreAsset(asset, ctx = {}) {
  const procs = ctx.processes || [];
  const confirmedProcs = procs.filter(isConfirmed);
  const data = dataSensitivity(asset.data_classification);
  const expo = exposureValue(asset);
  const spof = ctx.isSpof ? 1 : 0;
  const w = cfg.weights;

  // Authoritative score: process factors from CONFIRMED processes only.
  const pf = procFactors(confirmedProcs);
  const factors = { max_process_crit: pf.maxProc, process_concentration: pf.concentration, data_sensitivity: data, exposure: expo, spof };
  const breakdown = {
    max_process_crit: round(w.max_process_crit * pf.maxProc),
    process_concentration: round(w.process_concentration * pf.concentration),
    data_sensitivity: round(w.data_sensitivity * data),
    exposure: round(w.exposure * expo),
    spof: round(w.spof * spof),
  };
  const score = round(Object.values(breakdown).reduce((a, b) => a + b, 0));
  const crown = score >= cfg.crownJewelThreshold;
  const tier = crown ? TIERS(score) : 'none';

  // Provisional: would this become a crown jewel if the unconfirmed processes were confirmed?
  // Only meaningful when it is NOT already a confirmed crown jewel and some supporting process is
  // still unconfirmed.
  let provisional = false;
  let provisionalScore = score;
  const hasUnconfirmed = procs.length > confirmedProcs.length;
  if (!crown && hasUnconfirmed) {
    const pfAll = procFactors(procs);
    provisionalScore = round(
      w.max_process_crit * pfAll.maxProc + w.process_concentration * pfAll.concentration +
      w.data_sensitivity * data + w.exposure * expo + w.spof * spof
    );
    provisional = provisionalScore >= cfg.crownJewelThreshold;
  }

  return {
    score, factors, breakdown,
    crown_jewel: crown, crown_jewel_tier: tier,
    provisional, provisional_score: provisionalScore,
    rationale: rationale(asset, factors, score, { provisional }),
  };
}

function rationale(asset, f, score, opts = {}) {
  const bits = [];
  if (f.max_process_crit >= 0.75) bits.push('supports a mission-critical process');
  if (f.process_concentration >= 0.5) bits.push('many critical processes depend on it');
  if (f.data_sensitivity >= 0.7) bits.push('holds highly sensitive data');
  if (f.exposure >= 1) bits.push('internet-facing');
  if (f.spof >= 1) bits.push('single point of failure (no redundancy)');
  const head = bits.length ? bits.join('; ') : 'limited criticality drivers';
  const tail = opts.provisional
    ? ' — PROVISIONAL: would qualify once its revenue process is confirmed.'
    : '';
  return `${asset.name || asset.id}: ${head} — criticality ${Math.round(score * 100)}/100.${tail}`;
}

function round(x) { return Math.round(x * 1000) / 1000; }

module.exports = { scoreAsset, dataSensitivity, exposureValue, procCritValue, TIERS, isConfirmed };

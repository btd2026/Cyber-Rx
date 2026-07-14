'use strict';

/**
 * ContinuousAssessmentEngine — the honest three-axis engine, server side.
 * -----------------------------------------------------------------------
 * Complements the existing AssessmentEngine (which merges automated + document evidence into
 * a single status/score). This one adds what the scoring critique asked for and the other
 * lacks: an APPEND-ONLY evidence store, VERSIONED declarative rules, FRESHNESS/TTL decay,
 * COVERAGE denominators, RECOMPUTABILITY (replay as-of any date), and a crown-jewel-weighted,
 * weakest-link ROLLUP (never a simple average).
 *
 * Score axes, never collapsed into one number without the others:
 *   verdict (met/partial/not met/not assessed) · assurance (method→confidence) ·
 *   freshness (decays past TTL — expired ≠ passing) · coverage (observed vs known).
 */
const Rules = require('../data/assessmentRules');
const Evidence = require('./EvidenceStore');

const METHOD_TTL_DAYS = { live: 1, hybrid: 7, attestation: 365 };
const VERDICT_BASE = { met: 1, partial: 0.5, not_met: 0, not_assessed: 0 };
const FRESH_FACTOR = { healthy: 1, expiring: 0.85, expired: 0.5, none: 0 };

function daysBetween(a, b) { return (new Date(b).getTime() - new Date(a).getTime()) / 86400000; }

/** Freshness state from evidence age vs the method TTL. */
function freshness(method, collectedAt, asOf, ttlDays) {
  if (!collectedAt) return 'none';
  const age = daysBetween(collectedAt, asOf || new Date(collectedAt).toISOString());
  if (age > ttlDays) return 'expired';
  if (age > ttlDays * 0.75) return 'expiring';
  return 'healthy';
}

/** A control's 0–1 score — axes MULTIPLIED so weak evidence can't inflate it. */
function scoreControl(a) {
  const vb = VERDICT_BASE[a.verdict] != null ? VERDICT_BASE[a.verdict] : 0;
  const af = a.method === 'live' ? 1 : a.method === 'hybrid' ? 0.9 : a.method === 'attestation' ? 0.75 : 0;
  const ff = FRESH_FACTOR[a.freshness] != null ? FRESH_FACTOR[a.freshness] : 0;
  const cf = a.coveragePct != null ? a.coveragePct / 100 : 1;
  return vb * af * ff * cf;
}

/**
 * Assess one control AS-OF a date: read the latest evidence <= asOf and grade it under the
 * rule version in effect. Immutable evidence + versioned rules ⇒ this is fully recomputable.
 * An expired attestation drops to not_assessed (decayed evidence is not passing).
 */
async function assess(orgId, controlId, asOf, opts) {
  const at = asOf || new Date().toISOString();
  const ev = await Evidence.latest(orgId, controlId, at);
  if (!ev) return { controlId, verdict: 'not_assessed', assurance: 'unassessed', method: 'awaiting', freshness: 'none', coveragePct: null, ruleVersion: null, score: 0, confidence: 'none' };
  const method = ev.method || 'attestation';
  const ttl = METHOD_TTL_DAYS[method] != null ? METHOD_TTL_DAYS[method] : 365;
  const fr = freshness(method, ev.collected_at, at, ttl);
  const rule = Rules.ruleFor(controlId, opts && opts.ruleVersion);
  let verdict; let coveragePct = null; let rv = null;
  if (rule) { const r = Rules.evaluateRule(rule, ev.payload || {}); verdict = r.verdict; coveragePct = r.coveragePct; rv = r.ruleVersion; }
  else verdict = (ev.payload && (ev.payload.artifact_fresh || ev.payload.present)) ? 'met' : 'not_assessed';
  if (fr === 'expired') verdict = 'not_assessed';
  const assurance = method === 'live' ? 'machine-verified' : method === 'hybrid' ? 'machine-evidenced · human-confirmed' : 'attested';
  const a = { controlId, verdict, assurance, method, freshness: fr, coveragePct, ruleVersion: rv, collectedAt: ev.collected_at };
  a.score = scoreControl(a);
  a.confidence = method === 'live' ? 'high' : method === 'hybrid' ? 'medium' : (fr === 'healthy' ? 'low' : 'stale');
  return a;
}

/**
 * Roll up control → category → function → overall. Crown-jewel-weighted with a weakest-link
 * pull at category level; carries confidence (machine-verified share). NOT a simple average.
 * `weights` maps controlId → weight (default 1).
 */
function rollup(assessments, weights) {
  const w = weights || {};
  const byCat = {};
  assessments.forEach((a) => {
    const cat = String(a.controlId).split('-')[0];
    const fn = String(a.controlId).split('.')[0];
    (byCat[cat] = byCat[cat] || { fn, items: [] }).items.push({ score: a.score, weight: w[a.controlId] || 1, method: a.method });
  });
  const catScores = {}; const byFn = {};
  Object.keys(byCat).forEach((cat) => {
    const it = byCat[cat].items;
    const wsum = it.reduce((s, x) => s + x.weight, 0);
    const wavg = wsum ? it.reduce((s, x) => s + x.score * x.weight, 0) / wsum : 0;
    const crown = it.filter((x) => x.weight > 1);
    const weakest = crown.length ? Math.min.apply(null, crown.map((x) => x.score)) : wavg;
    const score = (weakest < 0.5) ? (wavg + weakest) / 2 : wavg;
    catScores[cat] = { fn: byCat[cat].fn, score, wavg, weakest, weight: wsum };
    (byFn[byCat[cat].fn] = byFn[byCat[cat].fn] || []).push(catScores[cat]);
  });
  const fnScores = {};
  Object.keys(byFn).forEach((fn) => {
    const cs = byFn[fn]; const wsum = cs.reduce((s, c) => s + c.weight, 0);
    fnScores[fn] = { score: wsum ? cs.reduce((s, c) => s + c.score * c.weight, 0) / wsum : 0, weight: wsum };
  });
  const fw = Object.keys(fnScores).reduce((s, f) => s + fnScores[f].weight, 0);
  const overall = fw ? Object.keys(fnScores).reduce((s, f) => s + fnScores[f].score * fnScores[f].weight, 0) / fw : 0;
  let mvW = 0; let totW = 0;
  assessments.forEach((a) => { const wt = w[a.controlId] || 1; totW += wt; if (a.method === 'live') mvW += wt; });
  return { overall, confidence: totW ? mvW / totW : 0, functions: fnScores, categories: catScores };
}

module.exports = { assess, rollup, scoreControl, freshness, METHOD_TTL_DAYS };

'use strict';

/**
 * resultEngine — the continuous control assessment RESULT engine.
 *
 * Ties the layers together for one run:
 *   1. collectEvidence  — pull required API fields from live connectors.
 *   2. (inside enrichment/conclude) validate denominator, scope, review period,
 *      freshness, and live-tenant validation.
 *   3. assessAll        — execute framework-native pass/fail/partial logic.
 *   4. produce results  — Effective / Partially Effective / Ineffective /
 *      Not Enough Evidence / Not API-Testable.
 *   5. store an evidence snapshot + the per-control history.
 *   6. the engine's conclude() gate guarantees no control is Effective without
 *      live_tenant_validated === true and all required evidence present.
 *
 * The requirements registry (required_api_fields, etc.) defines WHAT is needed;
 * this engine determines whether it EXISTS and whether the control operated.
 */

const { collectEvidence } = require('./collection/collectEvidence');
const { assessAll } = require('./engine');
const history = require('./history');

async function runAssessment(orgId, opts) {
  opts = opts || {};
  const { evidence, report } = await collectEvidence(orgId, opts);
  const all = assessAll(evidence);
  const snapshotId = opts.snapshotId || ('snap_' + (opts.now || Date.now()));

  const frameworks = {};
  Object.keys(all).forEach((k) => {
    frameworks[k] = { framework: all[k].framework, framework_key: k, score: all[k].score, results: all[k].results };
  });

  if (!opts.noPersist) {
    try { await history.recordSnapshot(orgId, snapshotId, evidence, report); } catch (_) {}
    try { await history.record(orgId, all, { evidence_snapshot_id: snapshotId }); } catch (_) {}
  }

  // Roll-up of statuses across all frameworks for a quick read.
  const summary = {};
  Object.values(all).forEach((fw) => fw.results.forEach((r) => { summary[r.assessment_status] = (summary[r.assessment_status] || 0) + 1; }));

  return {
    org_id: orgId,
    generated_at: new Date(opts.now || Date.now()).toISOString(),
    engine: 'framework-native continuous assessment (collect → validate → assess → snapshot)',
    review_period: report.review_period,
    evidence_snapshot_id: snapshotId,
    evidence_report: report,
    status_summary: summary,
    frameworks,
  };
}

module.exports = { runAssessment };

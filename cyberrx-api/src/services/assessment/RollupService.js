'use strict';

/**
 * RollupService — aggregates objective-level (800-53A determination) verdicts up
 * to a control-level verdict. Deterministic, no LLM. The control status follows
 * its determination statements:
 *   - all addressed in full      -> Fully addressed
 *   - none addressed             -> Not addressed
 *   - a mix                      -> Partially addressed
 *   - only Not-applicable        -> Not applicable
 * Evidence is the de-duplicated union of the objectives' evidence; confidence is
 * the mean of available objective confidences.
 */

const STATUS = { FULL: 'Fully addressed', PARTIAL: 'Partially addressed', NOT: 'Not addressed', NA: 'Not applicable' };

function rollupStatus(statuses) {
  const live = statuses.filter((s) => s !== STATUS.NA);
  if (!live.length) return STATUS.NA;
  const allFull = live.every((s) => s === STATUS.FULL);
  const noneAddressed = live.every((s) => s === STATUS.NOT);
  if (allFull) return STATUS.FULL;
  if (noneAddressed) return STATUS.NOT;
  return STATUS.PARTIAL;
}

function dedupeEvidence(items) {
  const seen = new Set(); const out = [];
  for (const e of items) {
    const k = `${e.section_ref}|${e.quote}`;
    if (!seen.has(k)) { seen.add(k); out.push(e); }
  }
  return out;
}

/** Group objective records by their parent spine control and roll each up. */
function rollup(objectiveRecords) {
  const byControl = {};
  for (const r of objectiveRecords) {
    const cid = r.parent_control_id || r.control_id;
    (byControl[cid] = byControl[cid] || []).push(r);
  }
  const verdicts = {};
  for (const [cid, recs] of Object.entries(byControl)) {
    const status = rollupStatus(recs.map((r) => r.status));
    const evidence = dedupeEvidence(recs.flatMap((r) => r.evidence || []));
    const confs = recs.map((r) => r.confidence).filter((c) => c != null);
    verdicts[cid] = {
      control_id: cid,
      framework: recs[0].framework,
      framework_version: recs[0].framework_version,
      control_nature: recs[0].control_nature,
      status,
      evidence,
      confidence: confs.length ? Math.round((confs.reduce((a, c) => a + c, 0) / confs.length) * 100) / 100 : null,
      objectives_total: recs.length,
      objectives_addressed: recs.filter((r) => r.status === STATUS.FULL || r.status === STATUS.PARTIAL).length,
    };
  }
  return verdicts;
}

module.exports = { rollup, rollupStatus, dedupeEvidence, STATUS };

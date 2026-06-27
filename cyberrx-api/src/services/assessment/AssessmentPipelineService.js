'use strict';

/**
 * AssessmentPipelineService — Stage 8 capstone. Runs the full grounded pipeline
 * for one uploaded document and produces the report:
 *   ingest chunks -> spine batch sweep -> rollup -> crosswalk propagation ->
 *   reverse coverage pass -> reconcile -> persist records + enqueue conflicts ->
 *   build the report model.
 *
 * Supports incremental re-assessment: when a prior scan's chunks are provided,
 * only changed/added sections are re-embedded and only affected controls are
 * re-assessed (the rest reused). All external deps are injectable.
 */

const logger = require('../../utils/logger');
const fwCfg = require('../../config/assessmentFrameworks');
const VectorStore = require('../rag/VectorStore');
const ControlCorpus = require('../ControlCorpusService');
const Batch = require('./BatchAssessmentService');
const Rollup = require('./RollupService');
const Propagation = require('./CrosswalkPropagationService');
const Reverse = require('./ReverseCoverageService');
const Recon = require('./ReconciliationService');
const Report = require('./AssessmentReportService');
const Store = require('./GroundedAssessmentStore');
const Queue = require('./AnalystQueueService');

async function run(orgId, uploadId, opts = {}) {
  const deps = opts.deps || {};
  const anthropic = deps.anthropic || null;
  const scanId = opts.scanId || null;

  const chunks = deps.chunks || await VectorStore.listChunks(orgId, uploadId);
  const spine = deps.spineControls || await ControlCorpus.listSpine({});
  const csfList = deps.csfControls || await ControlCorpus.listByFramework('NIST_CSF_2.0');
  const spineCorpus = {}; spine.forEach((c) => { spineCorpus[c.control_id] = c; });
  const csfCorpus = {}; csfList.forEach((c) => { csfCorpus[c.control_id] = c; });
  const validIds = new Set(spine.map((c) => c.control_id));

  // 1. Spine sweep (batch + routing + verify + cost) — forwards embed/search/batchClient.
  const { records: objRecords, usage } = await Batch.runSpine(orgId, uploadId, spine, { ...deps, anthropic });

  // 2. Rollup -> control verdicts; 3. propagate to CSF.
  const controlVerdicts = Rollup.rollup(objRecords);
  const csfRecords = await Propagation.propagate(controlVerdicts, { spineCorpus, csfCorpus, anthropic });

  // 4. Reverse coverage pass; 5. reconcile + heatmap.
  const { touchedByControl } = await Reverse.runReverse(chunks, { anthropic, validIds });
  const { conflicts } = Recon.reconcile(controlVerdicts, touchedByControl);
  const heatmap = Recon.heatmap(controlVerdicts, touchedByControl);

  // 6. Persist + enqueue conflicts.
  const records = [...Object.values(controlVerdicts), ...csfRecords];
  if (opts.persist !== false) {
    try {
      await Store.saveRecords(orgId, scanId, uploadId, records);
      if (conflicts.length) await Queue.enqueue(orgId, scanId, conflicts.map((c) => ({ ...c, framework: c.framework || fwCfg.SPINE.label })));
    } catch (e) { logger.warn(`persist failed for scan ${scanId}: ${e.message}`); }
  }

  // 7. Report model.
  const report = Report.buildReport({
    spineVerdicts: controlVerdicts, csfRecords, heatmap, conflicts,
    scanId, documentId: uploadId, generatedAt: opts.generatedAt || null,
    frameworkVersions: fwCfg.frameworkVersions(),
  });
  return { report, usage, conflicts, records };
}

module.exports = { run };

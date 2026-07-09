'use strict';

/**
 * control-assessment — the authoritative continuous control operating-
 * effectiveness engine (assessment_control_logic). Framework-native, no
 * crosswalks. See ./engine for the scoring guarantees.
 *
 *   assessment_control_logic  (this module) → pass/fail, effectiveness, scores.
 *   related_control_mapping    (frontend c5RevX crosswalk) → informational only.
 */

const engine = require('./engine');
const evidenceModel = require('./evidenceModel');
const enrichment = require('./enrichment');
const history = require('./history');
const exportCsv = require('./exportCsv');
const design = require('./design');
const resultEngine = require('./resultEngine');
const collection = require('./collection/collectEvidence');
const { CONNECTOR_COLLECTORS } = require('./collection/connectorCollectors');
const validation = require('./validation');
const documents = require('./documents');
const { REGISTRIES, FRAMEWORK_KEYS } = require('./registries');

module.exports = {
  ...engine,
  ...evidenceModel,
  buildEvidence: enrichment.buildEvidence,
  history,
  exportCsv,
  design, // DESIGN-effectiveness (auditor document review)
  runAssessment: resultEngine.runAssessment, // continuous RESULT engine
  collectEvidence: collection.collectEvidence,
  requiredFields: collection.requiredFields,
  CONNECTOR_COLLECTORS,
  validation,
  documents, // DOCUMENT control assessment (framework-native doc evidence)
  REGISTRIES,
  FRAMEWORK_KEYS,
};

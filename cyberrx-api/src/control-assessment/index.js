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
const { REGISTRIES, FRAMEWORK_KEYS } = require('./registries');

module.exports = {
  ...engine,
  ...evidenceModel,
  buildEvidence: enrichment.buildEvidence,
  history,
  exportCsv,
  REGISTRIES,
  FRAMEWORK_KEYS,
};

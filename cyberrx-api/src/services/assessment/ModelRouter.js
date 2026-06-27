'use strict';

/**
 * ModelRouter — picks the model by difficulty (§3 "model routing by difficulty").
 *   - Obvious cases (very high retrieval similarity) -> cheap/fast triage model.
 *   - Normal coverage judgments -> mid model.
 *   - Low-confidence / ambiguous (Partially addressed) verdicts -> flagship,
 *     re-judged once.
 * Thresholds are config (assessmentModels).
 */

const models = require('../../config/assessmentModels');

/** Initial judge model from retrieval signal. */
function pickInitialModel({ topSim = 0 } = {}) {
  return topSim >= models.obviousSim ? models.triageModel : models.judgeModel;
}

/** Should this verdict be re-judged by the flagship model? */
function needsEscalation({ status, confidence } = {}) {
  if (status === 'Partially addressed') return true;            // ambiguous by definition
  if (confidence != null && confidence < models.escalateBelowConfidence) return true;
  return false;
}

function escalationModel() { return models.escalateModel; }

module.exports = { pickInitialModel, needsEscalation, escalationModel };

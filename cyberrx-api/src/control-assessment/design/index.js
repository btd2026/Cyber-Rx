'use strict';

/**
 * design — the DESIGN-effectiveness assessment layer (auditor document review).
 * Parallel to the telemetry operating-effectiveness engine: this layer concludes
 * whether a policy/standard/SOP is DESIGNED to satisfy a control objective, by
 * checking each objective criterion is covered appropriately in the document.
 */
const dr = require('./documentReview');
const { REGISTRY, CONTROL_KEYS } = require('./criteria');

module.exports = {
  DESIGN_STATUS: dr.DESIGN_STATUS,
  COVERAGE: dr.COVERAGE,
  reviewControl: dr.reviewControl,
  reviewById: dr.reviewById,
  checklist: dr.checklist,
  allChecklists: dr.allChecklists,
  CRITERIA: REGISTRY,
  CONTROL_KEYS,
};

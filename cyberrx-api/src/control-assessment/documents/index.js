'use strict';

/**
 * documents — the document control assessment module.
 *
 * Public surface for assessing governance documents (policies, standards, plans,
 * procedures, records) against a control's OWN framework-native document
 * requirements. Keeps design and operating effectiveness separate, cites where
 * each design element is covered, versions documents by content hash, and
 * re-assesses on upload/replace/delete/expire/staleness/scope-change.
 */

const documentTypes = require('./documentTypes');
const requirements = require('./requirements');
const scoring = require('./scoring');
const assess = require('./assess');
const versioning = require('./versioning');
const reassessment = require('./reassessment');
const integrate = require('./integrate');

module.exports = {
  // classification
  classify: documentTypes.classify,
  TYPES: documentTypes.TYPES,
  // requirements registry
  REQUIREMENTS: requirements.REGISTRY,
  getRequirement: requirements.get,
  allRequirements: requirements.all,
  // scoring
  scoreDocument: scoring.scoreDocument,
  // assessment
  assessDocument: assess.assessDocument,
  DOC_STATUS: assess.DOC_STATUS,
  EVIDENCE_LAYER: assess.EVIDENCE_LAYER,
  EVIDENCE_STRENGTH: assess.EVIDENCE_STRENGTH,
  // versioning
  hashText: versioning.hashText,
  recordVersion: versioning.recordVersion,
  activeVersion: versioning.activeVersion,
  versionHistory: versioning.versionHistory,
  // reassessment
  reassess: reassessment.reassess,
  shouldReassess: reassessment.shouldReassess,
  REASSESS_TRIGGER: reassessment.TRIGGER,
  // mixed-evidence integration
  combineEvidence: integrate.combine,
};

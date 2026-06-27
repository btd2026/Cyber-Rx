'use strict';

/**
 * Frameworks the NEW grounded assessment engine covers.
 *
 * Canonical spine = NIST SP 800-53 Rev5 (assessed once, per §2 step 1).
 * Evidence-backed verdicts propagate from the spine to the TARGET frameworks
 * via published/derived crosswalks (Stage 6). ISO/IEC 27001:2022 and CIS v8.1
 * are INTENTIONALLY EXCLUDED here (Checkpoint-1 decision) until licensed content
 * is supplied — when it is, add the id to ASSESSMENT_TARGET_FRAMEWORKS and load
 * its corpus, and propagation picks it up. Everything is config-driven; nothing
 * about the framework set is hardcoded into the pipeline.
 */

// Spine — assessed control-by-control against the document.
const SPINE = Object.freeze({
  id: 'nist_800_53_r5',
  label: 'NIST_SP_800-53',
  version: process.env.SPINE_FRAMEWORK_VERSION || '5.2.0', // OSCAL catalog version
  assessmentVersion: '800-53A_5.2.0',                      // CPRT determination statements
});

// Targets we know how to load today. ISO/CIS deliberately absent.
const ALL_TARGETS = Object.freeze({
  nist_csf_2: Object.freeze({ id: 'nist_csf_2', label: 'NIST_CSF_2.0', version: '2.0' }),
});

function targets() {
  const ids = (process.env.ASSESSMENT_TARGET_FRAMEWORKS || 'nist_csf_2')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return ids.filter((id) => ALL_TARGETS[id]).map((id) => ALL_TARGETS[id]);
}

// Version map for the scan record (§4) — only in-scope frameworks.
function frameworkVersions() {
  const out = { [SPINE.label]: SPINE.version };
  targets().forEach((t) => { out[t.label] = t.version; });
  return out;
}

module.exports = {
  SPINE,
  ALL_TARGETS,
  get targets() { return targets(); },
  frameworkVersions,
};

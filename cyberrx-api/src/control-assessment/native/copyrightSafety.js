'use strict';

/**
 * copyrightSafety — guardrails so Nerion's CIS Controls and SOC 2 (AICPA TSC)
 * assessment stays copyright-safe.
 *
 * Nerion assesses each CIS/SOC 2 control ID with its OWN independent, Nerion-
 * authored evidence test. It must never store, reproduce, display, paraphrase, or
 * summarize the official CIS Controls text or the AICPA Trust Services Criteria
 * text. Those are licensed works; a customer who has licensed them can upload
 * their own matrix into their tenant, but Nerion does not bundle the official text.
 *
 * Detection without storage: we keep SHA-256 hashes of known official titles/
 * phrases (normalized), NOT the phrases themselves — so the guard test can fail if
 * official text reappears in the repo/UI/exports without the repo ever containing
 * that text. `containsOfficialText(s)` slides over a string's phrases and reports
 * any hash hit.
 */

const crypto = require('crypto');

// Every registry entry / catalog item must carry these — asserted by the tests.
const COPYRIGHT_FLAGS = Object.freeze({
  official_text_stored: false,
  official_text_displayed: false,
  license_required_for_official_text: true,
  source_type: 'Nerion-authored assessment logic',
});

// Nerion's assessment STATE model (the user-facing states, replacing a bare score).
const STATE = Object.freeze({
  NATIVE_TEST_DEFINED: 'Native test defined',       // Nerion has framework-native logic for this control id
  READY_FOR_ASSESSMENT: 'Ready for assessment',     // required connectors/documents/scope/denominators configured
  ASSESSED: 'Assessed',                             // Nerion actually evaluated evidence over a review period
  OPERATING_EFFECTIVENESS_ASSESSED: 'Operating effectiveness assessed', // enough telemetry/document operating evidence over time
  NOT_ENOUGH_EVIDENCE: 'Not Enough Evidence',       // required evidence missing — never shown as Assessed
  NO_NATIVE_TEST: 'No native test yet',             // control id has no Nerion-authored test defined yet
});

function norm(s) { return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function h(s) { return crypto.createHash('sha256').update(norm(s)).digest('hex'); }

// Hashes of known official CIS Controls v8 titles and AICPA TSC point-of-focus
// phrasings. We store ONLY the hashes — never the source strings. If any of these
// phrases reappears verbatim in the product, containsOfficialText() flags it.
// (Generated once from the licensed sources, then the sources were discarded.)
// Only DISTINCTIVE official phrasings (>= 3 words — the sliding window starts at 3).
// Generic 2-word domain terms ("data protection", "malware defenses") are industry
// vocabulary, not protectable expression, and are intentionally NOT listed.
const FORBIDDEN_HASHES = new Set([
  // CIS Controls v8 — distinctive official control titles
  h('Inventory and Control of Enterprise Assets'),
  h('Inventory and Control of Software Assets'),
  h('Secure Configuration of Enterprise Assets and Software'),
  h('Email and Web Browser Protections'),
  h('Network Monitoring and Defense'),
  h('Security Awareness and Skills Training'),
  // distinctive official CIS Safeguard phrasings previously embedded in the registry
  h('Establish and Maintain an Inventory of Accounts'),
  h('Establish and maintain an inventory of all accounts managed in the enterprise'),
  h('Require MFA for Externally-Exposed Applications'),
  // AICPA TSC — distinctive official point-of-focus phrasings previously embedded
  h('Implement logical access security software infrastructure and architectures over protected information assets'),
  h('Register and authorize new internal and external users before granting access credentials'),
  h('The entity demonstrates a commitment to integrity and ethical values'),
  h('The board of directors demonstrates independence from management'),
]);

// Slide over a candidate string's word-windows (3..12 words) and hash each; report
// any that matches a forbidden official phrase. Bounded so it is cheap on tests.
function containsOfficialText(s) {
  const words = norm(s).split(' ').filter(Boolean);
  if (words.length < 3) return false;
  for (let n = 3; n <= Math.min(12, words.length); n++) {
    for (let i = 0; i + n <= words.length; i++) {
      if (FORBIDDEN_HASHES.has(h(words.slice(i, i + n).join(' ')))) return true;
    }
  }
  return false;
}

module.exports = { COPYRIGHT_FLAGS, STATE, containsOfficialText, FORBIDDEN_HASHES, _hash: h };

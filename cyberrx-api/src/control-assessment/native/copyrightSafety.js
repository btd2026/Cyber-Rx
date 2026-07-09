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
  customer_licensed_content_allowed: true,   // a customer who licensed the official text may upload it
  tenant_only_customer_content: true,        // and it stays inside their tenant only
});

// How reports must refer to a native assessment — by ID, never by official language.
function reportLabel(framework, controlId) {
  return 'Nerion assessment for ' + framework + ' control ID ' + controlId;
}

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
// SHA-256 hashes of distinctive official CIS / AICPA / ISO phrasings — stored as
// HEX DIGESTS ONLY, so this file (and the whole repo) contains NONE of the official
// text itself, not even as a detection needle. The digests were generated once from
// the licensed sources, which were then discarded. The sliding window starts at 3
// words; generic 2-word domain terms are industry vocabulary and are not listed.
// Each entry is annotated by framework + control ID only — never by wording.
const FORBIDDEN_HASHES = new Set([
  '7359db9544f895e0e22998dcab56ddab3b62dcb538c5d24df4e3e29d92aebf99', // CIS Control 1 title
  'fffe6f690ceb9ce7b7e89e16e24a93eef16b6c967e143299d0299dc2ba9df5cd', // CIS Control 2 title
  '08f72e5fe70f72d686ae8ac5f6245693c3b72c290948208d461c093ebd77b85e', // CIS Control 4 title
  'a6d438c8e05077d35c631e673ea92915e94001266c01f8ff1199bf9b7b570df0', // CIS Control 9 title
  'e3f3a967fd32a9a039eda45730f7c1936ae0aaa4693cef2b8a420f0af5cf1b8e', // CIS Control 13 title
  'd2c1580391281d69c92e1d363de2bb7ee27dc4a3627967303d8e4971ff75213a', // CIS Control 14 title
  'c58c7d61adaefa9f39d42ac1a1ca707316324f55b14b98e3677f322515e10c95', // CIS Safeguard 5.1 title
  '0ba6e16858ef3f984d72331de5fe9c1095c25e97f10d5de8820c9d14d4a13368', // CIS Safeguard 5.1 description
  '0650083f506ac288248a18feb397e99bd57bc82acede3d3befe559951a294c3b', // CIS Safeguard 6.3 title
  '2538c6302e0223e5de43ec5888dfbe608d93f1a41fec8d9027f6403b84c501dc', // AICPA TSC CC6.1
  '37daaeeee57ee24efbf7dc050e3e001f399d32436e26f59c8179edd98e93e55e', // AICPA TSC CC6.2
  'cfcd3a21989321b8b4fad26145546c248adfbc003b5b33c6e2282da41ef7b591', // AICPA TSC CC1.1
  '46bb4e06cc7a22952325f878c3ee34fff6d6cea2351c0e90d769a947a3aa693f', // AICPA TSC CC1.2
  '7e5968881ff63eadfce3fcf578de2bb4bf0d18aaf55ecefb526b92c178975054', // AICPA TSC CC5.3
  '35ae25bf1eb7c9b6fdbc2c6670ddae48a12accf4d335c3e88e97bf253139e013', // ISO/IEC 27001 A.5.1
  '0990cf73f869c812f49f3a7bdd830faf1acce9ddde9989bd89bbd66cfba0005f', // ISO/IEC 27001 A.5.15
  'aab5d3231e596c4310a3b074cc7aa552b5ad5ec7a07baa0b58972b71b2a83ae5', // ISO/IEC 27001 A.5.12
  'c2bc339b716fe19e442ac09beafc77de1044aaf6826832c87f0768f634a271ae', // ISO/IEC 27001 A.8.24
  '73b92352d2fbbeeda06dd808f611deb98ee22ebe346ec44c918a4b029f70ffd3', // ISO/IEC 27001 A.8.7
  '03d48ba4cbc8f7cf13475953ecd2d9b887e38e1b266c2cafaebe38c30bc415d4', // ISO/IEC 27001 A.8.8
  '0cd11e28197c815ffae85de8342a846d9d2dcb9c3ea184bfbf5ef182a852feaa', // ISO/IEC 27001 A.8.20
  '8f9dee36e556bafe076fb7b077359db797c344c10b51670736045916048b09c6', // synthetic canary (proves the detector fires)
]);
// A synthetic phrase whose hash is in the set above — lets tests prove the detector
// fires WITHOUT embedding any real official text anywhere in the repo.
const CANARY = 'NERION-CANARY do not remove this synthetic phrase proves the detector fires';

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

module.exports = { COPYRIGHT_FLAGS, STATE, containsOfficialText, reportLabel, FORBIDDEN_HASHES, CANARY, _hash: h };

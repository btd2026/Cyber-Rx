'use strict';

/**
 * Copyright safety for CIS Controls & SOC 2 (AICPA TSC).
 *
 * Nerion assesses each CIS/SOC 2 control id with its OWN Nerion-authored evidence
 * test. It must never store or display the official CIS Controls text or AICPA TSC
 * text. These tests FAIL if a distinctive official phrase reappears in the
 * assessment registries, the cockpit UI, or seed data — and assert the copyright
 * flags and state model.
 */

const fs = require('fs');
const path = require('path');
const { containsOfficialText, COPYRIGHT_FLAGS, STATE } = require('../../src/control-assessment/native/copyrightSafety');
const { stateOf } = require('../../src/control-assessment/native/state');
const { REGISTRIES } = require('../../src/control-assessment/registries');

const REPO = path.join(__dirname, '../..', '..');
// Files most at risk of embedding official framework text.
const SCAN_FILES = [
  'cyberrx-api/src/control-assessment/registries/cis_v8_1.js',
  'cyberrx-api/src/control-assessment/registries/soc2_2017_tsc.js',
  'CyberRXNew/public/cockpit.html',
].map((p) => path.join(REPO, p)).filter((p) => fs.existsSync(p));

describe('no official CIS / AICPA text in the product', () => {
  test('registry control_name / control_objective are Nerion-authored (no official text)', () => {
    ['cis_v8_1', 'soc2_2017_tsc'].forEach((k) => {
      const reg = REGISTRIES[k] && REGISTRIES[k].REGISTRY;
      expect(reg).toBeTruthy();
      Object.values(reg).forEach((c) => {
        expect(containsOfficialText(c.control_name)).toBe(false);
        expect(containsOfficialText(c.control_objective)).toBe(false);
      });
    });
  });

  test('scanned source files contain no distinctive official framework phrase', () => {
    const hits = [];
    SCAN_FILES.forEach((f) => {
      const text = fs.readFileSync(f, 'utf8');
      // check each quoted string literal (cheap + targets displayed/stored text)
      (text.match(/'[^'\n]{6,120}'|"[^"\n]{6,120}"/g) || []).forEach((lit) => {
        const s = lit.slice(1, -1);
        if (containsOfficialText(s)) hits.push(path.basename(f) + ' :: ' + s);
      });
    });
    expect(hits).toEqual([]);
  });
});

describe('copyright flags + state model', () => {
  test('every CIS / SOC 2 registry entry carries the copyright-safe flags', () => {
    ['cis_v8_1', 'soc2_2017_tsc'].forEach((k) => {
      Object.values(REGISTRIES[k].REGISTRY).forEach((c) => {
        expect(c.official_text_stored).toBe(false);
        expect(c.official_text_displayed).toBe(false);
        expect(c.license_required_for_official_text).toBe(true);
        expect(c.source_type).toBe(COPYRIGHT_FLAGS.source_type);
      });
    });
  });

  test('the detector actually fires on a known official phrase and passes clean text', () => {
    expect(containsOfficialText('Inventory and Control of Enterprise Assets')).toBe(true);
    expect(containsOfficialText('Inventory & Control of Enterprise Assets')).toBe(true);
    expect(containsOfficialText('Account inventory & reconciliation (Nerion test)')).toBe(false);
    expect(containsOfficialText('Change management (Nerion test)')).toBe(false);
  });

  test('state model: defined → ready → assessed → operating effectiveness; missing evidence never reads Assessed', () => {
    const entry = { control_id: '5.1', native_test: true, required_connector_telemetry: ['iga'], required_document_evidence: ['Access Review / Certification Report'], required_denominator: 'account directory', required_scope: 'in-scope' };
    expect(stateOf({ control_id: 'x' }, {}).state).toBe(STATE.NO_NATIVE_TEST);
    expect(stateOf(entry, { connectedCapabilities: [], uploadedDocumentTypes: [] }).state).toBe(STATE.NATIVE_TEST_DEFINED);
    const ready = { connectedCapabilities: ['iga'], uploadedDocumentTypes: ['Access Review / Certification Report'], denominatorConfigured: true, scopeConfigured: true };
    expect(stateOf(entry, ready).state).toBe(STATE.READY_FOR_ASSESSMENT);
    expect(stateOf(entry, Object.assign({}, ready, { result: { assessed: true, notEnough: true } })).state).toBe(STATE.NOT_ENOUGH_EVIDENCE);
    expect(stateOf(entry, Object.assign({}, ready, { result: { assessed: true } })).state).toBe(STATE.ASSESSED);
    expect(stateOf(entry, Object.assign({}, ready, { result: { assessed: true, operatingEffectiveness: true } })).state).toBe(STATE.OPERATING_EFFECTIVENESS_ASSESSED);
  });
});

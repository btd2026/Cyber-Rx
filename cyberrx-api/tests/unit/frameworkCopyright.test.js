'use strict';

/**
 * Copyright safety for CIS Controls, SOC 2 (AICPA TSC) and ISO/IEC 27001.
 *
 * Nerion assesses each control id with its OWN Nerion-authored evidence test. It
 * must never store or display the official CIS / AICPA / ISO text. These tests FAIL
 * if a distinctive official phrase reappears in the assessment registries, the
 * cockpit UI, or seed data — and assert the copyright flags, the report phrasing,
 * the tenant-only customer-content isolation, and the state model.
 */

const fs = require('fs');
const path = require('path');
const { containsOfficialText, reportLabel, COPYRIGHT_FLAGS, STATE } = require('../../src/control-assessment/native/copyrightSafety');
const { stateOf } = require('../../src/control-assessment/native/state');
const tenantContent = require('../../src/control-assessment/native/tenantFrameworkContent');
const { REGISTRIES } = require('../../src/control-assessment/registries');

const COPYRIGHTED = ['cis_v8_1', 'soc2_2017_tsc', 'iso_27001_2022'];
const REPO = path.join(__dirname, '../..', '..');
// Files most at risk of embedding official framework text.
const SCAN_FILES = [
  'cyberrx-api/src/control-assessment/registries/cis_v8_1.js',
  'cyberrx-api/src/control-assessment/registries/soc2_2017_tsc.js',
  'cyberrx-api/src/control-assessment/registries/iso_27001_2022.js',
  'CyberRXNew/public/cockpit.html',
].map((p) => path.join(REPO, p)).filter((p) => fs.existsSync(p));

describe('no official CIS / AICPA / ISO text in the product', () => {
  test('registry control_name / control_objective are Nerion-authored (no official text)', () => {
    COPYRIGHTED.forEach((k) => {
      const reg = REGISTRIES[k] && REGISTRIES[k].REGISTRY;
      expect(reg).toBeTruthy();
      Object.values(reg).forEach((c) => {
        expect(containsOfficialText(c.control_name)).toBe(false);
        expect(containsOfficialText(c.control_objective)).toBe(false);
        if (c.nerion_assessment_objective) expect(containsOfficialText(c.nerion_assessment_objective)).toBe(false);
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
  test('every CIS / SOC 2 / ISO registry entry carries the copyright-safe flags (incl. tenant-content flags)', () => {
    COPYRIGHTED.forEach((k) => {
      Object.values(REGISTRIES[k].REGISTRY).forEach((c) => {
        expect(c.official_text_stored).toBe(false);
        expect(c.official_text_displayed).toBe(false);
        expect(c.license_required_for_official_text).toBe(true);
        expect(c.source_type).toBe(COPYRIGHT_FLAGS.source_type);
        expect(c.customer_licensed_content_allowed).toBe(true);
        expect(c.tenant_only_customer_content).toBe(true);
      });
    });
  });

  test('the detector fires on official CIS / AICPA / ISO phrases and passes Nerion labels', () => {
    expect(containsOfficialText('Inventory and Control of Enterprise Assets')).toBe(true); // CIS
    expect(containsOfficialText('Inventory & Control of Enterprise Assets')).toBe(true);
    expect(containsOfficialText('The entity demonstrates a commitment to integrity and ethical values')).toBe(true); // AICPA
    expect(containsOfficialText('Protection against malware shall be implemented and supported by appropriate user awareness')).toBe(true); // ISO
    expect(containsOfficialText('Secure authentication (Nerion test)')).toBe(false);
    expect(containsOfficialText('ISMS scope defined (Nerion test)')).toBe(false);
  });

  test('reports refer to controls by Nerion phrasing + ID only (no official language)', () => {
    const label = reportLabel('ISO/IEC 27001:2022', 'A.8.5');
    expect(label).toBe('Nerion assessment for ISO/IEC 27001:2022 control ID A.8.5');
    expect(containsOfficialText(label)).toBe(false);
    expect(reportLabel('CIS Controls v8.1', '5.1')).toContain('Nerion assessment for CIS Controls v8.1 control ID 5.1');
  });

  test('customer-licensed content is tenant-scoped, marked, and export-gated', async () => {
    // org_id is mandatory on every read/write — no cross-tenant path
    await expect(tenantContent.forTenant('', 'iso_27001_2022')).rejects.toThrow(/org_id/);
    await expect(tenantContent.upload('', { framework_key: 'iso_27001_2022', content: 'x' })).rejects.toThrow(/org_id/);
    // tenant-only export must be explicitly requested
    await expect(tenantContent.exportForTenant('org_a', 'iso_27001_2022')).rejects.toThrow(/explicit/);
    const out = await tenantContent.exportForTenant('org_a', 'iso_27001_2022', true);
    expect(out.tenant_only).toBe(true);
    expect(out.marking).toBe('customer-provided licensed content');
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

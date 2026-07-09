'use strict';

/**
 * Copyright safety for CIS Controls, SOC 2 (AICPA TSC) and ISO/IEC 27001.
 *
 * Nerion assesses each control id with its OWN Nerion-authored evidence test. It
 * must never store, reproduce, display, paraphrase or summarize the official CIS /
 * AICPA / ISO text — anywhere: source, registries, seed data, frontend UI, report
 * templates, exports, tests, or documentation.
 *
 * These tests walk the WHOLE repo and FAIL if a distinctive official phrase (matched
 * by SHA-256 hash — the guard stores no official text) reappears. They also assert
 * the copyright flags, the ID-only report phrasing, and the tenant-only isolation of
 * customer-uploaded licensed content. The detector is proven to fire using a
 * synthetic CANARY, so this test file itself contains no official text either.
 */

const fs = require('fs');
const path = require('path');
const { containsOfficialText, reportLabel, COPYRIGHT_FLAGS, STATE, CANARY } = require('../../src/control-assessment/native/copyrightSafety');
const { stateOf } = require('../../src/control-assessment/native/state');
const tenantContent = require('../../src/control-assessment/native/tenantFrameworkContent');
const { REGISTRIES } = require('../../src/control-assessment/registries');

const COPYRIGHTED = ['cis_v8_1', 'soc2_2017_tsc', 'iso_27001_2022'];
const REPO = path.resolve(__dirname, '../../..');

// Walk the repo (skipping deps/build) and return source/UI/doc/data/test files.
function repoFiles() {
  const EXT = new Set(['.js', '.html', '.md', '.json', '.txt', '.csv', '.hbs', '.ejs']);
  const SKIP = /node_modules|\.git|dist|build|coverage|pw-browsers/;
  const out = [];
  (function walk(d) {
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (_) { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (SKIP.test(p)) continue;
      if (e.isDirectory()) walk(p);
      else if (EXT.has(path.extname(e.name))) out.push(p);
    }
  })(REPO);
  return out;
}

describe('no official CIS / AICPA / ISO text anywhere in the repo', () => {
  test('registry control_name / control_objective / assessment objective are Nerion-authored', () => {
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

  test('whole repo — no distinctive official framework phrase in any string literal', () => {
    const files = repoFiles();
    expect(files.length).toBeGreaterThan(100);
    const hits = [];
    files.forEach((f) => {
      let text; try { text = fs.readFileSync(f, 'utf8'); } catch (_) { return; }
      (text.match(/'[^'\n]{6,180}'|"[^"\n]{6,180}"|`[^`\n]{6,180}`/g) || []).forEach((lit) => {
        const s = lit.slice(1, -1);
        if (s === CANARY) return; // the guard's own synthetic detector fixture — not official text
        if (containsOfficialText(s)) hits.push(path.relative(REPO, f) + ' :: ' + s.slice(0, 70));
      });
    });
    if (hits.length) console.error('OFFICIAL TEXT FOUND:\n' + hits.join('\n'));
    expect(hits).toEqual([]);
  });
});

describe('copyright flags + report phrasing + tenant isolation + state model', () => {
  test('every CIS / SOC 2 / ISO registry entry carries the copyright-safe flags', () => {
    COPYRIGHTED.forEach((k) => {
      Object.values(REGISTRIES[k].REGISTRY).forEach((c) => {
        expect(c.official_text_stored).toBe(false);
        expect(c.official_text_displayed).toBe(false);
        expect(c.license_required_for_official_text).toBe(true);
        expect(c.source_type).toBe('Nerion-authored assessment logic');
        expect(c.customer_licensed_content_allowed).toBe(true);
        expect(c.tenant_only_customer_content).toBe(true);
      });
    });
  });

  test('the detector fires (via synthetic canary) and passes Nerion labels — no official text needed', () => {
    expect(containsOfficialText(CANARY)).toBe(true);
    expect(containsOfficialText('Secure authentication (Nerion test)')).toBe(false);
    expect(containsOfficialText('Ethics & integrity program (Nerion test)')).toBe(false);
    expect(containsOfficialText('ISMS scope defined (Nerion test)')).toBe(false);
    // and the & / and normalization is handled
    expect(containsOfficialText('Enterprise asset inventory')).toBe(false);
  });

  test('reports refer to controls by Nerion phrasing + ID only', () => {
    expect(reportLabel('ISO/IEC 27001:2022', 'A.8.5')).toBe('Nerion assessment for ISO/IEC 27001:2022 control ID A.8.5');
    expect(reportLabel('CIS Controls v8.1', '5.1')).toBe('Nerion assessment for CIS Controls v8.1 control ID 5.1');
    expect(containsOfficialText(reportLabel('ISO/IEC 27001:2022', 'A.8.5'))).toBe(false);
  });

  test('customer-licensed content is tenant-scoped, marked, and export-gated', async () => {
    await expect(tenantContent.forTenant('', 'iso_27001_2022')).rejects.toThrow(/org_id/);
    await expect(tenantContent.upload('', { framework_key: 'iso_27001_2022', content: 'x' })).rejects.toThrow(/org_id/);
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

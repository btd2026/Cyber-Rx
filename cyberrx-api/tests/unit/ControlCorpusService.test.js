'use strict';

/**
 * ControlCorpusService unit tests.
 *  - Pure crosswalk shaping (no DB).
 *  - Authoritative parse of the bundled NIST OSCAL/CPRT for a known control
 *    (AC-2) — proves the corpus resolves with determination objectives + nature
 *    + version from real data (the spec's "test a known control resolves").
 */

const Corpus = require('../../src/services/ControlCorpusService');
const { buildSpineCorpus, parseCprt } = require('../../src/services/corpus/parse80053');

describe('crosswalk shaping (pure)', () => {
  test('mappingStrength: equivalent => full; others/provisional => partial', () => {
    expect(Corpus.mappingStrength('equivalent', false)).toBe('full');
    expect(Corpus.mappingStrength('subset', false)).toBe('partial');
    expect(Corpus.mappingStrength('equivalent', true)).toBe('partial'); // provisional downgrades
    expect(Corpus.mappingStrength('related', false)).toBe('partial');
  });
  test('buildCrosswalk keeps only in-scope target frameworks, labelled', () => {
    const edges = [
      { to_framework: 'nist_csf_2', to_id: 'PR.AA-01', relationship: 'related', provisional: true },
      { to_framework: 'nist_csf_2', to_id: 'PR.AA-05', relationship: 'equivalent', provisional: false },
      { to_framework: 'iso_27001', to_id: 'A.5.16', relationship: 'equivalent', provisional: false }, // out of scope -> dropped
    ];
    const xwalk = Corpus.buildCrosswalk(edges, { nist_csf_2: 'NIST_CSF_2.0' });
    expect(Object.keys(xwalk)).toEqual(['NIST_CSF_2.0']);
    expect(xwalk['NIST_CSF_2.0']).toEqual([
      { control_id: 'PR.AA-01', mapping: 'partial' },
      { control_id: 'PR.AA-05', mapping: 'full' },
    ]);
  });
});

describe('authoritative corpus from bundled NIST sources', () => {
  let corpus; let ac2;
  beforeAll(() => { corpus = buildSpineCorpus({}); ac2 = corpus.find((c) => c.control_id === 'AC-2'); });

  test('parses the full 800-53 Rev5 spine (non-withdrawn)', () => {
    expect(corpus.length).toBeGreaterThan(900);
    expect(corpus.every((c) => c.framework === 'NIST_SP_800-53')).toBe(true);
    expect(corpus.every((c) => c.framework_version === '5.2.0')).toBe(true);
  });

  test('AC-2 resolves with title, requirement text, nature and 800-53A objectives', () => {
    expect(ac2).toBeDefined();
    expect(ac2.title).toBe('Account Management');
    expect(ac2.family).toBe('AC');
    expect(ac2.control_nature).toBe('automated_capable');
    expect(ac2.requirement_text.length).toBeGreaterThan(50);
    expect(ac2.assessment_objectives.length).toBeGreaterThan(10);
    // every objective carries an authoritative 800-53A id + a verbatim statement
    ac2.assessment_objectives.forEach((o) => {
      expect(o.objective_id).toMatch(/^AC-0?2/);
      expect(typeof o.determination_statement).toBe('string');
      expect(o.determination_statement.length).toBeGreaterThan(0);
    });
  });

  test('AC-1 (policy & procedures) is procedural; determinations decomposed per control', () => {
    const ac1 = corpus.find((c) => c.control_id === 'AC-1');
    expect(ac1.control_nature).toBe('non_automated_procedural');
    // AC-2 objectives must not bleed in from AC-2(1) enhancement (boundary stop)
    const enhObjIds = (parseCprt()['AC-2(1)'] || { objectives: [] }).objectives.map((o) => o.objective_id);
    const baseObjIds = ac2.assessment_objectives.map((o) => o.objective_id);
    enhObjIds.forEach((id) => expect(baseObjIds).not.toContain(id));
  });
});

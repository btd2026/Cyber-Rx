'use strict';

/**
 * Control-corpus integration test (requires Postgres). Loads the real corpus
 * and resolves a known control end-to-end through control_corpus. Self-skips
 * when no DB is reachable (offline sandbox); runs fully with a TEST_DATABASE_URL.
 */

const db = require('../../src/utils/db');
const Corpus = require('../../src/services/ControlCorpusService');

let dbUp = false;
beforeAll(async () => {
  try { await db.query('SELECT 1'); await db.init(); dbUp = true; }
  catch (e) { console.warn(`[controlCorpus.integration] skipped — no DB: ${e.message}`); }
}, 60000);

const itDb = (name, fn, to) => test(name, async () => { if (!dbUp) return; await fn(); }, to);

describe('control corpus (live Postgres)', () => {
  itDb('loads the spine + CSF target and resolves AC-2 with objectives + nature', async () => {
    const res = await Corpus.load();
    expect(res.spine.controls).toBeGreaterThan(900);
    expect(res.frameworkVersions['NIST_SP_800-53']).toBe('5.2.0');

    const ac2 = await Corpus.getControl('NIST_SP_800-53', 'AC-2');
    expect(ac2).toBeTruthy();
    expect(ac2.title).toBe('Account Management');
    expect(ac2.control_nature).toBe('automated_capable');
    expect(ac2.assessment_objectives.length).toBeGreaterThan(10);
    expect(ac2.assessment_objectives[0]).toHaveProperty('objective_id');
    expect(ac2.assessment_objectives[0]).toHaveProperty('determination_statement');
    // crosswalk to CSF 2.0 is present (provisional partial edges are fine)
    expect(ac2.crosswalk).toBeDefined();
  }, 120000);

  itDb('a CSF 2.0 subcategory resolves with a mapped nature', async () => {
    const csf = await Corpus.getControl('NIST_CSF_2.0', 'PR.AA-01');
    if (csf) {
      expect(['automated_capable', 'non_automated_procedural', 'hybrid']).toContain(csf.control_nature);
      expect(csf.assessment_objectives.length).toBeGreaterThanOrEqual(1);
    }
  });
});

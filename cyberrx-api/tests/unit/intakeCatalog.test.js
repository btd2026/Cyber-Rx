'use strict';

/**
 * intakeDocumentCatalog — offline validation of the starter document catalog.
 * Ensures it's well-formed and that its NIST CSF 2.0 references resolve against
 * the seeded control library (so the seed's fan-out mappings won't be silently
 * dropped). Runs without a database.
 */

const { CATALOG } = require('../../src/data/intakeDocumentCatalog');
const csfLib = require('../../src/data/nistCsfControlLibrary');

const csfArray = Array.isArray(csfLib)
  ? csfLib
  : Object.values(csfLib).filter(Array.isArray).sort((a, b) => b.length - a.length)[0];
const csfIds = new Set(csfArray.map((c) => c.id));

describe('intake document catalog', () => {
  test('document types have unique ids and required fields', () => {
    const ids = new Set();
    for (const dt of CATALOG) {
      expect(typeof dt.id).toBe('string');
      expect(dt.id).toMatch(/^[a-z0-9_]+$/);
      expect(ids.has(dt.id)).toBe(false);
      ids.add(dt.id);
      expect(typeof dt.name).toBe('string');
      expect(dt.name.length).toBeGreaterThan(0);
      expect(Array.isArray(dt.controls)).toBe(true);
      expect(dt.controls.length).toBeGreaterThan(0);
    }
  });

  test('every control mapping is well-formed and unique within a document type', () => {
    for (const dt of CATALOG) {
      const seen = new Set();
      for (const c of dt.controls) {
        expect(typeof c.framework_id).toBe('string');
        expect(typeof c.requirement_id).toBe('string');
        expect(typeof c.expected_requirement).toBe('string');
        expect(c.expected_requirement.length).toBeGreaterThan(0);
        const key = `${c.framework_id}::${c.requirement_id}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  test('all referenced NIST CSF 2.0 controls exist in the control library', () => {
    const missing = [];
    for (const dt of CATALOG) {
      for (const c of dt.controls) {
        if (c.framework_id === 'nist_csf_2' && !csfIds.has(c.requirement_id)) {
          missing.push(`${dt.id} -> ${c.requirement_id}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('catalog covers a meaningful spread of document types', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(8);
  });
});

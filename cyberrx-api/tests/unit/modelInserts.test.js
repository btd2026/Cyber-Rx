'use strict';

/**
 * Static guard against column/placeholder mismatches in the model INSERTs —
 * the "INSERT has more target columns than expressions" class of bug (a missing
 * $N in the VALUES list shipped once in Risk.create and broke onboarding go-live).
 * Asserts, for each model, that column count === placeholder count === the max
 * placeholder index, so an off-by-one is caught without needing a database.
 */

const fs = require('fs');
const path = require('path');

const MODELS = ['Risk', 'Asset', 'BusinessProcess'];

describe('model INSERT column/placeholder balance', () => {
  for (const m of MODELS) {
    test(`${m}.create INSERT has matching columns and placeholders`, () => {
      const src = fs.readFileSync(path.join(__dirname, `../../src/models/${m}.js`), 'utf8');
      const ins = src.match(/INSERT INTO \w+ \(([\s\S]*?)\)\s*VALUES \(([^)]*)\)/);
      expect(ins).toBeTruthy();
      const columns = ins[1].split(',').map((x) => x.trim()).filter(Boolean).length;
      const placeholders = (ins[2].match(/\$\d+/g) || []);
      const maxPlaceholder = Math.max(...placeholders.map((x) => Number(x.slice(1))));
      expect(placeholders.length).toBe(columns);
      expect(maxPlaceholder).toBe(columns);
    });
  }
});

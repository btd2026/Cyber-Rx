'use strict';
/**
 * Regression guard (from the unit-test sweep): every route file must require
 * without throwing. This catches broken/missing imports at load time — e.g. the
 * `multer` boot-blocker and the mislocated `MitreAttckService` require — which the
 * per-service unit tests miss because they never assemble the route graph.
 */
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', '..', 'src', 'routes');
const routeFiles = fs.readdirSync(routesDir)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.refactored.js') && !f.includes('.test.'));

describe('route graph loads', () => {
  it('has route files to check', () => {
    expect(routeFiles.length).toBeGreaterThan(10);
  });

  test.each(routeFiles)('requires src/routes/%s without throwing', (file) => {
    expect(() => require(path.join(routesDir, file))).not.toThrow();
  });

  it('multer (used by the documents upload route) resolves', () => {
    expect(() => require('multer')).not.toThrow();
  });
});

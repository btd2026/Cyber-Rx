'use strict';
/**
 * Regression guard (from the unit-test sweep): Asset._transformFromDb must carry the
 * fields the crown-jewel scorer reads. It previously dropped `exposure`, so
 * isInternet() was always false and every internet-facing / AI-attack-surface metric
 * read 0 on live data. Fixtures that inject snake_case straight into the scorer bypass
 * this transform, so this test asserts the DB-row → model mapping directly.
 */
const Asset = require('../../src/models/Asset');

describe('Asset._transformFromDb preserves scorer-critical fields', () => {
  const row = {
    id: 'A1', name: 'Payments gateway', organization_id: 'org1',
    exposure: 'internet-facing', criticality: 'Critical',
    data_classification: ['PII'], cloud_provider: 'aws',
  };
  const t = Asset._transformFromDb(row);

  it('keeps exposure (drives isInternet / internet-facing metrics)', () => {
    expect(t.exposure).toBe('internet-facing');
  });
  it('keeps criticality', () => {
    expect(t.criticality).toBe('Critical');
  });
  it('still maps the existing fields', () => {
    expect(t.id).toBe('A1');
    expect(t.organizationId).toBe('org1');
    expect(t.dataClassification).toEqual(['PII']);
  });
  it('returns null for a null row', () => {
    expect(Asset._transformFromDb(null)).toBeNull();
  });
});

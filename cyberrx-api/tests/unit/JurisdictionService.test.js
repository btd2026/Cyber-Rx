'use strict';

/** JurisdictionService — derives applicable obligations from regions + data + industry. Pure. */

const J = require('../../src/services/crownjewels/JurisdictionService');

describe('JurisdictionService.derive', () => {
  test('EU + PII triggers GDPR with a 72h clock', () => {
    const out = J.derive({ regions: ['EU'], dataClasses: ['PII'] });
    const gdpr = out.obligations.find((o) => o.code === 'EU-GDPR');
    expect(gdpr).toBeTruthy();
    expect(gdpr.clock_hours).toBe(72);
  });

  test('binding clock is the tightest; financial services in Singapore → MAS 1h', () => {
    const out = J.derive({ regions: ['Singapore'], dataClasses: ['PII'], industry: 'financial services' });
    expect(out.binding.code).toBe('SG-MAS');
    expect(out.binding.clock_hours).toBe(1);
    // obligations are sorted by clock ascending
    for (let i = 1; i < out.obligations.length; i++) {
      expect(out.obligations[i].clock_hours).toBeGreaterThanOrEqual(out.obligations[i - 1].clock_hours);
    }
  });

  test('industry gate excludes DORA/MAS for a non-financial org', () => {
    const fin = J.derive({ regions: ['EU', 'Singapore'], dataClasses: ['PII'], industry: 'manufacturing' });
    expect(fin.obligations.find((o) => o.code === 'EU-DORA')).toBeFalsy();
    expect(fin.obligations.find((o) => o.code === 'SG-MAS')).toBeFalsy();
  });

  test('US always triggers SEC 8-K (appliesTo *), state laws only with personal data', () => {
    const noPersonal = J.derive({ regions: ['US'], dataClasses: ['IP'] });
    expect(noPersonal.obligations.find((o) => o.code === 'US-SEC')).toBeTruthy();
    expect(noPersonal.obligations.find((o) => o.code === 'US-STATE')).toBeFalsy();
    const withPii = J.derive({ regions: ['US'], dataClasses: ['PII'] });
    expect(withPii.obligations.find((o) => o.code === 'US-STATE')).toBeTruthy();
  });

  test('US-only org does NOT match Australia (substring "us" in "australia" must not trigger)', () => {
    const out = J.derive({ regions: ['US'], dataClasses: ['PII', 'PHI'] });
    expect(out.obligations.find((o) => o.code === 'AU-PRIV')).toBeFalsy();
    expect(out.obligations.find((o) => o.code === 'US-SEC')).toBeTruthy();
    expect(out.obligations.find((o) => o.code === 'US-STATE')).toBeTruthy();
    // only US regimes for a US-only footprint
    expect(out.obligations.every((o) => o.code.startsWith('US-'))).toBe(true);
  });

  test('region phrases still match on word boundaries (North America → US, Canada)', () => {
    const out = J.derive({ regions: ['North America'], dataClasses: ['PII'] });
    expect(out.obligations.find((o) => o.code === 'US-SEC')).toBeTruthy();
    expect(out.obligations.find((o) => o.code === 'CA-PIPEDA')).toBeTruthy();
    expect(out.obligations.find((o) => o.code === 'AU-PRIV')).toBeFalsy();
  });

  test('no regions → empty with a clear note', () => {
    const out = J.derive({ regions: [] });
    expect(out.count).toBe(0);
    expect(out.binding).toBeNull();
    expect(out.note).toMatch(/regions required/);
  });

  test('multi-region financial org: binding is the global minimum clock', () => {
    const out = J.derive({ regions: ['US', 'EU', 'UK', 'Singapore'], dataClasses: ['PII', 'financial'], industry: 'bank' });
    expect(out.binding.clock_hours).toBe(1); // MAS
    expect(out.count).toBeGreaterThan(4);
  });
});

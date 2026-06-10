'use strict';

// Mock the DB layer so the agent layer can be exercised without a database.
jest.mock('../../../src/utils/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const db = require('../../../src/utils/db');
const ExecutiveAgentService = require('../../../src/services/ExecutiveAgentService');

// Route each query to a canned result based on a substring of the SQL, so the
// deterministic synthesis has realistic primary-source data to summarize.
function wireQueries() {
  db.query.mockImplementation((sql) => {
    if (sql.includes('FROM financial_impacts')) return Promise.resolve([{ gross: 285000000, net: 235000000, insured: 50000000, n: 12 }]);
    if (sql.includes('financial_exposure') && sql.includes('FROM risks')) return Promise.resolve([{ exposure: 285000000, remediate: 4200000 }]);
    if (sql.includes('GROUP BY severity')) return Promise.resolve([{ severity: 'Critical', n: 3 }, { severity: 'High', n: 7 }]);
    if (sql.includes('GROUP BY status') && sql.includes('FROM risks')) return Promise.resolve([{ status: 'open', n: 10 }, { status: 'mitigating', n: 4 }, { status: 'accepted', n: 2 }]);
    if (sql.includes('ORDER BY CASE severity')) return Promise.resolve([
      { id: 'r1', title: 'Critical CVE on NASCO claims server', severity: 'Critical', status: 'open', financial_exposure: 217000000, executive_owner: 'CIO', remediation_owner: 'CISO', regulatory_citation: 'HIPAA 164.308' },
    ]);
    if (sql.includes('FROM legal_obligations lo')) return Promise.resolve([{ id: 'l1', name: 'OCR Breach Notification', source: 'HIPAA', citation: '164.404', notification_timeline: '60 days', max_penalty_amount: 1900000 }]);
    if (sql.includes('FROM legal_obligations WHERE')) return Promise.resolve([{ n: 9 }]);
    if (sql.includes('FROM threat_scenarios')) return Promise.resolve([{ id: 't1', name: 'LockBit ransomware', type: 'ransomware', probability: 62, impact_level: 'Critical', mitre_tactic: 'Impact' }]);
    if (sql.includes('FROM controls')) return Promise.resolve([{ n: 120, avg_eff: 74, implemented: 88, none_impl: 9 }]);
    if (sql.includes('FROM business_processes bp')) return Promise.resolve([{ id: 'p1', name: 'Claims Adjudication', tier: 'Primary', criticality: 'Critical', owner: 'CIO' }]);
    if (sql.includes('FROM business_processes')) return Promise.resolve([{ criticality: 'Critical', n: 5 }]);
    if (sql.includes('FROM remediation_tasks') && sql.includes('GROUP BY status')) return Promise.resolve([{ status: 'Pending', n: 6 }]);
    if (sql.includes('FROM remediation_tasks')) return Promise.resolve([{ n: 3 }]);
    if (sql.includes('is_repeat=true')) return Promise.resolve([{ n: 2 }]);
    if (sql.includes("severity IN ('Critical','High')")) return Promise.resolve([{ id: 'f1', title: 'Unpatched CVE', severity: 'Critical' }]);
    if (sql.includes('FROM vendor_risk_signals')) return Promise.resolve([{ severity: 'High', n: 2 }]);
    return Promise.resolve([]); // persistBrief INSERT / unknown
  });
}

describe('ExecutiveAgentService', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY; // force deterministic path
    wireQueries();
  });

  it('defines all six executive personas', () => {
    expect(ExecutiveAgentService.ROLE_KEYS).toEqual(['CFO', 'CRO', 'CLO', 'CIO', 'CISO', 'Board']);
    ExecutiveAgentService.ROLE_KEYS.forEach((role) => {
      expect(ExecutiveAgentService.ROLES[role].question).toBeTruthy();
      expect(ExecutiveAgentService.ROLES[role].deliverable).toBeTruthy();
    });
  });

  it('reports AI disabled when no key is configured', () => {
    expect(ExecutiveAgentService.aiEnabled()).toBe(false);
  });

  it('rejects invalid roles', () => {
    expect(ExecutiveAgentService.isValidRole('CEO')).toBe(false);
    expect(ExecutiveAgentService.isValidRole('CFO')).toBe(true);
  });

  it('generates a well-formed brief for every role from primary-source data', async () => {
    for (const role of ExecutiveAgentService.ROLE_KEYS) {
      const brief = await ExecutiveAgentService.generateBrief(role, 'org_test');
      expect(brief.role).toBe(role);
      expect(brief.source).toBe('deterministic');
      expect(['green', 'amber', 'red']).toContain(brief.status);
      expect(typeof brief.headline).toBe('string');
      expect(brief.headline.length).toBeGreaterThan(0);
      expect(Array.isArray(brief.metrics)).toBe(true);
      expect(Array.isArray(brief.highlights)).toBe(true);
      expect(Array.isArray(brief.actions)).toBe(true);
    }
  });

  it('quantifies CFO exposure in dollars and flags appetite breaches for CRO', async () => {
    const cfo = await ExecutiveAgentService.generateBrief('CFO', 'org_test');
    expect(cfo.headline).toMatch(/\$/);
    expect(cfo.deliverable).toMatch(/Financial exposure/i);

    const cro = await ExecutiveAgentService.generateBrief('CRO', 'org_test');
    // 3 critical risks => appetite breach => red status
    expect(cro.status).toBe('red');
    expect(cro.headline).toMatch(/critical/i);
  });

  it('surfaces triggered legal obligations for the CLO', async () => {
    const clo = await ExecutiveAgentService.generateBrief('CLO', 'org_test');
    expect(clo.headline).toMatch(/triggered/i);
    expect(clo.highlights.join(' ')).toMatch(/HIPAA/);
  });
});

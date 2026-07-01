'use strict';

const M = require('../../src/services/crownjewels/IngestMapper');

describe('IngestMapper.mapOnboarding', () => {
  const input = {
    org_name: 'Aflac',
    processes: [
      { name: 'Policy Administration', data: 'PII, Financial', rev: '$120M/day' },
      { name: 'Corporate Intranet', data: 'Internal', rev: '—' },
    ],
    apps: [
      { name: 'PolicyCenter', host: 'On-prem · single point of failure', data: 'PII, Financial' },
      { name: 'Confluence', host: 'SaaS', data: 'Internal docs' },
    ],
  };

  test('maps org + processes + assets into the canonical schema', () => {
    const out = M.mapOnboarding(input);
    expect(out.org).toEqual({ id: 'org_aflac', name: 'Aflac' });

    // processes -> tier/criticality enums
    const pa = out.processes.find((p) => p.name === 'Policy Administration');
    expect(pa.tier).toBe('Primary');
    expect(pa.criticality).toBe('Critical'); // has $ revenue
    expect(out.processes.find((p) => p.name === 'Corporate Intranet').criticality).toBe('Low');
    expect(pa.organizationId).toBe('org_aflac');

    // assets -> type + dataClassification + linked processes
    const pc = out.assets.find((a) => a.name === 'PolicyCenter');
    expect(pc.type).toBe('server');                 // on-prem
    expect(pc.dataClassification).toEqual(expect.arrayContaining(['PII', 'Financial']));
    expect(pc.businessProcessIds).toContain(pa.id); // linked by shared data class
    expect(pc.description).toMatch(/single point of failure/); // host kept for exposure derivation
  });

  test('field helpers', () => {
    expect(M.critFromRevData('$5M', '')).toBe('Critical');
    expect(M.critFromRevData('—', 'PHI')).toBe('Critical');
    expect(M.critFromRevData('—', 'PII')).toBe('High');
    expect(M.critFromRevData('—', 'Internal')).toBe('Low');
    expect(M.typeFromHost('Cloud · internet-facing')).toBe('cloud');
    expect(M.typeFromHost('Oracle DB')).toBe('database');
    expect(M.expoFromHost('SaaS · internet-facing')).toBe('internet_facing');
    expect(M.expoFromHost('On-prem datacenter')).toBe('internal_only');
    expect(M.dataClasses('PII, Financial')).toEqual(['PII', 'Financial']);
  });

  test('apps with no data overlap fall back to the most critical process', () => {
    const out = M.mapOnboarding({ org_name: 'X', processes: [{ name: 'Claims', data: 'PHI', rev: '$1/day' }], apps: [{ name: 'Mystery', host: 'cloud', data: 'Unknown' }] });
    expect(out.assets[0].businessProcessIds).toEqual([out.processes[0].id]);
  });
});

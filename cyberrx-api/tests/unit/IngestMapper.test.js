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

  test('explicit process→app mapping (by name) overrides the data-class heuristic', () => {
    const out = M.mapOnboarding({
      org_name: 'X',
      processes: [
        { name: 'Claims', data: 'PHI' },
        { name: 'Settlement', data: 'Financial' },
      ],
      // data overlaps Claims (PHI), but the user explicitly linked it to Settlement.
      apps: [{ name: 'ClaimsDB', host: 'db', data: 'PHI', processes: ['Settlement'] }],
    });
    const idByName = {}; out.processes.forEach((p) => { idByName[p.name] = p.id; });
    expect(out.assets[0].businessProcessIds).toEqual([idByName.Settlement]);
    expect(out.assets[0].businessProcessIds).not.toContain(idByName.Claims);
  });

  test('explicit mapping supports multiple processes and is case-insensitive by name', () => {
    const out = M.mapOnboarding({
      org_name: 'X',
      processes: [{ name: 'Claims', data: 'PHI' }, { name: 'Settlement', data: 'Financial' }],
      apps: [{ name: 'Core', host: 'server', data: '—', processes: ['claims', 'SETTLEMENT'] }],
    });
    expect(out.assets[0].businessProcessIds).toHaveLength(2);
    expect(out.assets[0].businessProcessIds).toEqual(out.processes.map((p) => p.id));
  });
});

describe('IngestMapper.mapRisks', () => {
  const mapped = M.mapOnboarding({
    org_name: 'Aflac',
    processes: [{ name: 'Claims Processing', data: 'PHI', rev: '$2.1B' }],
    apps: [{ name: 'ClaimsDB', host: 'oracle database on-prem', data: 'PHI' }, { name: 'MemberWeb', host: 'internet-facing cloud', data: 'PII' }],
  });

  test('links risks to assets/processes by name and normalizes enums + money', () => {
    const rows = M.mapRisks([
      { title: 'Ransomware path to claims database', severity: 'critical', status: 'open', asset: 'ClaimsDB', financial_exposure: '$52M' },
      { title: 'Internet exposure', severity: 'HIGH', asset: 'memberweb', exposure: '8000000', processes: ['Claims Processing'] },
    ], mapped);

    expect(rows).toHaveLength(2);
    const claimsAsset = mapped.assets.find((a) => a.name === 'ClaimsDB').id;
    expect(rows[0]).toMatchObject({ id: 'org_aflac_R1', title: 'Ransomware path to claims database', severity: 'Critical', status: 'open', assetId: claimsAsset, financialExposure: 52000000, organizationId: 'org_aflac' });
    // case-insensitive asset match + status defaults to open + $ parsed from plain number
    expect(rows[1].assetId).toBe(mapped.assets.find((a) => a.name === 'MemberWeb').id);
    expect(rows[1].severity).toBe('High');
    expect(rows[1].status).toBe('open');
    expect(rows[1].financialExposure).toBe(8000000);
    expect(rows[1].businessProcessIds).toEqual([mapped.processes[0].id]);
  });

  test('skips rows with no title; unknown asset name -> null link', () => {
    const rows = M.mapRisks([
      { title: '', severity: 'high' },
      { title: 'Orphan risk', asset: 'DoesNotExist', exposure: 'n/a' },
    ], mapped);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Orphan risk');
    expect(rows[0].assetId).toBeNull();
    expect(rows[0].financialExposure).toBeNull(); // non-numeric exposure
  });
});

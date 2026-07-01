'use strict';

const { ingestRegister, applyDeterministicRules, _extractThreatRefs, _prioritizeByTier, APPLICABILITY_RULES } = require('../../src/services/crownjewels/RiskMappingService');

describe('RiskMappingService', () => {
  describe('ingestRegister', () => {
    test('converts register risks to mappings with confidence 1.0', () => {
      const risks = [
        { id: 'R1', title: 'Ransomware', severity: 'Critical', assetId: 'A1', businessProcessIds: ['P1'], frameworkMappings: [] },
        { id: 'R2', title: 'Phishing', severity: 'High', assetId: 'A2', businessProcessIds: [], description: 'References T1566.001' },
      ];
      const mappings = ingestRegister('org1', risks);
      expect(mappings).toHaveLength(2);
      expect(mappings[0].origin).toBe('register');
      expect(mappings[0].confidence).toBe(1.0);
      expect(mappings[0].estimated).toBe(false);
      expect(mappings[0].asset_id).toBe('A1');
      expect(mappings[1].threat_refs).toContain('T1566.001');
    });

    test('skips risks with no id', () => {
      expect(ingestRegister('org1', [{ title: 'no-id' }])).toHaveLength(0);
    });
  });

  describe('_extractThreatRefs', () => {
    test('extracts technique IDs from framework mappings and descriptions', () => {
      const refs = _extractThreatRefs({
        frameworkMappings: ['MITRE T1486', 'T1490.001'],
        description: 'Also relates to T1078',
      });
      expect(refs).toEqual(expect.arrayContaining(['T1486', 'T1490.001', 'T1078']));
    });

    test('deduplicates refs', () => {
      const refs = _extractThreatRefs({ frameworkMappings: ['T1078'], description: 'T1078 again' });
      expect(refs).toHaveLength(1);
    });
  });

  describe('applyDeterministicRules', () => {
    test('internet-facing asset triggers external exposure rule', () => {
      const assets = [{ id: 'A1', name: 'Portal', exposure: 'internet_facing', type: 'application' }];
      const { mappings, newRisks } = applyDeterministicRules(assets, new Set());
      const match = mappings.find((m) => m.rule_id === 'rule-internet-facing');
      expect(match).toBeTruthy();
      expect(match.origin).toBe('threat_library');
      expect(match.confidence).toBe(0.85);
      expect(newRisks.find((r) => r.title === 'External Attack Surface Exposure')).toBeTruthy();
    });

    test('PHI data classification triggers regulated data breach rule', () => {
      const assets = [{ id: 'A2', name: 'EHR', data_classification: ['PHI'] }];
      const { mappings } = applyDeterministicRules(assets, new Set());
      expect(mappings.find((m) => m.rule_id === 'rule-phi-pii')).toBeTruthy();
    });

    test('skips rule when register already covers the threat ref', () => {
      const assets = [{ id: 'A1', name: 'Portal', exposure: 'internet_facing' }];
      const existing = new Set(['A1::T1190']);
      const { mappings } = applyDeterministicRules(assets, existing);
      expect(mappings.find((m) => m.rule_id === 'rule-internet-facing')).toBeFalsy();
    });

    test('tier1 crown jewel triggers APT rule', () => {
      const assets = [{ id: 'A3', name: 'CritDB', crown_jewel_tier: 'tier1' }];
      const { mappings } = applyDeterministicRules(assets, new Set());
      expect(mappings.find((m) => m.rule_id === 'rule-cj-apt')).toBeTruthy();
    });

    test('each mapping has a stored rationale', () => {
      const assets = [{ id: 'A1', name: 'DB', type: 'database' }];
      const { mappings } = applyDeterministicRules(assets, new Set());
      for (const m of mappings) {
        expect(m.rationale).toBeTruthy();
        expect(typeof m.rationale).toBe('string');
      }
    });
  });

  describe('_prioritizeByTier', () => {
    test('sorts tier1 before tier2 before none', () => {
      const assets = [
        { id: 'A1', crown_jewel_tier: 'none' },
        { id: 'A2', crown_jewel_tier: 'tier1' },
        { id: 'A3', crown_jewel_tier: 'tier2' },
      ];
      const sorted = _prioritizeByTier(assets);
      expect(sorted.map((a) => a.id)).toEqual(['A2', 'A3', 'A1']);
    });
  });

  test('APPLICABILITY_RULES has at least 10 rules with MITRE refs', () => {
    expect(APPLICABILITY_RULES.length).toBeGreaterThanOrEqual(10);
    const withRefs = APPLICABILITY_RULES.filter((r) => r.riskTemplate.threat_refs.length > 0);
    expect(withRefs.length).toBeGreaterThanOrEqual(10);
  });
});

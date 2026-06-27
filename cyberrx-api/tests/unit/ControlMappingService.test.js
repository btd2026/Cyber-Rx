'use strict';

const { classifyImpactLevel, selectBaselineControls, mapRiskDrivenControls, propagateToCsf, BASELINE_FAMILIES } = require('../../src/services/crownjewels/ControlMappingService');

describe('ControlMappingService', () => {
  describe('classifyImpactLevel', () => {
    test('PHI data -> high', () => {
      const { impact_level, rationale } = classifyImpactLevel({ id: 'A1', name: 'EHR', data_classification: ['PHI'] });
      expect(impact_level).toBe('high');
      expect(rationale).toMatch(/high-sensitivity/);
    });

    test('Financial data -> moderate', () => {
      const { impact_level } = classifyImpactLevel({ id: 'A2', name: 'ERP', data_classification: ['Financial'] });
      expect(impact_level).toBe('moderate');
    });

    test('Internal-only -> low', () => {
      const { impact_level } = classifyImpactLevel({ id: 'A3', name: 'Intranet', data_classification: ['Internal'] });
      expect(impact_level).toBe('low');
    });

    test('tier1 crown jewel bumps to high regardless of data', () => {
      const { impact_level, rationale } = classifyImpactLevel({ id: 'A4', name: 'Core', data_classification: ['Internal'], crown_jewel_tier: 'tier1' });
      expect(impact_level).toBe('high');
      expect(rationale).toMatch(/crown-jewel tier1/);
    });

    test('internet-facing with regulated data -> high', () => {
      const { impact_level } = classifyImpactLevel({ id: 'A5', name: 'Portal', data_classification: ['PII'], exposure: 'internet_facing' });
      expect(impact_level).toBe('high');
    });

    test('no data classification -> low by default', () => {
      const { impact_level } = classifyImpactLevel({ id: 'A6', name: 'Test' });
      expect(impact_level).toBe('low');
    });
  });

  describe('selectBaselineControls', () => {
    const mockCorpus = [
      { framework: 'NIST_SP_800-53', control_id: 'AC-1', family: 'AC' },
      { framework: 'NIST_SP_800-53', control_id: 'AC-2', family: 'AC' },
      { framework: 'NIST_SP_800-53', control_id: 'AC-2(1)', family: 'AC' },
      { framework: 'NIST_SP_800-53', control_id: 'PM-1', family: 'PM' },
      { framework: 'NIST_SP_800-53', control_id: 'SI-1', family: 'SI' },
    ];

    test('low: base controls from baseline families only, no enhancements', () => {
      const ids = selectBaselineControls('low', mockCorpus);
      expect(ids).toContain('AC-1');
      expect(ids).toContain('AC-2');
      expect(ids).toContain('SI-1');
      expect(ids).not.toContain('AC-2(1)');
      expect(ids).not.toContain('PM-1');
    });

    test('moderate: all base controls including PM', () => {
      const ids = selectBaselineControls('moderate', mockCorpus);
      expect(ids).toContain('PM-1');
      expect(ids).not.toContain('AC-2(1)');
    });

    test('high: everything including enhancements', () => {
      const ids = selectBaselineControls('high', mockCorpus);
      expect(ids).toContain('AC-2(1)');
      expect(ids).toContain('PM-1');
    });
  });

  describe('mapRiskDrivenControls', () => {
    const corpus = [
      { framework: 'NIST_SP_800-53', control_id: 'IA-1', family: 'IA' },
      { framework: 'NIST_SP_800-53', control_id: 'SC-1', family: 'SC' },
      { framework: 'NIST_SP_800-53', control_id: 'IR-1', family: 'IR' },
    ];

    test('maps credential-related risk to IA family', () => {
      const riskMappings = [{ risk_id: 'R1', asset_id: 'A1', category: 'Credential Compromise' }];
      const result = mapRiskDrivenControls(riskMappings, corpus);
      expect(result.some((r) => r.control_id === 'IA-1')).toBe(true);
      expect(result[0].basis).toBe('risk_driven');
    });

    test('maps network-related risk to SC family', () => {
      const riskMappings = [{ risk_id: 'R2', asset_id: 'A2', category: 'Network Security' }];
      const result = mapRiskDrivenControls(riskMappings, corpus);
      expect(result.some((r) => r.control_id === 'SC-1')).toBe(true);
    });

    test('maps incident-related risk to IR family', () => {
      const riskMappings = [{ risk_id: 'R3', asset_id: 'A3', category: 'incident response' }];
      const result = mapRiskDrivenControls(riskMappings, corpus);
      expect(result.some((r) => r.control_id === 'IR-1')).toBe(true);
    });
  });

  describe('BASELINE_FAMILIES', () => {
    test('low has 17 families', () => {
      expect(BASELINE_FAMILIES.low).toHaveLength(17);
    });

    test('moderate includes PM', () => {
      expect(BASELINE_FAMILIES.moderate).toContain('PM');
    });

    test('high same as moderate', () => {
      expect(BASELINE_FAMILIES.high).toEqual(BASELINE_FAMILIES.moderate);
    });
  });
});

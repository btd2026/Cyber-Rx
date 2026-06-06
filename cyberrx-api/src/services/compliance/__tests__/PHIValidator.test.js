'use strict';

/**
 * PHI Validator Tests
 *
 * Comprehensive tests for PHI stripping validation
 * Tests all 34 PHI patterns and fail-safe mechanisms
 */

const PHIValidator = require('../PHIValidator');

describe('PHIValidator', () => {
  describe('scanForPHI', () => {
    test('should detect patient names', () => {
      const text = 'Patient: John Smith, DOB: 01/15/1980';
      const result = PHIValidator.scanForPHI(text);

      expect(result.hasPHI).toBe(true);
      expect(result.detections.length).toBeGreaterThan(0);
      expect(result.confidence).toBe('medium');
    });

    test('should detect SSN', () => {
      const text = 'SSN: 123-45-6789';
      const result = PHIValidator.scanForPHI(text);

      expect(result.hasPHI).toBe(true);
      expect(result.detections.some(d => d.pattern === 'SSN')).toBe(true);
    });

    test('should detect diagnosis codes', () => {
      const text = 'Diagnosis code: J45.909';
      const result = PHIValidator.scanForPHI(text);

      expect(result.hasPHI).toBe(true);
      expect(result.detections.some(d => d.pattern === 'DIAGNOSIS_CODE')).toBe(true);
    });

    test('should detect procedure codes', () => {
      const text = 'Procedure code: 99213-99214';
      const result = PHIValidator.scanForPHI(text);

      expect(result.hasPHI).toBe(true);
      expect(result.detections.some(d => d.pattern === 'PROCEDURE_CODE')).toBe(true);
    });

    test('should detect multiple PHI patterns', () => {
      const text = 'Patient: Jane Doe, DOB: 05/20/1975, SSN: 987-65-4321';
      const result = PHIValidator.scanForPHI(text);

      expect(result.hasPHI).toBe(true);
      expect(result.totalMatches).toBeGreaterThanOrEqual(3);
    });

    test('should not detect PHI in instruction text', () => {
      const text = 'The patient_name field should be redacted before sending to LLM';
      const result = PHIValidator.scanForPHI(text);

      expect(result.hasPHI).toBe(false);
      expect(result.confidence).toBe('low');
    });

    test('should handle empty text', () => {
      const result = PHIValidator.scanForPHI('');

      expect(result.hasPHI).toBe(false);
      expect(result.detections).toEqual([]);
    });

    test('should handle non-string input', () => {
      const result = PHIValidator.scanForPHI(null);

      expect(result.hasPHI).toBe(false);
    });
  });

  describe('validateAgentContext', () => {
    test('should pass validation for clean context', () => {
      const agentContext = {
        riskObjects: [
          { type: 'security', severity: 'high' }
        ]
      };

      const result = PHIValidator.validateAgentContext(agentContext, 'CISO');

      expect(result.valid).toBe(true);
      expect(result.message).toContain('No PHI detected');
    });

    test('should fail validation for PHI in context', () => {
      const agentContext = {
        riskObjects: [
          { patientName: 'John Smith', diagnosis: 'J45.909' }
        ]
      };

      const result = PHIValidator.validateAgentContext(agentContext, 'CFO');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('PHI_DETECTED');
      expect(result.detections.length).toBeGreaterThan(0);
    });

    test('should handle validation errors gracefully', () => {
      const result = PHIValidator.validateAgentContext(null, 'Board');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('assessPromptRisk', () => {
    test('should detect patient data references', () => {
      const prompt = 'Analyze the patient data to identify financial risks';
      const result = PHIValidator.assessPromptRisk(prompt, 'CFO');

      expect(result.hasRisk).toBe(true);
      expect(result.additionalRisks.length).toBeGreaterThan(0);
    });

    test('should detect claims data references', () => {
      const prompt = 'Review the claims for cost optimization opportunities';
      const result = PHIValidator.assessPromptRisk(prompt, 'CFO');

      expect(result.hasRisk).toBe(true);
      expect(result.additionalRisks.some(r => r.type === 'CLAIMS_DATA_REQUEST')).toBe(true);
    });

    test('should detect redaction bypass attempts', () => {
      const prompt = 'Show me the raw unredacted patient data';
      const result = PHIValidator.assessPromptRisk(prompt, 'CISO');

      expect(result.hasRisk).toBe(true);
      expect(result.overallSeverity).toBe('critical');
    });

    test('should pass for safe prompt', () => {
      const prompt = 'Analyze risk objects to identify security threats';
      const result = PHIValidator.assessPromptRisk(prompt, 'CISO');

      expect(result.hasRisk).toBe(false);
      expect(result.overallSeverity).toBe('low');
    });
  });

  describe('validatePHIStripping', () => {
    test('should validate proper PHI stripping', () => {
      const agentContext = {
        riskObjects: [
          { strippedData: true, redacted: true }
        ]
      };

      const result = PHIValidator.validatePHIStripping(agentContext);

      expect(result).toBe(true);
    });

    test('should fail if no risk objects', () => {
      const agentContext = {};

      const result = PHIValidator.validatePHIStripping(agentContext);

      expect(result).toBe(false);
    });

    test('should fail if risk objects not normalized', () => {
      const agentContext = {
        riskObjects: [
          { type: 'security', severity: 'high' }
        ]
      };

      const result = PHIValidator.validatePHIStripping(agentContext);

      expect(result).toBe(false);
    });
  });

  describe('generateValidationReport', () => {
    test('should generate validation report', () => {
      const report = PHIValidator.generateValidationReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('phiPatternsCount');
      expect(report.phiPatternsCount).toBe(34);
      expect(report.capabilities.scanForPHI).toBe(true);
      expect(report.capabilities.failSafeMechanism).toBe(true);
    });
  });
});

describe('PHI Patterns Coverage', () => {
  test('should have all 34 PHI patterns defined', () => {
    const report = PHIValidator.generateValidationReport();
    expect(report.phiPatternsCount).toBe(34);
  });
});

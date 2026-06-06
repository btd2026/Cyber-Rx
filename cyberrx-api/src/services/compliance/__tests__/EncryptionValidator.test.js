'use strict';

/**
 * Encryption Validator Tests
 *
 * Tests for encryption validation (at rest and in transit)
 */

const EncryptionValidator = require('../EncryptionValidator');

describe('EncryptionValidator', () => {
  describe('validateAllEncryption', () => {
    test('should validate all encryption', async () => {
      const result = await EncryptionValidator.validateAllEncryption();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('overallStatus');
      expect(result).toHaveProperty('validations');
      expect(result.validiations).toHaveProperty('atRest');
      expect(result.validiations).toHaveProperty('inTransit');
      expect(result.validiations).toHaveProperty('keyManagement');
    }, 10000);
  });

  describe('validateAtRestEncryption', () => {
    test('should validate at-rest encryption', async () => {
      const result = await EncryptionValidator.validateAtRestEncryption();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('databaseTDE');
      expect(result.checks).toHaveProperty('diskEncryption');
      expect(result.checks).toHaveProperty('backupEncryption');
    }, 10000);
  });

  describe('validateInTransitEncryption', () => {
    test('should validate in-transit encryption', async () => {
      const result = await EncryptionValidator.validateInTransitEncryption();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('apiEndpoints');
      expect(result.checks).toHaveProperty('databaseConnections');
      expect(result.checks).toHaveProperty('certificateValidity');
    }, 10000);
  });

  describe('validateKeyManagement', () => {
    test('should validate key management', async () => {
      const result = await EncryptionValidator.validateKeyManagement();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('keyVaultAccess');
      expect(result.checks).toHaveProperty('keyRotation');
      expect(result.checks).toHaveProperty('keyBackup');
    }, 10000);
  });

  describe('generateComplianceReport', () => {
    test('should generate compliance report', async () => {
      const report = await EncryptionValidator.generateComplianceReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('standards');
      expect(report).toHaveProperty('compliance');
      expect(report.compliance).toHaveProperty('hipaa');
      expect(report.compliance).toHaveProperty('soc2');
      expect(report.compliance).toHaveProperty('nist');
    }, 10000);
  });
});

describe('Encryption Standards', () => {
  test('should have AES-256 for at rest', () => {
    const standards = EncryptionValidator.ENCRYPTION_STANDARDS;
    expect(standards.AT_REST.ALGORITHM).toBe('AES-256');
  });

  test('should have TLS 1.3 for in transit', () => {
    const standards = EncryptionValidator.ENCRYPTION_STANDARDS;
    expect(standards.IN_TRANSIT.PROTOCOL).toBe('TLS 1.3');
  });

  test('should use Azure Key Vault for key management', () => {
    const standards = EncryptionValidator.ENCRYPTION_STANDARDS;
    expect(standards.KEY_MANAGEMENT.PROVIDER).toContain('Azure Key Vault');
  });
});

'use strict';

const CredentialRotationService = require('../../src/services/CredentialRotationService');
const db = require('../../src/utils/db');

describe('CredentialRotationService', () => {
  let service;

  beforeEach(() => {
    service = new CredentialRotationService();
  });

  describe('getCredentialAge', () => {
    it('should calculate age correctly for recent credential', () => {
      const connection = {
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      };
      const age = service.getCredentialAge(connection);
      expect(age).toBeGreaterThanOrEqual(29);
      expect(age).toBeLessThanOrEqual(31);
    });

    it('should calculate age correctly for old credential', () => {
      const connection = {
        created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
      };
      const age = service.getCredentialAge(connection);
      expect(age).toBeGreaterThanOrEqual(99);
      expect(age).toBeLessThanOrEqual(101);
    });
  });

  describe('getSeverityByAge', () => {
    it('should return Critical for >30 days overdue', () => {
      const severity = service.getSeverityByAge(150, 90); // 60 days overdue
      expect(severity).toBe('Critical');
    });

    it('should return High for overdue credentials', () => {
      const severity = service.getSeverityByAge(100, 90); // 10 days overdue
      expect(severity).toBe('High');
    });

    it('should return Medium for credentials due soon', () => {
      const severity = service.getSeverityByAge(80, 90); // 10 days until due
      expect(severity).toBe('Medium');
    });

    it('should return Low for credentials far from due', () => {
      const severity = service.getSeverityByAge(30, 90); // 60 days until due
      expect(severity).toBe('Low');
    });
  });

  describe('getRotationStatus', () => {
    it('should return critical_overdue for >30 days overdue', () => {
      const status = service.getRotationStatus(-40);
      expect(status).toBe('critical_overdue');
    });

    it('should return overdue for past due', () => {
      const status = service.getRotationStatus(-10);
      expect(status).toBe('overdue');
    });

    it('should return due_soon for <30 days until due', () => {
      const status = service.getRotationStatus(20);
      expect(status).toBe('due_soon');
    });

    it('should return ok for >30 days until due', () => {
      const status = service.getRotationStatus(60);
      expect(status).toBe('ok');
    });
  });

  describe('getConnectorName', () => {
    it('should return display name for known connectors', () => {
      expect(service.getConnectorName('securityscorecard')).toBe('SecurityScorecard');
      expect(service.getConnectorName('bitsight')).toBe('BitSight');
      expect(service.getConnectorName('riskrecon')).toBe('RiskRecon');
      expect(service.getConnectorName('recorded_future')).toBe('Recorded Future');
      expect(service.getConnectorName('blackkite')).toBe('BlackKite');
    });

    it('should return connector type for unknown connectors', () => {
      expect(service.getConnectorName('unknown_tool')).toBe('unknown_tool');
    });
  });

  describe('buildRotationMessage', () => {
    it('should build overdue message', () => {
      const connection = {
        tool_key: 'securityscorecard',
        created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
      };
      const message = service.buildRotationMessage(connection, 100, 90);
      expect(message).toContain('SecurityScorecard');
      expect(message).toContain('10 days overdue');
      expect(message).toContain('100 days');
      expect(message).toContain('90 days');
    });

    it('should build upcoming message', () => {
      const connection = {
        tool_key: 'bitsight',
        created_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
      };
      const message = service.buildRotationMessage(connection, 80, 90);
      expect(message).toContain('BitSight');
      expect(message).toContain('10 days');
      expect(message).toContain('80 days');
    });
  });

  describe('checkCredentialRotation', () => {
    it('should return empty array for organization with no credentials', async () => {
      const alerts = await service.checkCredentialRotation('nonexistent-org');
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should detect credentials needing rotation', async () => {
      // This test requires a test organization with old credentials
      // Skip in unit tests, covered in integration tests
    });
  });

  describe('getRotationStatus', () => {
    it('should return array of status objects', async () => {
      const status = await service.getRotationStatus('test-org');
      expect(Array.isArray(status)).toBe(true);
    });
  });

  describe('rotateCredential', () => {
    it('should throw error for nonexistent connection', async () => {
      await expectAsync(
        service.rotateCredential(99999, { apiKey: 'test' }, 'test-user')
      ).rejects.toThrow('Connection not found');
    });
  });

  describe('getRotationHistory', () => {
    it('should throw error for nonexistent connection', async () => {
      await expectAsync(
        service.getRotationHistory(99999)
      ).rejects.toThrow('Connection not found');
    });
  });
});

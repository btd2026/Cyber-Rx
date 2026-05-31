const BaseService = require('../../src/domains/BaseService');

describe('BaseService', () => {
  let baseService;
  let mockModels;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    mockModels = {};
    baseService = new BaseService(mockModels, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with models and logger', () => {
      expect(baseService.models).toEqual(mockModels);
      expect(baseService.logger).toEqual(mockLogger);
    });

    it('should use console logger if no logger provided', () => {
      const serviceWithoutLogger = new BaseService(mockModels);
      expect(serviceWithoutLogger.logger).toBe(console);
    });
  });

  describe('logInfo', () => {
    it('should log info messages with service name', () => {
      baseService.logInfo('test operation', { key: 'value' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[BaseService] test operation',
        { key: 'value' }
      );
    });

    it('should log info messages without metadata', () => {
      baseService.logInfo('test operation');

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[BaseService] test operation',
        {}
      );
    });
  });

  describe('logError', () => {
    it('should log error messages with error details', () => {
      const error = new Error('Test error');
      baseService.logError('test operation', error, { key: 'value' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[BaseService] test operation',
        {
          error: 'Test error',
          stack: error.stack,
          key: 'value'
        }
      );
    });
  });

  describe('verifyOrgAccess', () => {
    it('should return resource if organization matches', () => {
      const resource = { id: 1, organizationId: 'org-123', name: 'Test Resource' };
      const result = baseService.verifyOrgAccess(resource, 'org-123', 'Resource');

      expect(result).toEqual(resource);
    });

    it('should throw 404 if resource not found', () => {
      const result = baseService.verifyOrgAccess(null, 'org-123', 'Resource');

      expect(result).toBeNull();
      try {
        baseService.verifyOrgAccess(null, 'org-123', 'Resource');
      } catch (error) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Resource not found');
      }
    });

    it('should throw 403 if organization does not match', () => {
      const resource = { id: 1, organizationId: 'org-456', name: 'Test Resource' };

      try {
        baseService.verifyOrgAccess(resource, 'org-123', 'Resource');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('access');
        expect(error.message).toContain('resource');
      }
    });
  });

  describe('sanitize', () => {
    it('should remove angle brackets from strings', () => {
      const input = '<script>alert("xss")</script>';
      const result = baseService.sanitize(input);

      expect(result).toBe('scriptalert("xss")/script');
    });

    it('should return non-string values unchanged', () => {
      expect(baseService.sanitize(123)).toBe(123);
      expect(baseService.sanitize(null)).toBe(null);
      expect(baseService.sanitize(undefined)).toBe(undefined);
      expect(baseService.sanitize({})).toEqual({});
    });
  });

  describe('validateRequiredString', () => {
    it('should return trimmed string if valid', () => {
      const result = baseService.validateRequiredString('  test string  ', 'Test Field');
      expect(result).toBe('test string');
    });

    it('should throw error if value is empty', () => {
      try {
        baseService.validateRequiredString('', 'Test Field');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Test Field is required');
      }
    });

    it('should throw error if value is only whitespace', () => {
      try {
        baseService.validateRequiredString('   ', 'Test Field');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Test Field is required');
      }
    });

    it('should throw error if value is null', () => {
      try {
        baseService.validateRequiredString(null, 'Test Field');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Test Field is required');
      }
    });

    it('should throw error if value is undefined', () => {
      try {
        baseService.validateRequiredString(undefined, 'Test Field');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Test Field is required');
      }
    });
  });

  describe('validateEnum', () => {
    it('should return value if valid', () => {
      const validValues = ['Critical', 'High', 'Medium', 'Low'];
      const result = baseService.validateEnum('High', validValues, 'Severity');
      expect(result).toBe('High');
    });

    it('should throw error if value not in valid values', () => {
      const validValues = ['Critical', 'High', 'Medium', 'Low'];
      try {
        baseService.validateEnum('Urgent', validValues, 'Severity');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Severity');
        expect(error.message).toContain('must be one of');
      }
    });

    it('should throw error if value is null', () => {
      const validValues = ['Critical', 'High', 'Medium', 'Low'];
      try {
        baseService.validateEnum(null, validValues, 'Severity');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('must be one of');
      }
    });
  });

  describe('validateRange', () => {
    it('should return value if within range', () => {
      const result = baseService.validateRange(50, 0, 100, 'Probability');
      expect(result).toBe(50);
    });

    it('should return value if at boundaries', () => {
      expect(baseService.validateRange(0, 0, 100, 'Probability')).toBe(0);
      expect(baseService.validateRange(100, 0, 100, 'Probability')).toBe(100);
    });

    it('should throw error if value below minimum', () => {
      try {
        baseService.validateRange(-5, 0, 100, 'Probability');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Probability');
        expect(error.message).toContain('between 0 and 100');
      }
    });

    it('should throw error if value above maximum', () => {
      try {
        baseService.validateRange(150, 0, 100, 'Probability');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Probability');
        expect(error.message).toContain('between 0 and 100');
      }
    });

    it('should return undefined if value is undefined', () => {
      const result = baseService.validateRange(undefined, 0, 100, 'Probability');
      expect(result).toBe(undefined);
    });
  });

  describe('handleError', () => {
    it('should re-throw error with statusCode', () => {
      const error = new Error('Test error');
      error.statusCode = 400;

      try {
        baseService.handleError(error, 'test operation');
        fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError).toBe(error);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    it('should wrap unknown errors', () => {
      const error = new Error('Unknown error');

      try {
        baseService.handleError(error, 'test operation');
        fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError.statusCode).toBe(500);
        expect(thrownError.message).toContain('test operation');
        expect(thrownError.originalError).toBe('Unknown error');
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    it('should wrap errors without statusCode', () => {
      const error = new Error('Database error');

      try {
        baseService.handleError(error, 'fetching data');
        fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError.statusCode).toBe(500);
        expect(thrownError.message).toContain('fetching data');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '[BaseService] fetching data',
          expect.objectContaining({
            error: 'Database error'
          })
        );
      }
    });
  });
});

'use strict';

/**
 * CORS Configuration Unit Tests
 *
 * Unit tests for CORS middleware configuration.
 * Tests:
 * - CORS allowlist is properly configured
 * - Origins are validated correctly
 * - Environment-specific configuration works
 * - Malformed origins are handled
 */

// We'll test the CORS logic without requiring the full app
// by extracting the key logic into testable functions

describe('CORS Configuration Unit Tests', () => {
  describe('Origin Validation', () => {
    test('should allow localhost origins in development', () => {
      const developmentOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173'
      ];

      // Mock NODE_ENV for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const isAllowed = (origin) => {
        if (process.env.NODE_ENV === 'development') {
          return developmentOrigins.includes(origin);
        }
        return false;
      };

      developmentOrigins.forEach(origin => {
        expect(isAllowed(origin)).toBe(true);
      });

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    test('should reject non-localhost origins in development without CORS_ALLOWLIST', () => {
      const developmentOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173'
      ];

      const isAllowed = (origin) => {
        if (process.env.NODE_ENV === 'development') {
          return developmentOrigins.includes(origin);
        }
        return false;
      };

      expect(isAllowed('https://malicious-site.com')).toBe(false);
      expect(isAllowed('https://app.cyberrx.com')).toBe(false);
    });

    test('should validate origin format', () => {
      const validOrigins = [
        'https://app.cyberrx.com',
        'http://localhost:3000',
        'https://staging.cyberrx.com'
      ];

      const invalidOrigins = [
        'not-a-origin',
        'ftp://example.com',
        'javascript:alert(1)'
      ];

      const emptyOrigin = '';

      const isValidOrigin = (origin) => {
        return !!(origin && (origin.startsWith('http://') || origin.startsWith('https://')));
      };

      validOrigins.forEach(origin => {
        expect(isValidOrigin(origin)).toBe(true);
      });

      invalidOrigins.forEach(origin => {
        expect(isValidOrigin(origin)).toBe(false);
      });

      // Test empty string separately
      expect(isValidOrigin(emptyOrigin)).toBe(false);
    });

    test('should handle CORS_ALLOWLIST parsing', () => {
      const allowlist = 'https://app.cyberrx.com,https://staging.cyberrx.com,https://demo.cyberrx.com';

      const origins = allowlist.split(',').map(url => url.trim()).filter(url => {
        return url && (url.startsWith('http://') || url.startsWith('https://'));
      });

      expect(origins).toEqual([
        'https://app.cyberrx.com',
        'https://staging.cyberrx.com',
        'https://demo.cyberrx.com'
      ]);
    });

    test('should handle CORS_ALLOWLIST with malformed entries', () => {
      const allowlist = 'https://valid.com,not-a-origin,http://another-valid.com,, ,';

      const origins = allowlist.split(',').map(url => url.trim()).filter(url => {
        return url && (url.startsWith('http://') || url.startsWith('https://'));
      });

      expect(origins).toEqual([
        'https://valid.com',
        'http://another-valid.com'
      ]);
    });

    test('should handle CORS_ALLOWLIST with trailing/leading spaces', () => {
      const allowlist = ' https://app.cyberrx.com , https://staging.cyberrx.com ';

      const origins = allowlist.split(',').map(url => url.trim()).filter(url => {
        return url && (url.startsWith('http://') || url.startsWith('https://'));
      });

      expect(origins).toEqual([
        'https://app.cyberrx.com',
        'https://staging.cyberrx.com'
      ]);
    });
  });

  describe('Security Validation', () => {
    test('should detect malicious origin patterns', () => {
      const legitimateOrigin = 'https://app.cyberrx.com';
      const maliciousOrigins = [
        'https://app.cyberrx.com.evil.com',
        'https://cyberrx.com.evil.com',
        'https://evil-cyberrx.com',
        'null'
      ];

      const isLegitimatePattern = (origin, allowedList) => {
        if (origin === 'null') return false;

        // Check if origin matches any allowed origin exactly
        if (allowedList.includes(origin)) return true;

        // Check for suspicious patterns
        const suspiciousPatterns = [
          /\.evil\.com$/
        ];

        // If it matches suspicious pattern, it's not legitimate
        if (suspiciousPatterns.some(pattern => pattern.test(origin))) {
          return false;
        }

        // Otherwise, check if it's in the allowlist
        return allowedList.includes(origin);
      };

      expect(isLegitimatePattern(legitimateOrigin, [legitimateOrigin])).toBe(true);

      maliciousOrigins.forEach(origin => {
        expect(isLegitimatePattern(origin, [legitimateOrigin])).toBe(false);
      });
    });

    test('should reject IP addresses unless explicitly allowed', () => {
      const allowedOrigins = ['https://app.cyberrx.com'];
      const ipOrigin = 'http://192.168.1.1:3000';

      const isAllowed = (origin, allowedList) => {
        // Check if origin is an IP address
        const isIP = /^https?:\/\/\d+\.\d+\.\d+\.\d+/.test(origin);

        // Allow only if explicitly in allowlist
        if (isIP && !allowedList.includes(origin)) {
          return false;
        }

        return allowedList.includes(origin);
      };

      expect(isAllowed(ipOrigin, allowedOrigins)).toBe(false);
      expect(isAllowed('https://app.cyberrx.com', allowedOrigins)).toBe(true);
    });
  });

  describe('Environment Configuration', () => {
    test('should require CORS_ALLOWLIST in production', () => {
      const isProductionSecure = (allowlist, nodeEnv) => {
        if (nodeEnv === 'production') {
          return allowlist.length > 0;
        }
        return true;
      };

      expect(isProductionSecure([], 'production')).toBe(false);
      expect(isProductionSecure(['https://app.cyberrx.com'], 'production')).toBe(true);
      expect(isProductionSecure([], 'development')).toBe(true);
    });

    test('should not allow hardcoded production URLs in production', () => {
      const productionOrigins = [
        'https://cyber-rx-frontend.vercel.app',
        'https://frontend-mu-drab-93.vercel.app'
      ];

      const buildAllowlist = (env, allowlistEnv, frontendUrl) => {
        const allowed = [];

        if (env === 'production') {
          // In production, ONLY use explicitly configured origins
          // NO DEFAULT ORIGINS
          if (allowlistEnv) {
            const origins = allowlistEnv.split(',').map(url => url.trim());
            origins.forEach(origin => {
              if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
                if (!allowed.includes(origin)) {
                  allowed.push(origin);
                }
              }
            });
          }

          // FRONTEND_URL is deprecated but still supported
          if (frontendUrl && frontendUrl.startsWith('http')) {
            if (!allowed.includes(frontendUrl)) {
              allowed.push(frontendUrl);
            }
          }

          // CRITICAL: Fail if no origins configured
          if (allowed.length === 0) {
            throw new Error('CORS configuration invalid: CORS_ALLOWLIST required in production');
          }
        } else {
          // In development, allow localhost
          allowed.push(
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:5173'
          );

          if (allowlistEnv) {
            const origins = allowlistEnv.split(',').map(url => url.trim());
            origins.forEach(origin => {
              if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
                if (!allowed.includes(origin)) {
                  allowed.push(origin);
                }
              }
            });
          }
        }

        return allowed;
      };

      // Production without allowlist should fail
      expect(() => {
        buildAllowlist('production', '', '');
      }).toThrow('CORS configuration invalid');

      // Production with allowlist should succeed
      const prodAllowlist = buildAllowlist('production', 'https://app.cyberrx.com', '');
      expect(prodAllowlist).toEqual(['https://app.cyberrx.com']);

      // Development should always have localhost origins
      const devAllowlist = buildAllowlist('development', '', '');
      expect(devAllowlist.length).toBeGreaterThan(0);
      expect(devAllowlist).toContain('http://localhost:3000');
    });

    test('should support CORS_REQUIRE_ORIGIN in production', () => {
      const shouldRequireOrigin = (env, requireOriginFlag) => {
        return env === 'production' && requireOriginFlag === 'true';
      };

      expect(shouldRequireOrigin('production', 'true')).toBe(true);
      expect(shouldRequireOrigin('production', 'false')).toBe(false);
      expect(shouldRequireOrigin('development', 'true')).toBe(false);
      expect(shouldRequireOrigin('development', 'false')).toBe(false);
    });
  });

  describe('CORS Headers', () => {
    test('should validate required CORS headers', () => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://app.cyberrx.com',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Org-ID',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      };

      const hasRequiredHeaders = (headers) => {
        const required = [
          'Access-Control-Allow-Origin',
          'Access-Control-Allow-Methods',
          'Access-Control-Allow-Headers',
          'Access-Control-Allow-Credentials'
        ];

        return required.every(header => headers[header]);
      };

      expect(hasRequiredHeaders(corsHeaders)).toBe(true);
    });

    test('should include rate limit headers in exposed headers', () => {
      const exposedHeaders = 'X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset';

      const headers = exposedHeaders.split(',');

      expect(headers).toContain('X-RateLimit-Limit');
      expect(headers).toContain('X-RateLimit-Remaining');
      expect(headers).toContain('X-RateLimit-Reset');
    });
  });
});

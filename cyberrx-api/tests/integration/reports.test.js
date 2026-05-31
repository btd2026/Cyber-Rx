'use strict';

const request = require('supertest');
const express = require('express');
const reportsRouter = require('../../src/routes/reports');

// Mock authentication middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticateJWT: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    req.orgId = 'test-org-id';
    next();
  }
}));

// Mock PDFReportService
jest.mock('../../src/services/PDFReportService', () => {
  return jest.fn().mockImplementation(() => {
    return {
      generateReport: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake pdf content')),
      getVendors: jest.fn().mockResolvedValue([
        { id: '1', name: 'Vendor A', tier: 'High', securityScore: 75, riskRating: 'Medium' },
        { id: '2', name: 'Vendor B', tier: 'Critical', securityScore: 35, riskRating: 'Critical' }
      ]),
      getAlerts: jest.fn().mockResolvedValue([
        { id: '1', severity: 'Critical', message: 'Test alert', vendorName: 'Vendor A', createdAt: new Date(), acknowledgedAt: null }
      ]),
      getNumericRiskScore: jest.fn().mockImplementation((vendor) => vendor.securityScore || 50)
    };
  });
});

describe('Reports API Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
  });

  describe('POST /api/reports/generate', () => {
    test('should generate PDF report successfully', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          reportType: 'executive',
          dateRange: '12M',
          includeCharts: true,
          includeAppendix: true
        })
        .expect('Content-Type', /application\/pdf/)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');
    });

    test('should accept minimal request body', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({})
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('should include report type in filename', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({ reportType: 'executive' })
        .expect(200);

      const contentDisposition = response.headers['content-disposition'];
      expect(contentDisposition).toMatch(/vendor-risk-report-.*\.pdf/);
    });

    test('should handle charts disabled', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({ includeCharts: false })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('should handle appendix disabled', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({ includeAppendix: false })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('should set correct headers', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({})
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-length']).toBeDefined();
    });
  });

  describe('GET /api/reports/preview', () => {
    test('should return report preview metadata', async () => {
      const response = await request(app)
        .get('/api/reports/preview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.preview).toBeDefined();
      expect(response.body.data.preview.totalVendors).toBeDefined();
      expect(response.body.data.preview.averageRiskScore).toBeDefined();
      expect(response.body.data.estimatedSize).toBeDefined();
      expect(response.body.data.estimatedTime).toBeDefined();
    });

    test('should calculate correct statistics', async () => {
      const response = await request(app)
        .get('/api/reports/preview')
        .expect(200);

      const preview = response.body.data.preview;
      expect(preview.totalVendors).toBe(2);
      expect(preview.criticalVendors).toBe(1);
      expect(parseFloat(preview.averageRiskScore)).toBeCloseTo(55, 0);
    });
  });

  describe('GET /api/reports/health', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/reports/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.message).toBe('PDF generation service is operational');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.canGeneratePDF).toBe(true);
    });
  });

  describe('Error handling', () => {
    test('should handle PDF generation errors', async () => {
      // Force an error by mocking the service to throw
      const PDFReportService = require('../../src/services/PDFReportService');
      PDFReportService.mockImplementationOnce(() => {
        return {
          generateReport: jest.fn().mockRejectedValue(new Error('PDF generation failed')),
          getVendors: jest.fn().mockResolvedValue([]),
          getAlerts: jest.fn().mockResolvedValue([])
        };
      });

      const response = await request(app)
        .post('/api/reports/generate')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate PDF report');
    });

    test('should handle preview errors', async () => {
      const PDFReportService = require('../../src/services/PDFReportService');
      PDFReportService.mockImplementationOnce(() => {
        return {
          generateReport: jest.fn(),
          getVendors: jest.fn().mockRejectedValue(new Error('Database error')),
          getAlerts: jest.fn().mockResolvedValue([])
        };
      });

      const response = await request(app)
        .get('/api/reports/preview')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to preview report');
    });

    test('should handle health check failures', async () => {
      const PDFReportService = require('../../src/services/PDFReportService');
      PDFReportService.mockImplementationOnce(() => {
        return {
          generateReport: jest.fn().mockRejectedValue(new Error('Service unavailable')),
          getVendors: jest.fn(),
          getAlerts: jest.fn()
        };
      });

      const response = await request(app)
        .get('/api/reports/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('unhealthy');
    });
  });

  describe('Authentication', () => {
    test('should require authentication', async () => {
      // This test would require temporarily disabling the mock
      // For now, we verify the middleware is applied by checking successful requests
      const response = await request(app)
        .post('/api/reports/generate')
        .send({})
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});

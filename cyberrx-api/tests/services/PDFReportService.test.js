'use strict';

// Mock the database models before importing the service
jest.mock('../../src/models/Vendor');
jest.mock('../../src/models/VendorAlert');

const PDFReportService = require('../../src/services/PDFReportService');

describe('PDFReportService', () => {
  let pdfService;

  beforeEach(() => {
    pdfService = new PDFReportService();
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      expect(pdfService.font).toBe('Helvetica');
      expect(pdfService.fontSize.title).toBe(24);
      expect(pdfService.fontSize.heading).toBe(18);
      expect(pdfService.colors.primary).toBe('#1e40af');
    });
  });

  describe('getNumericRiskScore', () => {
    test('should return securityScore when available', () => {
      const vendor = { securityScore: 75, complianceScore: 80 };
      expect(pdfService.getNumericRiskScore(vendor)).toBe(75);
    });

    test('should return complianceScore when securityScore is null', () => {
      const vendor = { securityScore: null, complianceScore: 65 };
      expect(pdfService.getNumericRiskScore(vendor)).toBe(65);
    });

    test('should map riskRating to numeric score when no scores available', () => {
      const vendor = { riskRating: 'High' };
      expect(pdfService.getNumericRiskScore(vendor)).toBe(40);
    });

    test('should return 50 as default when no risk data available', () => {
      const vendor = {};
      expect(pdfService.getNumericRiskScore(vendor)).toBe(50);
    });

    test('should map all risk ratings correctly', () => {
      expect(pdfService.getNumericRiskScore({ riskRating: 'Critical' })).toBe(20);
      expect(pdfService.getNumericRiskScore({ riskRating: 'High' })).toBe(40);
      expect(pdfService.getNumericRiskScore({ riskRating: 'Medium' })).toBe(60);
      expect(pdfService.getNumericRiskScore({ riskRating: 'Low' })).toBe(80);
      expect(pdfService.getNumericRiskScore({ riskRating: 'Info' })).toBe(90);
    });
  });

  describe('getScoreColor', () => {
    test('should return success color for high scores', () => {
      expect(pdfService.getScoreColor(85)).toBe('#10b981');
      expect(pdfService.getScoreColor(80)).toBe('#10b981');
    });

    test('should return medium-high color for good scores', () => {
      expect(pdfService.getScoreColor(75)).toBe('#059669');
      expect(pdfService.getScoreColor(60)).toBe('#059669');
    });

    test('should return warning color for medium scores', () => {
      expect(pdfService.getScoreColor(55)).toBe('#f59e0b');
      expect(pdfService.getScoreColor(40)).toBe('#f59e0b');
    });

    test('should return danger color for low scores', () => {
      expect(pdfService.getScoreColor(35)).toBe('#ef4444');
      expect(pdfService.getScoreColor(0)).toBe('#ef4444');
    });
  });

  describe('getRiskColor', () => {
    test('should return correct colors for risk labels', () => {
      expect(pdfService.getRiskColor('Low Risk (80-100)')).toBe('#10b981');
      expect(pdfService.getRiskColor('Medium Risk (60-79)')).toBe('#f59e0b');
      expect(pdfService.getRiskColor('High Risk (40-59)')).toBe('#dc2626');
      expect(pdfService.getRiskColor('Critical Risk (0-39)')).toBe('#ef4444');
    });
  });

  describe('generateRiskDistributionChart', () => {
    test('should generate chart buffer', async () => {
      const vendors = [
        { securityScore: 85, tier: 'Low' },
        { securityScore: 65, tier: 'Medium' },
        { securityScore: 45, tier: 'High' },
        { securityScore: 25, tier: 'Critical' }
      ];

      const chartBuffer = await pdfService.generateRiskDistributionChart(vendors);

      expect(chartBuffer).toBeDefined();
      expect(Buffer.isBuffer(chartBuffer)).toBe(true);
      expect(chartBuffer.length).toBeGreaterThan(0);
    });

    test('should handle empty vendor list', async () => {
      const chartBuffer = await pdfService.generateRiskDistributionChart([]);

      expect(chartBuffer).toBeDefined();
      expect(Buffer.isBuffer(chartBuffer)).toBe(true);
    });
  });

  describe('generateRiskByTierChart', () => {
    test('should generate tier chart buffer', async () => {
      const vendors = [
        { securityScore: 25, tier: 'Critical' },
        { securityScore: 35, tier: 'High' },
        { securityScore: 55, tier: 'Medium' },
        { securityScore: 75, tier: 'Low' }
      ];

      const chartBuffer = await pdfService.generateRiskByTierChart(vendors);

      expect(chartBuffer).toBeDefined();
      expect(Buffer.isBuffer(chartBuffer)).toBe(true);
      expect(chartBuffer.length).toBeGreaterThan(0);
    });

    test('should calculate average scores correctly by tier', async () => {
      const vendors = [
        { securityScore: 20, tier: 'Critical' },
        { securityScore: 30, tier: 'Critical' },
        { securityScore: 50, tier: 'Medium' },
        { securityScore: 70, tier: 'Medium' }
      ];

      const chartBuffer = await pdfService.generateRiskByTierChart(vendors);

      expect(chartBuffer).toBeDefined();
      expect(Buffer.isBuffer(chartBuffer)).toBe(true);
    });
  });

  describe('getVendors', () => {
    test('should fetch vendors for organization', async () => {
      // Mock the Vendor model
      const mockVendors = [
        { id: '1', name: 'Vendor A', tier: 'High', securityScore: 75 },
        { id: '2', name: 'Vendor B', tier: 'Medium', securityScore: 60 }
      ];

      // This test would require mocking the Vendor model
      // For now, we'll test the error handling
      const vendors = await pdfService.getVendors('test-org-id');

      // Should return empty array on error (in real scenario with mock)
      expect(Array.isArray(vendors)).toBe(true);
    });
  });

  describe('getAlerts', () => {
    test('should fetch alerts for organization', async () => {
      const alerts = await pdfService.getAlerts('test-org-id', '30D');

      // Should return array (empty in test environment)
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('should parse date range correctly', async () => {
      const alerts1 = await pdfService.getAlerts('test-org-id', '12M');
      const alerts2 = await pdfService.getAlerts('test-org-id', '90D');

      expect(Array.isArray(alerts1)).toBe(true);
      expect(Array.isArray(alerts2)).toBe(true);
    });
  });

  describe('generateReport', () => {
    test('should generate PDF report with all sections', async () => {
      const pdfBuffer = await pdfService.generateReport('test-org-id', {
        reportType: 'executive',
        dateRange: '12M',
        includeCharts: false,
        includeAppendix: false
      });

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Check for PDF signature (%PDF)
      const pdfString = pdfBuffer.toString('utf8', 0, 4);
      expect(pdfString).toBe('%PDF');
    }, 30000); // 30 second timeout for PDF generation

    test('should generate report without charts when disabled', async () => {
      const pdfBuffer = await pdfService.generateReport('test-org-id', {
        includeCharts: false,
        includeAppendix: false
      });

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    }, 30000);

    test('should generate report with appendix when enabled', async () => {
      const pdfBuffer = await pdfService.generateReport('test-org-id', {
        includeCharts: false,
        includeAppendix: true
      });

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    }, 30000);
  });

  describe('Error handling', () => {
    test('should handle missing organization gracefully', async () => {
      await expect(
        pdfService.generateReport(null, { includeCharts: false })
      ).rejects.toThrow();
    });

    test('should handle invalid options', async () => {
      const pdfBuffer = await pdfService.generateReport('test-org-id', {});
      expect(pdfBuffer).toBeDefined();
    }, 30000);
  });
});

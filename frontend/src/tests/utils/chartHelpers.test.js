/**
 * Chart Helper Utilities Tests
 *
 * Test suite for chart utility functions including:
 * - Color mapping
 * - Grade calculation
 * - Date formatting
 * - Statistical calculations
 * - Data processing
 * - Export formatting
 * - Validation
 */

import {
  CHART_COLORS,
  getRiskColor,
  getRiskGrade,
  getRiskLabel,
  formatDate,
  generateDateLabels,
  calculateMovingAverage,
  calculateTrend,
  getTrendIcon,
  formatChartDataForExport,
  chartDataToCSV,
  calculateStatistics,
  calculateConfidenceInterval,
  sanitizeLabel,
  getChartDescription,
  validateChartData
} from '../../../src/utils/chartHelpers';

describe('Chart Helper Utilities', () => {
  describe('CHART_COLORS', () => {
    test('should export all required colors', () => {
      expect(CHART_COLORS).toHaveProperty('primary');
      expect(CHART_COLORS).toHaveProperty('critical');
      expect(CHART_COLORS).toHaveProperty('high');
      expect(CHART_COLORS).toHaveProperty('medium');
      expect(CHART_COLORS).toHaveProperty('low');
      expect(CHART_COLORS).toHaveProperty('grid');
      expect(CHART_COLORS).toHaveProperty('text');
    });

    test('should have array of primary colors', () => {
      expect(Array.isArray(CHART_COLORS.primary)).toBe(true);
      expect(CHART_COLORS.primary.length).toBeGreaterThan(0);
    });

    test('should have valid hex color codes', () => {
      const hexRegex = /^#[0-9A-F]{6}$/i;

      Object.values(CHART_COLORS).forEach(color => {
        if (typeof color === 'string') {
          expect(color).toMatch(hexRegex);
        }
      });
    });
  });

  describe('getRiskColor', () => {
    test('should return critical color for score < 40', () => {
      expect(getRiskColor(35)).toBe(CHART_COLORS.critical);
      expect(getRiskColor(0)).toBe(CHART_COLORS.critical);
      expect(getRiskColor(39)).toBe(CHART_COLORS.critical);
    });

    test('should return high color for score 40-59', () => {
      expect(getRiskColor(40)).toBe(CHART_COLORS.high);
      expect(getRiskColor(50)).toBe(CHART_COLORS.high);
      expect(getRiskColor(59)).toBe(CHART_COLORS.high);
    });

    test('should return medium color for score 60-79', () => {
      expect(getRiskColor(60)).toBe(CHART_COLORS.medium);
      expect(getRiskColor(70)).toBe(CHART_COLORS.medium);
      expect(getRiskColor(79)).toBe(CHART_COLORS.medium);
    });

    test('should return low color for score >= 80', () => {
      expect(getRiskColor(80)).toBe(CHART_COLORS.low);
      expect(getRiskColor(90)).toBe(CHART_COLORS.low);
      expect(getRiskColor(100)).toBe(CHART_COLORS.low);
    });
  });

  describe('getRiskGrade', () => {
    test('should return A for score >= 80', () => {
      expect(getRiskGrade(80)).toBe('A');
      expect(getRiskGrade(90)).toBe('A');
      expect(getRiskGrade(100)).toBe('A');
    });

    test('should return B for score 60-79', () => {
      expect(getRiskGrade(60)).toBe('B');
      expect(getRiskGrade(70)).toBe('B');
      expect(getRiskGrade(79)).toBe('B');
    });

    test('should return C for score 40-59', () => {
      expect(getRiskGrade(40)).toBe('C');
      expect(getRiskGrade(50)).toBe('C');
      expect(getRiskGrade(59)).toBe('C');
    });

    test('should return D for score < 40', () => {
      expect(getRiskGrade(0)).toBe('D');
      expect(getRiskGrade(30)).toBe('D');
      expect(getRiskGrade(39)).toBe('D');
    });
  });

  describe('getRiskLabel', () => {
    test('should return Low for score >= 80', () => {
      expect(getRiskLabel(80)).toBe('Low');
      expect(getRiskLabel(95)).toBe('Low');
    });

    test('should return Medium for score 60-79', () => {
      expect(getRiskLabel(60)).toBe('Medium');
      expect(getRiskLabel(75)).toBe('Medium');
    });

    test('should return High for score 40-59', () => {
      expect(getRiskLabel(40)).toBe('High');
      expect(getRiskLabel(55)).toBe('High');
    });

    test('should return Critical for score < 40', () => {
      expect(getRiskLabel(0)).toBe('Critical');
      expect(getRiskLabel(35)).toBe('Critical');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2025-03-15');

    test('should format date as short', () => {
      const result = formatDate(testDate, 'short');
      expect(result).toMatch(/Mar/);
      expect(result).toMatch(/25/);
    });

    test('should format date as long', () => {
      const result = formatDate(testDate, 'long');
      expect(result).toMatch(/March/);
      expect(result).toMatch(/2025/);
    });

    test('should format date as month only', () => {
      const result = formatDate(testDate, 'month');
      expect(result).toBe('Mar');
    });

    test('should format date as default', () => {
      const result = formatDate(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    test('should handle string date input', () => {
      const result = formatDate('2025-03-15', 'short');
      expect(result).toBeTruthy();
    });
  });

  describe('generateDateLabels', () => {
    test('should generate 3 labels for 3M range', () => {
      const labels = generateDateLabels('3M');
      expect(labels).toHaveLength(3);
    });

    test('should generate 6 labels for 6M range', () => {
      const labels = generateDateLabels('6M');
      expect(labels).toHaveLength(6);
    });

    test('should generate 12 labels for 12M range', () => {
      const labels = generateDateLabels('12M');
      expect(labels).toHaveLength(12);
    });

    test('should generate custom count for all range', () => {
      const labels = generateDateLabels('all', 24);
      expect(labels).toHaveLength(24);
    });

    test('should generate chronological labels', () => {
      const labels = generateDateLabels('3M');
      const dates = labels.map(l => new Date(l));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i].getTime()).toBeGreaterThan(dates[i - 1].getTime());
      }
    });
  });

  describe('calculateMovingAverage', () => {
    test('should calculate moving average with window 3', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateMovingAverage(data, 3);
      expect(result).toHaveLength(5);
      expect(result[2]).toBeCloseTo(30, 0);
    });

    test('should calculate moving average with window 5', () => {
      const data = [10, 20, 30, 40, 50, 60];
      const result = calculateMovingAverage(data, 5);
      expect(result).toHaveLength(6);
    });

    test('should handle edge case with window larger than data', () => {
      const data = [10, 20];
      const result = calculateMovingAverage(data, 5);
      expect(result).toHaveLength(2);
    });

    test('should return same values for single element', () => {
      const data = [42];
      const result = calculateMovingAverage(data, 3);
      expect(result[0]).toBe(42);
    });

    test('should smooth data effectively', () => {
      const noisyData = [10, 50, 10, 50, 10, 50];
      const smoothed = calculateMovingAverage(noisyData, 3);
      const maxVariation = Math.max(...smoothed) - Math.min(...smoothed);
      expect(maxVariation).toBeLessThan(40);
    });
  });

  describe('calculateTrend', () => {
    test('should detect upward trend', () => {
      const data = [10, 20, 30, 40, 50];
      expect(calculateTrend(data)).toBe('up');
    });

    test('should detect downward trend', () => {
      const data = [50, 40, 30, 20, 10];
      expect(calculateTrend(data)).toBe('down');
    });

    test('should detect stable trend', () => {
      const data = [50, 51, 49, 50, 50];
      expect(calculateTrend(data)).toBe('stable');
    });

    test('should return stable for single data point', () => {
      const data = [50];
      expect(calculateTrend(data)).toBe('stable');
    });

    test('should return stable for empty data', () => {
      const data = [];
      expect(calculateTrend(data)).toBe('stable');
    });
  });

  describe('getTrendIcon', () => {
    test('should return up arrow for up trend', () => {
      expect(getTrendIcon('up')).toBe('↑');
    });

    test('should return down arrow for down trend', () => {
      expect(getTrendIcon('down')).toBe('↓');
    });

    test('should return right arrow for stable trend', () => {
      expect(getTrendIcon('stable')).toBe('→');
    });
  });

  describe('formatChartDataForExport', () => {
    test('should format chart data for export', () => {
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          { label: 'Vendor A', data: [80, 85, 90] },
          { label: 'Vendor B', data: [70, 75, 80] }
        ]
      };

      const result = formatChartDataForExport(chartData, 'line');

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('chartType', 'line');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(3);
    });

    test('should include all data points in export', () => {
      const chartData = {
        labels: ['Jan', 'Feb'],
        datasets: [
          { label: 'Vendor A', data: [80, 85] }
        ]
      };

      const result = formatChartDataForExport(chartData, 'line');
      expect(result.data).toHaveLength(2);
    });
  });

  describe('chartDataToCSV', () => {
    test('should convert chart data to CSV', () => {
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          { label: 'Vendor A', data: [80, 85, 90] }
        ]
      };

      const csv = chartDataToCSV(chartData);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(4); // Header + 3 data rows
      expect(lines[0]).toContain('Date');
      expect(lines[0]).toContain('Vendor A');
    });

    test('should handle missing data values', () => {
      const chartData = {
        labels: ['Jan', 'Feb'],
        datasets: [
          { label: 'Vendor A', data: [80, undefined] }
        ]
      };

      const csv = chartDataToCSV(chartData);
      expect(csv).toContain('"80"');
      expect(csv).toContain('""');
    });

    test('should handle multiple datasets', () => {
      const chartData = {
        labels: ['Jan'],
        datasets: [
          { label: 'Vendor A', data: [80] },
          { label: 'Vendor B', data: [70] }
        ]
      };

      const csv = chartDataToCSV(chartData);
      expect(csv.split('\n')[0]).toContain('Vendor A');
      expect(csv.split('\n')[0]).toContain('Vendor B');
    });
  });

  describe('calculateStatistics', () => {
    test('should calculate mean correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const stats = calculateStatistics(data);
      expect(stats.mean).toBe(30);
    });

    test('should calculate median correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const stats = calculateStatistics(data);
      expect(stats.median).toBe(30);
    });

    test('should calculate min and max correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const stats = calculateStatistics(data);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
    });

    test('should calculate standard deviation', () => {
      const data = [10, 20, 30, 40, 50];
      const stats = calculateStatistics(data);
      expect(stats.stdDev).toBeGreaterThan(0);
    });

    test('should calculate count correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const stats = calculateStatistics(data);
      expect(stats.count).toBe(5);
    });

    test('should return null for empty data', () => {
      const stats = calculateStatistics([]);
      expect(stats).toBeNull();
    });

    test('should handle single value', () => {
      const stats = calculateStatistics([42]);
      expect(stats.mean).toBe(42);
      expect(stats.median).toBe(42);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
    });
  });

  describe('calculateConfidenceInterval', () => {
    test('should calculate confidence interval bounds', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateConfidenceInterval(data, 0.95);

      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('lower');
      expect(result.upper).toHaveLength(5);
      expect(result.lower).toHaveLength(5);
    });

    test('should return upper bounds >= data', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateConfidenceInterval(data, 0.95);

      result.upper.forEach((upper, i) => {
        expect(upper).toBeGreaterThanOrEqual(data[i]);
      });
    });

    test('should return lower bounds <= data', () => {
      const data = [10, 20, 30, 40, 50];
      const result = calculateConfidenceInterval(data, 0.95);

      result.lower.forEach((lower, i) => {
        expect(lower).toBeLessThanOrEqual(data[i]);
      });
    });

    test('should return null for empty data', () => {
      const result = calculateConfidenceInterval([], 0.95);
      expect(result.upper).toEqual([]);
      expect(result.lower).toEqual([]);
    });
  });

  describe('sanitizeLabel', () => {
    test('should remove special characters', () => {
      const result = sanitizeLabel('Vendor@#$%Name');
      expect(result).toBe('VendorName');
    });

    test('should normalize whitespace', () => {
      const result = sanitizeLabel('Vendor    Name');
      expect(result).toBe('Vendor Name');
    });

    test('should trim leading/trailing spaces', () => {
      const result = sanitizeLabel('  Vendor Name  ');
      expect(result).toBe('Vendor Name');
    });

    test('should handle empty string', () => {
      const result = sanitizeLabel('');
      expect(result).toBe('');
    });

    test('should handle only special characters', () => {
      const result = sanitizeLabel('@#$%');
      expect(result).toBe('');
    });
  });

  describe('getChartDescription', () => {
    test('should generate chart description', () => {
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          { label: 'Vendor A', data: [80, 85, 90] }
        ]
      };

      const description = getChartDescription(chartData);
      expect(description).toContain('1 data series');
      expect(description).toContain('3 time periods');
      expect(description).toContain('Vendor A');
    });

    test('should include statistics for multiple datasets', () => {
      const chartData = {
        labels: ['Jan', 'Feb'],
        datasets: [
          { label: 'Vendor A', data: [80, 85] },
          { label: 'Vendor B', data: [70, 75] }
        ]
      };

      const description = getChartDescription(chartData);
      expect(description).toContain('2 data series');
      expect(description).toContain('Vendor A');
      expect(description).toContain('Vendor B');
      expect(description).toContain('Average');
    });
  });

  describe('validateChartData', () => {
    test('should validate correct chart data', () => {
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          { label: 'Vendor A', data: [80, 85, 90] }
        ]
      };

      const result = validateChartData(chartData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing labels', () => {
      const chartData = {
        labels: [],
        datasets: [
          { label: 'Vendor A', data: [80, 85, 90] }
        ]
      };

      const result = validateChartData(chartData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Chart must have labels');
    });

    test('should detect missing datasets', () => {
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: []
      };

      const result = validateChartData(chartData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Chart must have at least one dataset');
    });

    test('should detect mismatched data length', () => {
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          { label: 'Vendor A', data: [80, 85] }
        ]
      };

      const result = validateChartData(chartData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match'))).toBe(true);
    });

    test('should detect empty dataset', () => {
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          { label: 'Vendor A', data: [] }
        ]
      };

      const result = validateChartData(chartData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('no data'))).toBe(true);
    });

    test('should collect all validation errors', () => {
      const chartData = {
        labels: [],
        datasets: []
      };

      const result = validateChartData(chartData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

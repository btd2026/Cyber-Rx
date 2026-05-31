/**
 * Chart Helper Utilities
 *
 * Common functions for chart formatting, data processing,
 * and visual configurations for BCBS healthcare palette.
 */

// BCBS healthcare color palette
export const CHART_COLORS = {
  primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
  critical: '#DC2626',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
  grid: '#E5E7EB',
  text: '#6B7280',
  background: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444'
};

/**
 * Get risk level color based on score
 * @param {number} score - Risk score (0-100)
 * @returns {string} Color hex code
 */
export const getRiskColor = (score) => {
  if (score >= 80) return CHART_COLORS.low;
  if (score >= 60) return CHART_COLORS.medium;
  if (score >= 40) return CHART_COLORS.high;
  return CHART_COLORS.critical;
};

/**
 * Get risk grade based on score
 * @param {number} score - Risk score (0-100)
 * @returns {string} Grade letter (A-D)
 */
export const getRiskGrade = (score) => {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
};

/**
 * Get risk label based on score
 * @param {number} score - Risk score (0-100)
 * @returns {string} Risk level label
 */
export const getRiskLabel = (score) => {
  if (score >= 80) return 'Low';
  if (score >= 60) return 'Medium';
  if (score >= 40) return 'High';
  return 'Critical';
};

/**
 * Format date for chart display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'month')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'short') => {
  const d = new Date(date);

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    case 'long':
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    case 'month':
      return d.toLocaleDateString('en-US', { month: 'short' });
    default:
      return d.toLocaleDateString('en-US');
  }
};

/**
 * Generate date labels for time range
 * @param {string} range - Time range ('3M', '6M', '12M', 'all')
 * @param {number} count - Number of data points
 * @returns {Array<string>} Array of formatted date labels
 */
export const generateDateLabels = (range, count = 12) => {
  const labels = [];
  const now = new Date();
  const months = range === '3M' ? 3 : range === '6M' ? 6 : range === 'all' ? count : 12;

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(formatDate(date, 'short'));
  }

  return labels;
};

/**
 * Calculate moving average for data smoothing
 * @param {Array<number>} data - Data points
 * @param {number} window - Window size for average
 * @returns {Array<number>} Smoothed data
 */
export const calculateMovingAverage = (data, window = 3) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.floor(window / 2) + 1);
    const slice = data.slice(start, end);
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    result.push(Math.round(avg * 10) / 10);
  }
  return result;
};

/**
 * Calculate trend direction
 * @param {Array<number>} data - Data points
 * @returns {string} Trend direction ('up', 'down', 'stable')
 */
export const calculateTrend = (data) => {
  if (data.length < 2) return 'stable';

  const first = data[0];
  const last = data[data.length - 1];
  const change = ((last - first) / first) * 100;

  if (Math.abs(change) < 5) return 'stable';
  return change > 0 ? 'up' : 'down';
};

/**
 * Get trend icon
 * @param {string} trend - Trend direction
 * @returns {string} Unicode arrow character
 */
export const getTrendIcon = (trend) => {
  switch (trend) {
    case 'up': return '↑';
    case 'down': return '↓';
    default: return '→';
  }
};

/**
 * Format chart data for export
 * @param {Object} chartData - Chart.js data object
 * @param {string} chartType - Type of chart
 * @returns {Object} Formatted data for export
 */
export const formatChartDataForExport = (chartData, chartType) => {
  const labels = chartData.labels;
  const datasets = chartData.datasets;

  const rows = labels.map((label, index) => {
    const row = { Date: label };
    datasets.forEach(dataset => {
      row[dataset.label] = dataset.data[index] !== undefined
        ? dataset.data[index]
        : 'N/A';
    });
    return row;
  });

  return {
    title: 'Vendor Risk Trend Analysis',
    chartType,
    generatedAt: new Date().toISOString(),
    data: rows
  };
};

/**
 * Convert chart data to CSV
 * @param {Object} chartData - Chart.js data object
 * @returns {string} CSV string
 */
export const chartDataToCSV = (chartData) => {
  const labels = chartData.labels;
  const datasets = chartData.datasets;

  // Header
  const header = ['Date', ...datasets.map(d => d.label)];

  // Rows
  const rows = labels.map((_, index) => {
    return [
      labels[index],
      ...datasets.map(d => d.data[index] !== undefined ? d.data[index] : '')
    ];
  });

  // Combine
  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csv;
};

/**
 * Calculate statistics for dataset
 * @param {Array<number>} data - Data points
 * @returns {Object} Statistical measures
 */
export const calculateStatistics = (data) => {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((acc, val) => acc + val, 0);
  const mean = sum / data.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Standard deviation
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    min,
    max,
    stdDev: Math.round(stdDev * 10) / 10,
    count: data.length
  };
};

/**
 * Generate confidence interval data
 * @param {Array<number>} data - Data points
 * @param {number} confidence - Confidence level (0-1)
 * @returns {Object} Upper and lower bounds
 */
export const calculateConfidenceInterval = (data, confidence = 0.95) => {
  const stats = calculateStatistics(data);
  if (!stats) return { upper: [], lower: [] };

  const zScore = 1.96; // 95% confidence
  const margin = zScore * (stats.stdDev / Math.sqrt(stats.count));

  return {
    upper: data.map(val => Math.min(100, val + margin)),
    lower: data.map(val => Math.max(0, val - margin))
  };
};

/**
 * Create gradient for chart area
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} color - Base color
 * @returns {CanvasGradient} Gradient object
 */
export const createChartGradient = (ctx, color) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, `${color}05`);
  return gradient;
};

/**
 * Sanitize chart labels for accessibility
 * @param {string} label - Original label
 * @returns {string} Sanitized label
 */
export const sanitizeLabel = (label) => {
  return label
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Get accessible chart description
 * @param {Object} chartData - Chart data
 * @returns {string} Description for screen readers
 */
export const getChartDescription = (chartData) => {
  const datasets = chartData.datasets;
  const labels = chartData.labels;

  let description = `Chart showing ${datasets.length} data series over ${labels.length} time periods. `;

  datasets.forEach((dataset, index) => {
    const stats = calculateStatistics(dataset.data);
    description += `Series ${index + 1}: ${dataset.label}. `;
    description += `Average risk score: ${stats.mean}, Range: ${stats.min} to ${stats.max}. `;
  });

  return description;
};

/**
 * Validate chart data
 * @param {Object} chartData - Chart data to validate
 * @returns {Object} Validation result with errors
 */
export const validateChartData = (chartData) => {
  const errors = [];

  if (!chartData.labels || chartData.labels.length === 0) {
    errors.push('Chart must have labels');
  }

  if (!chartData.datasets || chartData.datasets.length === 0) {
    errors.push('Chart must have at least one dataset');
  }

  chartData.datasets?.forEach((dataset, index) => {
    if (!dataset.data || dataset.data.length === 0) {
      errors.push(`Dataset ${index + 1} has no data`);
    }

    if (dataset.data && dataset.data.length !== chartData.labels.length) {
      errors.push(`Dataset ${index + 1} data length does not match labels length`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
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
  createChartGradient,
  sanitizeLabel,
  getChartDescription,
  validateChartData
};

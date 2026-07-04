'use strict';

const PDFDocument = require('pdfkit');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const Vendor = require('../models/Vendor');
const VendorAlert = require('../models/VendorAlert');

/**
 * PDF Report Service
 *
 * Generates professional PDF reports for vendor risk portfolio
 * Includes executive summary, vendor portfolio tables, risk trends, and alerts
 */
class PDFReportService {
  constructor() {
    this.font = 'Helvetica';
    this.fontSize = {
      title: 24,
      heading: 18,
      subheading: 14,
      body: 11,
      footer: 9,
      small: 10
    };
    this.colors = {
      primary: '#1e40af',
      secondary: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      text: '#374151',
      light: '#f3f4f6',
      border: '#e5e7eb'
    };

    // Chart rendering configuration
    this.chartRenderer = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white'
    });
  }

  /**
   * Generate complete PDF report
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Report generation options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateReport(organizationId, options = {}) {
    const {
      reportType = 'executive',
      dateRange = '12M',
      includeCharts = true,
      includeAppendix = true
    } = options;

    // Fetch organization data
    const vendors = await this.getVendors(organizationId);
    const alerts = await this.getAlerts(organizationId, dateRange);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
      autoFirstPage: false
    });

    // Collect PDF chunks
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));

    // Add first page
    doc.addPage();

    // Generate report sections
    await this.addCoverPage(doc, organizationId);
    doc.addPage();
    await this.addExecutiveSummary(doc, vendors, alerts);
    doc.addPage();
    await this.addVendorPortfolio(doc, vendors);

    if (includeCharts) {
      doc.addPage();
      await this.addTrendCharts(doc, vendors, organizationId);
    }

    doc.addPage();
    await this.addAlertSummary(doc, alerts);

    if (includeAppendix) {
      doc.addPage();
      await this.addAppendix(doc, vendors);
    }

    doc.end();

    // Return promise that resolves with PDF buffer
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
    });
  }

  /**
   * Add cover page to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {string} organizationId - Organization ID
   */
  async addCoverPage(doc, organizationId) {
    // Center content vertically
    const centerX = doc.page.width / 2;
    const centerY = doc.page.height / 2;

    // Report title
    doc.fillColor(this.colors.primary)
       .fontSize(this.fontSize.title)
       .font('Helvetica-Bold')
       .text('Vendor Risk Portfolio Report', centerX, centerY - 100, { align: 'center', width: doc.page.width - 100 });

    // Subtitle
    doc.fillColor(this.colors.text)
       .fontSize(this.fontSize.subheading)
       .font('Helvetica')
       .text(`Executive Dashboard Summary`, centerX, centerY - 50, { align: 'center', width: doc.page.width - 100 });

    // Organization ID
    doc.fontSize(this.fontSize.body)
       .text(`Organization ID: ${organizationId}`, centerX, centerY, { align: 'center', width: doc.page.width - 100 });

    // Date
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(date, centerX, centerY + 30, { align: 'center', width: doc.page.width - 100 });

    // Prepared by
    doc.fontSize(this.fontSize.body)
       .text('Prepared by CyberX-Ray Platform', centerX, centerY + 80, { align: 'center', width: doc.page.width - 100 });

    // Confidentiality notice
    doc.fontSize(this.fontSize.small)
       .fillColor(this.colors.warning)
       .text('CONFIDENTIAL - For Internal Use Only', centerX, centerY + 130, { align: 'center', width: doc.page.width - 100 });

    // Footer
    this.addFooter(doc);
  }

  /**
   * Add executive summary section
   * @param {PDFDocument} doc - PDF document
   * @param {Array} vendors - Vendor data
   * @param {Array} alerts - Alert data
   */
  async addExecutiveSummary(doc, vendors, alerts) {
    this.addSectionHeader(doc, 'Executive Summary');

    // Key metrics
    const totalVendors = vendors.length;
    const criticalVendors = vendors.filter(v => this.getNumericRiskScore(v) < 40).length;
    const avgRiskScore = vendors.reduce((sum, v) => sum + this.getNumericRiskScore(v), 0) / totalVendors;
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledgedAt).length;

    doc.fontSize(this.fontSize.body)
       .fillColor(this.colors.text);

    // Metrics table
    const metrics = [
      ['Total Vendors Monitored', totalVendors.toString()],
      ['Average Risk Score', avgRiskScore.toFixed(1)],
      ['Critical Risk Vendors', criticalVendors.toString()],
      ['Unacknowledged Alerts', unacknowledgedAlerts.toString()],
      ['Report Generation Date', new Date().toLocaleDateString()]
    ];

    let y = doc.y;
    metrics.forEach(([label, value]) => {
      doc.fontSize(this.fontSize.body)
         .font('Helvetica-Bold')
         .text(label, 50, y, { width: 200 });

      doc.fontSize(this.fontSize.body)
         .font('Helvetica')
         .text(value, 260, y);

      y += 30;
    });

    doc.y = y + 20;

    // Risk distribution
    this.addSubsectionHeader(doc, 'Risk Score Distribution');

    const riskDistribution = {
      'Low Risk (80-100)': vendors.filter(v => this.getNumericRiskScore(v) >= 80).length,
      'Medium Risk (60-79)': vendors.filter(v => this.getNumericRiskScore(v) >= 60 && this.getNumericRiskScore(v) < 80).length,
      'High Risk (40-59)': vendors.filter(v => this.getNumericRiskScore(v) >= 40 && this.getNumericRiskScore(v) < 60).length,
      'Critical Risk (0-39)': vendors.filter(v => this.getNumericRiskScore(v) < 40).length
    };

    y = doc.y;
    Object.entries(riskDistribution).forEach(([label, count]) => {
      const percentage = totalVendors > 0 ? ((count / totalVendors) * 100).toFixed(1) : '0.0';

      doc.text(label, 50, y);
      doc.text(`${count} vendors (${percentage}%)`, 300, y);

      // Simple bar
      const barWidth = totalVendors > 0 ? (count / totalVendors) * 200 : 0;
      if (barWidth > 0) {
        doc.rect(450, y - 5, barWidth, 10)
           .fill(this.getRiskColor(label));
      }

      y += 25;
    });

    // Tier distribution
    doc.y += 10;
    this.addSubsectionHeader(doc, 'Vendor Tier Distribution');

    const tierDistribution = {
      'Critical Tier': vendors.filter(v => v.tier === 'Critical').length,
      'High Tier': vendors.filter(v => v.tier === 'High').length,
      'Medium Tier': vendors.filter(v => v.tier === 'Medium').length,
      'Low Tier': vendors.filter(v => v.tier === 'Low').length
    };

    y = doc.y;
    Object.entries(tierDistribution).forEach(([label, count]) => {
      const percentage = totalVendors > 0 ? ((count / totalVendors) * 100).toFixed(1) : '0.0';
      doc.text(`${label}: ${count} vendors (${percentage}%)`, 50, y);
      y += 20;
    });

    this.addFooter(doc);
  }

  /**
   * Add vendor portfolio table
   * @param {PDFDocument} doc - PDF document
   * @param {Array} vendors - Vendor data
   */
  async addVendorPortfolio(doc, vendors) {
    this.addSectionHeader(doc, 'Vendor Portfolio');

    // Table header
    const tableTop = doc.y;
    const rowHeight = 30;

    // Headers
    const headers = ['Vendor Name', 'Tier', 'Risk Score', 'Rating', 'Category'];
    const colWidths = [200, 80, 100, 80, 120];
    let x = 50;

    // Header background
    doc.fillColor(this.colors.light)
       .rect(50, tableTop, 660, rowHeight)
       .fill();

    // Header text
    doc.fillColor(this.colors.primary)
       .fontSize(this.fontSize.body)
       .font('Helvetica-Bold');

    headers.forEach((header, i) => {
      doc.text(header, x, tableTop + 10);
      x += colWidths[i];
    });

    // Table rows
    doc.fillColor(this.colors.text)
       .font('Helvetica');

    vendors.forEach((vendor, i) => {
      const y = tableTop + rowHeight + (i * rowHeight) + 10;
      x = 50;

      // Check for page break
      if (y > doc.page.height - 80) {
        doc.addPage();
        this.addSectionHeader(doc, 'Vendor Portfolio (continued)');

        // Re-add headers
        const newTableTop = doc.y;
        x = 50;
        doc.fillColor(this.colors.light)
           .rect(50, newTableTop, 660, rowHeight)
           .fill();

        doc.fillColor(this.colors.primary)
           .font('Helvetica-Bold');
        headers.forEach((header, j) => {
          doc.text(header, x, newTableTop + 10);
          x += colWidths[j];
        });
        doc.fillColor(this.colors.text)
           .font('Helvetica');
        x = 50;
      }

      const actualY = doc.y + rowHeight + 10;

      // Vendor name
      doc.text(vendor.name || 'N/A', x, actualY);
      x += colWidths[0];

      // Tier
      doc.text(vendor.tier || 'N/A', x, actualY);
      x += colWidths[1];

      // Risk score with color
      const score = this.getNumericRiskScore(vendor);
      const scoreColor = this.getScoreColor(score);
      doc.fillColor(scoreColor)
         .text(score.toFixed(0), x, actualY);
      x += colWidths[2];

      // Rating
      doc.fillColor(this.colors.text)
         .text(vendor.riskRating || 'N/A', x, actualY);
      x += colWidths[3];

      // Category
      doc.text(vendor.category || 'N/A', x, actualY);

      doc.y = actualY;
    });

    this.addFooter(doc);
  }

  /**
   * Add trend charts section
   * @param {PDFDocument} doc - PDF document
   * @param {Array} vendors - Vendor data
   * @param {string} organizationId - Organization ID
   */
  async addTrendCharts(doc, vendors, organizationId) {
    this.addSectionHeader(doc, 'Risk Trend Analysis (12 Months)');

    // Generate risk distribution chart
    try {
      const chartImage = await this.generateRiskDistributionChart(vendors);

      // Add chart to PDF
      doc.image(chartImage, 50, doc.y + 10, {
        width: 500,
        height: 300
      });

      doc.y += 320;
    } catch (error) {
      console.error('Error generating chart:', error);
      doc.text('Chart generation unavailable', 50, doc.y + 10);
      doc.y += 20;
    }

    // Trend summary
    doc.fontSize(this.fontSize.body)
       .fillColor(this.colors.text)
       .text('The chart above displays the current risk score distribution across all monitored vendors.', 50, doc.y, { width: 660, align: 'left' });

    doc.y += 40;

    // Add risk by tier chart
    this.addSubsectionHeader(doc, 'Risk Score by Tier');

    try {
      const tierChartImage = await this.generateRiskByTierChart(vendors);

      doc.image(tierChartImage, 50, doc.y + 10, {
        width: 500,
        height: 300
      });

      doc.y += 320;
    } catch (error) {
      console.error('Error generating tier chart:', error);
      doc.text('Chart generation unavailable', 50, doc.y + 10);
    }

    this.addFooter(doc);
  }

  /**
   * Add alert summary section
   * @param {PDFDocument} doc - PDF document
   * @param {Array} alerts - Alert data
   */
  async addAlertSummary(doc, alerts) {
    this.addSectionHeader(doc, 'Recent Critical Alerts');

    // Show last 10 critical alerts
    const criticalAlerts = alerts
      .filter(a => a.severity === 'Critical')
      .slice(0, 10);

    if (criticalAlerts.length === 0) {
      doc.fontSize(this.fontSize.body)
         .text('No critical alerts in the selected time range.', 50, doc.y + 10);
    } else {
      criticalAlerts.forEach((alert, i) => {
        const y = doc.y + 20;

        // Check page break
        if (y > doc.page.height - 80) {
          doc.addPage();
          this.addSectionHeader(doc, 'Recent Critical Alerts (continued)');
        }

        // Date and vendor
        doc.fontSize(this.fontSize.body)
           .font('Helvetica-Bold')
           .text(new Date(alert.createdAt).toLocaleDateString(), 50, doc.y + 10);

        doc.fontSize(this.fontSize.body)
           .font('Helvetica')
           .text(alert.vendorName || 'N/A', 200, doc.y);

        // Alert message
        doc.fontSize(this.fontSize.body)
           .fillColor(this.colors.danger)
           .text(alert.message, 50, doc.y + 15);
        doc.fillColor(this.colors.text);

        doc.y += 40;
      });
    }

    // Alert statistics
    if (alerts.length > 0) {
      doc.y += 20;
      this.addSubsectionHeader(doc, 'Alert Summary');

      const stats = {
        'Critical': alerts.filter(a => a.severity === 'Critical').length,
        'High': alerts.filter(a => a.severity === 'High').length,
        'Medium': alerts.filter(a => a.severity === 'Medium').length,
        'Low': alerts.filter(a => a.severity === 'Low').length
      };

      let y = doc.y;
      Object.entries(stats).forEach(([severity, count]) => {
        doc.text(`${severity} Severity: ${count} alerts`, 50, y);
        y += 20;
      });
    }

    this.addFooter(doc);
  }

  /**
   * Add appendix with detailed vendor data
   * @param {PDFDocument} doc - PDF document
   * @param {Array} vendors - Vendor data
   */
  async addAppendix(doc, vendors) {
    this.addSectionHeader(doc, 'Appendix: Detailed Vendor Data');

    // Full vendor data table with more columns
    const tableTop = doc.y;
    const rowHeight = 25;

    const headers = ['Vendor', 'Tier', 'Score', 'Rating', 'Category', 'Last Updated'];
    const colWidths = [150, 60, 60, 80, 120, 100];

    // Header row
    let x = 50;
    doc.fillColor(this.colors.light)
       .rect(50, tableTop, 660, rowHeight)
       .fill();

    doc.fillColor(this.colors.primary)
       .fontSize(this.fontSize.small)
       .font('Helvetica-Bold');

    headers.forEach((header, i) => {
      doc.text(header, x, tableTop + 8);
      x += colWidths[i];
    });

    // Data rows
    doc.fillColor(this.colors.text)
       .font('Helvetica');

    vendors.forEach((vendor, i) => {
      let y = tableTop + rowHeight + ((i + 1) * rowHeight) + 8;
      x = 50;

      // Check page break
      if (y > doc.page.height - 50) {
        doc.addPage();
        this.addSectionHeader(doc, 'Appendix: Detailed Vendor Data (continued)');

        // Re-add headers
        const newTableTop = doc.y;
        x = 50;
        doc.fillColor(this.colors.light)
           .rect(50, newTableTop, 660, rowHeight)
           .fill();

        doc.fillColor(this.colors.primary)
           .font('Helvetica-Bold');
        headers.forEach((header, j) => {
          doc.text(header, x, newTableTop + 8);
          x += colWidths[j];
        });
        doc.fillColor(this.colors.text)
           .font('Helvetica');
        x = 50;
        y = newTableTop + rowHeight + 8;
      }

      const actualY = doc.y + rowHeight + 8;

      // Vendor name
      doc.fontSize(this.fontSize.small)
         .text((vendor.name || 'N/A').substring(0, 25), x, actualY);
      x += colWidths[0];

      // Tier
      doc.text(vendor.tier || 'N/A', x, actualY);
      x += colWidths[1];

      // Score
      const score = this.getNumericRiskScore(vendor);
      doc.text(score.toFixed(0), x, actualY);
      x += colWidths[2];

      // Rating
      doc.text(vendor.riskRating || 'N/A', x, actualY);
      x += colWidths[3];

      // Category
      doc.text((vendor.category || 'N/A').substring(0, 15), x, actualY);
      x += colWidths[4];

      // Last updated
      const lastUpdated = vendor.lastAssessedAt || vendor.updatedAt;
      doc.text(lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'N/A', x, actualY);

      doc.y = actualY;
    });

    this.addFooter(doc);
  }

  /**
   * Add section header
   * @param {PDFDocument} doc - PDF document
   * @param {string} title - Section title
   */
  addSectionHeader(doc, title) {
    doc.fillColor(this.colors.primary)
       .fontSize(this.fontSize.heading)
       .font('Helvetica-Bold')
       .text(title, 50, doc.y + 20);

    // Add underline
    doc.moveTo(50, doc.y + 5)
       .lineTo(610, doc.y + 5)
       .strokeColor(this.colors.primary)
       .lineWidth(1)
       .stroke();

    doc.y += 40;
  }

  /**
   * Add subsection header
   * @param {PDFDocument} doc - PDF document
   * @param {string} title - Subsection title
   */
  addSubsectionHeader(doc, title) {
    doc.fillColor(this.colors.secondary)
       .fontSize(this.fontSize.subheading)
       .font('Helvetica-Bold')
       .text(title, 50, doc.y + 15);

    doc.y += 25;
  }

  /**
   * Add footer to page
   * @param {PDFDocument} doc - PDF document
   */
  addFooter(doc) {
    const footerY = doc.page.height - 30;

    doc.fontSize(this.fontSize.footer)
       .fillColor(this.colors.text)
       .text(
         `Page ${doc.pageCount} | Generated ${new Date().toLocaleString()} | Confidential`,
         50,
         footerY,
         { width: 660, align: 'center' }
       );
  }

  /**
   * Get numeric risk score from vendor
   * @param {Object} vendor - Vendor object
   * @returns {number} Numeric risk score
   */
  getNumericRiskScore(vendor) {
    // Try securityScore first, then complianceScore, then default to 50
    if (vendor.securityScore !== null && vendor.securityScore !== undefined) {
      return vendor.securityScore;
    }
    if (vendor.complianceScore !== null && vendor.complianceScore !== undefined) {
      return vendor.complianceScore;
    }

    // Map riskRating to numeric score
    const ratingMap = {
      'Critical': 20,
      'High': 40,
      'Medium': 60,
      'Low': 80,
      'Info': 90
    };

    return ratingMap[vendor.riskRating] || 50;
  }

  /**
   * Get color based on risk score
   * @param {number} score - Risk score
   * @returns {string} Color hex code
   */
  getScoreColor(score) {
    if (score >= 80) return this.colors.success;
    if (score >= 60) return '#059669';
    if (score >= 40) return this.colors.warning;
    return this.colors.danger;
  }

  /**
   * Get color based on risk category label
   * @param {string} label - Risk label
   * @returns {string} Color hex code
   */
  getRiskColor(label) {
    if (label.includes('Low')) return this.colors.success;
    if (label.includes('Medium')) return this.colors.warning;
    if (label.includes('High')) return '#dc2626';
    if (label.includes('Critical')) return this.colors.danger;
    return this.colors.text;
  }

  /**
   * Generate risk distribution chart
   * @param {Array} vendors - Vendor data
   * @returns {Promise<Buffer>} Chart image buffer
   */
  async generateRiskDistributionChart(vendors) {
    const distribution = {
      'Low (80-100)': vendors.filter(v => this.getNumericRiskScore(v) >= 80).length,
      'Medium (60-79)': vendors.filter(v => this.getNumericRiskScore(v) >= 60 && this.getNumericRiskScore(v) < 80).length,
      'High (40-59)': vendors.filter(v => this.getNumericRiskScore(v) >= 40 && this.getNumericRiskScore(v) < 60).length,
      'Critical (0-39)': vendors.filter(v => this.getNumericRiskScore(v) < 40).length
    };

    const configuration = {
      type: 'bar',
      data: {
        labels: Object.keys(distribution),
        datasets: [{
          label: 'Number of Vendors',
          data: Object.values(distribution),
          backgroundColor: [
            '#10b981',
            '#f59e0b',
            '#dc2626',
            '#ef4444'
          ],
          borderColor: [
            '#059669',
            '#d97706',
            '#b91c1c',
            '#dc2626'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Vendor Risk Score Distribution',
            font: { size: 16 }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Vendors'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Risk Score Range'
            }
          }
        }
      }
    };

    return await this.chartRenderer.renderToBuffer(configuration);
  }

  /**
   * Generate risk by tier chart
   * @param {Array} vendors - Vendor data
   * @returns {Promise<Buffer>} Chart image buffer
   */
  async generateRiskByTierChart(vendors) {
    const tiers = ['Critical', 'High', 'Medium', 'Low'];
    const tierScores = tiers.map(tier => {
      const tierVendors = vendors.filter(v => v.tier === tier);
      if (tierVendors.length === 0) return 0;
      return tierVendors.reduce((sum, v) => sum + this.getNumericRiskScore(v), 0) / tierVendors.length;
    });

    const configuration = {
      type: 'bar',
      data: {
        labels: tiers,
        datasets: [{
          label: 'Average Risk Score',
          data: tierScores,
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
          borderColor: ['#dc2626', '#d97706', '#2563eb', '#059669'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Average Risk Score by Tier',
            font: { size: 16 }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Average Risk Score'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Vendor Tier'
            }
          }
        }
      }
    };

    return await this.chartRenderer.renderToBuffer(configuration);
  }

  /**
   * Get vendors for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Vendor list
   */
  async getVendors(organizationId) {
    try {
      return await Vendor.findByOrganization(organizationId);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      return [];
    }
  }

  /**
   * Get alerts for organization
   * @param {string} organizationId - Organization ID
   * @param {string} dateRange - Date range (e.g., '12M', '30D')
   * @returns {Promise<Array>} Alert list
   */
  async getAlerts(organizationId, dateRange = '30D') {
    try {
      const days = parseInt(dateRange) || 30;
      return await VendorAlert.getRecentWithVendors(organizationId, 50, 0);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }
}

module.exports = PDFReportService;

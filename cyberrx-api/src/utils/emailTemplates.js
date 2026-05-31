'use strict';

/**
 * Email Templates
 *
 * HTML email templates for vendor monitoring alerts
 * Supports organization branding and customizable styles
 */

const BASE_STYLES = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid #0066cc;
    }
    .header h1 {
      margin: 0;
      color: #0066cc;
      font-size: 28px;
    }
    .content {
      padding: 30px;
    }
    .alert-box {
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid;
    }
    .alert-critical {
      background-color: #fee;
      border-color: #c00;
    }
    .alert-high {
      background-color: #fff3cd;
      border-color: #f57c00;
    }
    .alert-medium {
      background-color: #e3f2fd;
      border-color: #1976d2;
    }
    .alert-low {
      background-color: #f1f8e9;
      border-color: #689f38;
    }
    .alert-info {
      background-color: #e8f5e9;
      border-color: #4caf50;
    }
    .severity-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      color: white;
    }
    .badge-critical { background-color: #c00; }
    .badge-high { background-color: #f57c00; }
    .badge-medium { background-color: #1976d2; }
    .badge-low { background-color: #689f38; }
    .badge-info { background-color: #4caf50; }
    .vendor-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .vendor-info h3 {
      margin-top: 0;
      margin-bottom: 10px;
      color: #333;
    }
    .vendor-info p {
      margin: 5px 0;
      color: #666;
    }
    .signal-list {
      list-style: none;
      padding: 0;
      margin: 15px 0;
    }
    .signal-item {
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 4px;
      margin-bottom: 10px;
      border-left: 3px solid #ddd;
    }
    .signal-item.critical { border-left-color: #c00; }
    .signal-item.high { border-left-color: #f57c00; }
    .signal-item.medium { border-left-color: #1976d2; }
    .signal-item.low { border-left-color: #689f38; }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0066cc;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 10px 5px;
    }
    .button:hover {
      background-color: #0052a3;
    }
    .button-secondary {
      background-color: #6c757d;
    }
    .button-secondary:hover {
      background-color: #5a6268;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #dee2e6;
    }
    .footer a {
      color: #0066cc;
      text-decoration: none;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .data-table th {
      background-color: #f8f9fa;
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #dee2e6;
      font-weight: bold;
    }
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
    }
    .score-change {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .score-increase {
      background-color: #ffebee;
      color: #c00;
    }
    .score-decrease {
      background-color: #e8f5e9;
      color: #4caf50;
    }
  </style>
`;

/**
 * Critical Signal Alert Template
 */
function criticalSignalAlert(alert) {
  const { vendorName, data } = alert;
  const signals = data.signals || [];
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    subject: `🚨 Critical Security Alert: ${vendorName}`,
    text: `
Critical security signals detected for ${vendorName}.

${signals.map((s, i) => `
Signal ${i + 1}:
- Source: ${s.sourceName}
- Severity: ${s.severity}
- Description: ${s.description || 'N/A'}
- Observed: ${new Date(s.observedAt).toLocaleString()}
`).join('\n')}

View details: ${frontendUrl}/vendors/${data.vendorId}

This is an automated alert from CyberRx.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  ${BASE_STYLES}
  <div class="container">
    <div class="header">
      <h1>🚨 Critical Security Alert</h1>
    </div>
    <div class="content">
      <div class="alert-box alert-critical">
        <h2 style="margin-top: 0;">Critical signals detected for ${vendorName}</h2>
        <p>Immediate attention required. ${signals.length} critical security signal(s) have been detected.</p>
      </div>

      <div class="vendor-info">
        <h3>Vendor: ${vendorName}</h3>
        <p><strong>Alert Type:</strong> Critical Signal Detection</p>
        <p><strong>Time:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
      </div>

      <h3>Detected Signals</h3>
      <ul class="signal-list">
        ${signals.map(signal => `
          <li class="signal-item ${signal.severity.toLowerCase()}">
            <div style="font-weight: bold; margin-bottom: 5px;">
              ${signal.sourceName}
              <span class="severity-badge badge-${signal.severity.toLowerCase()}">${signal.severity}</span>
            </div>
            <div style="color: #666; margin-bottom: 5px;">
              ${signal.description || 'No description available'}
            </div>
            <div style="font-size: 12px; color: #999;">
              Observed: ${new Date(signal.observedAt).toLocaleString()}
            </div>
          </li>
        `).join('')}
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/vendors/${data.vendorId}" class="button">View Vendor Details</a>
        <a href="${frontendUrl}/alerts/${alert.id}/acknowledge" class="button button-secondary">Acknowledge Alert</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated alert from <a href="${frontendUrl}">CyberRx</a>.</p>
      <p>To manage your alert preferences, visit your <a href="${frontendUrl}/settings">settings</a>.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

/**
 * Risk Score Increase Alert Template
 */
function scoreIncreaseAlert(alert) {
  const { vendorName, data } = alert;
  const { previous, current, change } = data;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    subject: `⚠️ Risk Score Increase: ${vendorName}`,
    text: `
Risk score for ${vendorName} has increased significantly.

Previous Score: ${previous}
Current Score: ${current}
Change: +${change} points

View details: ${frontendUrl}/vendors/${data.vendorId}

This is an automated alert from CyberRx.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  ${BASE_STYLES}
  <div class="container">
    <div class="header">
      <h1>⚠️ Risk Score Increase</h1>
    </div>
    <div class="content">
      <div class="alert-box alert-high">
        <h2 style="margin-top: 0;">Significant risk score increase for ${vendorName}</h2>
        <p>Risk score has increased by ${change} points, indicating deteriorating security posture.</p>
      </div>

      <div class="vendor-info">
        <h3>Vendor: ${vendorName}</h3>
        <p><strong>Alert Type:</strong> Risk Score Increase</p>
        <p><strong>Time:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
      </div>

      <div class="score-change score-increase">
        +${change} points
      </div>

      <table class="data-table">
        <tr>
          <th>Metric</th>
          <th>Previous</th>
          <th>Current</th>
        </tr>
        <tr>
          <td>Risk Score</td>
          <td>${previous}</td>
          <td>${current}</td>
        </tr>
        <tr>
          <td>Grade</td>
          <td>${data.previousGrade || 'N/A'}</td>
          <td>${data.currentGrade || 'N/A'}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/vendors/${data.vendorId}" class="button">View Vendor Details</a>
        <a href="${frontendUrl}/alerts/${alert.id}/acknowledge" class="button button-secondary">Acknowledge Alert</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated alert from <a href="${frontendUrl}">CyberRx</a>.</p>
      <p>To manage your alert preferences, visit your <a href="${frontendUrl}/settings">settings</a>.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

/**
 * Grade Degradation Alert Template
 */
function gradeDegradationAlert(alert) {
  const { vendorName, data } = alert;
  const { from, to } = data;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    subject: `📉 Grade Degradation: ${vendorName}`,
    text: `
Security grade for ${vendorName} has degraded.

Previous Grade: ${from}
Current Grade: ${to}

This indicates a decline in security posture. Review vendor signals for details.

View details: ${frontendUrl}/vendors/${data.vendorId}

This is an automated alert from CyberRx.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  ${BASE_STYLES}
  <div class="container">
    <div class="header">
      <h1>📉 Grade Degradation</h1>
    </div>
    <div class="content">
      <div class="alert-box alert-medium">
        <h2 style="margin-top: 0;">Security grade degraded for ${vendorName}</h2>
        <p>Vendor's security grade has dropped from ${from} to ${to}, requiring review.</p>
      </div>

      <div class="vendor-info">
        <h3>Vendor: ${vendorName}</h3>
        <p><strong>Alert Type:</strong> Grade Degradation</p>
        <p><strong>Time:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
      </div>

      <div style="text-align: center; margin: 30px 0; font-size: 48px; font-weight: bold;">
        <span style="color: #999; text-decoration: line-through; margin-right: 10px;">${from}</span>
        <span style="color: #f57c00;">${to}</span>
      </div>

      <table class="data-table">
        <tr>
          <th>Metric</th>
          <th>Previous</th>
          <th>Current</th>
        </tr>
        <tr>
          <td>Grade</td>
          <td>${from}</td>
          <td>${to}</td>
        </tr>
        <tr>
          <td>Risk Score</td>
          <td>${data.previousScore || 'N/A'}</td>
          <td>${data.currentScore || 'N/A'}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/vendors/${data.vendorId}" class="button">View Vendor Details</a>
        <a href="${frontendUrl}/alerts/${alert.id}/acknowledge" class="button button-secondary">Acknowledge Alert</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated alert from <a href="${frontendUrl}">CyberRx</a>.</p>
      <p>To manage your alert preferences, visit your <a href="${frontendUrl}/settings">settings</a>.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

/**
 * Multi-Provider Confirmation Alert Template
 */
function multiProviderConfirmedAlert(alert) {
  const { vendorName, data } = alert;
  const issues = data.issues || [];
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    subject: `✅ Multi-Provider Confirmation: ${vendorName}`,
    text: `
Multiple security providers have confirmed issues for ${vendorName}.

${issues.map((issue, i) => `
Issue ${i + 1}:
- Category: ${issue.category}
- Providers: ${issue.providers.join(', ')}
- Severity: ${issue.severity}
`).join('\n')}

Multi-provider confirmation increases confidence in these signals.

View details: ${frontendUrl}/vendors/${data.vendorId}

This is an automated alert from CyberRx.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  ${BASE_STYLES}
  <div class="container">
    <div class="header">
      <h1>✅ Multi-Provider Confirmation</h1>
    </div>
    <div class="content">
      <div class="alert-box alert-high">
        <h2 style="margin-top: 0;">Multiple providers confirmed issues for ${vendorName}</h2>
        <p>${issues.length} issue(s) have been confirmed by 2 or more security providers, increasing signal confidence.</p>
      </div>

      <div class="vendor-info">
        <h3>Vendor: ${vendorName}</h3>
        <p><strong>Alert Type:</strong> Multi-Provider Confirmation</p>
        <p><strong>Time:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
      </div>

      <h3>Confirmed Issues</h3>
      <ul class="signal-list">
        ${issues.map(issue => `
          <li class="signal-item ${issue.severity.toLowerCase()}">
            <div style="font-weight: bold; margin-bottom: 5px;">
              ${issue.category}
              <span class="severity-badge badge-${issue.severity.toLowerCase()}">${issue.severity}</span>
            </div>
            <div style="margin-bottom: 5px;">
              <strong>Confirmed by:</strong> ${issue.providers.join(', ')}
            </div>
            <div style="font-size: 12px; color: #999;">
              Confidence: ${issue.confidence || 'High'}
            </div>
          </li>
        `).join('')}
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/vendors/${data.vendorId}" class="button">View Vendor Details</a>
        <a href="${frontendUrl}/alerts/${alert.id}/acknowledge" class="button button-secondary">Acknowledge Alert</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated alert from <a href="${frontendUrl}">CyberRx</a>.</p>
      <p>To manage your alert preferences, visit your <a href="${frontendUrl}/settings">settings</a>.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

/**
 * Sync Failure Daily Digest Template
 */
function syncFailureDigest(alert) {
  const { data } = alert;
  const failures = data.failures || [];
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    subject: `Daily Sync Failure Digest - ${new Date().toLocaleDateString()}`,
    text: `
Daily digest of vendor sync failures.

${failures.length} sync failures detected in the last 24 hours.

${failures.map((failure, i) => `
${i + 1}. ${failure.vendorName}
   - Connector: ${failure.connectorType}
   - Error: ${failure.error || 'Unknown error'}
   - Time: ${new Date(failure.failedAt).toLocaleString()}
`).join('\n')}

View all failures: ${frontendUrl}/admin/sync-failures

This is an automated alert from CyberRx.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  ${BASE_STYLES}
  <div class="container">
    <div class="header">
      <h1>Daily Sync Failure Digest</h1>
    </div>
    <div class="content">
      <div class="alert-box alert-medium">
        <h2 style="margin-top: 0;">${failures.length} Sync Failures Detected</h2>
        <p>Summary of vendor sync failures in the last 24 hours.</p>
      </div>

      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

      <h3>Failed Syncs</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Connector</th>
            <th>Error</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${failures.map(failure => `
            <tr>
              <td>${failure.vendorName}</td>
              <td>${failure.connectorType}</td>
              <td>${failure.error || 'Unknown error'}</td>
              <td>${new Date(failure.failedAt).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/admin/sync-failures" class="button">View All Failures</a>
        <a href="${frontendUrl}/admin/sync-configuration" class="button button-secondary">Configure Syncs</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated alert from <a href="${frontendUrl}">CyberRx</a>.</p>
      <p>To manage your alert preferences, visit your <a href="${frontendUrl}/settings">settings</a>.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

/**
 * Get email template for alert type
 * @param {Object} alert - Alert object
 * @returns {Object} Email template with subject, text, and html
 */
function getEmailTemplate(alert) {
  switch (alert.type) {
    case 'critical_signal':
      return criticalSignalAlert(alert);
    case 'score_increase':
      return scoreIncreaseAlert(alert);
    case 'grade_degradation':
      return gradeDegradationAlert(alert);
    case 'multi_provider_confirmed':
      return multiProviderConfirmedAlert(alert);
    case 'sync_failure':
      return syncFailureDigest(alert);
    default:
      throw new Error(`Unknown alert type: ${alert.type}`);
  }
}

module.exports = {
  getEmailTemplate,
  criticalSignalAlert,
  scoreIncreaseAlert,
  gradeDegradationAlert,
  multiProviderConfirmedAlert,
  syncFailureDigest
};

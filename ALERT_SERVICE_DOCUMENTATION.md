# Alert Service Documentation

## Overview

The Alert Service provides vendor monitoring alert capabilities with support for multiple delivery channels (email and Slack), configurable alert rules, and async processing via BullMQ queues.

## Features

- **Multiple Alert Channels**: Email (SendGrid) and Slack webhooks
- **4 Alert Rules**: Critical signals, risk score increases, grade degradation, multi-provider confirmation
- **Async Delivery**: Alerts are queued and delivered asynchronously
- **Retry Logic**: Failed alerts are automatically retried with exponential backoff
- **HTML Email Templates**: Beautiful, responsive email templates for each alert type
- **Slack Integration**: Formatted Slack messages with action buttons
- **Alert History**: All alerts are stored in the database for audit trail

## Alert Types

### 1. Critical Signal Alert
**Trigger**: Immediate alert when severity=Critical signals are detected

**Severity**: Critical

**Email Template**: Red alert box with list of critical signals

**Slack Format**: Header with emoji, signal details, action buttons

**Use Case**: Immediate notification of critical security issues requiring urgent attention

### 2. Risk Score Increase Alert
**Trigger**: When vendor risk score increases by >20 points

**Severity**: High

**Email Template**: Score change display with before/after comparison

**Slack Format**: Score change visualization

**Use Case**: Significant deterioration in vendor security posture

### 3. Grade Degradation Alert
**Trigger**: When connector grade drops (e.g., A → B)

**Severity**: Medium

**Email Template**: Grade change visualization

**Slack Format**: Before/after grade display

**Use Case**: Vendor security grade has declined

### 4. Multi-Provider Confirmation Alert
**Trigger**: When 2+ providers flag the same issue

**Severity**: High

**Email Template**: List of confirmed issues with providers

**Slack Format**: Confirmed issues with provider list

**Use Case**: High-confidence signals from multiple sources

### 5. Sync Failure Daily Digest
**Trigger**: Daily digest of sync failures (run nightly)

**Severity**: Medium

**Email Template**: Table of failed syncs

**Slack Format**: Failure list with details

**Use Case**: Summary of sync issues for the day

## Configuration

### Environment Variables

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=alerts@cyberrx.com
DEFAULT_ALERT_EMAIL=admin@cyberrx.com

# Slack Webhooks
SLACK_WEBHOOK_CRITICAL=https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK
SLACK_WEBHOOK_WARNING=https://hooks.slack.com/services/YOUR/WARNING/WEBHOOK
SLACK_WEBHOOK_INFO=https://hooks.slack.com/services/YOUR/INFO/WEBHOOK

# Frontend URL (for alert links)
FRONTEND_URL=http://localhost:5173

# Redis (for alert queue)
REDIS_URL=redis://localhost:6379
```

### SendGrid Setup

1. Create a SendGrid account at https://sendgrid.com/
2. Generate an API key with "Mail Send" permissions
3. Set up sender authentication (SPF/DKIM)
4. Configure `SENDGRID_API_KEY` in environment

### Slack Webhook Setup

1. Create a Slack app at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create webhooks for each severity level (optional)
4. Copy webhook URLs to environment variables

## Usage

### Basic Alert Sending

```javascript
const AlertService = require('./services/AlertService');

const alertService = new AlertService();

await alertService.sendAlert({
  organizationId: 'org-123',
  vendorId: 'vendor-123',
  type: 'critical_signal',
  severity: 'Critical',
  message: 'Critical security signals detected',
  data: {
    signals: [...],
    vendorId: 'vendor-123'
  }
});
```

### Evaluating Alert Rules

```javascript
// Automatically evaluates all rules for a vendor
const triggeredAlerts = await alertService.evaluateRules(
  vendorId,
  organizationId
);

console.log(`Triggered ${triggeredAlerts.length} alerts`);
```

### Creating Sync Failure Digest

```javascript
const failures = [
  {
    vendor_name: 'Vendor 1',
    vendor_id: 'vendor-1',
    connector_type: 'SecurityScorecard',
    error_message: 'API Error',
    failed_at: new Date()
  }
];

await alertService.createSyncFailureDigest('org-123', failures);
```

## Database Schema

### vendor_alerts Table

```sql
CREATE TABLE vendor_alerts (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL CHECK (
    alert_type IN (
      'critical_signal',
      'score_increase',
      'grade_degradation',
      'sync_failure',
      'multi_provider_confirmed'
    )
  ),
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')
  ),
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'sent', 'failed')
  ),
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

- `idx_vendor_alerts_org_created`: Organization + created_at
- `idx_vendor_alerts_vendor_created`: Vendor + created_at
- `idx_vendor_alerts_severity_created`: Severity + created_at
- `idx_vendor_alerts_type_created`: Alert type + created_at
- `idx_vendor_alerts_delivery_status`: Delivery status + created_at
- `idx_vendor_alerts_org_severity`: Organization + severity + created_at

## Queue Processing

### Alert Worker

Start the alert worker:

```bash
npm run alert-worker
```

The worker processes alerts from the BullMQ queue with:
- Concurrency: 5 alerts at a time
- Rate limit: 10 alerts per second
- Retry attempts: 3
- Backoff: Exponential (1s, 5s, 30s)

### Job Priority

Alerts are prioritized by severity:
1. Critical: Priority 1 (highest)
2. High: Priority 5
3. Medium: Priority 10
4. Low: Priority 15
5. Info: Priority 20 (lowest)

## API Endpoints

### Get Alerts for Organization

```http
GET /api/organizations/:organizationId/alerts?type=critical_signal&limit=50
```

### Get Alert Statistics

```http
GET /api/organizations/:organizationId/alerts/statistics?days=30
```

### Acknowledge Alert

```http
POST /api/alerts/:alertId/acknowledge
{
  "acknowledgedBy": "user-123"
}
```

## Email Templates

### Template Structure

Each alert type has a dedicated email template in `src/utils/emailTemplates.js`:

- `criticalSignalAlert()`: Critical signal alerts
- `scoreIncreaseAlert()`: Risk score increase alerts
- `gradeDegradationAlert()`: Grade degradation alerts
- `multiProviderConfirmedAlert()`: Multi-provider confirmation alerts
- `syncFailureDigest()`: Daily sync failure digest

### Customization

Templates can be customized by:
1. Modifying the HTML in `emailTemplates.js`
2. Adding organization-specific branding
3. Customizing CSS styles
4. Adding organization logos

## Slack Integration

### Message Format

Slack messages use the Block Kit format with:
- Header with alert type and severity
- Context section with @here mention for critical alerts
- Alert-specific details
- Action buttons (View Vendor, Acknowledge)

### Channel Routing

Alerts are routed to different channels based on severity:
- Critical → `SLACK_WEBHOOK_CRITICAL`
- High/Medium → `SLACK_WEBHOOK_WARNING`
- Low/Info → `SLACK_WEBHOOK_INFO`

## Testing

### Unit Tests

```bash
npm test tests/services/AlertService.test.js
```

### Test Coverage

The test suite covers:
- Alert creation and queuing
- Rule evaluation
- Grade calculation
- Multi-provider confirmation
- Priority assignment
- Slack block generation
- Email sending
- Error handling

### Manual Testing

1. Set up test SendGrid API key
2. Create test Slack webhooks
3. Run alert worker: `npm run alert-worker`
4. Trigger test alerts via API

## Monitoring

### Metrics to Track

- Alert delivery success rate
- Alert delivery latency
- Failed alert count
- Alert acknowledgment rate
- Queue depth

### Logging

Alert service logs to:
- `logs/cyberrx-api-DATE.log`: All logs
- `logs/error-DATE.log`: Error logs
- `logs/correlation-DATE.log`: Correlation logs

### Health Checks

Monitor alert service health:

```bash
curl http://localhost:3001/health
```

## Troubleshooting

### Common Issues

**Alerts not sending**:
- Check SendGrid API key is valid
- Verify Slack webhooks are accessible
- Check Redis connection
- Review queue metrics

**Alerts delayed**:
- Check queue depth
- Verify worker is running
- Check rate limiting settings

**Email not delivered**:
- Verify SendGrid sender authentication
- Check recipient email addresses
- Review SendGrid delivery logs

**Slack notifications not appearing**:
- Verify webhook URLs are correct
- Check Slack app permissions
- Review webhook rate limits

## Performance Considerations

- Alerts are processed asynchronously to avoid blocking
- Queue prevents overwhelming external APIs
- Rate limiting prevents Slack API errors
- Database indexes ensure fast queries
- Old alerts are cleaned up automatically

## Security Considerations

- API keys are stored in environment variables
- Alert data is organization-isolated
- Webhook URLs should use HTTPS
- SendGrid sender authentication is required
- No sensitive data in alert messages

## Future Enhancements

- [ ] SMS alerts via Twilio
- [ ] PagerDuty integration for critical alerts
- [ ] Custom alert rules per organization
- [ ] Alert digest scheduling (hourly, daily, weekly)
- [ ] Alert suppression windows
- [ ] Custom webhook endpoints
- [ ] Alert history export
- [ ] Real-time alert streaming via WebSocket

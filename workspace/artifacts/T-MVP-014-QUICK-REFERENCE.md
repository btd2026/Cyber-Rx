# T-MVP-014: Alerting System - Quick Reference

## Overview

Complete alerting and notification system for threshold breach detection across all agents (CFO, CISO, Board) with multi-channel notifications (email, Slack, Teams).

## Quick Start

### 1. Database Migration

```bash
# Apply migration
psql $DATABASE_URL < cyberrx-api/migrations/2025_06_06_create_alerting_tables.sql

# Verify tables created
psql $DATABASE_URL -c "\dt alerts"

# Rollback if needed
psql $DATABASE_URL < cyberrx-api/migrations/2025_06_06_create_alerting_tables_rollback.sql
```

### 2. Environment Configuration

Add to your `.env` file:

```bash
# SendGrid (Required for email alerts)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=alerts@yourdomain.com
SENDGRID_FROM_NAME=Your Company Alerts

# Slack (Optional - for Slack notifications)
SLACK_WEBHOOK_CRITICAL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_WEBHOOK_HIGH=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_WEBHOOK_MEDIUM=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_WEBHOOK_LOW=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Teams (Optional - for Teams notifications)
TEAMS_WEBHOOK_BASE_URL=https://your-org.webhook.office.com/webhookb2/YOUR/WEBHOOK/URL

# System Settings
ALERT_COOLDOWN_DEFAULT=60
ALERT_RETENTION_DAYS=90
FRONTEND_URL=https://your-frontend.com
```

### 3. Test the System

```bash
# Check health
curl https://api.cyberrx.com/api/alerting/health

# Send test alert
curl -X POST https://api.cyberrx.com/api/alerting/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "cfo",
    "channels": ["email"]
  }'

# Evaluate threshold manually
curl -X POST https://api.cyberrx.com/api/alerting/evaluate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "cfo",
    "metricType": "dollar_exposure",
    "actualValue": 1500000
  }'
```

## API Endpoints

### Alert Feed
- `GET /api/alerting/feed` - Fetch alerts (with filters)
- `GET /api/alerting/feed/:alertId` - Fetch single alert
- `PUT /api/alerting/feed/:alertId/acknowledge` - Acknowledge alert
- `PUT /api/alerting/feed/:alertId/dismiss` - Dismiss alert
- `PUT /api/alerting/feed/:alertId/resolve` - Resolve alert

### Configuration
- `GET /api/alerting/config` - Get alert configs
- `POST /api/alerting/config` - Create config
- `PUT /api/alerting/config` - Update config

### Statistics & Testing
- `GET /api/alerting/stats` - Get statistics
- `POST /api/alerting/test` - Send test alert
- `POST /api/alerting/evaluate` - Manual evaluation
- `GET /api/alerting/health` - Health check

## Default Alert Configurations

### CFO Alerts
- **Dollar Exposure > $1M** (High severity)
- **MLR Impact > 5%** (High severity)

### CISO Alerts
- **Blast Radius > 50 systems** (Critical severity)
- **Risk Score > 70** (High severity)
- **Attack Pathways > 5** (High severity)

### Board Alerts
- **Governance Questions ≥ 1** (Critical severity)

## Alert Flow

```
Agent Output → Threshold Detection → Alert Routing → Notification Delivery → Storage → Dashboard
```

1. Agent generates output with metrics
2. Threshold detector evaluates against configured thresholds
3. Alert router determines target roles based on severity
4. Notification services send via email/Slack/Teams
5. Alert persisted to database with delivery status
6. Dashboard displays alerts for user interaction

## Routing Logic

- **Low/Medium severity:** Primary role only
- **High severity:** Primary role + Board
- **Critical severity:** All executive roles
- **Custom rules:** Configured per alert type

## Testing

```bash
# Run unit tests
cd cyberrx-api
npm test -- src/services/alerting/__tests__/ThresholdDetector.test.js
npm test -- src/services/alerting/__tests__/AlertRouter.test.js
npm test -- src/services/alerting/__tests__/EmailService.test.js

# Run integration tests
npm test -- src/services/alerting/__tests__/integration.test.js

# Run load tests
npm test -- src/services/alerting/__tests__/load.test.js
```

## Troubleshooting

### Alerts Not Being Received

1. Check `/api/alerting/health` - verify services operational
2. Check `/api/alerting/stats` - view delivery statistics
3. Verify SendGrid API key is set
4. Check Slack/Teams webhook URLs
5. Review alert delivery status in alert object

### Too Many Alerts

1. Increase `cooldownMinutes` in AlertConfig
2. Enable `hysteresisPercent` (10-20%)
3. Adjust `thresholdValue` to be more lenient
4. Review alert patterns in statistics

### Configuration Issues

1. View current configs: `GET /api/alerting/config`
2. Update config: `PUT /api/alerting/config`
3. Test with specific values: `POST /api/alerting/test`

## Performance

- **Alert creation:** < 100ms
- **Threshold evaluation:** < 50ms
- **Email delivery:** < 5 seconds
- **Slack delivery:** < 1 second
- **Teams delivery:** < 1 second
- **Query 1000 alerts:** < 5 seconds

## Rate Limits

- GET endpoints: 100 requests/minute
- POST endpoints: 20 requests/minute
- PUT endpoints: 20 requests/minute

## Documentation

- **API Documentation:** `/cyberrx-api/docs/alerting-API.md`
- **Implementation Summary:** `/workspace/artifacts/T-MVP-014-IMPLEMENTATION-SUMMARY.md`
- **Database Schema:** `/cyberrx-api/migrations/2025_06_06_create_alerting_tables.sql`

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/cyber-rx/issues
- API Docs: https://docs.cyberrx.com
- Email: support@cyberrx.com

---

**Status:** ✅ COMPLETE
**Branch:** task/T-MVP-014-alerting-system
**Date:** 2025-06-06

# Alerting & Notification System API Documentation

## Overview

The Alerting & Notification System provides comprehensive threshold breach detection and multi-channel notifications for all executive roles (CFO, CISO, CRO, CLO, CIO, Board).

**Base URL:** `/api/alerting`

**Authentication:** All endpoints require JWT authentication (Bearer token)

**Tenant Isolation:** All requests are scoped to the authenticated user's tenant

---

## Endpoints

### 1. Alert Feed

#### GET /api/alerting/feed

Fetch alert history with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | Filter by role (cfo, ciso, croe, clo, cio, board) |
| severity | string | No | Filter by severity (critical, high, medium, low) |
| metricType | string | No | Filter by metric type |
| status | string | No | Filter by status (active, acknowledged, dismissed, escalated, resolved) |
| startDate | string | No | Filter by start date (ISO 8601) |
| endDate | string | No | Filter by end date (ISO 8601) |
| limit | number | No | Limit results (default: 50, max: 500) |
| offset | number | No | Offset results (default: 0) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "alertId": "uuid",
      "tenantId": "tenant-uuid",
      "role": "cfo",
      "severity": "high",
      "metricType": "dollar_exposure",
      "thresholdValue": 1000000,
      "actualValue": 1500000,
      "triggeredAt": "2025-06-06T10:30:00Z",
      "status": "active",
      "acknowledgedBy": null,
      "acknowledgedAt": null,
      "contextData": {
        "previousValue": 1200000,
        "changePercent": 25.0,
        "breachAmount": 500000,
        "breachPercent": 50.0
      },
      "deliveryStatus": {
        "email": "delivered",
        "slack": "delivered",
        "teams": "pending"
      },
      "retryCount": 0,
      "lastRetryAt": null,
      "createdAt": "2025-06-06T10:30:00Z",
      "updatedAt": "2025-06-06T10:30:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "limit": 50,
    "offset": 0
  }
}
```

**Example:**

```bash
curl -X GET "https://api.cyberrx.com/api/alerting/feed?role=cfo&severity=high&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### GET /api/alerting/feed/:alertId

Fetch a single alert by ID.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| alertId | string | Alert UUID (path parameter) |

**Response:**

```json
{
  "success": true,
  "data": {
    "alertId": "uuid",
    "tenantId": "tenant-uuid",
    "role": "cfo",
    "severity": "high",
    "metricType": "dollar_exposure",
    "thresholdValue": 1000000,
    "actualValue": 1500000,
    "triggeredAt": "2025-06-06T10:30:00Z",
    "status": "active",
    "contextData": {},
    "deliveryStatus": {},
    "createdAt": "2025-06-06T10:30:00Z",
    "updatedAt": "2025-06-06T10:30:00Z"
  }
}
```

---

#### PUT /api/alerting/feed/:alertId/acknowledge

Acknowledge an alert.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| alertId | string | Alert UUID (path parameter) |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| X-User-ID | Yes* | User ID (if not in JWT token) |

**Response:**

```json
{
  "success": true,
  "data": {
    "alertId": "uuid",
    "status": "acknowledged",
    "acknowledgedBy": "user-uuid",
    "acknowledgedAt": "2025-06-06T10:35:00Z"
  },
  "message": "Alert acknowledged"
}
```

---

#### PUT /api/alerting/feed/:alertId/dismiss

Dismiss an alert.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| alertId | string | Alert UUID (path parameter) |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| X-User-ID | Yes* | User ID (if not in JWT token) |

**Response:**

```json
{
  "success": true,
  "data": {
    "alertId": "uuid",
    "status": "dismissed",
    "acknowledgedBy": "user-uuid",
    "acknowledgedAt": "2025-06-06T10:35:00Z"
  },
  "message": "Alert dismissed"
}
```

---

#### PUT /api/alerting/feed/:alertId/resolve

Resolve an alert with optional notes.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| alertId | string | Alert UUID (path parameter) |

**Body:**

```json
{
  "notes": "Investigated and resolved - false positive"
}
```

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| X-User-ID | Yes* | User ID (if not in JWT token) |

**Response:**

```json
{
  "success": true,
  "data": {
    "alertId": "uuid",
    "status": "resolved",
    "acknowledgedBy": "user-uuid",
    "acknowledgedAt": "2025-06-06T10:35:00Z",
    "contextData": {
      "resolution": {
        "notes": "Investigated and resolved - false positive",
        "resolvedBy": "user-uuid"
      }
    }
  },
  "message": "Alert resolved"
}
```

---

### 2. Alert Configuration

#### GET /api/alerting/config

Fetch alert configuration for tenant.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | Filter by role |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "configId": "uuid",
      "tenantId": "tenant-uuid",
      "role": "cfo",
      "metricType": "dollar_exposure",
      "thresholdValue": 1000000,
      "severity": "high",
      "enabled": true,
      "cooldownMinutes": 60,
      "hysteresisPercent": 10.0,
      "notificationChannels": ["email", "slack", "teams"],
      "emailRecipients": ["cfo@example.com"],
      "slackChannels": {
        "critical": "https://hooks.slack.com/services/...",
        "default": "https://hooks.slack.com/services/..."
      },
      "teamsWebhooks": {
        "critical": "https://your-org.webhook.office.com/...",
        "default": "https://your-org.webhook.office.com/..."
      },
      "escalationRules": {
        "high": {
          "escalateTo": ["board"],
          "delayMinutes": 60
        }
      },
      "createdAt": "2025-06-06T10:00:00Z",
      "updatedAt": "2025-06-06T10:00:00Z"
    }
  ],
  "meta": {
    "count": 1
  }
}
```

---

#### POST /api/alerting/config

Create new alert configuration.

**Body:**

```json
{
  "role": "cfo",
  "metricType": "dollar_exposure",
  "thresholdValue": 1000000,
  "severity": "high",
  "enabled": true,
  "cooldownMinutes": 60,
  "hysteresisPercent": 10.0,
  "notificationChannels": ["email", "slack"],
  "emailRecipients": ["cfo@example.com"],
  "slackChannels": {
    "critical": "https://hooks.slack.com/services/...",
    "default": "https://hooks.slack.com/services/..."
  },
  "teamsWebhooks": {
    "critical": "https://your-org.webhook.office.com/...",
    "default": "https://your-org.webhook.office.com/..."
  },
  "escalationRules": {
    "high": {
      "escalateTo": ["board"],
      "delayMinutes": 60
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "configId": "uuid",
    "tenantId": "tenant-uuid",
    "role": "cfo",
    "metricType": "dollar_exposure",
    "thresholdValue": 1000000,
    "severity": "high",
    "enabled": true,
    "cooldownMinutes": 60,
    "hysteresisPercent": 10.0,
    "notificationChannels": ["email", "slack"],
    "createdAt": "2025-06-06T10:00:00Z",
    "updatedAt": "2025-06-06T10:00:00Z"
  },
  "message": "Config created"
}
```

---

#### PUT /api/alerting/config

Update existing alert configuration.

**Body:**

```json
{
  "configId": "uuid",
  "thresholdValue": 2000000,
  "severity": "critical",
  "enabled": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "configId": "uuid",
    "thresholdValue": 2000000,
    "severity": "critical",
    "enabled": true,
    "updatedAt": "2025-06-06T10:05:00Z"
  },
  "message": "Config updated"
}
```

---

### 3. Alert Statistics

#### GET /api/alerting/stats

Get comprehensive alert statistics.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| days | number | No | Number of days to look back (default: 30) |

**Response:**

```json
{
  "success": true,
  "data": {
    "statistics": [
      {
        "role": "cfo",
        "severity": "high",
        "totalCount": 15,
        "activeCount": 3,
        "acknowledgedCount": 10,
        "escalatedCount": 1,
        "resolvedCount": 1,
        "dismissedCount": 0,
        "avgValue": 1250000,
        "maxValue": 2000000,
        "minValue": 1000000
      }
    ],
    "deliveryStats": [
      {
        "channel": "email",
        "status": "delivered",
        "count": 45,
        "uniqueAlerts": 15
      },
      {
        "channel": "slack",
        "status": "delivered",
        "count": 15,
        "uniqueAlerts": 15
      }
    ],
    "severityBreakdown": [
      {
        "severity": "critical",
        "total": 5,
        "last24h": 1,
        "last7d": 3,
        "last30d": 5
      },
      {
        "severity": "high",
        "total": 15,
        "last24h": 2,
        "last7d": 8,
        "last30d": 15
      }
    ]
  }
}
```

---

### 4. Testing & Evaluation

#### POST /api/alerting/test

Send a test alert to verify notification setup.

**Body:**

```json
{
  "role": "cfo",
  "channels": ["email", "slack"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "alertId": "uuid",
    "routedAlerts": [
      { "alertId": "uuid", "role": "cfo" }
    ],
    "notifications": [
      {
        "channel": "email",
        "result": {
          "success": true,
          "attempts": 1
        }
      },
      {
        "channel": "slack",
        "result": {
          "success": true,
          "totalWebhooks": 1,
          "successful": 1
        }
      }
    ]
  },
  "message": "Test alert sent"
}
```

---

#### POST /api/alerting/evaluate

Manually trigger threshold evaluation.

**Body:**

```json
{
  "role": "cfo",
  "metricType": "dollar_exposure",
  "actualValue": 1500000,
  "context": {
    "source": "manual_test",
    "description": "Testing CFO dollar exposure"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "alert": {
      "alertId": "uuid",
      "role": "cfo",
      "severity": "high",
      "metricType": "dollar_exposure",
      "thresholdValue": 1000000,
      "actualValue": 1500000,
      "triggeredAt": "2025-06-06T10:30:00Z",
      "status": "active"
    },
    "routedAlerts": [
      { "alertId": "uuid", "role": "cfo" }
    ]
  },
  "message": "Threshold breach detected and alert created"
}
```

---

### 5. Health Check

#### GET /api/alerting/health

Check alerting system health and configuration.

**Response:**

```json
{
  "success": true,
  "data": {
    "thresholdDetector": {
      "cooldownCacheSize": 5,
      "previousValuesSize": 5,
      "configCacheSize": 10,
      "configLastRefresh": "2025-06-06T10:00:00Z"
    },
    "alertRouter": {
      "totalRouted": 150,
      "routingErrors": 0,
      "escalations": 25,
      "multiRoleAlerts": 10,
      "deadLetterQueueSize": 0
    },
    "emailService": {
      "configured": true,
      "fromEmail": "alerts@cyberrx.com",
      "rateLimit": {
        "maxPerMinute": 100,
        "sentThisMinute": 5
      },
      "retryConfig": {
        "maxRetries": 3,
        "retryDelay": 1000
      }
    },
    "slackService": {
      "configured": true,
      "webhooksConfigured": 4,
      "frontendUrl": "https://cyberrx.com"
    },
    "teamsService": {
      "configured": true,
      "webhookBaseUrl": "https://your-org.webhook.office.com",
      "frontendUrl": "https://cyberrx.com"
    }
  },
  "message": "Alerting system operational"
}
```

---

## Data Models

### Alert Object

```typescript
{
  alertId: string;              // UUID
  tenantId: string;            // Tenant UUID
  role: 'cfo' | 'ciso' | 'croe' | 'clo' | 'cio' | 'board' | 'critical';
  severity: 'critical' | 'high' | 'medium' | 'low';
  metricType: 'dollar_exposure' | 'blast_radius' | 'risk_score' | 'governance' |
              'mlr_impact' | 'stop_loss_exposure' | 'attack_pathway_count' |
              'crown_jewel_tier' | 'compliance_breach';
  thresholdValue: number;      // Threshold that was breached
  actualValue: number;         // Actual value that triggered alert
  triggeredAt: string;        // ISO 8601 timestamp
  status: 'active' | 'acknowledged' | 'dismissed' | 'escalated' | 'resolved';
  acknowledgedBy?: string;     // User UUID
  acknowledgedAt?: string;     // ISO 8601 timestamp
  contextData: object;         // Additional context (JSONB)
  deliveryStatus: object;      // { email: 'delivered', slack: 'pending', teams: 'failed' }
  retryCount: number;
  lastRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Alert Config Object

```typescript
{
  configId: string;            // UUID
  tenantId: string;            // Tenant UUID
  role: 'cfo' | 'ciso' | 'croe' | 'clo' | 'cio' | 'board';
  metricType: string;          // Same as Alert.metricType
  thresholdValue: number;      // Alert threshold
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  cooldownMinutes: number;     // Cooldown period between alerts
  hysteresisPercent: number;   // Hysteresis to prevent flapping (0-100)
  notificationChannels: string[];  // ['email', 'slack', 'teams', 'websocket']
  emailRecipients: string[];   // Custom email recipients
  slackChannels: object;       // { critical: 'url', high: 'url', default: 'url' }
  teamsWebhooks: object;       // { critical: 'url', high: 'url', default: 'url' }
  escalationRules: object;     // { high: { escalateTo: ['board'], delayMinutes: 60 } }
  createdAt: string;
  updatedAt: string;
}
```

---

## Error Responses

All endpoints may return error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created (for POST endpoints) |
| 400 | Bad Request (invalid parameters) |
| 403 | Forbidden (tenant access denied) |
| 404 | Not Found (alert/config doesn't exist) |
| 500 | Internal Server Error |

---

## Rate Limiting

All endpoints are subject to rate limiting:

| Method | Rate Limit |
|--------|------------|
| GET | 100 requests/minute |
| POST | 20 requests/minute |
| PUT | 20 requests/minute |
| DELETE | 10 requests/minute |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1622592000
```

---

## WebSocket Support (Future)

Real-time alert streaming via WebSocket will be available at:

```
WS /api/alerting/stream
```

**Connection:**

```javascript
const ws = new WebSocket('wss://api.cyberrx.com/api/alerting/stream', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  console.log('New alert:', alert);
};
```

**Message Format:**

```json
{
  "type": "alert",
  "action": "created",
  "data": {
    "alertId": "uuid",
    "role": "cfo",
    "severity": "high",
    "metricType": "dollar_exposure",
    "actualValue": 1500000,
    "triggeredAt": "2025-06-06T10:30:00Z"
  }
}
```

---

## Integration Guides

### SendGrid Setup

1. Create a SendGrid account: https://sendgrid.com/
2. Generate an API key with "Mail Send" permissions
3. Set environment variable: `SENDGRID_API_KEY=SG.your-key`
4. Configure sender email: `SENDGRID_FROM_EMAIL=alerts@yourdomain.com`
5. Optional: Customize sender name: `SENDGRID_FROM_NAME=Your Company Alerts`

### Slack Setup

1. Create a Slack App: https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create webhooks for each severity level (critical, high, medium, low)
4. Set environment variables:
   ```
   SLACK_WEBHOOK_CRITICAL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   SLACK_WEBHOOK_HIGH=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   SLACK_WEBHOOK_MEDIUM=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   SLACK_WEBHOOK_LOW=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```
5. Optional: Enable interactive buttons for acknowledge/dismiss actions

### Microsoft Teams Setup

1. Create a Teams Incoming Webhook: https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using
2. Set environment variable: `TEAMS_WEBHOOK_BASE_URL=https://your-org.webhook.office.com/webhookb2/YOUR/WEBHOOK/URL`
3. Configure per-tenant webhooks in AlertConfig

---

## Best Practices

1. **Threshold Configuration**: Set appropriate thresholds based on your organization's risk tolerance
2. **Cooldown Periods**: Use cooldown periods (60-120 minutes) to prevent alert fatigue
3. **Hysteresis**: Enable hysteresis (10-20%) to prevent alert flapping near thresholds
4. **Escalation Rules**: Configure escalation for high-severity alerts to ensure visibility
5. **Notification Channels**: Enable multiple channels (email + Slack/Teams) for critical alerts
6. **Regular Review**: Periodically review and adjust thresholds based on feedback

---

## Troubleshooting

### Alerts Not Being Received

1. Check `/api/alerting/health` endpoint
2. Verify SendGrid/Slack/Teams credentials are configured
3. Check alert delivery status in alert object
4. Review notification channel configuration in AlertConfig
5. Verify recipient emails/webhook URLs are correct

### Too Many Alerts

1. Increase cooldown period in AlertConfig
2. Enable hysteresis to prevent flapping
3. Adjust threshold values to be more lenient
4. Review alert patterns in statistics

### Alerts Not Routing Correctly

1. Verify role mappings in AlertRouter
2. Check escalation rules in AlertConfig
3. Review alert delivery logs
4. Test with `/api/alerting/test` endpoint

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/cyber-rx/issues
- Documentation: https://docs.cyberrx.com
- Email: support@cyberrx.com

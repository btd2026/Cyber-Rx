# Credential Rotation Workflow Documentation

## Overview

The Credential Rotation feature monitors API key age and enforces regular rotation policies to maintain security compliance. This document describes the workflow, API endpoints, and security considerations.

## Security Benefits

- **Compliance**: Meets regulatory requirements for credential rotation (SOC 2, PCI-DSS, HIPAA)
- **Reduced Risk**: Limits exposure window if credentials are compromised
- **Audit Trail**: Maintains history of all rotations for compliance audits
- **Automated Alerts**: Proactive notifications before credentials become overdue

## Rotation Periods

Default rotation periods by connector type:

| Connector Type | Rotation Period |
|----------------|-----------------|
| SecurityScorecard | 90 days |
| BitSight | 90 days |
| RiskRecon | 90 days |
| Recorded Future | 60 days |
| BlackKite | 60 days |
| Fortium | 60 days |

## Alert Severity Levels

| Credential Age | Severity | Description |
|----------------|----------|-------------|
| Within rotation period | Low | No action needed |
| Within 30 days of due | Medium | Warning - prepare for rotation |
| Overdue (0-30 days) | High | Action required - rotate immediately |
| Overdue (>30 days) | Critical | Urgent - rotate immediately and investigate |

## API Endpoints

### GET /api/credentials/rotation-status

Get rotation status for all credentials in an organization.

**Query Parameters:**
- `orgId` (from JWT): Organization ID

**Response:**
```json
{
  "organizationId": "org-123",
  "credentials": [
    {
      "id": 456,
      "connectorType": "securityscorecard",
      "connectorName": "SecurityScorecard",
      "currentVersion": "v2",
      "credentialAge": 95,
      "rotationPeriod": 90,
      "daysUntilRotation": -5,
      "status": "overdue",
      "lastRotated": "2025-01-01T00:00:00Z",
      "rotationHistory": [
        {
          "version": "v1",
          "rotatedAt": "2025-04-01T00:00:00Z",
          "rotatedBy": "user@example.com",
          "previousCreatedAt": "2025-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "total": 1,
  "overdue": 1,
  "dueSoon": 0
}
```

### POST /api/credentials/:connectionId/rotate

Rotate a credential to a new version.

**Request Body:**
```json
{
  "credentials": {
    "apiKey": "new-api-key",
    "domain": "example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "version": "v3",
  "rotatedAt": "2025-05-31T12:00:00Z",
  "message": "Credentials rotated to v3. Previous version saved to history."
}
```

**Security Notes:**
- New credentials are encrypted and stored in vault
- Old credentials are saved to rotation history (not actual keys, just metadata)
- Rotation event is logged to audit_logs table
- User who performed rotation is tracked

### GET /api/credentials/:connectionId/rotation-history

Get rotation history for a specific credential.

**Response:**
```json
{
  "connectionId": 456,
  "connectorType": "securityscorecard",
  "connectorName": "SecurityScorecard",
  "createdAt": "2025-01-01T00:00:00Z",
  "rotations": [
    {
      "version": "v1",
      "rotatedAt": "2025-04-01T00:00:00Z",
      "rotatedBy": "user@example.com",
      "previousCreatedAt": "2025-01-01T00:00:00Z"
    },
    {
      "version": "v2",
      "rotatedAt": "2025-05-31T00:00:00Z",
      "rotatedBy": "admin@example.com",
      "previousCreatedAt": "2025-04-01T00:00:00Z"
    }
  ]
}
```

## Scheduled Checks

The credential rotation check runs daily at 9:00 AM UTC:

```javascript
// In scheduler.js
const rotationTask = cron.schedule('0 9 * * *', checkCredentialRotations, {
  scheduled: true,
  timezone: process.env.TZ || 'UTC'
});
```

For each organization:
1. Fetch all tool connections
2. Calculate credential age
3. Check against rotation period
4. Generate alerts for credentials needing rotation
5. Send alerts via AlertService (email, Slack)

## Database Schema

```sql
-- tool_connections table
ALTER TABLE tool_connections
ADD COLUMN rotation_history JSONB DEFAULT '[]'::jsonb;

-- Index for age queries
CREATE INDEX idx_tool_connections_created_at
  ON tool_connections(created_at);

-- Sample rotation_history entry
[
  {
    "version": "v1",
    "rotatedAt": "2025-04-01T00:00:00Z",
    "rotatedBy": "user@example.com",
    "previousCreatedAt": "2025-01-01T00:00:00Z"
  }
]
```

## Frontend Component

### CredentialRotationStatus

Props:
- `connection`: Connection object with `id` and `orgId`
- `onRotate`: Callback function when "Rotate Now" is clicked
- `className`: Additional CSS classes

Features:
- Displays credential age and rotation status
- Shows current version (v1, v2, v3...)
- Color-coded status indicators
- "Rotate Now" button for overdue credentials
- Rotation history timeline

Example usage:
```jsx
<CredentialRotationStatus
  connection={{ id: 456, orgId: 'org-123' }}
  onRotate={(conn) => openRotationModal(conn)}
  className="mb-4"
/>
```

## Security Considerations

### Credential Storage
- Actual API keys are stored in vault (encrypted at rest)
- Rotation history contains only metadata (no actual keys)
- Old credentials are NOT retained after rotation

### Access Control
- JWT authentication required for all endpoints
- Organization isolation enforced via `req.orgId`
- Rate limiting applied to prevent abuse

### Audit Logging
- All rotation attempts logged to `audit_logs` table
- Tracks: user, timestamp, connection ID, result
- API key values NEVER logged (only masked versions)

### Alert Security
- Alert data contains NO actual credentials
- Only metadata: age, connector type, rotation period
- Alert delivery via authenticated channels (email, Slack)

## Compliance Mapping

### SOC 2 Type II
- **CC6.1**: Logical and physical access controls
- **CC7.2**: System monitoring and incident response
- **CC8.1**: Periodic rotation of credentials

### PCI-DSS
- **Requirement 8.2.1**: Change user passwords/passphrases at least once every 90 days
- **Requirement 8.2.4**: Change passwords/passphrases if there is any suspicion of compromise

### HIPAA
- **§164.308(a)(5)**: Security awareness and training
- **§164.312(a)(2)(i)**: Unique user identification
- **§164.312(d)**: Person or entity authentication

## Troubleshooting

### Credentials not showing as overdue
- Check `tool_connections.created_at` timestamp
- Verify rotation period for connector type
- Ensure scheduler is running (`0 9 * * *` cron)

### Alerts not being sent
- Check AlertService configuration
- Verify SendGrid/Slack credentials
- Check alert severity (Low severity not sent by default)

### Rotation history missing
- Verify `rotation_history` column exists
- Check database migration was applied
- Review rotation logs for errors

## Monitoring

Key metrics to monitor:

1. **Credential Age Distribution**
   - Number of credentials by age bracket
   - Track oldest credentials

2. **Rotation Compliance Rate**
   - Percentage of credentials within rotation period
   - Goal: 100% compliance

3. **Alert Response Time**
   - Time from alert to credential rotation
   - Target: <7 days

4. **Rotation Frequency**
   - Rotations per connector type
   - Identify outliers

## Best Practices

1. **Rotate Regularly**: Follow recommended rotation periods
2. **Document Rotation Reasons**: Track why credentials were rotated
3. **Update Third Parties**: Notify vendors immediately after rotation
4. **Test New Credentials**: Use validation endpoint before saving
5. **Monitor Compliance**: Set up alerts for upcoming rotations
6. **Audit Trail**: Review rotation history monthly

## Future Enhancements

Potential improvements:
- Automatic credential rotation (vendor API dependent)
- Integration with secret management systems (HashiCorp Vault, AWS Secrets Manager)
- Policy-based rotation periods per organization
- Risk-based rotation (shorter period for high-risk connectors)
- Credential dependency tracking (avoid breaking integrations)

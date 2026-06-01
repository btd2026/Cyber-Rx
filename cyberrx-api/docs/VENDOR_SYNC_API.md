# Vendor Sync API Documentation

## Overview

The Vendor Sync API provides endpoints for triggering and tracking asynchronous vendor sync operations. It integrates with BullMQ job queue for background processing and supports multiple security rating connectors.

**Base URL:** `/api/vendors`

**Authentication:** All endpoints require JWT authentication

**Rate Limiting:**
- POST endpoints: 10 requests per minute per organization
- GET endpoints: 100 requests per minute per organization

---

## Endpoints

### 1. Trigger Vendor Sync

Queue a background sync job for a specific vendor with a single connector type.

**Endpoint:** `POST /api/vendors/:vendorId/sync`

**Authentication:** Required (JWT + org_admin role)

**Rate Limit:** 10 requests/minute per organization

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| vendorId | string | Yes | Vendor UUID (URL parameter) |
| connectorType | string | No | Connector type (default: "all") |

#### Request Body

```json
{
  "connectorType": "securityscorecard" | "bitsight" | "riskrecon" | "all"
}
```

#### Valid Connector Types

- `securityscorecard` - SecurityScorecard API
- `bitsight` - BitSight API
- `riskrecon` - RiskRecon API
- `all` - All configured connectors (default)

#### Response (201 Created)

```json
{
  "jobId": "sync-vendor-550e8400-e29b-41d4-a716-446655440000-securityscorecard-1234567890",
  "status": "queued",
  "vendorId": "550e8400-e29b-41d4-a716-446655440000",
  "connectorType": "securityscorecard",
  "queuedAt": "2026-06-15T10:30:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid connector type | Connector type not recognized |
| 403 | Access denied | User lacks org_admin role or wrong organization |
| 404 | Vendor not found | Vendor does not exist |
| 429 | Too many requests | Rate limit exceeded |
| 500 | Failed to queue sync job | Server error |

---

### 2. Trigger Full Vendor Sync

Queue sync jobs for all configured connector types.

**Endpoint:** `POST /api/vendors/:vendorId/sync/all`

**Authentication:** Required (JWT + org_admin role)

**Rate Limit:** 10 requests/minute per organization

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| vendorId | string | Yes | Vendor UUID (URL parameter) |

#### Response (201 Created)

```json
{
  "jobIds": [
    "sync-vendor-550e8400-securityscorecard-1234567890",
    "sync-vendor-550e8400-bitsight-1234567891",
    "sync-vendor-550e8400-riskrecon-1234567892"
  ],
  "count": 3,
  "vendorId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Queued 3 sync jobs for all connectors"
}
```

#### Error Responses

Same as Trigger Vendor Sync endpoint.

---

### 3. Get Sync Job Status

Track the progress and status of a specific sync job.

**Endpoint:** `GET /api/vendors/:vendorId/sync-status/:jobId`

**Authentication:** Required (JWT)

**Rate Limit:** 100 requests/minute per organization

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| vendorId | string | Yes | Vendor UUID (URL parameter) |
| jobId | string | Yes | Job ID from sync endpoint (URL parameter) |

#### Response (200 OK)

```json
{
  "jobId": "sync-vendor-550e8400-securityscorecard-1234567890",
  "vendorId": "550e8400-e29b-41d4-a716-446655440000",
  "connectorType": "securityscorecard",
  "status": "running",
  "progress": 50,
  "startedAt": "2026-06-15T10:30:05.000Z",
  "completedAt": null,
  "error": null,
  "retryCount": 0,
  "createdAt": "2026-06-15T10:30:00.000Z",
  "queueState": {
    "state": "active",
    "attemptsMade": 1,
    "failedReason": null
  }
}
```

#### Job Status Values

| Status | Description | Progress |
|--------|-------------|----------|
| `queued` | Job is waiting to be processed | 0% |
| `running` | Job is currently processing | 50% |
| `completed` | Job completed successfully | 100% |
| `failed` | Job failed with error | 0% |

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Vendor mismatch | Job does not belong to specified vendor |
| 403 | Access denied | Job belongs to different organization |
| 404 | Job not found | Job does not exist |
| 500 | Failed to retrieve job status | Server error |

---

### 4. Get Vendor Sync Jobs

Get all sync jobs for a specific vendor.

**Endpoint:** `GET /api/vendors/:vendorId/sync-jobs`

**Authentication:** Required (JWT)

**Rate Limit:** 100 requests/minute per organization

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| vendorId | string | Yes | Vendor UUID (URL parameter) |
| status | string | No | Filter by status (queued, running, completed, failed) |
| limit | number | No | Max results (default: 50) |
| offset | number | No | Result offset (default: 0) |

#### Response (200 OK)

```json
{
  "vendorId": "550e8400-e29b-41d4-a716-446655440000",
  "count": 5,
  "data": [
    {
      "id": "sync-vendor-550e8400-securityscorecard-1234567890",
      "vendorId": "550e8400-e29b-41d4-a716-446655440000",
      "connectorType": "securityscorecard",
      "status": "completed",
      "startedAt": "2026-06-15T10:30:05.000Z",
      "completedAt": "2026-06-15T10:31:30.000Z",
      "errorMessage": null,
      "retryCount": 0,
      "createdAt": "2026-06-15T10:30:00.000Z",
      "updatedAt": "2026-06-15T10:31:30.000Z"
    }
  ]
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 403 | Access denied | Vendor belongs to different organization |
| 404 | Vendor not found | Vendor does not exist |
| 500 | Failed to retrieve sync jobs | Server error |

---

### 5. Get Sync Statistics

Get sync job statistics for the organization.

**Endpoint:** `GET /api/sync-jobs/statistics`

**Authentication:** Required (JWT)

**Rate Limit:** 100 requests/minute per organization

#### Response (200 OK)

```json
{
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "statistics": {
    "completed": {
      "count": 45,
      "avgDurationSeconds": 120.5
    },
    "failed": {
      "count": 3,
      "avgDurationSeconds": 180.2
    },
    "running": {
      "count": 2,
      "avgDurationSeconds": null
    },
    "queued": {
      "count": 5,
      "avgDurationSeconds": null
    }
  }
}
```

---

## Rate Limiting

### Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2026-06-15T10:31:00.000Z
```

### Rate Limit Exceeded Response (429)

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 30 seconds.",
  "retryAfter": "30 seconds"
}
```

---

## Database Schema

### vendor_sync_jobs Table

```sql
CREATE TABLE vendor_sync_jobs (
  id                    TEXT PRIMARY KEY,
  organization_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id             TEXT,
  connector_type        TEXT NOT NULL CHECK (connector_type IN ('securityscorecard', 'bitsight', 'riskrecon', 'all')),
  job_type              TEXT NOT NULL CHECK (job_type IN ('sync_vendor', 'sync_connector', 'assessment')),
  status                TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  error_message         TEXT,
  retry_count           INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

---

## Integration Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const TOKEN = 'your-jwt-token';

// Trigger sync for a vendor
async function syncVendor(vendorId, connectorType = 'all') {
  try {
    const response = await axios.post(
      `${API_BASE}/vendors/${vendorId}/sync`,
      { connectorType },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Sync failed:', error.response?.data || error.message);
    throw error;
  }
}

// Check job status
async function getJobStatus(vendorId, jobId) {
  const response = await axios.get(
    `${API_BASE}/vendors/${vendorId}/sync-status/${jobId}`,
    {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }
  );
  return response.data;
}

// Example usage
const jobId = await syncVendor('vendor-uuid', 'securityscorecard');
console.log('Job queued:', jobId);

// Poll for completion
let status = await getJobStatus('vendor-uuid', jobId.jobId);
while (status.status !== 'completed' && status.status !== 'failed') {
  await new Promise(resolve => setTimeout(resolve, 2000));
  status = await getJobStatus('vendor-uuid', jobId.jobId);
  console.log('Progress:', status.progress, '%');
}
console.log('Final status:', status.status);
```

### cURL

```bash
# Trigger sync
curl -X POST http://localhost:3001/api/vendors/550e8400-e29b-41d4-a716-446655440000/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"connectorType": "securityscorecard"}'

# Check job status
curl -X GET http://localhost:3001/api/vendors/550e8400-e29b-41d4-a716-446655440000/sync-status/JOB_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get all vendor jobs
curl -X GET http://localhost:3001/api/vendors/550e8400-e29b-41d4-a716-446655440000/sync-jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get organization statistics
curl -X GET http://localhost:3001/api/sync-jobs/statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Testing

Run the test suite:

```bash
npm test tests/routes/vendorSync.test.js
```

Run tests with coverage:

```bash
npm test -- --coverage tests/routes/vendorSync.test.js
```

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Sync operations require org_admin role
3. **Organization Isolation**: Users can only access their organization's vendors and jobs
4. **Rate Limiting**: Prevents abuse and API exhaustion
5. **Input Validation**: All inputs validated before processing
6. **Error Handling**: Sensitive information not exposed in error messages

---

## Monitoring & Logging

All sync operations are logged with:

- Job ID and type
- Organization and vendor IDs
- User who triggered the sync
- Connector type
- Job status changes
- Error messages and retry counts
- Duration metrics

Logs are available in:

- Application logs (stdout/stderr)
- Sentry (if configured)
- Database (vendor_sync_jobs table)

---

## Troubleshooting

### Job stuck in "queued" status

- Check BullMQ worker is running
- Verify Redis connection
- Check worker logs for errors

### Job stuck in "running" status

- Check if connector API is responding
- Verify credentials are valid
- Check network connectivity
- Review error_message in database

### Rate limit errors

- Implement exponential backoff
- Use batch operations (sync/all) for multiple connectors
- Check rate limit headers in responses

### 403 Forbidden errors

- Verify user has org_admin role
- Check JWT contains correct organization_id
- Ensure vendor belongs to user's organization

---

## Related Documentation

- [BullMQ Queue Documentation](./BULLMQ_QUEUE.md)
- [Vendor Monitoring API](./VENDOR_MONITORING_API.md)
- [Connectors Documentation](./CONNECTORS.md)
- [Authentication & Authorization](./AUTH.md)

---

## Changelog

### T-014 (2026-06-15)

- Initial implementation of vendor sync routes
- Added POST /api/vendors/:vendorId/sync endpoint
- Added POST /api/vendors/:vendorId/sync/all endpoint
- Added GET /api/vendors/:vendorId/sync-status/:jobId endpoint
- Added GET /api/vendors/:vendorId/sync-jobs endpoint
- Added GET /api/sync-jobs/statistics endpoint
- Implemented JWT authentication and role-based authorization
- Added rate limiting (10 req/min for POST, 100 req/min for GET)
- Created vendor_sync_jobs database table
- Added comprehensive error handling and validation
- Created unit tests
- Added API documentation

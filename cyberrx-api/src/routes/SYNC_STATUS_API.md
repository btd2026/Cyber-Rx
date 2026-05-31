# Sync Status API

## Overview

The Sync Status API provides endpoints to track the progress and status of async vendor sync jobs. These jobs include vendor monitoring connector syncs (BCBS 210, Security Scorecard, etc.) and assessment jobs.

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

The token must include `organizationId` in its payload to ensure proper data isolation.

## Endpoints

### 1. Get Sync Job Status

Get detailed status of a specific sync job.

**Endpoint:** `GET /api/vendors/:vendorId/sync-status/:jobId`

**Parameters:**
- `vendorId` (path) - UUID of the vendor
- `jobId` (path) - UUID of the sync job

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "vendorId": "550e8400-e29b-41d4-a716-446655440001",
  "connectorType": "bcbs_210",
  "jobType": "sync_vendor",
  "status": "running",
  "progress": 50,
  "startedAt": "2025-01-31T10:30:00Z",
  "completedAt": null,
  "errorMessage": null,
  "retryCount": 0,
  "metadata": {
    "progress": 50,
    "completedConnectors": 2,
    "totalConnectors": 4
  },
  "createdAt": "2025-01-31T10:29:00Z",
  "updatedAt": "2025-01-31T10:30:00Z"
}
```

**Status Values:**
- `queued` - Job is waiting to be processed
- `running` - Job is currently processing
- `completed` - Job completed successfully
- `failed` - Job failed with errors

**Progress Calculation:**
- If `metadata.progress` exists, that value is used
- Otherwise:
  - `queued`: 0%
  - `running`: 50% (default)
  - `completed`: 100%
  - `failed`: Value from `metadata.progress` or 0%

**Error Responses:**
- `400 Bad Request` - Invalid vendorId or jobId format
- `401 Unauthorized` - Missing or invalid JWT
- `403 Forbidden` - User doesn't belong to job's organization
- `404 Not Found` - Job not found
- `500 Internal Server Error` - Database error

---

### 2. List Sync Jobs for Vendor

List all sync jobs for a specific vendor with filtering and pagination.

**Endpoint:** `GET /api/vendors/:vendorId/sync-jobs`

**Parameters:**
- `vendorId` (path) - UUID of the vendor
- `status` (query, optional) - Filter by status: `queued`, `running`, `completed`, `failed`
- `jobType` (query, optional) - Filter by job type: `sync_vendor`, `sync_connector`, `assessment`
- `limit` (query, optional) - Max results (default: 50, max: 100)
- `offset` (query, optional) - Number of results to skip (default: 0)

**Example Request:**
```
GET /api/vendors/550e8400-e29b-41d4-a716-446655440001/sync-jobs?status=completed&limit=10
```

**Response:**
```json
{
  "vendorId": "550e8400-e29b-41d4-a716-446655440001",
  "jobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "connectorType": "bcbs_210",
      "jobType": "sync_vendor",
      "status": "completed",
      "progress": 100,
      "startedAt": "2025-01-31T10:30:00Z",
      "completedAt": "2025-01-31T10:32:00Z",
      "errorMessage": null,
      "createdAt": "2025-01-31T10:29:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid vendorId, limit, offset, or status
- `401 Unauthorized` - Missing or invalid JWT
- `500 Internal Server Error` - Database error

---

### 3. List Organization Sync Jobs

List all sync jobs for the authenticated user's organization.

**Endpoint:** `GET /api/sync-jobs`

**Parameters:**
- `vendorId` (query, optional) - Filter by vendor UUID
- `status` (query, optional) - Filter by status
- `jobType` (query, optional) - Filter by job type
- `limit` (query, optional) - Max results (default: 50, max: 100)
- `offset` (query, optional) - Number of results to skip (default: 0)

**Example Request:**
```
GET /api/sync-jobs?status=running&jobType=sync_vendor&limit=20
```

**Response:**
```json
{
  "organizationId": "550e8400-e29b-41d4-a716-446655440002",
  "jobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440003",
      "vendorId": "550e8400-e29b-41d4-a716-446655440001",
      "connectorType": "security_scorecard",
      "jobType": "sync_vendor",
      "status": "running",
      "progress": 65,
      "startedAt": "2025-01-31T11:00:00Z",
      "completedAt": null,
      "errorMessage": null,
      "createdAt": "2025-01-31T10:59:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## Usage Examples

### Polling for Job Completion

```javascript
async function waitForJobCompletion(vendorId, jobId, maxWait = 300000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const response = await fetch(
      `/api/vendors/${vendorId}/sync-status/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    );

    const job = await response.json();

    if (job.status === 'completed') {
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(job.errorMessage || 'Job failed');
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Job did not complete within timeout');
}
```

### Listing Recent Jobs

```javascript
async function getRecentJobs(vendorId) {
  const response = await fetch(
    `/api/vendors/${vendorId}/sync-jobs?limit=10&status=completed`,
    {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }
  );

  const data = await response.json();
  return data.jobs;
}
```

### Getting All Running Jobs

```javascript
async function getRunningJobs() {
  const response = await fetch(
    '/api/sync-jobs?status=running',
    {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }
  );

  const data = await response.json();
  return data.jobs;
}
```

---

## Job Types

### sync_vendor
Syncs all configured connectors for a specific vendor. Progress is calculated as:
```
(completed_connectors / total_connectors) × 100
```

### sync_connector
Syncs a specific connector type across all vendors. Progress is calculated as:
```
(completed_vendors / total_vendors) × 100
```

### assessment
Runs an assessment job with multiple stages. Progress is calculated based on completed stages.

---

## Metadata Structure

The `metadata` field contains job-specific information:

**sync_vendor example:**
```json
{
  "progress": 50,
  "completedConnectors": 2,
  "totalConnectors": 4,
  "lastConnector": "bcbs_210",
  "lastResult": {
    "vendorsUpdated": 15,
    "errors": 0
  }
}
```

**sync_connector example:**
```json
{
  "progress": 75,
  "completedVendors": 30,
  "totalVendors": 40,
  "lastVendor": "550e8400-e29b-41d4-a716-446655440001"
}
```

**assessment example:**
```json
{
  "progress": 33,
  "currentStage": "data_collection",
  "completedStages": 1,
  "totalStages": 3,
  "stageProgress": 100
}
```

---

## Rate Limiting

All endpoints use `apiGetLimiter` rate limiting middleware. Default limits:
- 100 requests per 15 minutes per IP
- Adjusted by `API_RATE_LIMIT_TTL` and `API_RATE_LIMIT_MAX` environment variables

---

## Security

- All endpoints require valid JWT authentication
- Organization isolation enforced at database level
- Users can only view jobs from their own organization
- Invalid UUID formats return 400 Bad Request
- Comprehensive error logging for security monitoring

---

## Worker Integration

Workers should use the `jobProgressHelper` module to report progress:

```javascript
const { updateJobProgress, updateBatchProgress } = require('../workers/jobProgressHelper');

// Update simple progress
await updateJobProgress(jobId, 50);

// Update batch progress
const progress = await updateBatchProgress(jobId, currentIndex, totalItems);
```

See `/cyberrx-api/src/workers/jobProgressHelper.js` for detailed usage.

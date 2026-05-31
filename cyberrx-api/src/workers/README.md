# BullMQ Job Queue Implementation

## Overview

This module implements a Redis-backed BullMQ job queue for processing vendor sync operations asynchronously in the CyberRx system. The queue handles background jobs for vendor data synchronization, connector syncing, and risk assessments.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   API       │      │   BullMQ     │      │   Worker    │
│  Routes     │─────▶│    Queue     │─────▶│  Processors │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                      ┌──────────┐
                      │  Redis   │
                      │  (ioredis)│
                      └──────────┘
```

## Installation

### Dependencies

The following packages have been added to `package.json`:

```json
{
  "bullmq": "^5.29.0",
  "ioredis": "^5.4.1"
}
```

Install dependencies:

```bash
cd cyberrx-api
npm install
```

### Environment Configuration

Add Redis configuration to your `.env` file:

```bash
# Option 1: Use REDIS_URL (recommended)
REDIS_URL=redis://localhost:6379

# Option 2: Use individual parameters
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# For production with authentication
REDIS_URL=redis://:password@redis-host:6379
```

### Redis Setup

#### Local Development (Docker)

```bash
# Start Redis locally
docker run -d -p 6379:6379 redis:7-alpine

# Verify connection
redis-cli ping
# Should return: PONG
```

#### Production (Render)

1. Create a Redis instance in Render dashboard
2. Copy the internal Redis URL
3. Add to environment variables: `REDIS_URL=redis://...`

#### Production (Upstash)

```bash
# Upstash provides REST URL - convert to Redis URL format
# Use ioredis with REST adapter for serverless environments
```

## Usage

### Basic Queue Operations

```javascript
const queue = require('../workers/queue');

// 1. Add a job to the queue
const job = await queue.addJob(
  queue.JobTypes.SYNC_VENDOR,  // Job type
  {
    organizationId: 'org-123',
    vendorId: 'vendor-456',
    priority: 1,
    scheduledFor: new Date(Date.now() + 60000) // Optional: schedule for 1 min later
  }
);

// 2. Get job status
const state = await queue.getJobState(job.id);

// 3. List jobs
const jobs = await queue.getJobs(['waiting', 'active'], 0, 10);

// 4. Get queue metrics
const metrics = await queue.getQueueMetrics();

// 5. Health check
const health = await queue.healthCheck();
```

## Job Types

### 1. SYNC_VENDOR

Sync all connectors for a specific vendor.

```javascript
await queue.addJob(queue.JobTypes.SYNC_VENDOR, {
  organizationId: 'org-123',
  vendorId: 'vendor-456',
  priority: 1  // 1=highest, 10=lowest
});
```

**Job Data Structure:**
- `organizationId` (UUID, required): Organization ID
- `vendorId` (UUID, required): Vendor to sync
- `priority` (number, optional): Job priority (1-10, default: 1)
- `scheduledFor` (Date, optional): Delay execution until specific time

**Use Cases:**
- Manual vendor sync triggered by user
- Scheduled periodic sync for a vendor
- Retry after failed sync

### 2. SYNC_CONNECTOR

Sync one connector type across all vendors.

```javascript
await queue.addJob(queue.JobTypes.SYNC_CONNECTOR, {
  organizationId: 'org-123',
  connectorType: 'bcbs_210',
  priority: 5
});
```

**Job Data Structure:**
- `organizationId` (UUID, required): Organization ID
- `connectorType` (string, required): Connector type (e.g., `bcbs_210`, `security_scorecard`)
- `priority` (number, optional): Job priority (1-10, default: 5)
- `scheduledFor` (Date, optional): Delay execution until specific time

**Supported Connector Types:**
- `bcbs_210` - BCBS 210 API connector
- `bcbs_210_sftp` - BCBS 210 SFTP connector
- `security_scorecard` - Security Scorecard API
- `bitbucket` - Bitbucket repository connector
- `github` - GitHub repository connector
- `gitlab` - GitLab repository connector

**Use Cases:**
- Bulk sync all vendors for a connector
- Scheduled periodic sync by connector type
- Connector-specific data refresh

### 3. ASSESSMENT

Full vendor risk assessment (multiple data sources).

```javascript
await queue.addJob(queue.JobTypes.ASSESSMENT, {
  organizationId: 'org-123',
  vendorId: 'vendor-456',
  priority: 3
});
```

**Job Data Structure:**
- `organizationId` (UUID, required): Organization ID
- `vendorId` (UUID, required): Vendor to assess
- `priority` (number, optional): Job priority (1-10, default: 3)
- `scheduledFor` (Date, optional): Delay execution until specific time

**Use Cases:**
- Comprehensive vendor risk evaluation
- Onboarding new vendor assessment
- Periodic re-assessment (quarterly/annual)

## Job Lifecycle

```
┌────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐
│ queued │───▶│ waiting │───▶│ active  │───▶│completed │
└────────┘    └─────────┘    └─────────┘    └──────────┘
                                   │              │
                                   ▼              ▔──┐
                                ┌─────┐             │
                                │delayed│◀────────────┘
                                └─────┘            (retry)
                                   │
                                   ▼
                                ┌──────┐
                                │failed │
                                └──────┘
```

### Job States

- **waiting**: Job is queued, waiting to be processed
- **active**: Job is currently being processed by a worker
- **completed**: Job finished successfully
- **failed**: Job failed after all retries
- **delayed**: Job is delayed (scheduled for future or retry backoff)

### Retry Strategy

Jobs are automatically retried with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 5 seconds delay
- Attempt 4: 30 seconds delay
- Attempt 5: 2 minutes delay
- Attempt 6: 6 minutes delay
- After 5 failures: Job marked as `failed`

## Queue Control

### Pause Queue

Stop processing new jobs (currently running jobs continue):

```javascript
await queue.pause();
```

### Resume Queue

Resume processing jobs:

```javascript
await queue.resume();
```

### Queue Metrics

Get current queue statistics:

```javascript
const metrics = await queue.getQueueMetrics();
console.log(metrics);
// {
//   waiting: 5,
//   active: 2,
//   completed: 150,
//   failed: 3,
//   delayed: 1,
//   total: 161
// }
```

## Error Handling

### Connection Errors

The queue automatically attempts to reconnect to Redis if connection is lost:

```javascript
// Built-in retry strategy:
// - Attempts 1-3: 50ms, 100ms, 150ms delay
// - Subsequent: 2000ms max delay
```

### Graceful Degradation

If Redis is unavailable, the queue will log errors but won't crash the application:

```javascript
try {
  await queue.addJob(queue.JobTypes.SYNC_VENDOR, data);
} catch (error) {
  logger.error('Failed to add job', { error });
  // Fallback: Process inline or queue for later
}
```

### Job Failures

Failed jobs are retained in Redis for debugging:

```javascript
// Retrieve failed jobs
const failedJobs = await queue.getJobs(['failed'], 0, 10);

// Inspect failure reason
const job = await queue.getJobState('job-id');
console.log(job.failedReason);
```

## Database Integration

### vendor_sync_jobs Table

The queue integrates with the `vendor_sync_jobs` table (T-021) to track job status:

```sql
CREATE TABLE vendor_sync_jobs (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  vendor_id UUID REFERENCES vendors(id),
  connector_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 5),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Worker Integration

The worker (to be implemented in T-020) will:

1. Create database record when job starts: `INSERT INTO vendor_sync_jobs (...)`
2. Update status to `running`: `UPDATE vendor_sync_jobs SET status='running', started_at=NOW()`
3. Update on completion: `UPDATE vendor_sync_jobs SET status='completed', completed_at=NOW()`
4. Handle failures: `UPDATE vendor_sync_jobs SET status='failed', error_message=?, retry_count=retry_count+1`

## Monitoring & Observability

### Health Check Endpoint

Add to API routes:

```javascript
// GET /api/queue/health
app.get('/api/queue/health', async (req, res) => {
  const health = await queue.healthCheck();
  res.json(health);
});
```

**Response:**

```json
{
  "status": "healthy",
  "queueName": "vendor-sync-queue",
  "connected": true,
  "metrics": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 1,
    "total": 161
  },
  "timestamp": "2026-05-31T15:30:00.000Z"
}
```

### Logging

All queue operations are logged using Winston:

```javascript
// Log levels used:
// - info: Job added, job completed, queue operations
// - warn: Job stalled, connection retry
// - error: Job failed, connection error, queue error
```

**Example logs:**

```
2026-05-31 15:30:00 [info]: Job added to queue {"jobId":"sync_vendor-org-123-1234567890","type":"sync_vendor","organizationId":"org-123"}
2026-05-31 15:30:01 [info]: Job sync_vendor-org-123-1234567890 is now processing {"type":"sync_vendor"}
2026-05-31 15:30:05 [info]: Job sync_vendor-org-123-1234567890 completed successfully {"duration":4000}
```

### Sentry Integration

Queue errors are automatically sent to Sentry:

```javascript
// Errors are logged with context:
logger.error('Job failed', {
  jobId: job.id,
  type: job.name,
  error: error.message,
  stack: error.stack
});
```

## Testing

### Unit Tests

```javascript
// tests/workers/queue.test.js
const queue = require('../../src/workers/queue');

describe('BullMQ Queue', () => {
  test('should add job to queue', async () => {
    const job = await queue.addJob(queue.JobTypes.SYNC_VENDOR, {
      organizationId: 'test-org',
      vendorId: 'test-vendor'
    });
    expect(job.id).toBeDefined();
  });

  test('should get job state', async () => {
    const state = await queue.getJobState('job-id');
    expect(state).toHaveProperty('state');
  });
});
```

### Integration Tests

```bash
# Run integration tests with local Redis
npm run test:integration
```

### Manual Testing

```bash
# Start API
npm run dev

# Add a test job via curl
curl -X POST http://localhost:3001/api/vendor-sync/test \
  -H "Content-Type: application/json" \
  -d '{"vendorId":"test-vendor"}'

# Check queue health
curl http://localhost:3001/api/queue/health
```

## Performance Considerations

### Throughput

- **Target**: Process 100+ jobs per second
- **Bottleneck**: Redis network latency
- **Optimization**: Use Redis cluster for high-volume scenarios

### Latency

- **Queue latency**: < 100ms (job addition)
- **Processing latency**: Depends on worker implementation
- **Retry backoff**: Exponential (1s → 6m)

### Memory Usage

- **Job data**: Stored in Redis strings
- **Completed jobs**: Retained indefinitely (configure retention policy)
- **Failed jobs**: Retained for debugging

### Redis Memory Management

```bash
# Set max memory policy (Redis config)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Monitor memory usage
redis-cli INFO memory
```

## Production Deployment

### Redis Configuration

**Render Redis:**

```bash
# Add to environment variables
REDIS_URL=redis://default:password@your-redis.render.com:6379
```

**AWS ElastiCache:**

```bash
# Use TLS connection
REDIS_URL=rediss://:password@your-elasticache endpoint:6379
```

**Upstash:**

```javascript
// Use REST adapter for serverless
const Redis = require('ioredis');
const redis = new Redis({
  host: 'your-redis.upstash.io',
  port: 6379,
  tls: {},
  password: 'your-password'
});
```

### Queue Monitoring

Set up monitoring for:

1. Queue depth (number of waiting jobs)
2. Job failure rate
3. Average job duration
4. Redis memory usage
5. Connection errors

### Scaling Workers

```bash
# Run multiple worker processes
pm2 start src/workers/worker.js --name 'vendor-sync-worker' --instances 4

# Or use Kubernetes
kubectl scale deployment vendor-sync-worker --replicas=4
```

## Troubleshooting

### Common Issues

#### 1. Redis Connection Refused

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL environment variable
- Ensure Redis port is accessible

#### 2. Jobs Not Processing

**Symptom:** Jobs stuck in `waiting` state

**Solution:**
- Verify worker process is running
- Check worker logs for errors
- Ensure queue is not paused: `await queue.isPaused()`

#### 3. High Memory Usage

**Symptom:** Redis memory grows continuously

**Solution:**
- Clean up old completed jobs: `await queue.clean(24 * 3600 * 1000, 100)`
- Set Redis max memory policy
- Reduce job retention time

#### 4. Job Failures

**Symptom:** Jobs failing with `attemptsMade: 5`

**Solution:**
- Check job failedReason
- Verify worker error handling
- Check connector credentials
- Review application logs

## API Routes (Future)

The following API routes will be implemented in future tasks:

- `POST /api/vendor-sync-jobs` - Create manual sync job
- `GET /api/vendor-sync-jobs` - List jobs for organization
- `GET /api/vendor-sync-jobs/:id` - Get job details
- `GET /api/vendor-sync-jobs/status/:status` - Filter by status
- `POST /api/vendor-sync-jobs/:id/retry` - Retry failed job
- `DELETE /api/vendor-sync-jobs/:id` - Cancel/delete job

## Next Steps

1. **Worker Implementation (T-020):** Create worker processors for job types
2. **Database Model:** Create `VendorSyncJob` model class
3. **API Routes:** Implement REST endpoints for job management
4. **Testing:** Write unit and integration tests
5. **Monitoring:** Set up production monitoring and alerting

## References

- **Task:** T-005
- **Branch:** `feature/T-005-bullmq-setup`
- **Related:**
  - T-020: Vendor sync worker implementation
  - T-021: vendor_sync_jobs table migration
- **Docs:**
  - [BullMQ Documentation](https://docs.bullmq.io/)
  - [ioredis Documentation](https://github.com/luin/ioredis)
  - [Redis Best Practices](https://redis.io/docs/manual/patterns/)

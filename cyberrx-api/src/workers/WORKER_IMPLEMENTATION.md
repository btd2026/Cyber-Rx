# Background Sync Worker Implementation (T-006)

## Overview

This document describes the implementation of the BullMQ worker process for handling async vendor sync operations in the CyberRx system.

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   API Routes    │─────▶│   BullMQ Queue   │─────▶│   Worker        │
│                 │      │   (Redis)        │      │   Processors    │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                                           │
                                                           ▼
                                                    ┌──────────────┐
                                                    │   Database   │
                                                    │   Updates    │
                                                    └──────────────┘
```

## Components

### 1. Worker Process (`workerProcess.js`)

The main worker process that consumes jobs from the BullMQ queue.

**Key Features:**
- Concurrent job processing (configurable, default: 5)
- Rate limiting (max 10 jobs per second)
- Automatic retry with exponential backoff
- Graceful shutdown on SIGTERM/SIGINT
- Error tracking and logging

**Environment Variables:**
- `REDIS_URL` - Redis connection URL (recommended)
- `REDIS_HOST` - Redis host (fallback)
- `REDIS_PORT` - Redis port (fallback: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `WORKER_CONCURRENCY` - Max concurrent jobs (default: 5)

**Usage:**

```bash
# Start worker
npm run worker

# Start worker in development mode
npm run worker:dev
```

**Programmatic Usage:**

```javascript
const workerProcess = require('./src/workers/workerProcess');

// Start worker process
await workerProcess.startWorker();

// Stop worker process
await workerProcess.stopWorker();

// Get worker metrics
const metrics = await workerProcess.getWorkerMetrics();
```

### 2. Job Handlers (`jobHandlers.js`)

Specialized handlers for each job type.

#### `handleSyncVendor`

Syncs all connectors for a specific vendor.

**Job Data:**
```javascript
{
  type: 'sync_vendor',
  organizationId: 'org-123',
  vendorId: 'vendor-456'
}
```

**Process:**
1. Fetch vendor from database
2. Get all available connector types
3. For each connector:
   - Load connector class
   - Create connector instance
   - Collect signals
   - Store signals in database
4. Aggregate results
5. Return summary

**Response:**
```javascript
{
  vendorId: 'vendor-456',
  organizationId: 'org-123',
  connectorResults: [
    {
      connectorType: 'security_scorecard',
      status: 'success',
      signalsCollected: 15
    },
    {
      connectorType: 'bitsight',
      status: 'error',
      error: 'API timeout',
      signalsCollected: 0
    }
  ],
  totalSignalsCollected: 15,
  successfulConnectors: 1,
  failedConnectors: 1
}
```

#### `handleSyncConnector`

Syncs one connector type across all vendors.

**Job Data:**
```javascript
{
  type: 'sync_connector',
  organizationId: 'org-123',
  connectorType: 'security_scorecard'
}
```

**Process:**
1. Load connector class
2. Get all vendors for organization
3. For each vendor:
   - Create connector instance
   - Collect signals
   - Store signals in database
4. Aggregate results
5. Return summary

**Response:**
```javascript
{
  connectorType: 'security_scorecard',
  organizationId: 'org-123',
  vendorResults: [
    {
      vendorId: 'vendor-1',
      vendorName: 'Acme Corp',
      status: 'success',
      signalsCollected: 12
    }
  ],
  totalSignalsCollected: 12,
  successfulVendors: 1,
  failedVendors: 0
}
```

#### `handleAssessment`

Full vendor risk assessment using multiple data sources.

**Job Data:**
```javascript
{
  type: 'assessment',
  organizationId: 'org-123',
  vendorId: 'vendor-456'
}
```

**Process:**
1. Fetch vendor from database
2. Get all available connectors
3. For each connector:
   - Collect signals
   - Analyze risk factors
   - Identify critical findings
4. Generate recommendations
5. Update vendor risk rating
6. Return comprehensive assessment

**Response:**
```javascript
{
  vendorId: 'vendor-456',
  vendorName: 'Acme Corp',
  organizationId: 'org-123',
  assessmentType: 'comprehensive',
  connectorResults: [...],
  totalSignalsCollected: 45,
  riskFactors: [
    {
      source: 'security_scorecard',
      criticalSignals: 3,
      topIssues: [...]
    }
  ],
  recommendations: [
    'Review critical findings with vendor',
    'Request remediation plan'
  ],
  assessedRiskRating: 'High'
}
```

### 3. Job Status Utilities (`utils/jobStatus.js`)

Helper functions for tracking job status in the database.

**Functions:**
- `createJobRecord(jobId, jobData)` - Create initial job record
- `markJobRunning(jobId)` - Update status to 'running'
- `markJobCompleted(jobId, result)` - Update status to 'completed'
- `markJobFailed(jobId, error, retryCount)` - Update status to 'failed'
- `incrementJobRetry(jobId)` - Increment retry counter
- `getJobById(jobId)` - Fetch job record
- `getJobsForOrganization(organizationId, options)` - List jobs
- `getJobStatistics(organizationId)` - Get job stats
- `cleanupOldJobs(days)` - Delete old completed jobs

### 4. VendorSyncJob Model (`models/VendorSyncJob.js`)

Database model for job tracking.

**Schema:**
```sql
CREATE TABLE vendor_sync_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  vendor_id TEXT,
  connector_type VARCHAR(50) NOT NULL,
  job_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Status Values:**
- `queued` - Job is waiting to be processed
- `running` - Job is currently processing
- `completed` - Job completed successfully
- `failed` - Job failed after all retries

**Methods:**
- `create(data)` - Create new job record
- `findById(id)` - Find job by ID
- `findByOrganization(organizationId, options)` - List jobs for org
- `findByStatus(status, limit)` - Find jobs by status
- `findByVendor(vendorId, options)` - Find jobs for vendor
- `updateStatus(id, status, options)` - Update job status
- `incrementRetry(id)` - Increment retry count
- `deleteOld(days)` - Delete old completed jobs
- `getStatistics(organizationId)` - Get job statistics
- `getRecentActivity(organizationId, hours)` - Get recent jobs

## Retry Logic

Workers implement automatic retry with exponential backoff:

**Retry Schedule:**
1. Attempt 1: Immediate
2. Attempt 2: 1 minute delay
3. Attempt 3: 5 minutes delay
4. Attempt 4: 30 minutes delay
5. Attempt 5: 2 hours delay
6. Attempt 6: 6 hours delay

**Max Retries:** 5 attempts total

**Error Handling:**
- Transient errors (network timeouts, API rate limits): Retry
- Permanent errors (invalid credentials, 404): Mark as failed
- Connector-specific errors: Log and continue with next connector/vendor

**Retry Tracking:**
```javascript
// Database
retry_count: 0-5

// BullMQ
attemptsMade: 1-5
failedReason: 'Error message'
```

## Error Handling

### Error Categories

1. **Transient Errors** (Retry)
   - Network timeouts
   - API rate limits
   - Redis connection errors
   - Database connection errors

2. **Permanent Errors** (Fail Immediately)
   - Invalid job data
   - Missing vendor/organization
   - Authentication failures

3. **Connector Errors** (Continue Processing)
   - Single connector failure
   - Single vendor failure
   - Partial signal collection

### Error Logging

All errors are logged with context:

```javascript
logger.error('Job failed permanently', {
  jobId: job.id,
  type: job.name,
  error: error.message,
  attemptsMade: job.attemptsMade,
  stack: error.stack
});
```

## Performance

### Concurrency

- **Default:** 5 concurrent jobs
- **Configurable:** Set `WORKER_CONCURRENCY` environment variable
- **Rate Limit:** Max 10 jobs per second

### Optimization

1. **Batch Processing:** Process multiple vendors in one job
2. **Connector Caching:** Reuse connector instances
3. **Database Pooling:** Use connection pooling (max: 10)
4. **Redis Pipelining:** Batch Redis operations

### Monitoring

**Metrics to Track:**
- Queue depth (waiting jobs)
- Job duration (processing time)
- Success rate (completed vs failed)
- Retry rate (jobs requiring retries)
- Error rate (connector failures)

**Health Check:**

```bash
curl http://localhost:3001/api/worker/health
```

**Response:**
```json
{
  "status": "healthy",
  "pid": 12345,
  "queueMetrics": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3
  },
  "timestamp": "2026-05-31T15:30:00.000Z"
}
```

## Testing

### Unit Tests

```bash
# Run worker tests
npm test tests/workers/workerProcess.test.js
```

**Test Coverage:**
- Worker creation and lifecycle
- Job processing for all types
- Retry logic
- Error handling
- Status tracking

### Integration Tests

```bash
# Run with local Redis
npm run test:integration
```

**Test Scenarios:**
1. Add job to queue
2. Verify worker processes job
3. Check database status updates
4. Verify retry on failure
5. Test graceful shutdown

### Manual Testing

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start worker
npm run worker

# In another terminal, add test job
curl -X POST http://localhost:3001/api/vendor-sync/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sync_vendor",
    "organizationId": "test-org",
    "vendorId": "test-vendor"
  }'

# Check worker logs
tail -f logs/cyberrx-api-*.log
```

## Production Deployment

### Environment Variables

```bash
# Redis
REDIS_URL=redis://:password@redis-host:6379

# Worker
WORKER_CONCURRENCY=10
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Process Management

#### PM2

```bash
# Start worker with PM2
pm2 start src/workers/workerProcess.js \
  --name 'vendor-sync-worker' \
  --instances 4 \
  --max-memory-restart 500M

# Monitor
pm2 monit

# View logs
pm2 logs vendor-sync-worker
```

#### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
CMD ["node", "src/workers/workerProcess.js"]
```

```bash
# Build and run
docker build -t cyberrx-worker .
docker run -d --name worker-1 cyberrx-worker
docker run -d --name worker-2 cyberrx-worker
```

#### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vendor-sync-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: cyberrx-worker:latest
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: WORKER_CONCURRENCY
          value: "5"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Scaling

**Horizontal Scaling:**
- Run multiple worker processes
- Use PM2 clusters or Kubernetes replicas
- Each worker processes independent jobs

**Vertical Scaling:**
- Increase `WORKER_CONCURRENCY`
- Add more Redis connections
- Increase database pool size

**When to Scale:**
- Queue depth consistently > 100
- Job duration > 5 minutes
- CPU/memory > 80%

### Monitoring

**Key Metrics:**
1. Queue depth
2. Job success rate
3. Average job duration
4. Worker CPU/memory
5. Redis memory
6. Database connections

**Alerting:**
- Queue depth > 500
- Failure rate > 10%
- Job duration > 30 minutes
- Worker crashes

**Logs:**

```bash
# View worker logs
tail -f logs/cyberrx-api-*.log | grep "Job event"

# Search for errors
grep "Job failed" logs/error-*.log

# View recent activity
grep "Job event: completed" logs/cyberrx-api-$(date +%Y-%m-%d).log | tail -20
```

## Troubleshooting

### Common Issues

#### 1. Jobs Not Processing

**Symptoms:** Jobs stuck in 'waiting' state

**Solutions:**
- Verify worker is running: `ps aux | grep workerProcess`
- Check Redis connection: `redis-cli ping`
- Verify queue name matches
- Check worker logs for errors

#### 2. High Failure Rate

**Symptoms:** Many jobs failing after retries

**Solutions:**
- Check connector credentials
- Verify API rate limits
- Check network connectivity
- Review error messages in database

#### 3. Memory Leaks

**Symptoms:** Worker memory grows continuously

**Solutions:**
- Restart worker periodically
- Reduce concurrency
- Check for signal leaks in connectors
- Monitor with `pm2 monit`

#### 4. Database Connection Pool Exhausted

**Symptoms:** "Connection pool exhausted" errors

**Solutions:**
- Increase pool size in `db.js`
- Reduce worker concurrency
- Check for connection leaks
- Add connection timeout

## Database Migration

Run the migration to create the `vendor_sync_jobs` table:

```bash
# Using psql
psql -U postgres -d cyberrx -f migrations/create_vendor_sync_jobs.sql

# Or run programmatically
node -e "
  const fs = require('fs');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = fs.readFileSync('migrations/create_vendor_sync_jobs.sql', 'utf8');
  pool.query(sql).then(() => console.log('Migration complete')).catch(console.error);
"
```

## API Integration

Workers integrate with API routes to provide job status:

```javascript
// GET /api/vendor-sync-jobs/:id
app.get('/api/vendor-sync-jobs/:id', async (req, res) => {
  const job = await VendorSyncJob.findById(req.params.id);
  res.json(job);
});

// GET /api/vendor-sync-jobs
app.get('/api/vendor-sync-jobs', async (req, res) => {
  const jobs = await VendorSyncJob.findByOrganization(
    req.user.organizationId,
    req.query
  );
  res.json(jobs);
});

// POST /api/vendor-sync-jobs/:id/retry
app.post('/api/vendor-sync-jobs/:id/retry', async (req, res) => {
  // Re-add job to queue
  const job = await VendorSyncJob.findById(req.params.id);
  await queue.addJob(job.jobType, job.data);
  res.json({ status: 'queued' });
});
```

## Next Steps

1. **API Routes:** Implement REST endpoints for job management
2. **UI Integration:** Build job status dashboard
3. **Monitoring:** Set up production monitoring and alerting
4. **Optimization:** Fine-tune concurrency and rate limits
5. **Testing:** Add comprehensive integration tests

## References

- **Task:** T-006
- **Branch:** `feature/T-006-sync-worker`
- **Related:**
  - T-005: BullMQ queue setup
  - T-021: vendor_sync_jobs table
- **Dependencies:**
  - [BullMQ Documentation](https://docs.bullmq.io/)
  - [ioredis Documentation](https://github.com/luin/ioredis)

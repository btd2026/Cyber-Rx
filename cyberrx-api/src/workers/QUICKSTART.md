# Worker Quick Start Guide

## Prerequisites

1. Redis server running
2. PostgreSQL database with migrations applied
3. Node.js 20+

## Setup

### 1. Install Dependencies

```bash
cd cyberrx-api
npm install
```

### 2. Run Database Migration

```bash
psql -U postgres -d cyberrx -f migrations/create_vendor_sync_jobs.sql
```

### 3. Configure Environment

Create `.env` file:

```bash
# Redis (required)
REDIS_URL=redis://localhost:6379

# Or use individual params
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=

# Database (required)
DATABASE_URL=postgresql://user:pass@localhost:5432/cyberrx

# Worker (optional)
WORKER_CONCURRENCY=5
LOG_LEVEL=info

# Environment
NODE_ENV=development
```

## Running

### Development Mode

```bash
# Start worker with auto-reload
npm run worker:dev

# Or directly with nodemon
nodemon src/workers/workerProcess.js
```

### Production Mode

```bash
# Start worker
npm run worker

# Or directly
node src/workers/workerProcess.js
```

### With Process Manager

```bash
# Using PM2
pm2 start npm --name "worker" -- run worker

# Scale to 3 instances
pm2 scale worker 3

# Monitor
pm2 monit
pm2 logs worker
```

## Testing

### Start Redis (Docker)

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### Add Test Job

```bash
curl -X POST http://localhost:3001/api/vendor-sync/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sync_vendor",
    "organizationId": "test-org-123",
    "vendorId": "test-vendor-456"
  }'
```

### Check Worker Logs

```bash
tail -f logs/cyberrx-api-$(date +%Y-%m-%d).log
```

### Check Queue Status

```bash
# Connect to Redis
redis-cli

# Check queue depth
LLEN vendor-sync-queue:waiting

# Check active jobs
LLEN vendor-sync-queue:active

# Check failed jobs
LLEN vendor-sync-queue:failed
```

## Verification

### 1. Worker Started Successfully

Logs should show:
```
2026-05-31 15:30:00 [info]: Worker connecting to Redis
2026-05-31 15:30:00 [info]: Worker created successfully
2026-05-31 15:30:00 [info]: Worker is ready to process jobs
2026-05-31 15:30:00 [info]: Worker process started
```

### 2. Job Processing

Logs should show:
```
2026-05-31 15:30:05 [info]: Job event: started
2026-05-31 15:30:05 [info]: Created job record in database
2026-05-31 15:30:05 [info]: Job marked as running
2026-05-31 15:30:10 [info]: SYNC_VENDOR job completed
2026-05-31 15:30:10 [info]: Job marked as completed
```

### 3. Database Records

```sql
-- Check job records
SELECT * FROM vendor_sync_jobs ORDER BY created_at DESC LIMIT 5;

-- Check job statistics
SELECT status, COUNT(*) FROM vendor_sync_jobs GROUP BY status;

-- Check recent activity
SELECT * FROM vendor_sync_jobs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## Troubleshooting

### Worker Won't Start

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:** Start Redis server
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### Jobs Not Processing

**Problem:** Jobs in queue but worker not processing

**Solution:**
1. Check worker is running: `ps aux | grep workerProcess`
2. Check worker logs for errors
3. Verify Redis connection: `redis-cli ping`

### High Memory Usage

**Problem:** Worker memory grows continuously

**Solution:**
1. Reduce concurrency: `WORKER_CONCURRENCY=3`
2. Restart worker periodically
3. Check for connection leaks

### Database Errors

**Problem:** `relation "vendor_sync_jobs" does not exist`

**Solution:** Run migration
```bash
psql -U postgres -d cyberrx -f migrations/create_vendor_sync_jobs.sql
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/api/worker/health
```

### Queue Metrics

```bash
curl http://localhost:3001/api/queue/metrics
```

### Worker Stats

```bash
curl http://localhost:3001/api/worker/stats
```

## Production Tips

1. **Use PM2 for process management**
2. **Set up log rotation**
3. **Monitor queue depth**
4. **Set up alerts for failures**
5. **Run multiple worker instances**
6. **Use Redis with persistence**
7. **Enable database connection pooling**

## Next Steps

1. Implement API routes for job management
2. Build job status dashboard in UI
3. Set up production monitoring
4. Configure alerts and notifications
5. Scale workers based on load

## Support

- **Documentation:** See `WORKER_IMPLEMENTATION.md`
- **Queue Setup:** See `queue.js` README
- **Issue Tracker:** Create GitHub issue

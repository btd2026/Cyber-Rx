# Correlation Engine Optimization - Quick Start Guide

## Overview

This guide will help you implement the Correlation Engine performance optimization in under 30 minutes.

## Prerequisites

- Redis server (local or cloud)
- PostgreSQL database with admin access
- Node.js 20+
- Existing CyberRx API installation

## Installation Steps

### Step 1: Start Redis (5 minutes)

**Option A: Local Development**
```bash
# macOS
brew install redis
brew services start redis

# Verify
redis-cli ping
# Should return: PONG
```

**Option B: Docker**
```bash
docker run -d -p 6379:6379 --name cyberrx-redis redis:7-alpine

# Verify
docker exec cyberrx-redis redis-cli ping
```

**Option C: Production (AWS ElastiCache)**
```bash
# Set environment variables
export REDIS_URL=redis://your-elasticache-endpoint:6379
export REDIS_PASSWORD=your-password
```

### Step 2: Update Environment Variables (2 minutes)

Add to your `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=info
```

### Step 3: Copy Files (5 minutes)

Copy these files from this PR to your codebase:

```bash
# Core optimization files
cp src/services/CorrelationEngineOptimized.js src/services/
cp src/services/redisClient.js src/services/
cp src/services/correlationInitialization.js src/services/
cp src/utils/logger.js src/utils/

# Updated routes
cp src/routes/correlation.js src/routes/

# Database migration
cp migrations/add_correlation_indexes.sql migrations/

# Tests (optional)
cp tests/integration/correlationEngineOptimized.test.js tests/integration/
cp tests/unit/redisCacheService.test.js tests/unit/
cp tests/performance/correlationEngineBenchmark.test.js tests/performance/
```

### Step 4: Run Database Migration (3 minutes)

```bash
# Connect to your database
psql -U $DATABASE_USER -d $DATABASE_NAME

# Run migration
\i migrations/add_correlation_indexes.sql

# Verify indexes created
\det+ "*correlation*"
```

Expected output should show indexes like:
- `findings_org_business_process`
- `findings_correlation_covering`
- `risks_business_processes`
- `data_objects_high_value`

### Step 5: Update Application Startup (5 minutes)

Add to your `src/index.js`:

```javascript
// At the top with other imports
const { initializeCorrelationEngine, shutdownCorrelationEngine } = require('./services/correlationInitialization');

// After database initialization, add:
try {
  const correlationInit = await initializeCorrelationEngine();
  if (correlationInit.success) {
    console.log('✅ Optimized Correlation Engine initialized');
  } else {
    console.warn('⚠️  Correlation Engine running without caching');
  }
} catch (err) {
  console.error('Failed to initialize Correlation Engine:', err);
}

// Add graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Shutting down Correlation Engine...');
  await shutdownCorrelationEngine();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down Correlation Engine...');
  await shutdownCorrelationEngine();
  process.exit(0);
});
```

### Step 6: Verify Installation (5 minutes)

**Start the API:**
```bash
npm run dev
```

**Check logs for successful initialization:**
```
✅ Optimized Correlation Engine initialized
Redis Client Connected
Redis Client Ready
```

**Test the API:**
```bash
# Test single correlation
curl -X POST http://localhost:3001/api/correlation/narrative/<your-finding-id> \
  -H "Authorization: Bearer <your-token>"

# Should return executive narrative with correlationMetadata.performanceMetrics
```

**Check performance metrics:**
```bash
curl http://localhost:3001/api/correlation/performance \
  -H "Authorization: Bearer <your-token>"

# Should return:
# {
#   "metrics": {
#     "correlationCount": 1,
#     "avgTime": 1234,
#     "cacheHitRate": "0.00%"
#   },
#   "cacheStats": { ... }
# }
```

### Step 7: Run Tests (5 minutes)

**Unit tests:**
```bash
npm run test:unit tests/unit/redisCacheService.test.js
```

**Integration tests:**
```bash
npm run test:integration tests/integration/correlationEngineOptimized.test.js
```

**Performance benchmarks:**
```bash
npm run test:performance tests/performance/correlationEngineBenchmark.test.js
```

All tests should pass with ✅ indicators.

## Verification Checklist

Use this checklist to verify your installation:

- [ ] Redis server running and accessible
- [ ] Environment variables configured
- [ ] Database indexes created
- [ ] Application logs show successful initialization
- [ ] Single correlation API returns results
- [ ] Performance metrics endpoint returns data
- [ ] Cache hit rate increases on repeated calls
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks pass

## Troubleshooting

### Issue: "Redis connection failed"

**Solution:**
```bash
# Check Redis is running
redis-cli ping

# If not running, start it:
brew services start redis  # macOS
sudo systemctl start redis  # Linux
docker start cyberrx-redis  # Docker
```

### Issue: "Database index already exists"

**Solution:**
This is normal - the migration uses `CREATE INDEX IF NOT EXISTS`. You can ignore this warning.

### Issue: "Module not found" errors

**Solution:**
Install missing dependencies:
```bash
npm install redis winston winston-daily-rotate-file
```

### Issue: Slow performance (>3 seconds)

**Solution:**
1. Check Redis is working:
```bash
redis-cli INFO stats
```

2. Check database indexes:
```bash
psql -c "SELECT indexname, idx_scan FROM pg_stat_user_indexes WHERE relname = 'findings';"
```

3. Check cache hit rate via API:
```bash
curl http://localhost:3001/api/correlation/performance
```

4. Check logs for slow correlation warnings:
```bash
tail -f logs/correlation-*.log | grep "Slow correlation"
```

## Rollback Procedure

If you need to rollback to the original Correlation Engine:

1. **Stop the application**
2. **Revert route changes:**
   ```bash
   git checkout src/routes/correlation.js
   ```

3. **Remove initialization code from `src/index.js`**

4. **Restart application**

The original `CorrelationEngine.js` is still available and will work without Redis.

## Performance Validation

After installation, validate performance with this script:

```bash
# Save as validate-performance.sh
#!/bin/bash

FINDING_ID="your-test-finding-id"
API_URL="http://localhost:3001"
TOKEN="your-auth-token"

echo "Testing single finding correlation performance..."

# Cold cache test
echo "1. Cold cache test..."
time curl -X POST "$API_URL/api/correlation/narrative/$FINDING_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Warm cache test
echo "2. Warm cache test (should be much faster)..."
time curl -X POST "$API_URL/api/correlation/narrative/$FINDING_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo "Performance validation complete!"
echo "Check logs/correlation-*.log for detailed timing"
```

Run with:
```bash
chmod +x validate-performance.sh
./validate-performance.sh
```

## Next Steps

After successful installation:

1. **Monitor Performance**
   - Check `/api/correlation/performance` regularly
   - Review logs in `logs/correlation-*.log`
   - Set up Datadog monitoring

2. **Configure Alerts**
   - Alert if P95 latency > 3 seconds
   - Alert if cache hit rate < 70%
   - Alert if error rate > 5%

3. **Optimize Further**
   - Review slow correlation logs
   - Identify frequently accessed findings
   - Consider pre-warming cache for critical findings

4. **Scale if Needed**
   - For high-traffic deployments, use Redis Cluster
   - Increase Redis memory for larger cache
   - Consider read replicas for database

## Support

For issues or questions:
- Check logs: `logs/correlation-*.log` and `logs/error-*.log`
- Review documentation: `CORRELATION_ENGINE_OPTIMIZATION.md`
- Check test output for validation examples
- Monitor performance metrics endpoint

## Success Criteria

Your installation is successful when:
- ✅ Single finding correlates in <3 seconds (cold cache)
- ✅ Single finding correlates in <100ms (warm cache)
- ✅ Batch of 50 correlates in <30 seconds
- ✅ Cache hit rate >80% on repeated correlations
- ✅ No errors in logs
- ✅ All tests pass

Estimated total time: **30 minutes**

Good luck! 🚀

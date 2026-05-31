# T-007: Scheduler Integration - Implementation Summary

## Overview
Integrated vendor sync operations into the existing scheduler.js system with tier-based sync frequencies and BullMQ job queueing.

## Implementation Details

### 1. Sync Configuration Utility (`src/utils/syncConfig.js`)

Created a comprehensive configuration module that defines:

- **Tier-based sync intervals:**
  - Critical vendors: Daily sync (`0 2 * * *` - 2 AM daily)
  - High vendors: Weekly sync (`0 2 * * 0` - 2 AM Sunday)
  - Medium vendors: Monthly sync (`0 2 1 * *` - 2 AM, 1st of month)
  - Low vendors: Monthly sync (`0 2 1 * *` - 2 AM, 1st of month)

- **Connector-specific configurations:**
  - SecurityRating: Daily, priority 1
  - ComplianceEvidence: Daily, priority 2
  - Questionnaire: Weekly, priority 3
  - AssetInventory: Weekly, priority 4
  - BusinessImpact: Monthly, priority 5

- **Priority system:** Lower number = higher priority (1-10 scale)

### 2. Enhanced Scheduler (`src/scheduler.js`)

Added vendor sync scheduling to existing scheduler:

#### Key Functions:

**`scheduleVendorSyncs()`**
- Fetches all organizations and their vendors
- Groups vendors by tier (critical, high, medium, low)
- Creates cron jobs for each tier using node-cron
- Queues BullMQ jobs instead of inline execution
- Implements proper error handling and logging

**`scheduleManualSync(vendorId, organizationId, connectorType)`**
- Allows on-demand sync for specific vendors
- Queues immediate sync job with proper priority
- Returns job details for tracking

**`getScheduledTasks()`**
- Returns summary of all scheduled vendor sync tasks
- Shows vendor counts and intervals per tier/organization

**`stopVendorSyncs()`**
- Gracefully stops all scheduled vendor sync tasks
- Used for shutdown scenarios

### 3. Job Queueing Integration

- Uses existing BullMQ queue from `src/workers/queue.js`
- Job type: `JobTypes.SYNC_VENDOR`
- Job data includes:
  - `organizationId`: Organization UUID
  - `vendorId`: Vendor UUID
  - `connectorType`: Connector type (optional)
  - `priority`: Job priority based on vendor tier

### 4. Cron-based Scheduling

- Uses `node-cron` library for reliable scheduling
- Each tier gets its own cron task per organization
- Tasks named: `vendor-sync-{orgId}-{tier}`
- Supports timezone configuration via `TZ` environment variable
- Graceful shutdown on SIGTERM/SIGINT

## Sync Flow

```
1. Scheduler starts
   ↓
2. Fetches all organizations
   ↓
3. For each organization:
   - Fetch all vendors
   - Group by tier
   - Create cron job for each tier
   ↓
4. Cron job triggers (based on tier interval)
   ↓
5. For each vendor in tier:
   - Queue BullMQ job
   - Job processed by worker (T-006)
   ↓
6. Worker executes sync
   - Connects to vendor systems
   - Collects data
   - Updates database
   ↓
7. Job completes/fails with retry logic
```

## Configuration

### Environment Variables

```bash
# Timezone for scheduler (default: UTC)
TZ=America/New_York

# Redis connection (required for BullMQ)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password
```

### Custom Sync Intervals

To customize sync intervals, modify `SYNC_INTERVALS` in `src/utils/syncConfig.js`:

```javascript
const SYNC_INTERVALS = {
  critical: '0 2 * * *',  // Daily at 2 AM
  high: '0 3 * * 0',      // Weekly Sunday at 3 AM
  medium: '0 4 1 * *',    // Monthly 1st at 4 AM
  low: '0 5 1 * *'        // Monthly 1st at 5 AM
};
```

## API Usage

### Manual Sync Trigger

To trigger a manual sync via API:

```javascript
POST /api/vendors/:vendorId/sync
{
  "connectorType": "securityRating" // Optional
}
```

This calls `scheduleManualSync()` which queues a BullMQ job immediately.

### Get Scheduled Tasks

```javascript
GET /api/admin/scheduled-tasks
```

Returns all scheduled vendor sync tasks with intervals and vendor counts.

## Error Handling

### Scheduler-level errors:
- Logged with context (organization, vendor, tier)
- Non-fatal: Continue processing other vendors/orgs
- Fatal: Logged and scheduler exits

### Job-level errors:
- Handled by BullMQ retry mechanism
- Max 5 retries with exponential backoff
- Failed jobs tracked in `vendor_sync_jobs` table

### Cron task errors:
- Logged with task name and error details
- Task continues to run on next schedule

## Logging

All scheduler operations are logged with winston logger:

```
[ scheduler] Starting vendor sync scheduling
[ scheduler] Processing 15 vendors for org abc-123
[ scheduler] Scheduling 3 critical vendors with interval: 0 2 * * *
[ scheduler] Queued sync job 12345 for vendor Acme Corp
[ scheduler] Scheduled task vendor-sync-abc-123-critical with cron: 0 2 * * *
```

## Testing

### Manual Testing

```bash
# Start scheduler
npm run scheduler

# Check logs for scheduled tasks
tail -f logs/scheduler.log

# Verify cron tasks are created
# Check BullMQ queue for jobs
```

### Integration Testing

```javascript
// Test scheduling
const { scheduleVendorSyncs, getScheduledTasks } = require('./src/scheduler');
await scheduleVendorSyncs();
const tasks = await getScheduledTasks();
console.log('Scheduled tasks:', tasks);

// Test manual sync
const { scheduleManualSync } = require('./src/scheduler');
const result = await scheduleManualSync(vendorId, orgId);
console.log('Manual sync job:', result);
```

## Performance Considerations

### Scalability:
- Each organization with vendors gets 4 cron tasks (one per tier)
- BullMQ handles job processing concurrently
- Redis provides reliable queue storage

### Resource Usage:
- Memory: Minimal (scheduler is lightweight)
- CPU: Low (cron tasks are efficient)
- Database: One query per organization on startup

### Optimization:
- Vendor data cached in memory after initial fetch
- Cron tasks only execute at scheduled times
- Job queueing prevents blocking operations

## Monitoring

### Health Checks

Monitor scheduler health via:

1. **Log files:** Check for errors and warnings
2. **BullMQ metrics:** Queue depth, job counts
3. **Database queries:** Check `vendor_sync_jobs` table
4. **Cron tasks:** Verify tasks are scheduled

### Metrics to Track

- Total scheduled tasks
- Jobs queued per tier
- Job completion rates
- Average job duration
- Failed job rate

## Future Enhancements

### Potential Improvements:

1. **Dynamic rescheduling:**
   - Auto-reschedule when vendor tier changes
   - Add/remove tasks when vendors are created/deleted

2. **Custom intervals:**
   - Allow per-vendor custom intervals
   - Support business-hour-only syncing

3. **Batch optimization:**
   - Group vendors into single job
   - Reduce database queries

4. **Monitoring dashboard:**
   - Real-time scheduler status
   - Upcoming sync schedule
   - Historical job performance

5. **Failure handling:**
   - Automatic backoff for failing vendors
   - Alert on repeated failures
   - Skip vendors with chronic issues

## Dependencies

- `node-cron`: ^3.0.0 - Cron scheduling
- `bullmq`: ^5.29.0 - Job queue (existing)
- `ioredis`: ^5.4.1 - Redis client (existing)
- `winston`: ^3.19.0 - Logging (existing)

## Files Modified

1. **Created:**
   - `/cyberrx-api/src/utils/syncConfig.js` - Sync configuration module

2. **Modified:**
   - `/cyberrx-api/src/scheduler.js` - Added vendor sync scheduling

## Next Steps

1. **T-008:** Implement monitoring endpoints for scheduler health
2. **T-009:** Add admin API for managing scheduled tasks
3. **T-010:** Create scheduler tests (unit + integration)
4. **T-011:** Add scheduler metrics dashboard

## Verification Checklist

- [x] Install node-cron dependency
- [x] Create syncConfig utility
- [x] Integrate vendor sync into scheduler
- [x] Implement tier-based cron scheduling
- [x] Queue BullMQ jobs (no inline execution)
- [x] Add manual sync trigger function
- [x] Implement error handling
- [x] Add comprehensive logging
- [x] Support graceful shutdown
- [x] Create documentation
- [x] Test with sample vendors

## Summary

Successfully integrated vendor sync scheduling into the existing scheduler system with:

- Tier-based sync frequencies (daily/weekly/monthly)
- BullMQ job queueing for async processing
- Cron-based scheduling for reliability
- Manual sync on-demand capability
- Comprehensive error handling and logging
- Production-ready code with documentation

The scheduler now automatically queues vendor sync jobs based on vendor tiers, replacing inline execution with scalable BullMQ job processing.

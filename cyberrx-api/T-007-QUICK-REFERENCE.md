# T-007: Scheduler Integration - Quick Reference

## Overview
Integrated vendor sync operations into the existing scheduler.js system with tier-based sync frequencies and BullMQ job queueing.

## Files Created/Modified

### New Files
- `/cyberrx-api/src/utils/syncConfig.js` - Sync configuration utility
- `/cyberrx-api/tests/syncConfig.test.js` - Sync configuration tests
- `/cyberrx-api/tests/scheduler.test.js` - Scheduler tests
- `/cyberrx-api/T-007-IMPLEMENTATION-SUMMARY.md` - Full documentation

### Modified Files
- `/cyberrx-api/src/scheduler.js` - Added vendor sync scheduling
- `/cyberrx-api/package.json` - Added node-cron dependency

## Sync Intervals by Tier

| Tier | Interval | Cron Expression | Description |
|------|----------|-----------------|-------------|
| Critical | Daily | `0 2 * * *` | Every day at 2 AM |
| High | Weekly | `0 2 * * 0` | Every Sunday at 2 AM |
| Medium | Monthly | `0 2 1 * *` | 1st of month at 2 AM |
| Low | Monthly | `0 2 1 * *` | 1st of month at 2 AM |

## Connector Sync Configuration

| Connector | Interval | Priority | Description |
|-----------|----------|----------|-------------|
| securityRating | Daily | 1 | Security scores - highest priority |
| complianceEvidence | Daily | 2 | Compliance docs |
| questionnaire | Weekly | 3 | Vendor assessments |
| assetInventory | Weekly | 4 | Asset tracking |
| businessImpact | Monthly | 5 | Impact analysis |

## API Functions

### scheduleVendorSyncs()
```javascript
await scheduleVendorSyncs();
```
- Automatically schedules syncs for all vendors by tier
- Creates cron jobs for each tier/organization combination
- Queues BullMQ jobs when cron triggers

### scheduleManualSync()
```javascript
const result = await scheduleManualSync(vendorId, organizationId, connectorType);
```
- Triggers immediate sync for specific vendor
- Returns job details for tracking
- Optional connector type parameter

### getScheduledTasks()
```javascript
const tasks = await getScheduledTasks();
```
- Returns summary of all scheduled tasks
- Shows vendor counts and intervals

### stopVendorSyncs()
```javascript
await stopVendorSyncs();
```
- Gracefully stops all scheduled tasks
- Used for shutdown scenarios

## Usage Examples

### Start Scheduler
```bash
npm run scheduler
```

### Manual Sync via Code
```javascript
const { scheduleManualSync } = require('./src/scheduler');

// Sync all connectors for a vendor
const job = await scheduleManualSync(
  'vendor-uuid',
  'org-uuid'
);

// Sync specific connector
const job = await scheduleManualSync(
  'vendor-uuid',
  'org-uuid',
  'securityRating'
);
```

### Get Sync Configuration
```javascript
const {
  getSyncInterval,
  getTierPriority,
  getEnabledConnectors
} = require('./src/utils/syncConfig');

// Get interval for tier
const interval = getSyncInterval('critical'); // '0 2 * * *'

// Get priority for tier
const priority = getTierPriority('high'); // 2

// Get enabled connectors
const connectors = getEnabledConnectors();
// ['securityRating', 'complianceEvidence', ...]
```

## Environment Variables

```bash
# Timezone for scheduler (default: UTC)
TZ=America/New_York

# Redis connection (required for BullMQ)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password
```

## Job Queueing

All sync jobs are queued via BullMQ:

```javascript
{
  type: 'sync_vendor',
  data: {
    organizationId: 'org-uuid',
    vendorId: 'vendor-uuid',
    priority: 1  // Based on tier
  }
}
```

## Logging

Scheduler operations are logged with winston:

```
[scheduler] Nerion scheduler initialized
[scheduler] Starting vendor sync scheduling
[scheduler] Processing 15 vendors for org abc-123
[scheduler] Scheduling 3 critical vendors with interval: 0 2 * * *
[scheduler] Queued sync job 12345 for vendor Acme Corp
[scheduler] Scheduled task vendor-sync-abc-123-critical with cron: 0 2 * * *
```

## Error Handling

- Scheduler-level errors: Logged, non-fatal
- Job-level errors: BullMQ retry mechanism (5 retries)
- Database errors: Logged, continue processing other vendors
- Queue errors: Logged, continue processing other jobs

## Testing

### Manual Testing
```bash
# Start scheduler
npm run scheduler

# Check logs
tail -f logs/cyberrx-api-*.log

# Verify cron tasks
# Check BullMQ queue
```

### Unit Tests
```bash
npm test -- tests/syncConfig.test.js
```

### Integration Tests
```bash
npm test -- tests/scheduler.test.js
```

## Monitoring

### Health Checks
1. Check log files for errors
2. Monitor BullMQ queue metrics
3. Check `vendor_sync_jobs` table
4. Verify cron tasks are scheduled

### Metrics to Track
- Total scheduled tasks
- Jobs queued per tier
- Job completion rates
- Average job duration
- Failed job rate

## Customization

### Change Sync Intervals
Edit `/cyberrx-api/src/utils/syncConfig.js`:

```javascript
const SYNC_INTERVALS = {
  critical: '0 1 * * *',  // Change to 1 AM
  high: '0 3 * * 0',      // Change to 3 AM Sunday
  medium: '0 4 1 * *',    // Change to 4 AM monthly
  low: '0 5 1 * *'        // Change to 5 AM monthly
};
```

### Add New Connector
Edit `CONNECTOR_SYNC_CONFIG` in syncConfig.js:

```javascript
const CONNECTOR_SYNC_CONFIG = {
  // ... existing connectors
  newConnector: {
    enabled: true,
    defaultInterval: '0 2 * * *',
    priority: 6
  }
};
```

## Troubleshooting

### Scheduler Not Starting
```bash
# Check Redis connection
redis-cli ping

# Check database connection
psql -d cyberrx -c "SELECT 1"

# Check logs
tail -f logs/error-*.log
```

### Jobs Not Queuing
```bash
# Check BullMQ queue
# Check Redis connection
# Verify vendors exist in database
```

### Cron Tasks Not Running
```bash
# Verify cron syntax
node -e "console.log(require('node-cron').validate('0 2 * * *'))"

# Check timezone settings
echo $TZ

# Verify tasks are scheduled
# Check logs for "Scheduled task" messages
```

## Key Features

- Tier-based sync frequencies
- BullMQ job queueing (no inline execution)
- Cron-based scheduling
- Manual sync on-demand
- Comprehensive error handling
- Graceful shutdown
- Extensive logging
- Production-ready

## Dependencies Added

```json
{
  "node-cron": "^3.0.0"
}
```

## Next Steps

1. Test with real vendor data
2. Monitor scheduled tasks in production
3. Add admin API for managing schedules
4. Create monitoring dashboard
5. Implement failure alerting

## Related Tasks

- T-005: BullMQ Queue Implementation
- T-006: Background Sync Worker
- T-008: Monitoring Endpoints (future)

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
- [x] Create tests
- [x] Commit changes

## Summary

Successfully integrated vendor sync scheduling into the existing scheduler system with tier-based sync frequencies, BullMQ job queueing, and comprehensive error handling. The scheduler automatically queues vendor sync jobs based on vendor tiers, replacing inline execution with scalable BullMQ job processing.

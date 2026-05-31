# Database Migrations

This directory contains PostgreSQL migrations for the CyberRx database schema.

## Migration Files

### Vendor Sync Jobs Tracking (2025_01_31)

**Files:**
- `2025_01_31_create_vendor_sync_jobs.sql` - Creates vendor_sync_jobs table
- `2025_01_31_create_vendor_sync_jobs_rollback.sql` - Rollback script

**Purpose:**
Tracks async vendor monitoring sync jobs for status monitoring, retry logic, and failure tracking.

**Table Schema:**
```sql
vendor_sync_jobs (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  connector_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
```

**Indexes:**
- `idx_sync_jobs_org_vendor` - Composite index on organization_id and vendor_id
- `idx_sync_jobs_status` - Index on status for filtering by job state
- `idx_sync_jobs_connector` - Composite index on connector_type and created_at (DESC)
- `idx_sync_jobs_created` - Index on created_at (DESC) for time-based queries
- `idx_sync_jobs_org_status` - Composite index on organization_id, status, and created_at

**Foreign Keys:**
- `organization_id` → `organizations(id)` with CASCADE delete
- `vendor_id` → `vendors(id)` with SET NULL delete

**Constraints:**
- `status` CHECK constraint - Only allows: 'queued', 'running', 'completed', 'failed'
- `retry_count` CHECK constraint - Range: 0-5 retries

**Triggers:**
- `update_vendor_sync_jobs_timestamp` - Auto-updates `updated_at` on row update

**Usage Example:**
```sql
-- Queue a new sync job
INSERT INTO vendor_sync_jobs (organization_id, vendor_id, connector_type, status)
VALUES ('org-uuid', 'vendor-uuid', 'bcbs_210', 'queued');

-- Update to running status
UPDATE vendor_sync_jobs
SET status = 'running', started_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Mark as completed
UPDATE vendor_sync_jobs
SET status = 'completed', completed_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Mark as failed with retry
UPDATE vendor_sync_jobs
SET status = 'queued', error_message = 'Connection timeout', retry_count = retry_count + 1
WHERE id = 1;

-- Query failed jobs for retry
SELECT * FROM vendor_sync_jobs
WHERE status = 'failed' AND retry_count < 5
ORDER BY created_at ASC;
```

## Running Migrations

### Apply Migration:
```bash
psql -U your_username -d cyberrx -f migrations/2025_01_31_create_vendor_sync_jobs.sql
```

### Rollback Migration:
```bash
psql -U your_username -d cyberrx -f migrations/2025_01_31_create_vendor_sync_jobs_rollback.sql
```

### Verify Migration:
```sql
-- Check table exists
\d vendor_sync_jobs

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'vendor_sync_jobs';

-- Check trigger
SELECT tgname FROM pg_trigger WHERE tgrelid = 'vendor_sync_jobs'::regclass;

-- Sample query
SELECT * FROM vendor_sync_jobs ORDER BY created_at DESC LIMIT 10;
```

## Testing

### Test Foreign Key Cascade:
```sql
-- Create test organization and vendor
INSERT INTO organizations (id, name) VALUES ('test-org', 'Test Org');
INSERT INTO vendors (id, name, organization_id, tier) VALUES ('test-vendor', 'Test Vendor', 'test-org', 'Low');

-- Create sync job
INSERT INTO vendor_sync_jobs (organization_id, vendor_id, connector_type, status)
VALUES ('test-org', 'test-vendor', 'bcbs_210', 'queued');

-- Verify job exists
SELECT * FROM vendor_sync_jobs WHERE vendor_id = 'test-vendor';

-- Delete organization (should cascade delete job)
DELETE FROM organizations WHERE id = 'test-org';

-- Verify job deleted
SELECT * FROM vendor_sync_jobs WHERE vendor_id = 'test-vendor'; -- Should return empty
```

### Test Foreign Key Set NULL:
```sql
-- Create test vendor and job
INSERT INTO vendors (id, name, organization_id, tier) VALUES ('test-vendor-2', 'Test Vendor 2', 'org-uuid', 'Low');
INSERT INTO vendor_sync_jobs (organization_id, vendor_id, connector_type, status)
VALUES ('org-uuid', 'test-vendor-2', 'bcbs_210', 'queued');

-- Verify job has vendor_id
SELECT vendor_id FROM vendor_sync_jobs WHERE vendor_id = 'test-vendor-2';

-- Delete vendor (should set vendor_id to NULL)
DELETE FROM vendors WHERE id = 'test-vendor-2';

-- Verify vendor_id is NULL
SELECT * FROM vendor_sync_jobs WHERE vendor_id IS NULL;
```

## Connector Types

Supported connector types for `connector_type` column:
- `bcbs_210` - BCBS 210 API connector
- `bcbs_210_sftp` - BCBS 210 SFTP connector
- `security_scorecard` - Security Scorecard API connector
- `bitbucket` - Bitbucket repository connector
- `github` - GitHub repository connector
- `gitlab` - GitLab repository connector

## Job Status Flow

```
queued → running → completed
   ↓         ↓
   └───→ failed → queued (if retry_count < 5)
                    ↓
                    failed (permanent if retry_count >= 5)
```

## Performance Considerations

- Indexes are optimized for common query patterns (org filtering, status filtering, time-based sorting)
- Partial index on `idx_sync_jobs_org_vendor` only indexes non-null vendor_id values
- Composite indexes reduce index scans for multi-column queries
- Time-based indexes use DESC order for recent-first queries

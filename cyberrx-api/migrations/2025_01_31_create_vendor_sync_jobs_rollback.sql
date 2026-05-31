-- Rollback Migration: Drop vendor_sync_jobs table
-- This reverses the 2025_01_31_create_vendor_sync_jobs migration

-- Drop indexes (will be auto-dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_sync_jobs_org_vendor;
DROP INDEX IF EXISTS idx_sync_jobs_status;
DROP INDEX IF EXISTS idx_sync_jobs_connector;
DROP INDEX IF EXISTS idx_sync_jobs_created;
DROP INDEX IF EXISTS idx_sync_jobs_org_status;

-- Drop trigger
DROP TRIGGER IF EXISTS update_vendor_sync_jobs_timestamp ON vendor_sync_jobs;

-- Drop table
DROP TABLE IF EXISTS vendor_sync_jobs;

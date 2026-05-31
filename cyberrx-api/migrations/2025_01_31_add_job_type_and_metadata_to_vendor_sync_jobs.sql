-- Migration: Add job_type and metadata columns to vendor_sync_jobs
-- This enables progress tracking and job categorization

-- Add job_type column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_sync_jobs'
    AND column_name = 'job_type'
  ) THEN
    ALTER TABLE vendor_sync_jobs
    ADD COLUMN job_type VARCHAR(50) NOT NULL DEFAULT 'sync_vendor';
  END IF;
END $$;

-- Add metadata column for progress tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_sync_jobs'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE vendor_sync_jobs
    ADD COLUMN metadata JSONB DEFAULT '{"progress": 0}'::jsonb;
  END IF;
END $$;

-- Add comment for job_type
COMMENT ON COLUMN vendor_sync_jobs.job_type IS 'Type of sync job: sync_vendor, sync_connector, assessment';

-- Add comment for metadata
COMMENT ON COLUMN vendor_sync_jobs.metadata IS 'Job metadata including progress, stage info, and other dynamic data';

-- Create index on job_type for filtering
CREATE INDEX IF NOT EXISTS idx_sync_jobs_job_type
  ON vendor_sync_jobs(job_type);

-- Create index on metadata for progress queries
CREATE INDEX IF NOT EXISTS idx_sync_jobs_metadata
  ON vendor_sync_jobs USING GIN (metadata);

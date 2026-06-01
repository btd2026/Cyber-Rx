-- Migration: Create vendor_sync_jobs table
-- This enables tracking of async vendor sync operations in BullMQ queue

-- Create vendor_sync_jobs table
CREATE TABLE IF NOT EXISTS vendor_sync_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id TEXT,
  connector_type TEXT NOT NULL CHECK (connector_type IN ('securityscorecard', 'bitsight', 'riskrecon', 'all')),
  job_type TEXT NOT NULL CHECK (job_type IN ('sync_vendor', 'sync_connector', 'assessment')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_sync_jobs_organization ON vendor_sync_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_sync_jobs_vendor ON vendor_sync_jobs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_sync_jobs_status ON vendor_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_vendor_sync_jobs_connector_type ON vendor_sync_jobs(connector_type);
CREATE INDEX IF NOT EXISTS idx_vendor_sync_jobs_created_at ON vendor_sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_sync_jobs_completed_at ON vendor_sync_jobs(completed_at DESC);

-- Add comments for documentation
COMMENT ON TABLE vendor_sync_jobs IS 'Tracks async vendor sync operations in BullMQ queue';
COMMENT ON COLUMN vendor_sync_jobs.id IS 'Job ID from BullMQ queue';
COMMENT ON COLUMN vendor_sync_jobs.organization_id IS 'Organization that owns this sync job';
COMMENT ON COLUMN vendor_sync_jobs.vendor_id IS 'Vendor being synced (nullable for connector-wide syncs)';
COMMENT ON COLUMN vendor_sync_jobs.connector_type IS 'Connector type: securityscorecard, bitsight, riskrecon, all';
COMMENT ON COLUMN vendor_sync_jobs.job_type IS 'Job type: sync_vendor, sync_connector, assessment';
COMMENT ON COLUMN vendor_sync_jobs.status IS 'Job status: queued, running, completed, failed';
COMMENT ON COLUMN vendor_sync_jobs.started_at IS 'When job started processing';
COMMENT ON COLUMN vendor_sync_jobs.completed_at IS 'When job completed (success or failure)';
COMMENT ON COLUMN vendor_sync_jobs.error_message IS 'Error message if job failed';
COMMENT ON COLUMN vendor_sync_jobs.retry_count IS 'Number of retry attempts';

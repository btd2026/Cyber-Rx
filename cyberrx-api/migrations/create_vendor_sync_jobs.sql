-- Migration: Create vendor_sync_jobs table
-- Task: T-006 Background Sync Worker
-- Description: Stores async vendor sync job status and tracking

-- Create vendor_sync_jobs table
CREATE TABLE IF NOT EXISTS vendor_sync_jobs (
  id TEXT PRIMARY KEY,

  -- Organization
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Vendor (optional - connector sync jobs don't have vendor)
  vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,

  -- Connector type (e.g., bcbs_210, security_scorecard)
  connector_type VARCHAR(50) NOT NULL,

  -- Job type: sync_vendor, sync_connector, assessment
  job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('sync_vendor', 'sync_connector', 'assessment')),

  -- Job status: queued, running, completed, failed
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 5)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS vendor_sync_jobs_org_id_idx ON vendor_sync_jobs(organization_id);
CREATE INDEX IF NOT EXISTS vendor_sync_jobs_vendor_id_idx ON vendor_sync_jobs(vendor_id);
CREATE INDEX IF NOT EXISTS vendor_sync_jobs_status_idx ON vendor_sync_jobs(status);
CREATE INDEX IF NOT EXISTS vendor_sync_jobs_created_at_idx ON vendor_sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS vendor_sync_jobs_org_status_idx ON vendor_sync_jobs(organization_id, status);

-- Create composite index for organization status queries
CREATE INDEX IF NOT EXISTS vendor_sync_jobs_org_status_created_idx
  ON vendor_sync_jobs(organization_id, status, created_at DESC);

-- Add comments
COMMENT ON TABLE vendor_sync_jobs IS 'Tracks async vendor sync operations from BullMQ queue';
COMMENT ON COLUMN vendor_sync_jobs.id IS 'Job ID from BullMQ queue';
COMMENT ON COLUMN vendor_sync_jobs.organization_id IS 'Organization that owns the job';
COMMENT ON COLUMN vendor_sync_jobs.vendor_id IS 'Vendor being synced (optional)';
COMMENT ON COLUMN vendor_sync_jobs.connector_type IS 'Connector type being synced';
COMMENT ON COLUMN vendor_sync_jobs.job_type IS 'Type of job: sync_vendor, sync_connector, assessment';
COMMENT ON COLUMN vendor_sync_jobs.status IS 'Job status: queued, running, completed, failed';
COMMENT ON COLUMN vendor_sync_jobs.started_at IS 'When job started processing';
COMMENT ON COLUMN vendor_sync_jobs.completed_at IS 'When job completed (or failed permanently)';
COMMENT ON COLUMN vendor_sync_jobs.error_message IS 'Error message if job failed';
COMMENT ON COLUMN vendor_sync_jobs.retry_count IS 'Number of retry attempts (max 5)';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_vendor_sync_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_sync_jobs_updated_at
  BEFORE UPDATE ON vendor_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_sync_jobs_updated_at();

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON vendor_sync_jobs TO cyberrx_api;
-- GRANT USAGE, SELECT ON SEQUENCE vendor_sync_jobs_id_seq TO cyberrx_api;

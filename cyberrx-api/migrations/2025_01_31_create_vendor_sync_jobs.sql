-- Migration: Create vendor_sync_jobs table
-- This enables tracking of async vendor monitoring sync jobs for status, retries, and failure monitoring

-- Create vendor_sync_jobs table
CREATE TABLE IF NOT EXISTS vendor_sync_jobs (
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
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_org_vendor
  ON vendor_sync_jobs(organization_id, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sync_jobs_status
  ON vendor_sync_jobs(status);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_connector
  ON vendor_sync_jobs(connector_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_created
  ON vendor_sync_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_org_status
  ON vendor_sync_jobs(organization_id, status, created_at DESC);

-- Add updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_vendor_sync_jobs_timestamp ON vendor_sync_jobs;
CREATE TRIGGER update_vendor_sync_jobs_timestamp
  BEFORE UPDATE ON vendor_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE vendor_sync_jobs IS 'Tracks async sync jobs for vendor monitoring connectors (BCBS, Security Scorecard, etc)';
COMMENT ON COLUMN vendor_sync_jobs.organization_id IS 'Organization that owns this sync job';
COMMENT ON COLUMN vendor_sync_jobs.vendor_id IS 'Vendor being synced (null if bulk sync)';
COMMENT ON COLUMN vendor_sync_jobs.connector_type IS 'Type of connector: bcbs_210, bcbs_210_sftp, security_scorecard, bitbucket, github, gitlab';
COMMENT ON COLUMN vendor_sync_jobs.status IS 'Job lifecycle: queued → running → completed/failed';
COMMENT ON COLUMN vendor_sync_jobs.started_at IS 'When the sync job started processing';
COMMENT ON COLUMN vendor_sync_jobs.completed_at IS 'When the sync job completed (success or failure)';
COMMENT ON COLUMN vendor_sync_jobs.error_message IS 'Detailed error message if status is failed';
COMMENT ON COLUMN vendor_sync_jobs.retry_count IS 'Number of retry attempts (max 5)';
COMMENT ON COLUMN vendor_sync_jobs.created_at IS 'When the sync job was created/queued';
COMMENT ON COLUMN vendor_sync_jobs.updated_at IS 'Last time the job status changed';

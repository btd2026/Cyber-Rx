-- Migration: Add credential rotation tracking fields to tool_connections table
-- Created: 2025-05-31
-- Purpose: Track credential versioning and rotation history for security compliance

-- Add rotation_history JSONB column to track credential versions
-- Stores array of rotation events with version, timestamp, and user info
ALTER TABLE tool_connections
ADD COLUMN IF NOT EXISTS rotation_history JSONB DEFAULT '[]'::jsonb;

-- Add index for created_at to support credential age queries
-- This improves performance when checking credentials due for rotation
CREATE INDEX IF NOT EXISTS idx_tool_connections_created_at
  ON tool_connections(created_at);

-- Add index for organization and status to filter active connections efficiently
CREATE INDEX IF NOT EXISTS idx_tool_connections_org_status
  ON tool_connections(org_id, status);

-- Add comment to document the new field
COMMENT ON COLUMN tool_connections.rotation_history IS 'JSONB array tracking credential rotation history. Each entry contains: version (e.g., v1, v2), rotatedAt (timestamp), rotatedBy (user ID), and previousCreatedAt (timestamp)';

-- Verify the migration
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tool_connections'
AND column_name IN ('rotation_history');

-- Expected output:
-- column_name      | data_type | column_default | is_nullable
-- -----------------+-----------+----------------+-------------
-- rotation_history | jsonb     | []::jsonb      | YES

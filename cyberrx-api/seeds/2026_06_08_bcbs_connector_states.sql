-- BCBS State-Specific Connector Monitoring States
-- Seed Date: 2026-06-08
-- Description: Creates 33 connector monitoring states (11 per state) with realistic status distribution

-- Note: vendor_monitoring_connections table structure expected:
-- organization_id, vendor_id, connector_type, status, last_synced, sync_frequency, last_sync_status

-- ========================================
-- MASSACHUSETTS CONNECTOR STATES (11 connectors)
-- Distribution: 5 Connected, 3 Manual Entry Required, 2 Error, 1 Syncing
-- ========================================

-- 1. Cotiviti - SecurityScorecard (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-cotiviti',
  'securityscorecard',
  'connected',
  '2026-05-28T10:30:00Z'::timestamptz,
  'weekly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 2. HealthEdge - BitSight (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-healthedge',
  'bitsight',
  'connected',
  '2026-05-27T14:20:00Z'::timestamptz,
  'weekly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 3. Salesforce - Questionmark (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-salesforce',
  'questionmark',
  'connected',
  '2026-05-26T09:15:00Z'::timestamptz,
  'monthly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 4. Kyruus - UpGuard (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-kyruus',
  'upguard',
  'connected',
  '2026-05-25T16:45:00Z'::timestamptz,
  'weekly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 5. CAQH - Kognito (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-caqh',
  'kognito',
  'connected',
  '2026-05-24T11:30:00Z'::timestamptz,
  'quarterly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 6. TriZetto Facets - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-trizetto',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-20T10:00:00Z'::timestamptz,
  'quarterly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 7. Zelis - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-zelis',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-15T14:00:00Z'::timestamptz,
  'monthly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 8. Change Healthcare - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-changehc',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-18T09:00:00Z'::timestamptz,
  'quarterly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 9. BitSight - Error (Rate Limit)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-healthedge',
  'bitsight',
  'error',
  '2026-05-22T13:45:00Z'::timestamptz,
  'weekly',
  'rate_limit_exceeded'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 10. Recorded Future - Error (API Issue)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-cotiviti',
  'recorded_future',
  'error',
  '2026-05-19T15:30:00Z'::timestamptz,
  'weekly',
  'api_authentication_error'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 11. Compliance Connector - Syncing
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-mass-001',
  'asset-mass-salesforce',
  'compliance_automation',
  'syncing',
  '2026-05-28T08:00:00Z'::timestamptz,
  'monthly',
  'in_progress'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- ========================================
-- TEXAS CONNECTOR STATES (11 connectors)
-- Distribution: 3 Connected, 5 Manual Entry Required, 3 Error
-- ========================================

-- 1. HealthEdge - SecurityScorecard (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-healthedge',
  'securityscorecard',
  'connected',
  '2026-05-27T11:00:00Z'::timestamptz,
  'weekly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 2. Salesforce - BitSight (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-salesforce',
  'bitsight',
  'connected',
  '2026-05-26T15:30:00Z'::timestamptz,
  'weekly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 3. Availity - UpGuard (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-availity',
  'upguard',
  'connected',
  '2026-05-25T10:15:00Z'::timestamptz,
  'monthly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 4. QNXT - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-qnxt',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-10T09:00:00Z'::timestamptz,
  'quarterly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 5. FACETS - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-facets',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-12T14:00:00Z'::timestamptz,
  'quarterly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 6. Inovalon - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-inovalon',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-08T11:00:00Z'::timestamptz,
  'monthly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 7. Zelis - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-zelis',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-14T16:00:00Z'::timestamptz,
  'monthly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 8. Benefitfocus - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-benefitfocus',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-05T13:00:00Z'::timestamptz,
  'quarterly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 9. QNXT - Error (API Integration Issue)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-qnxt',
  'api_integration',
  'error',
  '2026-05-21T10:30:00Z'::timestamptz,
  'weekly',
  'legacy_system_incompatible'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 10. FACETS - Error (API Integration Issue)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-facets',
  'api_integration',
  'error',
  '2026-05-20T14:45:00Z'::timestamptz,
  'weekly',
  'legacy_system_timeout'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 11. Inovalon - Error (Rate Limit)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-texas-001',
  'asset-texas-inovalon',
  'securityscorecard',
  'error',
  '2026-05-23T09:15:00Z'::timestamptz,
  'weekly',
  'rate_limit_exceeded'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- ========================================
-- VIRGINIA CONNECTOR STATES (11 connectors)
-- Distribution: 6 Connected, 2 Manual Entry Required, 1 Error, 2 Syncing
-- ========================================

-- 1. Change Healthcare - SecurityScorecard (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-changehc',
  'securityscorecard',
  'connected',
  '2026-05-28T12:00:00Z'::timestamptz,
  'weekly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 2. Availity - BitSight (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-availity',
  'bitsight',
  'connected',
  '2026-05-27T14:30:00Z'::timestamptz,
  'weekly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 3. Cotiviti - UpGuard (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-cotiviti',
  'upguard',
  'connected',
  '2026-05-26T10:45:00Z'::timestamptz,
  'monthly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 4. Salesforce - Questionmark (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-salesforce',
  'questionmark',
  'connected',
  '2026-05-25T15:20:00Z'::timestamptz,
  'monthly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 5. HealthSherpa - Kognito (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-healthsherpa',
  'kognito',
  'connected',
  '2026-05-24T09:30:00Z'::timestamptz,
  'quarterly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 6. Modio Health - Compliance Automation (Connected)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-modio',
  'compliance_automation',
  'connected',
  '2026-05-23T11:15:00Z'::timestamptz,
  'monthly',
  'success'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 7. HealthEdge - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-healthedge',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-16T10:00:00Z'::timestamptz,
  'quarterly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 8. Zelis - Manual Entry Required
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-zelis',
  'manual_entry_required',
  'manual_entry_required',
  '2026-05-11T13:00:00Z'::timestamptz,
  'monthly',
  'manual_update'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 9. SecurityScorecard - Error (Connectivity Issue)
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-changehc',
  'securityscorecard',
  'error',
  '2026-05-22T14:00:00Z'::timestamptz,
  'weekly',
  'connection_timeout'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 10. BitSight - Syncing
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-availity',
  'bitsight',
  'syncing',
  '2026-05-28T08:30:00Z'::timestamptz,
  'weekly',
  'in_progress'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- 11. Recorded Future - Syncing
INSERT INTO vendor_monitoring_connections (
  organization_id, vendor_id, connector_type,
  status, last_synced, sync_frequency, last_sync_status
) VALUES (
  'bcbs-virginia-001',
  'asset-va-cotiviti',
  'recorded_future',
  'syncing',
  '2026-05-28T09:00:00Z'::timestamptz,
  'weekly',
  'in_progress'
)
ON CONFLICT (organization_id, vendor_id, connector_type) DO NOTHING;

-- Verification Query:
-- SELECT organization_id, status, COUNT(*) FROM vendor_monitoring_connections
-- WHERE organization_id LIKE 'bcbs-%'
-- GROUP BY organization_id, status;

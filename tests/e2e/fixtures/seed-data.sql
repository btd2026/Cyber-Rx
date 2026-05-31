-- Seed data for E2E tests
-- This file contains test data for vendor monitoring E2E tests

-- Insert test organization
INSERT INTO orgs (id, name, industry, created_at) VALUES
('e2e-test-org', 'E2E Test Organization', 'Technology', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test user
INSERT INTO users (id, email, password_hash, name, role, org_id, created_at) VALUES
('e2e-test-user', 'test@cyberrx.com', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'Test User', 'admin', 'e2e-test-org', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test vendors
INSERT INTO vendors (id, org_id, name, domain, tier, created_at) VALUES
('test-vendor-1', 'e2e-test-org', 'Acme Corp', 'acmecorp.com', 'critical', NOW()),
('test-vendor-2', 'e2e-test-org', 'Globex Inc', 'globex.com', 'high', NOW()),
('test-vendor-3', 'e2e-test-org', 'Soylent Corp', 'soylent.com', 'medium', NOW()),
('test-vendor-4', 'e2e-test-org', 'Initech', 'initech.com', 'low', NOW()),
('test-vendor-5', 'e2e-test-org', 'Umbrella Corp', 'umbrella.com', 'critical', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert tool connections (SecurityScorecard)
INSERT INTO tool_connections (id, org_id, vendor_id, tool_type, config, status, last_sync_at, created_at) VALUES
('conn-1', 'e2e-test-org', 'test-vendor-1', 'securityscorecard', '{"api_key":"test-key-123"}', 'active', NOW(), NOW()),
('conn-2', 'e2e-test-org', 'test-vendor-2', 'securityscorecard', '{"api_key":"test-key-456"}', 'active', NOW() - INTERVAL '1 day', NOW()),
('conn-3', 'e2e-test-org', 'test-vendor-3', 'securityscorecard', '{"api_key":"test-key-789"}', 'error', NOW() - INTERVAL '2 days', NOW()),
('conn-4', 'e2e-test-org', 'test-vendor-4', 'bitwarden', '{"api_key":"test-key-abc"}', 'active', NOW(), NOW()),
('conn-5', 'e2e-test-org', 'test-vendor-5', 'sftp', '{"host":"sftp.umbrella.com","username":"test","port":22}', 'inactive', NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert vendor metrics (risk scores, signal data)
INSERT INTO vendor_metrics (id, org_id, vendor_id, overall_score, information_score, patching_score, malware_score, social_score, physical_score, ecosystem_score, brand_score, employee_score, metric_date, created_at) VALUES
('metrics-1', 'e2e-test-org', 'test-vendor-1', 85, 90, 88, 82, 80, 85, 87, 83, 84, NOW(), NOW()),
('metrics-2', 'e2e-test-org', 'test-vendor-2', 72, 75, 70, 73, 71, 74, 72, 70, 73, NOW() - INTERVAL '1 day', NOW()),
('metrics-3', 'e2e-test-org', 'test-vendor-3', 58, 60, 55, 58, 57, 59, 56, 58, 57, NOW() - INTERVAL '2 days', NOW()),
('metrics-4', 'e2e-test-org', 'test-vendor-4', 91, 93, 90, 92, 91, 94, 90, 89, 92, NOW(), NOW()),
('metrics-5', 'e2e-test-org', 'test-vendor-5', 45, 50, 42, 45, 44, 46, 43, 47, 44, NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert alerts (critical, high, medium, low severity)
INSERT INTO alerts (id, org_id, vendor_id, severity, title, description, status, created_at) VALUES
('alert-1', 'e2e-test-org', 'test-vendor-1', 'critical', 'Critical Security Vulnerability Detected', 'CVE-2024-12345 detected in Acme Corp systems', 'unacknowledged', NOW() - INTERVAL '1 hour'),
('alert-2', 'e2e-test-org', 'test-vendor-2', 'high', 'High Risk Score Drop', 'Vendor risk score dropped from 80 to 72', 'unacknowledged', NOW() - INTERVAL '3 hours'),
('alert-3', 'e2e-test-org', 'test-vendor-3', 'medium', 'SSL Certificate Expiring Soon', 'SSL certificate will expire in 7 days', 'unacknowledged', NOW() - INTERVAL '1 day'),
('alert-4', 'e2e-test-org', 'test-vendor-4', 'low', 'Minor Information Disclosure', 'Email addresses exposed in public records', 'unacknowledged', NOW() - INTERVAL '2 days'),
('alert-5', 'e2e-test-org', 'test-vendor-5', 'critical', 'Malware Detected', 'Multiple malware signatures detected', 'acknowledged', NOW() - INTERVAL '4 hours'),
('alert-6', 'e2e-test-org', 'test-vendor-1', 'high', 'Outdated Software Detected', 'Apache version 2.4.29 (vulnerable)', 'unacknowledged', NOW() - INTERVAL '2 hours'),
('alert-7', 'e2e-test-org', 'test-vendor-2', 'medium', 'DNS Security Issue', 'DNSSEC not configured', 'unacknowledged', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

-- Insert sync jobs (for testing credential rotation and sync status)
INSERT INTO sync_jobs (id, org_id, vendor_id, tool_type, status, started_at, completed_at, error_message, created_at) VALUES
('sync-1', 'e2e-test-org', 'test-vendor-1', 'securityscorecard', 'completed', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '55 minutes', NULL, NOW()),
('sync-2', 'e2e-test-org', 'test-vendor-2', 'securityscorecard', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', NULL, NOW()),
('sync-3', 'e2e-test-org', 'test-vendor-3', 'securityscorecard', 'failed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'Invalid API key', NOW()),
('sync-4', 'e2e-test-org', 'test-vendor-1', 'securityscorecard', 'running', NOW() - INTERVAL '5 minutes', NULL, NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert credential versions (for testing rotation)
INSERT INTO credential_versions (id, connection_id, version, encrypted_value, created_at, expires_at, status) VALUES
('cred-v1-1', 'conn-1', 1, 'encrypted-api-key-v1', NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 days', 'expired'),
('cred-v1-2', 'conn-1', 2, 'encrypted-api-key-v2', NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', 'active'),
('cred-v2-1', 'conn-2', 1, 'encrypted-api-key-v1', NOW() - INTERVAL '120 days', NOW() - INTERVAL '60 days', 'expired'),
('cred-v2-2', 'conn-2', 2, 'encrypted-api-key-v2', NOW() - INTERVAL '60 days', NOW() + INTERVAL '-1 days', 'overdue'),
('cred-v3-1', 'conn-3', 1, 'encrypted-api-key-v1', NOW() - INTERVAL '100 days', NOW() - INTERVAL '40 days', 'expired')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better test performance
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_tool_connections_org ON tool_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_metrics_org ON vendor_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_org ON sync_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_credential_versions_connection ON credential_versions(connection_id);

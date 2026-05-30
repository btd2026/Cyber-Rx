-- ============================================================================
-- Seed File: Sample Findings for Correlation Testing
-- Task: T-115 (Validation)
-- Description: Create sample findings linked to demo assets for testing
-- Organization: BCBS Demo Tenant (org_id: demo-bcbs-001)
-- ============================================================================

-- Sample Finding F-001: NASCO Unencrypted SFTP Channel (from assessment)
-- This is the worked example from the assessment's NASCO screenshot
INSERT INTO findings (
  id,
  title,
  description,
  severity,
  status,
  organization_id,
  discovered_date,
  asset_id,
  business_process_id,
  source,
  tool,
  metadata,
  risk_id
) VALUES (
  'finding-nasco-f001',
  'NASCO Unencrypted SFTP Channel Exposes PHI',
  'The SFTP channel between NASCO and the mailing vendor transmits unencrypted PHI for 8 million members. The channel lacks TLS encryption and has been documented in internal audit findings for 47+ days. This creates a structural breach-readiness exposure with immediate downstream liability under HIPAA and multi-state breach notification laws.',
  'Critical',
  'open',
  'demo-bcbs-001',
  NOW() - INTERVAL '47 days',
  'asset-nasco-001',
  'bp-claims-adjudication',
  'internal_audit',
  'audit_log',
  '{"audit_ref": "AUD-2024-Q4-087", "days_open": 47, "affected_members": 8000000, "channel_type": "SFTP"}'::jsonb,
  'risk-nasco-sftp'
) ON CONFLICT (id) DO NOTHING;

-- Sample Finding F-002: HealthEdge Unauthorized Access
INSERT INTO findings (
  id,
  title,
  description,
  severity,
  status,
  organization_id,
  discovered_date,
  asset_id,
  business_process_id,
  source,
  tool,
  metadata,
  risk_id
) VALUES (
  'finding-healthedge-f001',
  'HealthEdge Unauthorized Admin Access',
  'Two accounts with administrative privileges on HealthEdge were found with shared credentials and no MFA. The accounts have been active for 180+ days with evidence of access from unusual geographic locations.',
  'High',
  'in_progress',
  'demo-bcbs-001',
  NOW() - INTERVAL '15 days',
  'asset-healthedge-001',
  'bp-care-management',
  'siem',
  'crowdstrike',
  '{"alert_id": "AL-2024-0815-HE-001", "shared_accounts": 2, "unusual_locations": 3, "days_active": 180}'::jsonb,
  'risk-healthedge-access'
) ON CONFLICT (id) DO NOTHING;

-- Sample Finding F-003: Genesys PHI Data Exfiltration
INSERT INTO findings (
  id,
  title,
  description,
  severity,
  status,
  organization_id,
  discovered_date,
  asset_id,
  business_process_id,
  source,
  tool,
  metadata,
  risk_id
) VALUES (
  'finding-genesys-f001',
  'Genesys PHI Data Exfiltration via Insider Threat',
  'Analysis of Genesys call center logs detected bulk downloads of member PHI by a terminated employee 2 days before their departure. Over 15,000 member records were accessed including SSN, DOB, and medical condition information.',
  'Critical',
  'open',
  'demo-bcbs-001',
  NOW() - INTERVAL '5 days',
  'asset-genesys-001',
  'bp-member-services',
  'uba',
  'splunk',
  '{"employee_id": "EMP-1847", "records_exfiltrated": 15000, "termination_date": "2024-08-10", "download_days": [-3, -2]}'::jsonb,
  'risk-genesys-insider'
) ON CONFLICT (id) DO NOTHING;

-- Sample Finding F-004: FACETS Out-of-Support Platform
INSERT INTO findings (
  id,
  title,
  description,
  severity,
  status,
  organization_id,
  discovered_date,
  asset_id,
  business_process_id,
  source,
  tool,
  metadata,
  is_repeat,
  repeat_count
) VALUES (
  'finding-facets-f001',
  'FACETS Claims Platform Running Unsupported Version',
  'FACETS claims system is running version 4.6 which reached end-of-support in December 2023. The vendor no longer provides security patches, leaving known vulnerabilities unmitigated. This is the third consecutive quarterly assessment identifying this issue.',
  'High',
  'open',
  'demo-bcbs-001',
  NOW() - INTERVAL '30 days',
  'asset-facets-001',
  'bp-claims-adjudication',
  'vendor_assessment',
  'internal_audit',
  '{"version": "4.6", "eos_date": "2023-12-31", "cves": ["CVE-2023-XXXX", "CVE-2024-YYYY"], "patch_status": "none"}'::jsonb,
  true,
  3
) ON CONFLICT (id) DO NOTHING;

-- Sample Finding F-005: Missing MFA on QNXT Medicaid System
INSERT INTO findings (
  id,
  title,
  description,
  severity,
  status,
  organization_id,
  discovered_date,
  asset_id,
  business_process_id,
  source,
  tool,
  metadata,
  risk_id
) VALUES (
  'finding-qnxt-f001',
  'QNXT Medicaid System Lacks MFA for External Access',
  'The QNXT Medicaid claims system allows external access via web portal without multi-factor authentication. The state Medicaid agreement requires MFA per 42 CFR §422.306(c)(1). CMS audit has flagged this as a CAP-level finding.',
  'High',
  'mitigating',
  'demo-bcbs-001',
  NOW() - INTERVAL '60 days',
  'asset-qnxt-001',
  'bp-enrollment-eligibility',
  'cms_audit',
  'manual_assessment',
  '{"cms_requirement": "42 CFR 422.306(c)(1)", "cap_level": true, "external_users": 450, "estimated_remediation": 90}'::jsonb,
  'risk-qnxt-mfa'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Create associated risks for the findings
-- ============================================================================

-- Risk for NASCO SFTP Issue
INSERT INTO risks (
  id,
  title,
  severity,
  status,
  organization_id,
  description,
  likelihood,
  asset_id,
  business_process_ids,
  data_object_ids,
  threat_scenario_id,
  framework_mappings,
  financial_exposure,
  cost_to_remediate,
  legal_obligation_ids,
  executive_owner,
  remediation_owner,
  evidence_owner,
  audit_evidence_required,
  audit_test_ids
) VALUES (
  'risk-nasco-sftp',
  'NASCO Unencrypted PHI Transmission - Breach Exposure',
  'Critical',
  'open',
  'demo-bcbs-001',
  'Unencrypted SFTP transmission of PHI for 8M members creates immediate breach exposure under HIPAA and multi-state laws. The channel has been documented for 47+ days without remediation, creating willful neglect exposure.',
  'High',
  'asset-nasco-001',
  '["bp-claims-adjudication", "bp-enrollment-eligibility"]',
  '["phi-claims-data", "phi-member-demographics"]',
  'ts-mitm-001',
  '["HIPAA Security Rule", "HIPAA Privacy Rule", "NIST CSF", "42 CFR 422.306"]',
  285000000,
  2500000,
  '["lo-hipaa-164-400", "lo-ca-ccpa-cmia", "lo-ny-shield-act"]',
  'CISO',
  'CRO',
  'CLO',
  ' quarterly_review: evidence of TLS encryption implementation for all external PHI transmissions',
  '["TEST-PHI-001", "TEST-ENC-001", "TEST-VND-001"]'
) ON CONFLICT (id) DO NOTHING;

-- Risk for HealthEdge Access Issue
INSERT INTO risks (
  id,
  title,
  severity,
  status,
  organization_id,
  description,
  likelihood,
  asset_id,
  business_process_ids,
  threat_scenario_id,
  framework_mappings,
  financial_exposure,
  legal_obligation_ids,
  executive_owner,
  remediation_owner
) VALUES (
  'risk-healthedge-access',
  'HealthEdge Administrative Access Control Failure',
  'High',
  'mitigating',
  'demo-bcbs-001',
  'Shared admin credentials without MFA on HealthEdge creates unauthorized access risk to claims and care management data. Geographic anomalies suggest potential compromise.',
  'Medium',
  'asset-healthedge-001',
  '["bp-claims-adjudication", "bp-care-management"]',
  'ts-credential-stuffing-001',
  '["NIST CSF AC-7", "NIST 800-53 IA-2"]',
  1200000,
  '["lo-hipaa-security-rule"]',
  'CISO',
  'CRO'
) ON CONFLICT (id) DO NOTHING;

-- Risk for Genesys Insider Threat
INSERT INTO risks (
  id,
  title,
  severity,
  status,
  organization_id,
  description,
  likelihood,
  asset_id,
  business_process_ids,
  data_object_ids,
  threat_scenario_id,
  framework_mappings,
  financial_exposure,
  legal_obligation_ids,
  executive_owner,
  remediation_owner,
  audit_evidence_required
) VALUES (
  'risk-genesys-insider',
  'Genesys Insider PHI Data Exfiltration',
  'Critical',
  'open',
  'demo-bcbs-001',
  'Terminated employee exfiltrated 15K member records including SSN and medical information before departure. This represents a confirmed breach with notification requirements across all 10 BCBS markets.',
  'High',
  'asset-genesys-001',
  '["bp-member-services"]',
  '["phi-member-inquiries", "phi-grievance-records"]',
  'ts-insider-001',
  '["HIPAA Privacy Rule", "NIST CSF AT-3"]',
  8500000,
  '["lo-hipaa-164-400", "lo-ca-ccpa-cmia", "lo-ny-shield-act", "lo-tx-hb300", "lo-fl-fipa", "lo-il-pipa", "lo-pa-breach-act", "lo-oh-data-protection", "lo-mi-identity-theft", ' ||
   '"lo-ga-pipa", "lo-nc-identity-theft"]',
  'CISO',
  'CLO',
  'complete_investigation: forensic analysis, legal review, member notification plan'
) ON CONFLICT (id) DO NOTHING;

-- Risk for FACETS EOL Issue
INSERT INTO risks (
  id,
  title,
  severity,
  status,
  organization_id,
  description,
  likelihood,
  asset_id,
  business_process_ids,
  threat_scenario_id,
  framework_mappings,
  financial_exposure,
  cost_to_remediate,
  executive_owner,
  remediation_owner
) VALUES (
  'risk-facets-eol',
  'FACETS Unsupported Platform - Security Patch Gap',
  'High',
  'open',
  'demo-bcbs-001',
  'FACETS 4.6 reached end-of-support in December 2023 with no security patches available. Known vulnerabilities remain unmitigated. This is a repeat finding for 3 consecutive quarters.',
  'Medium',
  'asset-facets-001',
  '["bp-claims-adjudication"]',
  'ts-zero-day-001',
  '["NIST CSF RM-2", "NIST 800-53 RA-5"]',
  3500000,
  4500000,
  'CIO',
  'CRO'
) ON CONFLICT (id) DO NOTHING;

-- Risk for QNXT MFA Issue
INSERT INTO risks (
  id,
  title,
  severity,
  status,
  organization_id,
  description,
  likelihood,
  asset_id,
  business_process_ids,
  threat_scenario_id,
  framework_mappings,
  regulatory_citation,
  financial_exposure,
  legal_obligation_ids,
  executive_owner,
  remediation_owner
) VALUES (
  'risk-qnxt-mfa',
  'QNXT MFA Gap - CAP Finding from CMS',
  'High',
  'mitigating',
  'demo-bcbs-001',
  'QNXT Medicaid web portal lacks MFA for external access, violating CMS requirements. CAP-level finding from recent audit could trigger sanctions if not remediated within 90 days.',
  'Medium',
  'asset-qnxt-001',
  '["bp-enrollment-eligibility"]',
  'ts-credential-stuffing-001',
  '["NIST CSF AC-7", "NIST 800-53 IA-2", "CMS 42 CFR 422.306"]',
  '42 CFR §422.306(c)(1) - MFA requirement for MA organizations',
  2100000,
  '["lo-cms-ma-5day"]',
  'CISO',
  'CRO'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- After running this seed, you should have:
-- - 5 Findings (including F-001 NASCO worked example)
-- - 5 Associated Risks
-- - All findings linked to demo assets and business processes
-- - Ready for correlation engine testing
-- ============================================================================

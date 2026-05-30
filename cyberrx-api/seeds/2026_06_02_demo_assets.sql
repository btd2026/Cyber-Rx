-- ============================================================================
-- Seed File: Demo Assets - NASCO, HealthEdge, Genesys
-- Task: T-109
-- Description: Seed worked-example system assets for BCBS demo tenant
-- Organization: BCBS Demo Tenant (org_id: demo-bcbs-001)
-- ============================================================================

-- ============================================================================
-- CRITICAL ASSETS - The worked-example systems from the assessment
-- These are the three key systems that will be used in correlation examples
-- ============================================================================

-- 1. NASCO (National Association of Blue Cross Blue Shield Plans)
-- Core platform for claims processing and member enrollment for Blue plans
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-nasco-001',
  'demo-bcbs-001',
  'nasco-prod.bluecross.example.com',
  '10.100.1.10',
  'Mainframe',
  '{"PHI", "PII", "Financial"}',
  'CRO',
  '["bp-claims-adjudication", "bp-enrollment-eligibility"]',
  '["app-nasco"]',
  true,
  NULL,
  'Critical',
  'NASCO (National Association of Blue Cross Blue Shield Plans)',
  'z/OS 2.5',
  NOW() - INTERVAL '30 days',
  85,
  'NASCO is the central claims and enrollment processing platform for Blue Cross Blue Shield plans. Processes approximately 40 million claims annually and houses member eligibility data for 8 million members. Any outage impacts claim payment accuracy and member verification.'
) ON CONFLICT (id) DO NOTHING;

-- NASCO - High-level narrative for correlation engine
-- This system is referenced in the assessment's F-001 NASCO worked example

-- 2. HealthEdge
-- Modern health plan administration platform for claims, enrollment, and care management
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-healthedge-001',
  'demo-bcbs-001',
  'healthedge-prod.bluecross.example.com',
  '10.100.2.20',
  'SaaS Application',
  '{"PHI", "PII", "Financial"}',
  'CRO',
  '["bp-claims-adjudication", "bp-care-management"]',
  '["app-healthedge"]',
  true,
  NULL,
  'Critical',
  'HealthEdge',
  '5.2',
  NOW() - INTERVAL '25 days',
  72,
  'HealthEdge provides modern claims adjudication, enrollment management, and care coordination capabilities. Hosted in cloud environments with direct integration to NASCO for legacy data.'
) ON CONFLICT (id) DO NOTHING;

-- 3. Genesys
-- Contact center and member services platform
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-genesys-001',
  'demo-bcbs-001',
  'genesys-contact.bluecross.example.com',
  '10.100.3.30',
  'Cloud Platform',
  '{"PHI", "PII"}',
  'CXO',
  '["bp-member-services"]',
  '["app-genesys"]',
  true,
  NULL,
  'High',
  'Genesys',
  '100.0',
  NOW() - INTERVAL '20 days',
  68,
  'Genesys powers the member services contact center, handling 5 million calls annually. Supports call routing, IVR, agent desktop, and omnichannel member engagement. Integration with member portal for self-service capabilities.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADDITIONAL CRITICAL ASSETS for a realistic demo environment
-- These support the business processes seeded in T-108
-- ============================================================================

-- 4. FACETS (Claims Administration System)
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-facets-001',
  'demo-bcbs-001',
  'facets-prod.bluecross.example.com',
  '10.100.4.40',
  'On-Premise Server',
  '{"PHI", "PII", "Financial"}',
  'CRO',
  '["bp-claims-adjudication", "bp-payment-integrity"]',
  '["app-facets"]',
  true,
  NULL,
  'Critical',
  'Cognizant (formerly TriZetto)',
  '4.8',
  NOW() - INTERVAL '35 days',
  78,
  'FACETS is the core claims administration platform for commercial lines. Supports claim adjudication, pricing, and payment processing for 3 million commercial members.'
) ON CONFLICT (id) DO NOTHING;

-- 5. QNXT (QNXT is another claims system)
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-qnxt-001',
  'demo-bcbs-001',
  'qnxt-prod.bluecross.example.com',
  '10.100.5.50',
  'On-Premise Server',
  '{"PHI", "PII", "Financial"}',
  'CRO',
  '["bp-claims-adjudication"]',
  '["app-qnxt"]',
  true,
  NULL,
  'Critical',
  'Cognizant',
  '7.1',
  NOW() - INTERVAL '40 days',
  82,
  'QNXT processes claims for Medicaid and marketplace lines. Handles approximately 2 million claims per month with complex eligibility and benefit logic.'
) ON CONFLICT (id) DO NOTHING;

-- 6. Member Portal (Web Application)
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-member-portal-001',
  'demo-bcbs-001',
  'member.bluecross.example.com',
  '10.200.1.10',
  'Web Application',
  '{"PHI", "PII"}',
  'CXO',
  '["bp-enrollment-eligibility", "bp-member-services"]',
  '["app-member-portal"]',
  true,
  NULL,
  'High',
  'Internal',
  '3.5',
  NOW() - INTERVAL '15 days',
  65,
  'Member-facing web portal for self-service eligibility verification, claims status, ID card access, and benefit inquiries. Handles 2 million monthly visits.'
) ON CONFLICT (id) DO NOTHING;

-- 7. Provider Portal (Web Application)
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-provider-portal-001',
  'demo-bcbs-001',
  'provider.bluecross.example.com',
  '10.200.2.20',
  'Web Application',
  '{"PHI", "PII", "Financial"}',
  'CRO',
  '["bp-provider-network"]',
  '["app-provider-portal"]',
  true,
  NULL,
  'High',
  'Internal',
  '2.8',
  NOW() - INTERVAL '20 days',
  62,
  'Provider-facing portal for eligibility verification, claims submission, referral authorization, and provider directory updates. Used by 50,000 providers monthly.'
) ON CONFLICT (id) DO NOTHING;

-- 8. Payment Integrity Platform (FACS)
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-facs-001',
  'demo-bcbs-001',
  'facs-prod.bluecross.example.com',
  '10.100.6.60',
  'On-Premise Application',
  '{"Financial", "PHI"}',
  'CFO',
  '["bp-payment-integrity"]',
  '["app-facs"]',
  true,
  NULL,
  'High',
  'Internal',
  '4.2',
  NOW() - INTERVAL '30 days',
  70,
  'FACS performs pre-payment validation, post-payment review, and coordination of benefits processing. Identifies $50M annually in payment accuracy improvements.'
) ON CONFLICT (id) DO NOTHING;

-- 9. Care Management Platform
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-care-mgmt-001',
  'demo-bcbs-001',
  'care-mgmt.bluecross.example.com',
  '10.100.7.70',
  'SaaS Application',
  '{"PHI"}',
  'CMO',
  '["bp-care-management"]',
  '["app-care-mgmt"]',
  true,
  NULL,
  'High',
  'Internal',
  '2.5',
  NOW() - INTERVAL '25 days',
  58,
  'Care management platform supporting case management, utilization management, and care coordination. Houses care plans for 500,000 complex members.'
) ON CONFLICT (id) DO NOTHING;

-- 10. Fraud Detection System
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-fraud-detection-001',
  'demo-bcbs-001',
  'fraud-detect.bluecross.example.com',
  '10.100.8.80',
  'Analytics Platform',
  '{"PHI", "Financial"}',
  'CFO',
  '["bp-payment-integrity"]',
  '["app-fraud-detection"]',
  true,
  NULL,
  'High',
  'Internal',
  '3.0',
  NOW() - INTERVAL '20 days',
  55,
  'AI-powered fraud detection system analyzing claims patterns in real-time. Flags approximately 1,000 potential fraud cases monthly.'
) ON CONFLICT (id) DO NOTHING;

-- 11. Actuarial Modeling System
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-actuarial-001',
  'demo-bcbs-001',
  'actuary.bluecross.example.com',
  '10.100.9.90',
  'On-Premise Application',
  '{"Financial", "Confidential"}',
  'CFO',
  '["bp-actuarial"]',
  '["app-actuarial"]',
  true,
  NULL,
  'Medium',
  'Internal',
  '5.1',
  NOW() - INTERVAL '45 days',
  52,
  'Actuarial modeling system for product pricing, reserving, and financial forecasting. Contains sensitive rating factors and reserve assumptions.'
) ON CONFLICT (id) DO NOTHING;

-- 12. Enterprise Data Warehouse (EDW)
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-edw-001',
  'demo-bcbs-001',
  'edw.bluecross.example.com',
  '10.100.10.100',
  'Database Cluster',
  '{"PHI", "PII", "Financial", "Confidential"}',
  'CIO',
  '["bp-claims-adjudication", "bp-actuarial", "bp-payment-integrity"]',
  '["app-edw"]',
  true,
  NULL,
  'Critical',
  'Internal',
  '19c',
  NOW() - INTERVAL '10 days',
  88,
  'Central data warehouse aggregating data from all operational systems. Contains 10+ years of historical claims, enrollment, and financial data. Used for analytics, reporting, and machine learning.'
) ON CONFLICT (id) DO NOTHING;

-- 13. PBM Platform (Pharmacy Benefits Management)
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-pbm-001',
  'demo-bcbs-001',
  'pbm.bluecross.example.com',
  '10.100.11.110',
  'SaaS Application',
  '{"PHI", "Financial"}',
  'CMO',
  '["bp-pharmacy-pbm"]',
  '["app-pbm"]',
  true,
  NULL,
  'High',
  'External PBM',
  '4.0',
  NOW() - INTERVAL '30 days',
  64,
  'Pharmacy benefits management platform processing 30 million prescription claims annually. Includes formulary management and drug utilization review.'
) ON CONFLICT (id) DO NOTHING;

-- 14. Compliance Management System
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-compliance-001',
  'demo-bcbs-001',
  'compliance.bluecross.example.com',
  '10.100.12.120',
  'Web Application',
  '{"Confidential", "PII"}',
  'CLO',
  '["bp-compliance-regulatory"]',
  '["app-compliance"]',
  true,
  NULL,
  'Medium',
  'Internal',
  '2.1',
  NOW() - INTERVAL '20 days',
  48,
  'Compliance management system tracking regulatory obligations, audit findings, policy exceptions, and corrective action plans. Critical for audit readiness.'
) ON CONFLICT (id) DO NOTHING;

-- 15. CRM System (Constituent Relationship Management)
INSERT INTO assets (
  id,
  organization_id,
  hostname,
  ip_address,
  type,
  data_classification,
  owner,
  business_process_ids,
  application_ids,
  supported,
  end_of_support_date,
  criticality,
  vendor,
  version,
  last_assessment_date,
  risk_score,
  description
) VALUES (
  'asset-crm-001',
  'demo-bcbs-001',
  'crm.bluecross.example.com',
  '10.200.3.30',
  'SaaS Application',
  '{"PII", "PHI"}',
  'CXO',
  '["bp-member-services", "bp-provider-network"]',
  '["app-crm"]',
  true,
  NULL,
  'Medium',
  'Salesforce',
  'Cloud',
  NOW() - INTERVAL '15 days',
  45,
  'CRM system for member and provider interactions, case management, and communication tracking. Integrates with Genesys for call center operations.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- APPLICATIONS (referenced by assets)
-- Create the application records that assets reference
-- ============================================================================

INSERT INTO applications (id, name, type, owner, criticality, description, organization_id)
VALUES
  ('app-nasco', 'NASCO Claims & Enrollment', 'Mainframe', 'CRO', 'Critical', 'Central claims and enrollment platform for Blue plans', 'demo-bcbs-001'),
  ('app-healthedge', 'HealthEdge', 'SaaS', 'CRO', 'Critical', 'Modern health plan administration platform', 'demo-bcbs-001'),
  ('app-genesys', 'Genesys Contact Center', 'Cloud Platform', 'CXO', 'High', 'Contact center and member services platform', 'demo-bcbs-001'),
  ('app-facets', 'FACETS', 'On-Premise', 'CRO', 'Critical', 'Claims administration for commercial lines', 'demo-bcbs-001'),
  ('app-qnxt', 'QNXT', 'On-Premise', 'CRO', 'Critical', 'Claims administration for Medicaid/marketplace', 'demo-bcbs-001'),
  ('app-member-portal', 'Member Portal', 'Web Application', 'CXO', 'High', 'Member self-service portal', 'demo-bcbs-001'),
  ('app-provider-portal', 'Provider Portal', 'Web Application', 'CRO', 'High', 'Provider self-service portal', 'demo-bcbs-001'),
  ('app-facs', 'FACS Payment Integrity', 'On-Premise', 'CFO', 'High', 'Payment validation and recovery', 'demo-bcbs-001'),
  ('app-care-mgmt', 'Care Management Platform', 'SaaS', 'CMO', 'High', 'Case and utilization management', 'demo-bcbs-001'),
  ('app-fraud-detection', 'Fraud Detection System', 'Analytics', 'CFO', 'High', 'AI-powered fraud detection', 'demo-bcbs-001'),
  ('app-actuarial', 'Actuarial System', 'On-Premise', 'CFO', 'Medium', 'Pricing and reserving platform', 'demo-bcbs-001'),
  ('app-edw', 'Enterprise Data Warehouse', 'Database', 'CIO', 'Critical', 'Central data repository', 'demo-bcbs-001'),
  ('app-pbm', 'PBM Platform', 'SaaS', 'CMO', 'High', 'Pharmacy benefits management', 'demo-bcbs-001'),
  ('app-compliance', 'Compliance System', 'Web Application', 'CLO', 'Medium', 'Compliance and audit tracking', 'demo-bcbs-001'),
  ('app-crm', 'CRM System', 'SaaS', 'CXO', 'Medium', 'Constituent relationship management', 'demo-bcbs-001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- After running this seed, you should have:
-- - 15 Assets (including NASCO, HealthEdge, Genesys worked examples)
-- - 15 Applications linked to assets
-- - All assets linked to business processes from T-108
-- ============================================================================

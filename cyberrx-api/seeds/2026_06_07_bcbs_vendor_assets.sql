-- BCBS State-Specific Vendor Assets
-- Seed Date: 2026-06-07
-- Description: Creates 24 vendor assets (8 per state) across 3 BCBS organizations

-- ========================================
-- MASSACHUSETTS VENDOR ASSETS (8 assets)
-- ========================================

-- 1. TriZetto Facets - Claims Processing
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-mass-trizetto',
  'TriZetto Facets - Claims Processing',
  'app',
  'bcbs-mass-001',
  'facets-prod.bcbs-ma.internal',
  '10.40.20.150',
  'CIO-Applications',
  'Core claims adjudication platform for commercial lines. Processes 500K claims/month.',
  '["claims", "payment_integrity"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  72
)
ON CONFLICT (id) DO NOTHING;

-- 2. HealthEdge - Enrollment & Eligibility
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-mass-healthedge',
  'HealthEdge - Enrollment & Eligibility',
  'app',
  'bcbs-mass-001',
  'healthedge-prod.bcbs-ma.internal',
  '10.40.20.151',
  'CIO-MedicareOperations',
  'Medicare Advantage enrollment and eligibility platform. Real-time CMS integration.',
  '["enrollment", "eligibility", "medicare"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  68
)
ON CONFLICT (id) DO NOTHING;

-- 3. Cotiviti - Analytics Platform
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-mass-cotiviti',
  'Cotiviti - Payment Integrity Analytics',
  'app',
  'bcbs-mass-001',
  'analytics.bcbs-ma.internal',
  '10.40.20.152',
  'CIO-Analytics',
  'Payment integrity, claims analytics, and fraud detection platform. AI-driven pattern recognition.',
  '["payment_integrity", "fraud_detection"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  65
)
ON CONFLICT (id) DO NOTHING;

-- 4. Zelis - Payment Platform
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-mass-zelis',
  'Zelis - Payment Processing',
  'app',
  'bcbs-mass-001',
  'payments.bcbs-ma.internal',
  '10.40.20.153',
  'CFO-Finance',
  'Provider payment processing and settlement platform. ACH and EFT integration.',
  '["payment_integrity", "payment_processing"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  70
)
ON CONFLICT (id) DO NOTHING;

-- 5. Salesforce Health Cloud - CRM
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-mass-salesforce',
  'Salesforce Health Cloud - Member Services',
  'app',
  'bcbs-mass-001',
  'bcbs-ma.my.salesforce.com',
  '10.40.20.154',
  'CIO-MemberServices',
  'Member services CRM, call center platform, care management coordination.',
  '["member_services", "care_management"]'::jsonb,
  '["PHI", "PII"]'::jsonb,
  58
)
ON CONFLICT (id) DO NOTHING;

-- 6. Change Healthcare - Clearinghouse
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-mass-changehc',
  'Change Healthcare - Clearinghouse',
  'app',
  'bcbs-mass-001',
  'clearinghouse.changehealthcare.com',
  '10.40.20.155',
  'CIO-ClaimsOperations',
  'Claims clearinghouse for electronic data interchange (EDI) with providers and payers.',
  '["claims", "clearinghouse"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  75
)
ON CONFLICT (id) DO NOTHING;

-- 7. Kyruus - Provider Directory
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-mass-kyruus',
  'Kyruus - Provider Directory & Scheduling',
  'app',
  'bcbs-mass-001',
  'providerdirectory.bcbs-ma.internal',
  '10.40.20.156',
  'CIO-ProviderNetwork',
  'Provider directory management and patient scheduling platform. Integrated with Health Cloud.',
  '["provider_network", "member_services"]'::jsonb,
  '["PHI", "PII"]'::jsonb,
  52
)
ON CONFLICT (id) DO NOTHING;

-- 8. CAQH - Provider Credentials
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-mass-caqh',
  'CAQH - Provider Credentialing',
  'app',
  'bcbs-mass-001',
  'credentials.caqh.org',
  '10.40.20.157',
  'CIO-ProviderNetwork',
  'Provider credentialing and privileging platform. Real-time license verification.',
  '["provider_credentialing"]'::jsonb,
  '["PII", "Professional Credentials"]'::jsonb,
  48
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- TEXAS VENDOR ASSETS (8 assets)
-- ========================================

-- 1. QNXT - Medicaid Claims
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-texas-qnxt',
  'QNXT - Medicaid Claims Processing',
  'app',
  'bcbs-texas-001',
  'qnxt-medicaid.bcbs-tx.internal',
  '10.50.20.150',
  'CIO-MedicaidOperations',
  'Texas Medicaid STAR and CHIP claims adjudication. HHSC compliance and reporting.',
  '["claims", "medicaid"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  74
)
ON CONFLICT (id) DO NOTHING;

-- 2. FACETS - Commercial Claims
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-texas-facets',
  'FACETS - Commercial Claims Processing',
  'app',
  'bcbs-texas-001',
  'facets-commercial.bcbs-tx.internal',
  '10.50.20.151',
  'CIO-ClaimsOperations',
  'Commercial and Medicare Advantage claims processing platform.',
  '["claims", "payment_integrity"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  71
)
ON CONFLICT (id) DO NOTHING;

-- 3. HealthEdge - Enrollment
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-texas-healthedge',
  'HealthEdge - Enrollment & Eligibility',
  'app',
  'bcbs-texas-001',
  'healthedge.bcbs-tx.internal',
  '10.50.20.152',
  'CIO-Enrollment',
  'Medicare, Medicaid, and Commercial enrollment and eligibility platform.',
  '["enrollment", "eligibility"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  66
)
ON CONFLICT (id) DO NOTHING;

-- 4. Inovalon - Analytics
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-texas-inovalon',
  'Inovalon - Population Health Analytics',
  'app',
  'bcbs-texas-001',
  'analytics.bcbs-tx.internal',
  '10.50.20.153',
  'CIO-PopulationHealth',
  'Medicare STAR ratings, HEDIS measures, quality analytics, and risk adjustment.',
  '["population_health", "quality_measures"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  62
)
ON CONFLICT (id) DO NOTHING;

-- 5. Zelis - Payment Platform
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-texas-zelis',
  'Zelis - Payment Processing',
  'app',
  'bcbs-texas-001',
  'payments.bcbs-tx.internal',
  '10.50.20.154',
  'CFO-Finance',
  'Provider payment processing and settlement platform. Texas Medicaid EFT integration.',
  '["payment_integrity", "payment_processing"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  69
)
ON CONFLICT (id) DO NOTHING;

-- 6. Salesforce Health Cloud - CRM
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-texas-salesforce',
  'Salesforce Health Cloud - Member Services',
  'app',
  'bcbs-texas-001',
  'bcbs-tx.my.salesforce.com',
  '10.50.20.155',
  'CIO-MemberServices',
  'Member services CRM, call center platform (multi-language support for Texas).',
  '["member_services", "care_management"]'::jsonb,
  '["PHI", "PII"]'::jsonb,
  56
)
ON CONFLICT (id) DO NOTHING;

-- 7. Availity - Clearinghouse
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-texas-availity',
  'Availity - Clearinghouse & Portal',
  'app',
  'bcbs-texas-001',
  'portal.availity.com',
  '10.50.20.156',
  'CIO-ProviderNetwork',
  'Claims clearinghouse and provider portal. Real-time eligibility and claims status.',
  '["claims", "clearinghouse"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  73
)
ON CONFLICT (id) DO NOTHING;

-- 8. Benefitfocus - Benefits Administration
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-texas-benefitfocus',
  'Benefitfocus - Benefits Administration',
  'app',
  'bcbs-texas-001',
  'benefits.bcbs-tx.internal',
  '10.50.20.157',
  'CIO-GroupOperations',
  'Group and employer benefits administration platform. ACA reporting.',
  '["enrollment", "benefits_administration"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  54
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VIRGINIA VENDOR ASSETS (8 assets)
-- ========================================

-- 1. Change Healthcare - Claims Gateway
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-va-changehc',
  'Change Healthcare - Claims Gateway',
  'app',
  'bcbs-virginia-001',
  'gateway.changehealthcare.com',
  '10.60.20.150',
  'CIO-ClaimsOperations',
  'Multi-state (DC/VA/MD) claims gateway and clearinghouse. FEP processing.',
  '["claims", "clearinghouse", "fep"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  76
)
ON CONFLICT (id) DO NOTHING;

-- 2. HealthEdge - Enrollment
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-va-healthedge',
  'HealthEdge - Enrollment & Eligibility',
  'app',
  'bcbs-virginia-001',
  'healthedge.bcbs-va.internal',
  '10.60.20.151',
  'CIO-Enrollment',
  'Medicare and Commercial enrollment. Multi-state eligibility platform.',
  '["enrollment", "eligibility", "fep"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  67
)
ON CONFLICT (id) DO NOTHING;

-- 3. Cotiviti - Analytics
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-va-cotiviti',
  'Cotiviti - Payment Integrity Analytics',
  'app',
  'bcbs-virginia-001',
  'analytics.bcbs-va.internal',
  '10.60.20.152',
  'CIO-PaymentIntegrity',
  'Payment integrity and fraud detection. Mid-Atlantic region coordination.',
  '["payment_integrity", "fraud_detection"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  64
)
ON CONFLICT (id) DO NOTHING;

-- 4. Zelis - Payment Platform
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-va-zelis',
  'Zelis - Payment Processing',
  'app',
  'bcbs-virginia-001',
  'payments.bcbs-va.internal',
  '10.60.20.153',
  'CFO-Finance',
  'Provider payment processing. Multi-state settlement (DC/VA/MD).',
  '["payment_integrity", "payment_processing"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  68
)
ON CONFLICT (id) DO NOTHING;

-- 5. Salesforce Service Cloud - CRM
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-va-salesforce',
  'Salesforce Service Cloud - Member Services',
  'app',
  'bcbs-virginia-001',
  'bcbs-va.my.salesforce.com',
  '10.60.20.154',
  'CIO-MemberServices',
  'Member services CRM and contact center platform. FEP member support.',
  '["member_services", "fep"]'::jsonb,
  '["PHI", "PII"]'::jsonb,
  57
)
ON CONFLICT (id) DO NOTHING;

-- 6. Availity - Provider Portal
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-va-availity',
  'Availity - Provider Portal',
  'app',
  'bcbs-virginia-001',
  'portal.availity.com',
  '10.60.20.155',
  'CIO-ProviderNetwork',
  'Provider portal and clearinghouse. Multi-state provider verification.',
  '["provider_network", "clearinghouse"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  59
)
ON CONFLICT (id) DO NOTHING;

-- 7. HealthSherpa - Marketplace Enrollment
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-va-healthsherpa',
  'HealthSherpa - Marketplace Enrollment',
  'app',
  'bcbs-virginia-001',
  'enroll.healthsherpa.com',
  '10.60.20.156',
  'CIO-Marketplace',
  'Virginia ACA Marketplace enrollment platform. Direct CMS integration.',
  '["enrollment", "marketplace"]'::jsonb,
  '["PHI", "PII", "Financial"]'::jsonb,
  51
)
ON CONFLICT (id) DO NOTHING;

-- 8. Modio Health - Provider Data
INSERT INTO assets (
  id, name, type, organization_id,
  hostname, ip_address, owner, description,
  business_process_ids, data_classification, risk_score
) VALUES (
  'asset-va-modio',
  'Modio Health - Provider Data Management',
  'app',
  'bcbs-virginia-001',
  'providerdata.bcbs-va.internal',
  '10.60.20.157',
  'CIO-ProviderNetwork',
  'Provider data management and directory platform. Multi-state coordination.',
  '["provider_network", "credentialing"]'::jsonb,
  '["PII", "Professional Credentials"]'::jsonb,
  49
)
ON CONFLICT (id) DO NOTHING;

-- Verification Query:
-- SELECT organization_id, COUNT(*) FROM assets WHERE organization_id LIKE 'bcbs-%' GROUP BY organization_id;

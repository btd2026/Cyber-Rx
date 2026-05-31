-- BCBS Vendor Ecosystem
-- Seed Date: 2026-06-15
-- Description: Creates 50 realistic BCBS vendors with complete risk profiles, contract data, and process mappings

-- ========================================
-- CRITICAL TIER VENDORS (10 vendors)
-- ========================================

-- 1. NASCO (Claims Processing) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-nasco-001',
  'NASCO',
  'Critical',
  'High',
  'Claims Processing',
  'bcbs-mass-001',
  '["claims", "payment_integrity"]'::jsonb,
  25000000.00,
  '2027-12-31',
  'Core claims processing platform for BCBS organizations. Processes 10M+ claims monthly.',
  'enterprise.contracts@nasco.com',
  '1-800-555-0101',
  'https://www.nasco.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  75,
  85
) ON CONFLICT (id) DO NOTHING;

-- 2. Change Healthcare (Clearinghouse) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-changehc-002',
  'Change Healthcare',
  'Critical',
  'Critical',
  'Clearinghouse',
  'bcbs-mass-001',
  '["claims", "clearinghouse"]'::jsonb,
  18000000.00,
  '2027-06-30',
  'National claims clearinghouse and EDI network. Processes 15B transactions annually.',
  'contracts@changehealthcare.com',
  '1-800-555-0102',
  'https://www.changehealthcare.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  65,
  80
) ON CONFLICT (id) DO NOTHING;

-- 3. Optum (Analytics) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-optum-003',
  'Optum',
  'Critical',
  'Medium',
  'Analytics',
  'bcbs-mass-001',
  '["payment_integrity", "fraud_detection", "analytics"]'::jsonb,
  22000000.00,
  '2028-03-31',
  'Data analytics, payment integrity, and care management platform. 500M+ records managed.',
  'enterprise@optum.com',
  '1-800-555-0103',
  'https://www.optum.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  80,
  85
) ON CONFLICT (id) DO NOTHING;

-- 4. Epic Systems (EHR) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-epic-004',
  'Epic Systems',
  'Critical',
  'Medium',
  'EHR',
  'bcbs-mass-001',
  '["enrollment", "eligibility", "care_management"]'::jsonb,
  35000000.00,
  '2029-12-31',
  'Electronic health records and care coordination platform. 500+ hospitals.',
  'contracts@epic.com',
  '1-800-555-0104',
  'https://www.epic.com',
  '["PHI", "PII"]'::jsonb,
  85,
  90
) ON CONFLICT (id) DO NOTHING;

-- 5. Cerner (EHR) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-cerner-005',
  'Cerner',
  'Critical',
  'Medium',
  'EHR',
  'bcbs-mass-001',
  '["enrollment", "eligibility", "care_management"]'::jsonb,
  28000000.00,
  '2028-09-30',
  'Electronic health records and population health management platform.',
  'enterprise@cerner.com',
  '1-800-555-0105',
  'https://www.cerner.com',
  '["PHI", "PII"]'::jsonb,
  82,
  88
) ON CONFLICT (id) DO NOTHING;

-- 6. TriZetto (Claims) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-trizetto-006',
  'TriZetto',
  'Critical',
  'High',
  'Claims Processing',
  'bcbs-mass-001',
  '["claims", "payment_integrity"]'::jsonb,
  15000000.00,
  '2027-09-30',
  'Claims adjudication and payment integrity platform. FACETS and QNXT systems.',
  'sales@trizetto.com',
  '1-800-555-0106',
  'https://www.trizetto.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  72,
  82
) ON CONFLICT (id) DO NOTHING;

-- 7. IBM (Cloud/Mainframe) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-ibm-007',
  'IBM',
  'Critical',
  'Low',
  'Cloud Infrastructure',
  'bcbs-mass-001',
  '["claims", "enrollment", "payment_integrity"]'::jsonb,
  42000000.00,
  '2029-06-30',
  'Mainframe and cloud infrastructure hosting. Core systems hosting for BCBS.',
  'enterprise@ibm.com',
  '1-800-555-0107',
  'https://www.ibm.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  88,
  92
) ON CONFLICT (id) DO NOTHING;

-- 8. Microsoft (Azure/O365) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-microsoft-008',
  'Microsoft',
  'Critical',
  'Low',
  'Cloud & Productivity',
  'bcbs-mass-001',
  '["member_services", "care_management", "fraud_detection"]'::jsonb,
  38000000.00,
  '2028-12-31',
  'Azure cloud hosting and Office 365 productivity suite. 10,000+ users.',
  'enterprise@microsoft.com',
  '1-800-555-0108',
  'https://www.microsoft.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  90,
  95
) ON CONFLICT (id) DO NOTHING;

-- 9. Salesforce (CRM) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-salesforce-009',
  'Salesforce',
  'Critical',
  'Low',
  'CRM',
  'bcbs-mass-001',
  '["member_services", "care_management", "provider_network"]'::jsonb,
  12000000.00,
  '2028-06-30',
  'Health Cloud CRM for member services and care management.',
  'healthcloud@salesforce.com',
  '1-800-555-0109',
  'https://www.salesforce.com/healthcloud',
  '["PHI", "PII"]'::jsonb,
  86,
  90
) ON CONFLICT (id) DO NOTHING;

-- 10. Amazon Web Services (Cloud) - Critical Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-aws-010',
  'Amazon Web Services',
  'Critical',
  'Low',
  'Cloud Infrastructure',
  'bcbs-mass-001',
  '["claims", "enrollment", "analytics"]'::jsonb,
  25000000.00,
  '2029-03-31',
  'AWS cloud infrastructure for web applications and analytics. HIPAA compliant.',
  'enterprise@aws.amazon.com',
  '1-800-555-0110',
  'https://aws.amazon.com/health',
  '["PHI", "PII", "Financial"]'::jsonb,
  92,
  94
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- HIGH TIER VENDORS (15 vendors)
-- ========================================

-- 11. PharmMD (Pharmacy) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-pharmmd-011',
  'PharmMD',
  'High',
  'Medium',
  'Pharmacy Benefits',
  'bcbs-mass-001',
  '["claims", "payment_integrity"]'::jsonb,
  8500000.00,
  '2027-12-31',
  'Pharmacy benefit management and claims processing platform.',
  'info@pharmmd.com',
  '1-800-555-0111',
  'https://www.pharmmd.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  78,
  84
) ON CONFLICT (id) DO NOTHING;

-- 12. Nordisk (Pharmacy) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-nordisk-012',
  'Novo Nordisk',
  'High',
  'Low',
  'Pharmaceutical',
  'bcbs-mass-001',
  '["payment_integrity", "care_management"]'::jsonb,
  12000000.00,
  '2028-06-30',
  'Pharmaceutical supplier for specialty medications and diabetes care.',
  'us@novonordisk.com',
  '1-800-555-0112',
  'https://www.novonordisk.com',
  '["PHI", "Financial"]'::jsonb,
  85,
  90
) ON CONFLICT (id) DO NOTHING;

-- 13. Cotiviti (Analytics) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-cotiviti-013',
  'Cotiviti',
  'High',
  'Medium',
  'Payment Integrity',
  'bcbs-mass-001',
  '["payment_integrity", "fraud_detection"]'::jsonb,
  9500000.00,
  '2027-09-30',
  'Payment integrity analytics and claims auditing platform.',
  'contracts@cotiviti.com',
  '1-800-555-0113',
  'https://www.cotiviti.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  76,
  83
) ON CONFLICT (id) DO NOTHING;

-- 14. Zelis (Payments) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-zelis-014',
  'Zelis',
  'High',
  'Medium',
  'Payment Processing',
  'bcbs-mass-001',
  '["payment_integrity", "payment_processing"]'::jsonb,
  7200000.00,
  '2027-06-30',
  'Provider payment processing and settlement platform.',
  'info@zelis.com',
  '1-800-555-0114',
  'https://www.zelis.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  74,
  82
) ON CONFLICT (id) DO NOTHING;

-- 15. HealthEdge (Enrollment) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-healthedge-015',
  'HealthEdge',
  'High',
  'Medium',
  'Enrollment Platform',
  'bcbs-mass-001',
  '["enrollment", "eligibility"]'::jsonb,
  8800000.00,
  '2028-03-31',
  'Health insurance enrollment and eligibility platform. GuidingCare solution.',
  'sales@healthedge.com',
  '1-800-555-0115',
  'https://www.healthedge.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  79,
  85
) ON CONFLICT (id) DO NOTHING;

-- 16. Kyruus (Provider Directory) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-kyruus-016',
  'Kyruus',
  'High',
  'Low',
  'Provider Network',
  'bcbs-mass-001',
  '["provider_network", "member_services"]'::jsonb,
  4500000.00,
  '2027-12-31',
  'Provider directory management and patient scheduling platform.',
  'info@kyruus.com',
  '1-800-555-0116',
  'https://www.kyruus.com',
  '["PHI", "PII"]'::jsonb,
  84,
  88
) ON CONFLICT (id) DO NOTHING;

-- 17. CAQH (Credentialing) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-caqh-017',
  'CAQH',
  'High',
  'Low',
  'Provider Credentialing',
  'bcbs-mass-001',
  '["provider_credentialing", "provider_network"]'::jsonb,
  3200000.00,
  '2028-06-30',
  'Provider credentialing and privileging platform. CORE system.',
  'support@caqh.org',
  '1-800-555-0117',
  'https://www.caqh.org',
  '["PII", "Professional Credentials"]'::jsonb,
  82,
  86
) ON CONFLICT (id) DO NOTHING;

-- 18. Inovalon (Analytics) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-inovalon-018',
  'Inovalon',
  'High',
  'Medium',
  'Population Health',
  'bcbs-mass-001',
  '["population_health", "quality_measures"]'::jsonb,
  6800000.00,
  '2027-09-30',
  'Population health analytics, Medicare STAR ratings, and HEDIS measures.',
  'contracts@inovalon.com',
  '1-800-555-0118',
  'https://www.inovalon.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  75,
  81
) ON CONFLICT (id) DO NOTHING;

-- 19. Availity (Clearinghouse) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-availity-019',
  'Availity',
  'High',
  'Medium',
  'Clearinghouse',
  'bcbs-mass-001',
  '["claims", "clearinghouse"]'::jsonb,
  5900000.00,
  '2027-12-31',
  'Claims clearinghouse and provider portal. Real-time eligibility.',
  'info@availity.com',
  '1-800-555-0119',
  'https://www.availity.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  77,
  84
) ON CONFLICT (id) DO NOTHING;

-- 20. Benefitfocus (Benefits) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-benefitfocus-020',
  'Benefitfocus',
  'High',
  'Low',
  'Benefits Administration',
  'bcbs-mass-001',
  '["enrollment", "benefits_administration"]'::jsonb,
  4200000.00,
  '2028-03-31',
  'Group and employer benefits administration platform. ACA reporting.',
  'sales@benefitfocus.com',
  '1-800-555-0120',
  'https://www.benefitfocus.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  83,
  87
) ON CONFLICT (id) DO NOTHING;

-- 21. HealthGrades (Quality) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-healthgrades-021',
  'HealthGrades',
  'High',
  'Low',
  'Quality Reporting',
  'bcbs-mass-001',
  '["care_management", "quality_measures"]'::jsonb,
  2800000.00,
  '2027-06-30',
  'Healthcare quality reporting and provider ratings platform.',
  'info@healthgrades.com',
  '1-800-555-0121',
  'https://www.healthgrades.com',
  '["PHI", "PII"]'::jsonb,
  80,
  85
) ON CONFLICT (id) DO NOTHING;

-- 22. LexisNexis (Risk Scoring) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-lexisnexis-022',
  'LexisNexis',
  'High',
  'Medium',
  'Risk Analytics',
  'bcbs-mass-001',
  '["fraud_detection", "payment_integrity"]'::jsonb,
  5500000.00,
  '2028-09-30',
  'Fraud detection and risk scoring platform for claims.',
  'risk.solutions@lexisnexis.com',
  '1-800-555-0122',
  'https://www.lexisnexis.com/risk',
  '["PHI", "PII", "Financial"]'::jsonb,
  76,
  83
) ON CONFLICT (id) DO NOTHING;

-- 23. Experian (Identity) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-experian-023',
  'Experian',
  'High',
  'Medium',
  'Identity Verification',
  'bcbs-mass-001',
  '["enrollment", "member_services"]'::jsonb,
  4100000.00,
  '2027-12-31',
  'Identity verification and fraud prevention for member enrollment.',
  'healthcare@experian.com',
  '1-800-555-0123',
  'https://www.experian.com/healthcare',
  '["PII", "Financial"]'::jsonb,
  78,
  85
) ON CONFLICT (id) DO NOTHING;

-- 24. Palo Alto Networks (Security) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-paloalto-024',
  'Palo Alto Networks',
  'High',
  'Low',
  'Cybersecurity',
  'bcbs-mass-001',
  '["fraud_detection", "claims"]'::jsonb,
  3600000.00,
  '2028-06-30',
  'Next-generation firewall and network security platform.',
  'healthcare@paloaltonetworks.com',
  '1-800-555-0124',
  'https://www.paloaltonetworks.com/healthcare',
  '[]'::jsonb,
  90,
  92
) ON CONFLICT (id) DO NOTHING;

-- 25. CrowdStrike (Security) - High Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-crowdstrike-025',
  'CrowdStrike',
  'High',
  'Low',
  'Endpoint Security',
  'bcbs-mass-001',
  '["fraud_detection", "payment_integrity"]'::jsonb,
  3200000.00,
  '2028-03-31',
  'Endpoint detection and response (EDR) platform. 15,000+ endpoints.',
  'sales@crowdstrike.com',
  '1-800-555-0125',
  'https://www.crowdstrike.com/healthcare',
  '[]'::jsonb,
  88,
  90
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- MEDIUM TIER VENDORS (15 vendors)
-- ========================================

-- 26. Okta (Identity) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-okta-026',
  'Okta',
  'Medium',
  'Low',
  'Identity Management',
  'bcbs-mass-001',
  '["member_services", "provider_network"]'::jsonb,
  2800000.00,
  '2028-09-30',
  'Single sign-on (SSO) and identity management platform.',
  'enterprise@okta.com',
  '1-800-555-0126',
  'https://www.okta.com/healthcare',
  '["PII"]'::jsonb,
  86,
  90
) ON CONFLICT (id) DO NOTHING;

-- 27. Snowflake (Data Warehouse) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-snowflake-027',
  'Snowflake',
  'Medium',
  'Low',
  'Data Analytics',
  'bcbs-mass-001',
  '["analytics", "fraud_detection"]'::jsonb,
  2400000.00,
  '2028-06-30',
  'Cloud data warehouse for analytics and reporting.',
  'healthcare@snowflake.com',
  '1-800-555-0127',
  'https://www.snowflake.com/healthcare',
  '["PHI", "PII"]'::jsonb,
  84,
  88
) ON CONFLICT (id) DO NOTHING;

-- 28. Tableau (Analytics) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-tableau-028',
  'Tableau',
  'Medium',
  'Low',
  'Data Visualization',
  'bcbs-mass-001',
  '["analytics", "population_health"]'::jsonb,
  1900000.00,
  '2027-12-31',
  'Business intelligence and data visualization platform.',
  'healthcare@tableau.com',
  '1-800-555-0128',
  'https://www.tableau.com/healthcare',
  '["PHI", "PII"]'::jsonb,
  82,
  86
) ON CONFLICT (id) DO NOTHING;

-- 29. ServiceNow (ITSM) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-servicenow-029',
  'ServiceNow',
  'Medium',
  'Low',
  'IT Service Management',
  'bcbs-mass-001',
  '["care_management", "provider_network"]'::jsonb,
  3100000.00,
  '2028-03-31',
  'IT service management and workflow automation platform.',
  'healthcare@servicenow.com',
  '1-800-555-0129',
  'https://www.servicenow.com/healthcare',
  '["PHI", "PII"]'::jsonb,
  85,
  89
) ON CONFLICT (id) DO NOTHING;

-- 30. Twilio (Communications) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-twilio-030',
  'Twilio',
  'Medium',
  'Medium',
  'Communications',
  'bcbs-mass-001',
  '["member_services", "care_management"]'::jsonb,
  1500000.00,
  '2027-09-30',
  'SMS and voice communications for member engagement.',
  'healthcare@twilio.com',
  '1-800-555-0130',
  'https://www.twilio.com/healthcare',
  '["PHI", "PII"]'::jsonb,
  80,
  84
) ON CONFLICT (id) DO NOTHING;

-- 31. DocuSign (Signatures) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-docusign-031',
  'DocuSign',
  'Medium',
  'Low',
  'Document Management',
  'bcbs-mass-001',
  '["enrollment", "provider_credentialing"]'::jsonb,
  1200000.00,
  '2028-06-30',
  'Electronic signature and document management platform.',
  'healthcare@docusign.com',
  '1-800-555-0131',
  'https://www.docusign.com/healthcare',
  '["PII", "Legal"]'::jsonb,
  83,
  87
) ON CONFLICT (id) DO NOTHING;

-- 32. Box (Content Management) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-box-032',
  'Box',
  'Medium',
  'Medium',
  'Content Management',
  'bcbs-mass-001',
  '["care_management", "provider_network"]'::jsonb,
  1800000.00,
  '2027-12-31',
  'Cloud content management and file sharing platform. HIPAA compliant.',
  'healthcare@box.com',
  '1-800-555-0132',
  'https://www.box.com/healthcare',
  '["PHI", "PII"]'::jsonb,
  78,
  82
) ON CONFLICT (id) DO NOTHING;

-- 33. Zoom (Telehealth) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-zoom-033',
  'Zoom',
  'Medium',
  'Low',
  'Telehealth',
  'bcbs-mass-001',
  '["care_management"]'::jsonb,
  2100000.00,
  '2028-09-30',
  'Video conferencing platform for telehealth services. HIPAA compliant.',
  'healthcare@zoom.us',
  '1-800-555-0133',
  'https://zoom.us/healthcare',
  '["PHI", "PII"]'::jsonb,
  81,
  85
) ON CONFLICT (id) DO NOTHING;

-- 34. Teladoc (Telehealth) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-teladoc-034',
  'Teladoc',
  'Medium',
  'Low',
  'Telehealth',
  'bcbs-mass-001',
  '["care_management", "member_services"]'::jsonb,
  2600000.00,
  '2028-03-31',
  'Virtual care and telemedicine platform. 24/7 doctor access.',
  'partners@teladoc.com',
  '1-800-555-0134',
  'https://www.teladoc.com',
  '["PHI", "PII"]'::jsonb,
  82,
  86
) ON CONFLICT (id) DO NOTHING;

-- 35. Accolade (Care Management) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-accolade-035',
  'Accolade',
  'Medium',
  'Low',
  'Care Management',
  'bcbs-mass-001',
  '["care_management", "member_services"]'::jsonb,
  2300000.00,
  '2027-12-31',
  'Personalized healthcare advocacy and care navigation platform.',
  'contracts@accolade.com',
  '1-800-555-0135',
  'https://www.accolade.com',
  '["PHI", "PII"]'::jsonb,
  80,
  84
) ON CONFLICT (id) DO NOTHING;

-- 36. Grand Rounds (Care) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-grandrounds-036',
  'Grand Rounds',
  'Medium',
  'Low',
  'Care Management',
  'bcbs-mass-001',
  '["care_management", "member_services"]'::jsonb,
  2000000.00,
  '2028-06-30',
  'Expert medical opinions and care navigation platform.',
  'enterprise@grandrounds.com',
  '1-800-555-0136',
  'https://www.grandrounds.com',
  '["PHI", "PII"]'::jsonb,
  79,
  83
) ON CONFLICT (id) DO NOTHING;

-- 37. CVS Caremark (Pharmacy) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-caremark-037',
  'CVS Caremark',
  'Medium',
  'Low',
  'Pharmacy Benefits',
  'bcbs-mass-001',
  '["claims", "payment_integrity"]'::jsonb,
  5800000.00,
  '2028-09-30',
  'Pharmacy benefit management and mail order pharmacy.',
  'plans@caremark.com',
  '1-800-555-0137',
  'https://www.caremark.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  84,
  88
) ON CONFLICT (id) DO NOTHING;

-- 38. Express Scripts (Pharmacy) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-expressscripts-038',
  'Express Scripts',
  'Medium',
  'Low',
  'Pharmacy Benefits',
  'bcbs-mass-001',
  '["claims", "payment_integrity"]'::jsonb,
  6200000.00,
  '2028-12-31',
  'Pharmacy benefit management and specialty pharmacy.',
  'accounts@express-scripts.com',
  '1-800-555-0138',
  'https://www.express-scripts.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  83,
  87
) ON CONFLICT (id) DO NOTHING;

-- 39. McGraw Hill (Education) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-mcgrawhill-039',
  'McGraw Hill',
  'Medium',
  'Low',
  'Member Education',
  'bcbs-mass-001',
  '["member_services", "care_management"]'::jsonb,
  1100000.00,
  '2027-09-30',
  'Health education content and member communication platform.',
  'healthcare@mheducation.com',
  '1-800-555-0139',
  'https://www.mheducation.com/healthcare',
  '["PII"]'::jsonb,
  80,
  84
) ON CONFLICT (id) DO NOTHING;

-- 40. WebMD (Education) - Medium Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-webmd-040',
  'WebMD',
  'Medium',
  'Low',
  'Health Education',
  'bcbs-mass-001',
  '["member_services", "care_management"]'::jsonb,
  1300000.00,
  '2028-03-31',
  'Health education content and symptom checker platform.',
  'licensing@webmd.com',
  '1-800-555-0140',
  'https://www.webmd.com',
  '["PII"]'::jsonb,
  81,
  85
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- LOW TIER VENDORS (10 vendors)
-- ========================================

-- 41. HealthSherpa (Marketplace) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-healthsherpa-041',
  'HealthSherpa',
  'Low',
  'Low',
  'Marketplace Enrollment',
  'bcbs-mass-001',
  '["enrollment", "marketplace"]'::jsonb,
  750000.00,
  '2027-06-30',
  'ACA marketplace enrollment platform and shopping tool.',
  'partners@healthsherpa.com',
  '1-800-555-0141',
  'https://www.healthsherpa.com',
  '["PHI", "PII", "Financial"]'::jsonb,
  78,
  82
) ON CONFLICT (id) DO NOTHING;

-- 42. Modio Health (Provider Data) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-modio-042',
  'Modio Health',
  'Low',
  'Low',
  'Provider Data',
  'bcbs-mass-001',
  '["provider_network", "credentialing"]'::jsonb,
  820000.00,
  '2027-12-31',
  'Provider data management and directory platform.',
  'info@modiohealth.com',
  '1-800-555-0142',
  'https://www.modiohealth.com',
  '["PII", "Professional Credentials"]'::jsonb,
  79,
  83
) ON CONFLICT (id) DO NOTHING;

-- 43. Qualtrics (Surveys) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-qualtrics-043',
  'Qualtrics',
  'Low',
  'Low',
  'Member Surveys',
  'bcbs-mass-001',
  '["member_services", "care_management"]'::jsonb,
  680000.00,
  '2028-09-30',
  'Member satisfaction surveys and experience management.',
  'healthcare@qualtrics.com',
  '1-800-555-0143',
  'https://www.qualtrics.com/healthcare',
  '["PII"]'::jsonb,
  80,
  84
) ON CONFLICT (id) DO NOTHING;

-- 44. SurveyMonkey (Surveys) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-surveymonkey-044',
  'SurveyMonkey',
  'Low',
  'Low',
  'Member Surveys',
  'bcbs-mass-001',
  '["member_services"]'::jsonb,
  520000.00,
  '2027-09-30',
  'Member satisfaction and feedback surveys.',
  'enterprise@surveymonkey.com',
  '1-800-555-0144',
  'https://www.surveymonkey.com/enterprise',
  '["PII"]'::jsonb,
  77,
  81
) ON CONFLICT (id) DO NOTHING;

-- 45. Adobe (Document Management) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-adobe-045',
  'Adobe',
  'Low',
  'Low',
  'Document Management',
  'bcbs-mass-001',
  '["enrollment", "member_services"]'::jsonb,
  950000.00,
  '2028-06-30',
  'Document management and PDF generation platform.',
  'healthcare@adobe.com',
  '1-800-555-0145',
  'https://www.adobe.com/healthcare',
  '["PHI", "PII"]'::jsonb,
  82,
  86
) ON CONFLICT (id) DO NOTHING;

-- 46. Google Workspace (Productivity) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-google-046',
  'Google',
  'Low',
  'Low',
  'Productivity',
  'bcbs-mass-001',
  '["member_services", "provider_network"]'::jsonb,
  1800000.00,
  '2028-12-31',
  'Gmail, Google Drive, and Google Meet for collaboration.',
  'enterprise@google.com',
  '1-800-555-0146',
  'https://workspace.google.com/healthcare',
  '["PHI", "PII"]'::jsonb,
  84,
  88
) ON CONFLICT (id) DO NOTHING;

-- 47. Slack (Collaboration) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-slack-047',
  'Slack',
  'Low',
  'Low',
  'Team Collaboration',
  'bcbs-mass-001',
  '["care_management", "member_services"]'::jsonb,
  780000.00,
  '2027-12-31',
  'Team collaboration and messaging platform.',
  'healthcare@slack.com',
  '1-800-555-0147',
  'https://slack.com/healthcare',
  '["PHI", "PII"]'::jsonb,
  79,
  83
) ON CONFLICT (id) DO NOTHING;

-- 48. Asana (Project Management) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-asana-048',
  'Asana',
  'Low',
  'Low',
  'Project Management',
  'bcbs-mass-001',
  '["care_management", "provider_network"]'::jsonb,
  480000.00,
  '2028-06-30',
  'Project and task management platform.',
  'enterprise@asana.com',
  '1-800-555-0148',
  'https://asana.com/healthcare',
  '[]'::jsonb,
  80,
  84
) ON CONFLICT (id) DO NOTHING;

-- 49. Jira (Project Tracking) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-jira-049',
  'Jira',
  'Low',
  'Low',
  'Issue Tracking',
  'bcbs-mass-001',
  '["provider_network", "care_management"]'::jsonb,
  520000.00,
  '2027-09-30',
  'Issue tracking and project management platform.',
  'sales@atlassian.com',
  '1-800-555-0149',
  'https://www.atlassian.com/healthcare',
  '[]'::jsonb,
  78,
  82
) ON CONFLICT (id) DO NOTHING;

-- 50. GitHub (Code Repository) - Low Tier
INSERT INTO vendors (
  id, name, tier, risk_rating, category, organization_id,
  business_process_ids, contract_value, contract_expiry,
  description, contact_email, contact_phone, website,
  data_access, security_score, compliance_score
) VALUES (
  'vendor-github-050',
  'GitHub',
  'Low',
  'Low',
  'Development',
  'bcbs-mass-001',
  '["claims", "payment_integrity"]'::jsonb,
  380000.00,
  '2028-03-31',
  'Source code repository and DevSecOps platform.',
  'enterprise@github.com',
  '1-800-555-0150',
  'https://github.com/enterprise',
  '[]'::jsonb,
  81,
  85
) ON CONFLICT (id) DO NOTHING;

-- Verification Query:
-- SELECT tier, risk_rating, COUNT(*) FROM vendors GROUP BY tier, risk_rating ORDER BY tier, risk_rating;
-- SELECT category, COUNT(*) FROM vendors GROUP BY category ORDER BY COUNT DESC;

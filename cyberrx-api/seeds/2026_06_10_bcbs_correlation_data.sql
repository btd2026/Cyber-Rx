-- BCBS State-Specific Correlation Engine Data
-- Seed Date: 2026-06-10
-- Description: Creates business processes, legal obligations, and threat scenarios for 3 BCBS organizations

-- ========================================
-- MASSACHUSETTS BUSINESS PROCESSES (10 processes)
-- ========================================

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-medicare-advantage',
  'Medicare Advantage Program Management',
  'Primary',
  'Critical',
  'CIO-MedicareOperations',
  'bcbs-mass-001',
  'CMS Medicare Advantage program compliance, STAR ratings, HEDIS measures, RDMA validation.',
  '["asset-mass-healthedge", "asset-mass-trizetto", "asset-mass-cotiviti"]'::jsonb,
  '["MA Member Data", "HEDIS Quality Data", "RDMA Submission Data"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-provider-network',
  'Provider Network Management - Academic Partners',
  'Primary',
  'Critical',
  'CIO-ProviderNetwork',
  'bcbs-mass-001',
  'Academic medical center partnerships, provider contracting, credentialing, directory management.',
  '["asset-mass-kyruus", "asset-mass-caqh", "asset-mass-salesforce"]'::jsonb,
  '["Provider Contracts", "Credentialing Data", "Provider Directory"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-claims-commercial',
  'Claims Adjudication - Commercial Lines',
  'Primary',
  'Critical',
  'CIO-ClaimsOperations',
  'bcbs-mass-001',
  'Commercial claims processing, payment integrity, fraud detection for commercial lines.',
  '["asset-mass-trizetto", "asset-mass-cotiviti", "asset-mass-changehc"]'::jsonb,
  '["Claims Data", "Payment Data", "Fraud Alerts"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-enrollment-medicare',
  'Enrollment & Eligibility - Medicare',
  'Primary',
  'Critical',
  'CIO-MedicareOperations',
  'bcbs-mass-001',
  'Medicare Advantage enrollment, eligibility verification, CMS integration.',
  '["asset-mass-healthedge"]'::jsonb,
  '["Member Enrollment Data", "Eligibility Records", "CMS Submissions"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-care-management',
  'Care Management - Complex Cases',
  'Secondary',
  'High',
  'CIO-CareManagement',
  'bcbs-mass-001',
  'Complex case management, care coordination, academic medical center integration.',
  '["asset-mass-salesforce", "asset-mass-healthedge"]'::jsonb,
  '["Care Plans", "Case Notes", "Member Health Data"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-payment-integrity',
  'Payment Integrity - Commercial',
  'Primary',
  'High',
  'CIO-PaymentIntegrity',
  'bcbs-mass-001',
  'Commercial payment integrity, claims auditing, overpayment recovery.',
  '["asset-mass-cotiviti", "asset-mass-zelis"]'::jsonb,
  '["Audit Results", "Recovery Data", "Payment Adjustments"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-member-services',
  'Member Services - Call Center',
  'Secondary',
  'Medium',
  'CIO-MemberServices',
  'bcbs-mass-001',
  'Member call center, inquiries, grievance resolution, support services.',
  '["asset-mass-salesforce", "asset-mass-kyruus"]'::jsonb,
  '["Call Records", "Member Inquiries", "Grievance Data"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-pharmacy',
  'Pharmacy Benefit Management',
  'Secondary',
  'High',
  'CIO-Pharmacy',
  'bcbs-mass-001',
  'Pharmacy benefits, formulary management, claims processing, prior authorization.',
  '["asset-mass-trizetto", "asset-mass-changehc"]'::jsonb,
  '["Pharmacy Claims", "Formulary Data", "Prior Auth Records"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-government-programs',
  'Government Programs - CMS Region 1 Compliance',
  'Primary',
  'Critical',
  'CIO-GovernmentPrograms',
  'bcbs-mass-001',
  'CMS Region 1 compliance, Medicare program audits, regulatory submissions.',
  '["asset-mass-healthedge", "asset-mass-trizetto"]'::jsonb,
  '["CMS Compliance Data", "Audit Submissions", "Regulatory Reports"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-mass-compliance',
  'Compliance & Regulatory - MA DPH Privacy',
  'Primary',
  'Critical',
  'CISO',
  'bcbs-mass-001',
  'MA DPH privacy compliance (201 CMR 17.00), breach response, privacy impact assessments.',
  '["asset-mass-salesforce", "asset-mass-caqh"]'::jsonb,
  '["Compliance Reports", '::jsonb || '"PIA Documents", "Breach Records"]'::jsonb,
  '["Compliance Reports", "PIA Documents", "Breach Records"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- TEXAS BUSINESS PROCESSES (10 processes)
-- ========================================

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-medicaid',
  'Texas Medicaid Managed Care (STAR Program)',
  'Primary',
  'Critical',
  'CIO-MedicaidOperations',
  'bcbs-texas-001',
  'Texas Medicaid STAR and CHIP programs, HHSC compliance, quality measures.',
  '["asset-texas-qnxt", "asset-texas-healthedge", "asset-texas-inovalon"]'::jsonb,
  '["Medicaid Member Data", "STAR Quality Data", "HHSC Submissions"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-chip',
  'CHIP Administration',
  'Primary',
  'Critical',
  'CIO-MedicaidOperations',
  'bcbs-texas-001',
  'Children''s Health Insurance Program administration, eligibility, benefits.',
  '["asset-texas-qnxt", "asset-texas-healthedge"]'::jsonb,
  '["CHIP Member Data", "Eligibility Records", "CHIP Claims"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-dual-eligible',
  'Dual Eligible Coordination',
  'Primary',
  'Critical',
  'CIO-MedicareMedicaid',
  'bcbs-texas-001',
  'Medicare-Medicaid dual eligible coordination, MSP integration, financial alignment.',
  '["asset-texas-qnxt", "asset-texas-facets", "asset-texas-healthedge"]'::jsonb,
  '["Dual Eligible Data", "MSP Records", "Financial Alignment"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-claims-medicaid',
  'Claims Adjudication - Medicaid',
  'Primary',
  'Critical',
  'CIO-MedicaidOperations',
  'bcbs-texas-001',
  'Medicaid claims processing, TX Medicaid-specific rules, HHSC reporting.',
  '["asset-texas-qnxt", "asset-texas-availity"]'::jsonb,
  '["Medicaid Claims", "HHSC Reports", "Payment Data"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-claims-commercial',
  'Claims Adjudication - Commercial',
  'Primary',
  'Critical',
  'CIO-ClaimsOperations',
  'bcbs-texas-001',
  'Commercial and Medicare Advantage claims processing, payment integrity.',
  '["asset-texas-facets", "asset-texas-benefitfocus"]'::jsonb,
  '["Commercial Claims", "MA Claims", "Payment Data"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-provider-network',
  'Provider Network Management - Rural & Urban',
  'Primary',
  'Critical',
  'CIO-ProviderNetwork',
  'bcbs-texas-001',
  'Texas-wide provider network, rural health access, contracting, credentialing.',
  '["asset-texas-availity", "asset-texas-salesforce"]'::jsonb,
  '["Provider Contracts", "Credentialing Data", "Network Adequacy"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-care-management',
  'Care Management - High-Risk Medicaid',
  'Secondary',
  'High',
  'CIO-CareManagement',
  'bcbs-texas-001',
  'High-risk Medicaid care management, case management, health home integration.',
  '["asset-texas-salesforce", "asset-texas-inovalon"]'::jsonb,
  '["Care Plans", "Case Notes", "Health Outcomes"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-pharmacy',
  'Pharmacy Benefit Management - Medicaid Formulary',
  'Secondary',
  'High',
  'CIO-Pharmacy',
  'bcbs-texas-001',
  'Texas Medicaid pharmacy benefits, formulary management, prior authorization.',
  '["asset-texas-qnxt", "asset-texas-availity"]'::jsonb,
  '["Pharmacy Claims", "Formulary Data", "Prior Auth Records"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-government-programs',
  'Government Programs - Texas HHSC Compliance',
  'Primary',
  'Critical',
  'CIO-GovernmentPrograms',
  'bcbs-texas-001',
  'Texas HHSC compliance, Medicaid program audits, regulatory submissions.',
  '["asset-texas-qnxt", "asset-texas-healthedge"]'::jsonb,
  '["HHSC Compliance Data", "Medicaid Audits", "Regulatory Reports"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-texas-compliance',
  'Compliance & Regulatory - TX HB 300',
  'Primary',
  'Critical',
  'CISO',
  'bcbs-texas-001',
  'Texas HB 300 privacy compliance, breach notification, state-specific privacy requirements.',
  '["asset-texas-salesforce", "asset-texas-benefitfocus"]'::jsonb,
  '["TX HB 300 Compliance", "Breach Records", "PIA Documents"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VIRGINIA BUSINESS PROCESSES (10 processes)
-- ========================================

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-fep',
  'Federal Employee Program (FEP) Processing',
  'Primary',
  'Critical',
  'CIO-FEPOperations',
  'bcbs-virginia-001',
  'FEP claims processing, OPM compliance, multi-state (DC/VA/MD) coordination.',
  '["asset-va-changehc", "asset-va-healthedge"]'::jsonb,
  '["FEP Claims", "OPM Compliance Data", "FEP Member Data"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-medicare',
  'Medicare Advantage - Mid-Atlantic Region',
  'Primary',
  'Critical',
  'CIO-MedicareOperations',
  'bcbs-virginia-001',
  'Mid-Atlantic Medicare Advantage, CMS Region 3 compliance, STAR ratings.',
  '["asset-va-healthedge", "asset-va-cotiviti"]'::jsonb,
  '["MA Member Data", "STAR Quality Data", "CMS Submissions"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-claims-commercial',
  'Commercial Claims - Change Healthcare Gateway',
  'Primary',
  'Critical',
  'CIO-ClaimsOperations',
  'bcbs-virginia-001',
  'Commercial claims processing through Change Healthcare gateway, payment integrity.',
  '["asset-va-changehc", "asset-va-cotiviti"]'::jsonb,
  '["Commercial Claims", "Payment Data", "Fraud Alerts"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-provider-network',
  'Provider Network Management - Multi-State (DC/VA/MD)',
  'Primary',
  'Critical',
  'CIO-ProviderNetwork',
  'bcbs-virginia-001',
  'Multi-state provider network management, credentialing, directory maintenance.',
  '["asset-va-modio", "asset-va-availity", "asset-va-salesforce"]'::jsonb,
  '["Provider Contracts", "Credentialing Data", "Provider Directory"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-care-management',
  'Care Management - Population Health',
  'Secondary',
  'High',
  'CIO-PopulationHealth',
  'bcbs-virginia-001',
  'Population health management, care coordination, health outcomes.',
  '["asset-va-salesforce", "asset-va-cotiviti"]'::jsonb,
  '["Population Health Data", "Care Plans", "Health Outcomes"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-payment-integrity',
  'Payment Integrity - Mid-Atlantic Region',
  'Primary',
  'High',
  'CIO-PaymentIntegrity',
  'bcbs-virginia-001',
  'Mid-Atlantic payment integrity, claims auditing, overpayment recovery.',
  '["asset-va-cotiviti", "asset-va-zelis"]'::jsonb,
  '["Audit Results", "Recovery Data", "Payment Adjustments"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-member-services',
  'Member Services - Contact Center',
  'Secondary',
  'Medium',
  'CIO-MemberServices',
  'bcbs-virginia-001',
  'Multi-state member contact center, FEP member support, grievance resolution.',
  '["asset-va-salesforce", "asset-va-modio"]'::jsonb,
  '["Call Records", "Member Inquiries", "FEP Support Data"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-pharmacy',
  'Pharmacy Benefit Management',
  'Secondary',
  'High',
  'CIO-Pharmacy',
  'bcbs-virginia-001',
  'Pharmacy benefits management, formulary, claims processing, prior authorization.',
  '["asset-va-changehc", "asset-va-availity"]'::jsonb,
  '["Pharmacy Claims", "Formulary Data", "Prior Auth Records"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-marketplace',
  'Marketplace Enrollment - Virginia ACA',
  'Secondary',
  'High',
  'CIO-Marketplace',
  'bcbs-virginia-001',
  'Virginia ACA Marketplace enrollment, CMS integration, subsidy processing.',
  '["asset-va-healthsherpa", "asset-va-healthedge"]'::jsonb,
  '["Marketplace Enrollments", "Subsidy Data", "CMS Submissions"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO business_processes (
  id, name, tier, criticality, owner, organization_id,
  description, supported_by_systems, creates_data_objects
) VALUES (
  'bp-va-compliance',
  'Compliance & Regulatory - Virginia Insurance Bureau',
  'Primary',
  'Critical',
  'CISO',
  'bcbs-virginia-001',
  'Multi-state compliance (DC/VA/MD), Virginia Insurance Bureau, FEP OPM requirements.',
  '["asset-va-salesforce", "asset-va-modio"]'::jsonb,
  '["Multi-State Compliance", "FEP OPM Data", "Regulatory Reports"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- MASSACHUSETTS LEGAL OBLIGATIONS (8 obligations)
-- ========================================

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-mass-hipaa',
  'HIPAA Privacy Rule',
  'Privacy',
  'bcbs-mass-001',
  'Protected health information (PHI) privacy protections, minimum necessary standard, member rights.',
  'HHS OCR',
  '45 CFR § 160.103',
  '2003-04-14'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-mass-hipaa-security',
  'HIPAA Security Rule',
  'Security',
  'bcbs-mass-001',
  'PHI electronic protections, administrative, physical, and technical safeguards.',
  'HHS OCR',
  '45 CFR § 164.302',
  '2005-04-21'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-mass-ma-privacy',
  'MA 201 CMR 17.00 Privacy Regulations',
  'Privacy',
  'bcbs-mass-001',
  'Massachusetts-specific personal information protection, written security program, encryption requirements.',
  'MA DPH',
  '201 CMR 17.00',
  '2010-03-01'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-mass-ma-breach',
  'MA Data Breach Notification Law',
  'Breach Notification',
  'bcbs-mass-001',
  'Massachusetts breach notification requirements ( stricter than federal), notification to AG and residents.',
  'MA AG',
  'MA Gen. Laws ch. 93H',
  '2007-08-02'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-mass-medicare-advantage',
  'Medicare Advantage Program Requirements',
  'Healthcare',
  'bcbs-mass-001',
  'CMS Medicare Advantage compliance, STAR ratings, HEDIS measures, RDMA submissions.',
  'CMS',
  '42 CFR § 422.100',
  '2006-01-01'::date,
  '2025-12-31'::date,
  'Critical'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-mass-hitech',
  'HITECH Act Breach Notification',
  'Breach Notification',
  'bcbs-mass-001',
  'HIPAA breach notification requirements, notification timeline (60 days), risk assessment.',
  'HHS OCR',
  '45 CFR § 164.400',
  '2009-02-17'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-mass-ma-dph',
  'MA DPH Health Data Regulations',
  'Healthcare',
  'bcbs-mass-001',
  'Massachusetts DPH health data reporting, quality measures, provider oversight.',
  'MA DPH',
  '105 CMR 100.000',
  '2008-01-01'::date,
  '2025-12-31'::date,
  'Medium'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-mass-ancient',
  'Massachusetts State Privacy Law Update',
  'Privacy',
  'bcbs-mass-001',
  'Updates to Massachusetts privacy law, recent amendments, enforcement trends.',
  'MA AG',
  'MA Gen. Laws ch. 93I',
  '2019-01-01'::date,
  '2025-12-31'::date,
  'Medium'
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- TEXAS LEGAL OBLIGATIONS (8 obligations)
-- ========================================

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-texas-hipaa',
  'HIPAA Privacy Rule',
  'Privacy',
  'bcbs-texas-001',
  'PHI privacy protections, minimum necessary standard, member rights under HIPAA.',
  'HHS OCR',
  '45 CFR § 160.103',
  '2003-04-14'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-texas-hb300',
  'Texas HB 300 Privacy Act',
  'Privacy',
  'bcbs-texas-001',
  'Texas-specific privacy law, broader than HIPAA, more stringent breach notification (30 days).',
  'Texas AG',
  'Tex. Bus. & Com. Code § 521',
  '2011-09-01'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-texas-medicaid',
  'Texas Medicaid Managed Care Requirements',
  'Healthcare',
  'bcbs-texas-001',
  'Texas Medicaid STAR and CHIP program requirements, HHSC compliance, quality measures.',
  'Texas HHSC',
  'Tex. Health & Safety Code § 533',
  '2012-01-01'::date,
  '2025-12-31'::date,
  'Critical'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-texas-breach',
  'Texas Data Breach Notification Law',
  'Breach Notification',
  'bcbs-texas-001',
  'Texas breach notification requirements ( 30 days), notification to AG and residents.',
  'Texas AG',
  'Tex. Bus. & Com. Code § 521.053',
  '2011-09-01'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-texas-hitech',
  'HITECH Act Breach Notification',
  'Breach Notification',
  'bcbs-texas-001',
  'HIPAA breach notification requirements, notification timeline, risk assessment requirements.',
  'HHS OCR',
  '45 CFR § 164.400',
  '2009-02-17'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-texas-dual-eligible',
  'Medicare-Medicaid Dual Eligible Requirements',
  'Healthcare',
  'bcbs-texas-001',
  'Dual eligible coordination, MSP requirements, financial alignment initiatives.',
  'CMS & Texas HHSC',
  '42 CFR § 422.100',
  '2013-01-01'::date,
  '2025-12-31'::date,
  'Critical'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-texas-hhsc',
  'Texas HHSC Provider Network Requirements',
  'Healthcare',
  'bcbs-texas-001',
  'Texas Medicaid provider network adequacy, rural access, HHSC oversight.',
  'Texas HHSC',
  'Tex. Admin. Code § 353.10',
  '2015-01-01'::date,
  '2025-12-31'::date,
  'Medium'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-texas-42-cfr',
  'CMS Medicare Advantage Requirements',
  'Healthcare',
  'bcbs-texas-001',
  'CMS Medicare Advantage program requirements, STAR ratings, HEDIS measures.',
  'CMS',
  '42 CFR § 422.100',
  '2006-01-01'::date,
  '2025-12-31'::date,
  'Critical'
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VIRGINIA LEGAL OBLIGATIONS (8 obligations)
-- ========================================

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-va-hipaa',
  'HIPAA Privacy Rule',
  'Privacy',
  'bcbs-virginia-001',
  'PHI privacy protections, minimum necessary standard, member rights under HIPAA.',
  'HHS OCR',
  '45 CFR § 160.103',
  '2003-04-14'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-va-fep',
  'FEP OPM Compliance Requirements',
  'Healthcare',
  'bcbs-virginia-001',
  'Federal Employee Program OPM compliance, multi-state (DC/VA/MD) requirements.',
  'OPM',
  'FEP Contract § 5.0',
  '2017-01-01'::date,
  '2025-12-31'::date,
  'Critical'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-va-breach',
  'Virginia Data Breach Notification Law',
  'Breach Notification',
  'bcbs-virginia-001',
  'Virginia breach notification requirements, notification to AG and residents.',
  'Virginia AG',
  'Va. Code § 18.2-186.6',
  '2008-07-01'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-va-dc-breach',
  'DC Data Breach Notification Law',
  'Breach Notification',
  'bcbs-virginia-001',
  'Washington DC breach notification requirements for multi-state operations.',
  'DC AG',
  'DC Code § 28-4551',
  '2015-04-01'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-va-medicare',
  'Medicare Advantage - CMS Region 3 Requirements',
  'Healthcare',
  'bcbs-virginia-001',
  'Medicare Advantage CMS Region 3 compliance, STAR ratings, HEDIS measures.',
  'CMS',
  '42 CFR § 422.100',
  '2006-01-01'::date,
  '2025-12-31'::date,
  'Critical'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-va-hitech',
  'HITECH Act Breach Notification',
  'Breach Notification',
  'bcbs-virginia-001',
  'HIPAA breach notification requirements, notification timeline, risk assessment.',
  'HHS OCR',
  '45 CFR § 164.400',
  '2009-02-17'::date,
  '2025-12-31'::date,
  'High'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-va-vhib',
  'Virginia Insurance Bureau Regulations',
  'Healthcare',
  'bcbs-virginia-001',
  'Virginia Insurance Bureau oversight, state-specific requirements, market conduct.',
  'Virginia Bureau of Insurance',
  'Va. Code § 38.2-100',
  '2010-01-01'::date,
  '2025-12-31'::date,
  'Medium'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (
  id, name, category, organization_id, description,
  regulatory_body, citation, effective_date, review_date, risk_level
) VALUES (
  'lo-va-md-breach',
  'Maryland Data Breach Notification Law',
  'Breach Notification',
  'bcbs-virginia-001',
  'Maryland breach notification requirements for multi-state (DC/VA/MD) operations.',
  'Maryland AG',
  'Md. Code, Com. Law § 14-3503',
  '2012-01-01'::date,
  '2025-12-31'::date,
  'Medium'
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- MASSACHUSETTS THREAT SCENARIOS (3 scenarios)
-- ========================================

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-mass-bec',
  'Business Email Compromise (BEC) - Medicare Advantage Payments',
  'Fraud',
  'bcbs-mass-001',
  'Attackers compromise vendor email accounts to redirect Medicare Advantage payments to fraudulent accounts.',
  'Medium',
  'High',
  'High',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-mass-ransomware',
  'Ransomware - Claims Processing Disruption',
  'Malware',
  'bcbs-mass-001',
  'Ransomware attack on claims processing systems (TriZetto Facets) disrupting commercial claims.',
  'Medium',
  'Critical',
  'High',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-mass-insider',
  'Insider Threat - Academic Medical Center Data Theft',
  'Insider',
  'bcbs-mass-001',
  'Malicious insider at academic medical center partner exfiltrates member PHI.',
  'Low',
  'High',
  'Medium',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- TEXAS THREAT SCENARIOS (3 scenarios)
-- ========================================

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-texas-bec',
  'Business Email Compromise (BEC) - Medicaid Payments',
  'Fraud',
  'bcbs-texas-001',
  'Attackers compromise vendor email accounts to redirect Texas Medicaid payments to fraudulent accounts.',
  'Medium',
  'High',
  'High',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-texas-ransomware',
  'Ransomware - Medicaid Claims Disruption',
  'Malware',
  'bcbs-texas-001',
  'Ransomware attack on QNXT Medicaid claims system disrupting Texas Medicaid operations.',
  'Medium',
  'Critical',
  'High',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-texas-phishing',
  'Credential Harvesting - HHSC Portal Access',
  'Social Engineering',
  'bcbs-texas-001',
  'Phishing campaign targeting Texas HHSC portal access credentials for Medicaid data.',
  'Medium',
  'High',
  'High',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VIRGINIA THREAT SCENARIOS (3 scenarios)
-- ========================================

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-va-bec',
  'Business Email Compromise (BEC) - FEP Payments',
  'Fraud',
  'bcbs-virginia-001',
  'Attackers compromise vendor email accounts to redirect FEP payments to fraudulent accounts.',
  'Medium',
  'High',
  'High',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-va-ransomware',
  'Ransomware - Multi-State Claims Gateway Disruption',
  'Malware',
  'bcbs-virginia-001',
  'Ransomware attack on Change Healthcare claims gateway disrupting DC/VA/MD operations.',
  'Medium',
  'Critical',
  'High',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO threat_scenarios (
  id, name, category, organization_id, description,
  likelihood, impact, overall_risk, mit_status
) VALUES (
  'ts-va-supply-chain',
  'Supply Chain Attack - FEP Vendor Breach',
  'Third-Party Risk',
  'bcbs-virginia-001',
  'FEP vendor breach exposes multi-state (DC/VA/MD) FEP member data.',
  'Medium',
  'High',
  'High',
  'Partially Mitigated'
) ON CONFLICT (id) DO NOTHING;

-- Verification Queries:
-- SELECT organization_id, COUNT(*) FROM business_processes WHERE organization_id LIKE 'bcbs-%' GROUP BY organization_id;
-- SELECT organization_id, COUNT(*) FROM legal_obligations WHERE organization_id LIKE 'bcbs-%' GROUP BY organization_id;
-- SELECT organization_id, COUNT(*) FROM threat_scenarios WHERE organization_id LIKE 'bcbs-%' GROUP BY organization_id;

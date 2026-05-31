-- BCBS State-Specific Evidence Records
-- Seed Date: 2026-06-09
-- Description: Creates 36 evidence records (12 per state) for SOC 2, HITRUST, HIPAA, ISO, NIST, CIS certificates

-- ========================================
-- MASSACHUSETTS EVIDENCE RECORDS (12 files)
-- Types: 4 SOC 2, 2 HITRUST, 4 HIPAA BAA, 1 NIST CSF, 1 State Compliance
-- ========================================

-- 1. SOC 2 Type II - Cotiviti
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-soc2-cotiviti',
  'bcbs-mass-001',
  'SOC 2 Type II Report - Cotiviti',
  'SOC 2 Type II audit report for Cotiviti analytics platform. Covers security, availability, and processing integrity.',
  'Document',
  '/mock-evidence/mass/SOC2_TypeII_Cotiviti_2025.pdf',
  'SOC2_TypeII_Cotiviti_2025.pdf',
  2458624,
  '2025-03-15'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 2. SOC 2 Type II - HealthEdge
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-soc2-healthedge',
  'bcbs-mass-001',
  'SOC 2 Type II Report - HealthEdge',
  'SOC 2 Type II audit report for HealthEdge enrollment platform. Covers security, availability, and confidentiality.',
  'Document',
  '/mock-evidence/mass/SOC2_TypeII_HealthEdge_2025.pdf',
  'SOC2_TypeII_HealthEdge_2025.pdf',
  2891045,
  '2025-02-20'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 3. SOC 2 Type II - Salesforce
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-soc2-salesforce',
  'bcbs-mass-001',
  'SOC 2 Type II Report - Salesforce Health Cloud',
  'SOC 2 Type II audit report for Salesforce Health Cloud member services platform.',
  'Document',
  '/mock-evidence/mass/SOC2_TypeII_Salesforce_2025.pdf',
  'SOC2_TypeII_Salesforce_2025.pdf',
  3124567,
  '2025-04-10'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 4. SOC 2 Type II - Kyruus
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-soc2-kyruus',
  'bcbs-mass-001',
  'SOC 2 Type II Report - Kyruus',
  'SOC 2 Type II audit report for Kyruus provider directory platform.',
  'Document',
  '/mock-evidence/mass/SOC2_TypeII_Kyruus_2025.pdf',
  'SOC2_TypeII_Kyruus_2025.pdf',
  1987654,
  '2025-03-05'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 5. HITRUST CS2 - HealthEdge
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-hitrust-healthedge',
  'bcbs-mass-001',
  'HITRUST CS2 Certified - HealthEdge',
  'HITRUST CS2 certification for HealthEdge enrollment platform. HIPAA and NIST alignment.',
  'Document',
  '/mock-evidence/mass/HITRUST_cs2_HealthEdge_2025.pdf',
  'HITRUST_cs2_HealthEdge_2025.pdf',
  1823456,
  '2025-01-15'::date,
  '2024-06-01'::date,
  '2025-05-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 6. HITRUST CS2 - Zelis
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-hitrust-zelis',
  'bcbs-mass-001',
  'HITRUST CS2 Certified - Zelis',
  'HITRUST CS2 certification for Zelis payment processing platform. PCI DSS and HIPAA alignment.',
  'Document',
  '/mock-evidence/mass/HITRUST_cs2_Zelis_2025.pdf',
  'HITRUST_cs2_Zelis_2025.pdf',
  1754321,
  '2025-02-28'::date,
  '2024-06-01'::date,
  '2025-05-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 7. HIPAA BAA - TriZetto
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-baa-trizetto',
  'bcbs-mass-001',
  'HIPAA BAA - TriZetto Facets',
  'HIPAA Business Associate Agreement for TriZetto Facets claims processing platform.',
  'Document',
  '/mock-evidence/mass/HIPAA_BAA_TriZetto_Mass_2025.pdf',
  'HIPAA_BAA_TriZetto_Mass_2025.pdf',
  524288,
  '2025-01-10'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 8. HIPAA BAA - Change Healthcare
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-baa-changehc',
  'bcbs-mass-001',
  'HIPAA BAA - Change Healthcare',
  'HIPAA Business Associate Agreement for Change Healthcare clearinghouse services.',
  'Document',
  '/mock-evidence/mass/HIPAA_BAA_ChangeHealthcare_Mass_2025.pdf',
  'HIPAA_BAA_ChangeHealthcare_Mass_2025.pdf',
  489560,
  '2025-01-12'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 9. HIPAA BAA - Cotiviti
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-baa-cotiviti',
  'bcbs-mass-001',
  'HIPAA BAA - Cotiviti',
  'HIPAA Business Associate Agreement for Cotiviti analytics platform.',
  'Document',
  '/mock-evidence/mass/HIPAA_BAA_Cotiviti_Mass_2025.pdf',
  'HIPAA_BAA_Cotiviti_Mass_2025.pdf',
  512456,
  '2025-01-08'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 10. HIPAA BAA - CAQH
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-baa-caqh',
  'bcbs-mass-001',
  'HIPAA BAA - CAQH',
  'HIPAA Business Associate Agreement for CAQH provider credentialing platform.',
  'Document',
  '/mock-evidence/mass/HIPAA_BAA_CAQH_Mass_2025.pdf',
  'HIPAA_BAA_CAQH_Mass_2025.pdf',
  498765,
  '2025-01-14'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 11. NIST CSF Self-Assessment - Salesforce
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-nist-salesforce',
  'bcbs-mass-001',
  'NIST CSF Self-Assessment - Salesforce Health Cloud',
  'NIST Cybersecurity Framework self-assessment for Salesforce Health Cloud member services platform.',
  'Document',
  '/mock-evidence/mass/NIST_CSF_SelfAssessment_Mass_2025.pdf',
  'NIST_CSF_SelfAssessment_Mass_2025.pdf',
  1543210,
  '2025-04-01'::date,
  '2025-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 12. MA DPH Assessment
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-mass-dph',
  'bcbs-mass-001',
  'MA DPH Privacy & Security Assessment',
  'Massachusetts DPH privacy and security assessment per 201 CMR 17.00 regulations.',
  'Document',
  '/mock-evidence/mass/MA_DPH_Assessment_2025.pdf',
  'MA_DPH_Assessment_2025.pdf',
  1234567,
  '2025-03-30'::date,
  '2025-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- TEXAS EVIDENCE RECORDS (12 files)
-- Types: 4 SOC 2, 2 HITRUST, 4 HIPAA BAA, 1 ISO 27001, 1 State Compliance
-- ========================================

-- 1. SOC 2 Type II - Inovalon
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-soc2-inovalon',
  'bcbs-texas-001',
  'SOC 2 Type II Report - Inovalon',
  'SOC 2 Type II audit report for Inovalon population health analytics platform.',
  'Document',
  '/mock-evidence/texas/SOC2_TypeII_Inovalon_2025.pdf',
  'SOC2_TypeII_Inovalon_2025.pdf',
  2765432,
  '2025-03-20'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 2. SOC 2 Type II - Salesforce
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-soc2-salesforce',
  'bcbs-texas-001',
  'SOC 2 Type II Report - Salesforce Health Cloud',
  'SOC 2 Type II audit report for Salesforce Health Cloud member services platform.',
  'Document',
  '/mock-evidence/texas/SOC2_TypeII_Salesforce_2025.pdf',
  'SOC2_TypeII_Salesforce_2025.pdf',
  3087654,
  '2025-04-05'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 3. SOC 2 Type II - Benefitfocus
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-soc2-benefitfocus',
  'bcbs-texas-001',
  'SOC 2 Type II Report - Benefitfocus',
  'SOC 2 Type II audit report for Benefitfocus benefits administration platform.',
  'Document',
  '/mock-evidence/texas/SOC2_TypeII_Benefitfocus_2025.pdf',
  'SOC2_TypeII_Benefitfocus_2025.pdf',
  2345678,
  '2025-03-10'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 4. SOC 2 Type II - Availity
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-soc2-availity',
  'bcbs-texas-001',
  'SOC 2 Type II Report - Availity',
  'SOC 2 Type II audit report for Availity provider portal and clearinghouse.',
  'Document',
  '/mock-evidence/texas/SOC2_TypeII_Availity_2025.pdf',
  'SOC2_TypeII_Availity_2025.pdf',
  2654321,
  '2025-03-25'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 5. HITRUST CS2 - HealthEdge
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-hitrust-healthedge',
  'bcbs-texas-001',
  'HITRUST CS2 Certified - HealthEdge',
  'HITRUST CS2 certification for HealthEdge enrollment platform. Texas Medicaid compliance.',
  'Document',
  '/mock-evidence/texas/HITRUST_cs2_HealthEdge_Texas_2025.pdf',
  'HITRUST_cs2_HealthEdge_Texas_2025.pdf',
  1823456,
  '2025-02-15'::date,
  '2024-06-01'::date,
  '2025-05-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 6. HITRUST CS2 - Zelis
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-hitrust-zelis',
  'bcbs-texas-001',
  'HITRUST CS2 Certified - Zelis',
  'HITRUST CS2 certification for Zelis payment processing platform. Texas Medicaid EFT compliance.',
  'Document',
  '/mock-evidence/texas/HITRUST_cs2_Zelis_Texas_2025.pdf',
  'HITRUST_cs2_Zelis_Texas_2025.pdf',
  1754321,
  '2025-02-28'::date,
  '2024-06-01'::date,
  '2025-05-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 7. HIPAA BAA - QNXT
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-baa-qnxt',
  'bcbs-texas-001',
  'HIPAA BAA - QNXT',
  'HIPAA Business Associate Agreement for QNXT Medicaid claims processing platform.',
  'Document',
  '/mock-evidence/texas/HIPAA_BAA_QNXT_Texas_2025.pdf',
  'HIPAA_BAA_QNXT_Texas_2025.pdf',
  545678,
  '2025-01-15'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 8. HIPAA BAA - FACETS
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-baa-facets',
  'bcbs-texas-001',
  'HIPAA BAA - FACETS',
  'HIPAA Business Associate Agreement for FACETS commercial claims processing platform.',
  'Document',
  '/mock-evidence/texas/HIPAA_BAA_FACETS_Texas_2025.pdf',
  'HIPAA_BAA_FACETS_Texas_2025.pdf',
  534567,
  '2025-01-16'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 9. HIPAA BAA - Inovalon
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-baa-inovalon',
  'bcbs-texas-001',
  'HIPAA BAA - Inovalon',
  'HIPAA Business Associate Agreement for Inovalon population health analytics platform.',
  'Document',
  '/mock-evidence/texas/HIPAA_BAA_Inovalon_Texas_2025.pdf',
  'HIPAA_BAA_Inovalon_Texas_2025.pdf',
  523456,
  '2025-01-18'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 10. HIPAA BAA - Availity
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-baa-availity',
  'bcbs-texas-001',
  'HIPAA BAA - Availity',
  'HIPAA Business Associate Agreement for Availity provider portal and clearinghouse.',
  'Document',
  '/mock-evidence/texas/HIPAA_BAA_Availity_Texas_2025.pdf',
  'HIPAA_BAA_Availity_Texas_2025.pdf',
  512345,
  '2025-01-20'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 11. ISO 27001 - Benefitfocus
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-iso27001-benefitfocus',
  'bcbs-texas-001',
  'ISO 27001 Certified - Benefitfocus',
  'ISO 27001:2013 certification for Benefitfocus benefits administration platform. ISMS scope included.',
  'Document',
  '/mock-evidence/texas/ISO_27001_Benefitfocus_2025.pdf',
  'ISO_27001_Benefitfocus_2025.pdf',
  2987654,
  '2025-04-15'::date,
  '2024-05-01'::date,
  '2027-05-01'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 12. TX HB 300 Gap Assessment
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-texas-hb300',
  'bcbs-texas-001',
  'Texas HB 300 Gap Assessment',
  'Texas HB 300 privacy law gap assessment and remediation plan for BCBS Texas.',
  'Document',
  '/mock-evidence/texas/TX_HB300_GapAssessment_2025.pdf',
  'TX_HB300_GapAssessment_2025.pdf',
  1456789,
  '2025-05-01'::date,
  '2025-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VIRGINIA EVIDENCE RECORDS (12 files)
-- Types: 4 SOC 2, 2 HITRUST, 4 HIPAA BAA, 1 CIS v8.1.2, 1 Federal Compliance
-- ========================================

-- 1. SOC 2 Type II - Change Healthcare
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-soc2-changehc',
  'bcbs-virginia-001',
  'SOC 2 Type II Report - Change Healthcare',
  'SOC 2 Type II audit report for Change Healthcare claims gateway and clearinghouse.',
  'Document',
  '/mock-evidence/virginia/SOC2_TypeII_ChangeHealthcare_2025.pdf',
  'SOC2_TypeII_ChangeHealthcare_2025.pdf',
  2876543,
  '2025-03-18'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 2. SOC 2 Type II - Availity
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-soc2-availity',
  'bcbs-virginia-001',
  'SOC 2 Type II Report - Availity',
  'SOC 2 Type II audit report for Availity provider portal and clearinghouse.',
  'Document',
  '/mock-evidence/virginia/SOC2_TypeII_Availity_2025.pdf',
  'SOC2_TypeII_Availity_2025.pdf',
  2654321,
  '2025-03-22'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 3. SOC 2 Type II - Cotiviti
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-soc2-cotiviti',
  'bcbs-virginia-001',
  'SOC 2 Type II Report - Cotiviti',
  'SOC 2 Type II audit report for Cotiviti payment integrity analytics platform.',
  'Document',
  '/mock-evidence/virginia/SOC2_TypeII_Cotiviti_2025.pdf',
  'SOC2_TypeII_Cotiviti_2025.pdf',
  2765432,
  '2025-03-15'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 4. SOC 2 Type II - HealthSherpa
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-soc2-healthsherpa',
  'bcbs-virginia-001',
  'SOC 2 Type II Report - HealthSherpa',
  'SOC 2 Type II audit report for HealthSherpa marketplace enrollment platform.',
  'Document',
  '/mock-evidence/virginia/SOC2_TypeII_HealthSherpa_2025.pdf',
  'SOC2_TypeII_HealthSherpa_2025.pdf',
  2234567,
  '2025-03-08'::date,
  '2024-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 5. HITRUST CS2 - Zelis
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-hitrust-zelis',
  'bcbs-virginia-001',
  'HITRUST CS2 Certified - Zelis',
  'HITRUST CS2 certification for Zelis payment processing platform. Multi-state (DC/VA/MD) compliance.',
  'Document',
  '/mock-evidence/virginia/HITRUST_cs2_Zelis_Virginia_2025.pdf',
  'HITRUST_cs2_Zelis_Virginia_2025.pdf',
  1754321,
  '2025-02-20'::date,
  '2024-06-01'::date,
  '2025-05-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 6. HITRUST CS2 - Modio Health
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-hitrust-modio',
  'bcbs-virginia-001',
  'HITRUST CS2 Certified - Modio Health',
  'HITRUST CS2 certification for Modio Health provider data management platform.',
  'Document',
  '/mock-evidence/virginia/HITRUST_cs2_ModioHealth_2025.pdf',
  'HITRUST_cs2_ModioHealth_2025.pdf',
  1687654,
  '2025-02-25'::date,
  '2024-06-01'::date,
  '2025-05-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 7. HIPAA BAA - Change Healthcare
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-baa-changehc',
  'bcbs-virginia-001',
  'HIPAA BAA - Change Healthcare',
  'HIPAA Business Associate Agreement for Change Healthcare claims gateway and clearinghouse.',
  'Document',
  '/mock-evidence/virginia/HIPAA_BAA_ChangeHealthcare_Virginia_2025.pdf',
  'HIPAA_BAA_ChangeHealthcare_Virginia_2025.pdf',
  534567,
  '2025-01-11'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 8. HIPAA BAA - Availity
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-baa-availity',
  'bcbs-virginia-001',
  'HIPAA BAA - Availity',
  'HIPAA Business Associate Agreement for Availity provider portal and clearinghouse.',
  'Document',
  '/mock-evidence/virginia/HIPAA_BAA_Availity_Virginia_2025.pdf',
  'HIPAA_BAA_Availity_Virginia_2025.pdf',
  523456,
  '2025-01-13'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 9. HIPAA BAA - Cotiviti
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-baa-cotiviti',
  'bcbs-virginia-001',
  'HIPAA BAA - Cotiviti',
  'HIPAA Business Associate Agreement for Cotiviti payment integrity analytics platform.',
  'Document',
  '/mock-evidence/virginia/HIPAA_BAA_Cotiviti_Virginia_2025.pdf',
  'HIPAA_BAA_Cotiviti_Virginia_2025.pdf',
  512345,
  '2025-01-09'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 10. HIPAA BAA - Zelis
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-baa-zelis',
  'bcbs-virginia-001',
  'HIPAA BAA - Zelis',
  'HIPAA Business Associate Agreement for Zelis payment processing platform.',
  'Document',
  '/mock-evidence/virginia/HIPAA_BAA_Zelis_Virginia_2025.pdf',
  'HIPAA_BAA_Zelis_Virginia_2025.pdf',
  501234,
  '2025-01-07'::date,
  '2025-01-01'::date,
  '2027-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 11. CIS v8.1.2 Assessment - Salesforce Service Cloud
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-cis-salesforce',
  'bcbs-virginia-001',
  'CIS v8.1.2 Assessment - Salesforce Service Cloud',
  'Center for Internet Security Critical Security Controls v8.1.2 assessment for Salesforce Service Cloud.',
  'Document',
  '/mock-evidence/virginia/CIS_v8_Assessment_Salesforce_2025.pdf',
  'CIS_v8_Assessment_Salesforce_2025.pdf',
  1876543,
  '2025-04-20'::date,
  '2025-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- 12. FEP OPM Assessment
INSERT INTO evidence (
  id, organization_id, title, description, evidence_type,
  file_url, file_name, file_size, upload_date, validity_start, validity_end, status
) VALUES (
  'ev-va-fep-opm',
  'bcbs-virginia-001',
  'FEP OPM Compliance Assessment',
  'Federal Employee Program OPM compliance assessment for BCBS Virginia (CareFirst). Multi-state (DC/VA/MD) FEP requirements.',
  'Document',
  '/mock-evidence/virginia/FEP_OPM_Assessment_2025.pdf',
  'FEP_OPM_Assessment_2025.pdf',
  2345678,
  '2025-05-10'::date,
  '2025-01-01'::date,
  '2025-12-31'::date,
  'Valid'
)
ON CONFLICT (id) DO NOTHING;

-- Verification Query:
-- SELECT organization_id, COUNT(*) FROM evidence WHERE organization_id LIKE 'bcbs-%' GROUP BY organization_id;

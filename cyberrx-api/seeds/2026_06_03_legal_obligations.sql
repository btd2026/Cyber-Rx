-- ============================================================================
-- Seed File: Legal Obligations - HIPAA, CMS, and State Notification Regimes
-- Task: T-110
-- Description: Seed LegalObligation rows for healthcare breach notification timelines
-- Organization: BCBS Demo Tenant (org_id: demo-bcbs-001)
-- ============================================================================

-- ============================================================================
-- FEDERAL LEGAL OBLIGATIONS - HIPAA Privacy Rule
-- OCR (Office for Civil Rights) breach notification requirements
-- ============================================================================

-- HIPAA Privacy Rule - 45 CFR §164.400 (Unsecured PHI)
-- 60-day notification requirement for breaches of unsecured PHI
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-hipaa-164-400',
  'HIPAA',
  '45 CFR §164.400',
  'HIPAA Breach Notification Rule',
  'Requires covered entities and business associates to notify affected individuals, HHS, and sometimes the media following a breach of unsecured protected health information (PHI). A breach is defined as the acquisition, access, use, or disclosure of PHI in a manner not permitted by the Privacy Rule that poses a significant risk of financial, reputational, or other harm to the individual.',
  '60 days from breach discovery (without unreasonable delay)',
  '["Health Plan", "Healthcare Provider", "Healthcare Clearinghouse", "Business Associate"]',
  'demo-bcbs-001',
  68928,
  '["Affected Individuals", "HHS Secretary", "Media (if >500 individuals)"]',
  '["Breach description", "Types of PHI involved", "Steps individual should take", "Investigation timeline", "Contact information"]',
  '["Unsecured PHI encrypted per NIST standards", "Low risk of harm assessment"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- HIPAA Security Rule - 45 CFR §164.302-318
-- Safeguards for electronic PHI (ePHI)
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-hipaa-security-rule',
  'HIPAA',
  '45 CFR §164.302-318',
  'HIPAA Security Rule for ePHI',
  'Establishes national standards to protect individuals'' electronic personal health information (ePHI) that is created, received, used, or maintained by a covered entity. Requires implementation of administrative, physical, and technical safeguards.',
  'Ongoing compliance; breach notification per §164.400',
  '["Health Plan", "Healthcare Provider", "Healthcare Clearinghouse", "Business Associate"]',
  'demo-bcbs-001',
  68928,
  'N/A',
  '["Risk Analysis", "Risk Management", "Policies and Procedures", "Training", "Physical Access Controls", "Workstation Security", "Audit Controls", "Transmission Security"]',
  '["Paper-based PHI", "Information encrypted to NIST standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FEDERAL LEGAL OBLIGATIONS - MEDICARE/MEDICAID
-- CMS (Centers for Medicare & Medicaid Services) requirements
-- ============================================================================

-- Medicare Advantage Contract Requirements
-- 42 CFR §422.306(c)(1) - 5-day notification requirement
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-cms-ma-5day',
  'CMS',
  '42 CFR §422.306(c)(1)',
  'Medicare Advantage 5-Day Notification',
  'Requires Medicare Advantage (Part C) organizations to notify CMS of any breach or suspected breach of Medicare beneficiary information within 5 calendar days of discovery. This applies to unauthorized access, use, or disclosure of Medicare beneficiary information.',
  '5 calendar days from breach discovery',
  '["Medicare Advantage Organization", "Medicare Cost Plan"]',
  'demo-bcbs-001',
  25000_per_breach,
  '["CMS Medicare Drug Integrity Contractor (MEDIC)", "CMS Regional Office"]',
  '["Beneficiary information compromised", "Breach date and duration", "Number of affected beneficiaries", "Remediation steps"]',
  '["De-identified data per CMS standards", "Information encrypted to CMS standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Medicare Part D Event Reporting
-- 42 CFR §423.504 - 1-day notification requirement
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-cms-partd-1day',
  'CMS',
  '42 CFR §423.504',
  'Medicare Part D 1-Day Event Notification',
  'Requires Medicare Part D plan sponsors to notify CMS of any event affecting availability of Part D drugs within 1 business day. Includes security breaches affecting pharmacy benefit management systems.',
  '1 business day from event discovery',
  '["Medicare Part D Sponsor", "PBM"]',
  'demo-bcbs-001',
  10000_per_day,
  '["CMS Center for Medicare (C4M)", "MEDIC"]',
  '["Event description", "Affected beneficiaries", "Remediation timeline", "Business impact"]',
  '["Events resolved within 4 hours with no beneficiary impact"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Medicaid Managed Care Reporting
-- State Medicaid agency breach reporting requirements (typical)
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-medicaid-reporting',
  'CMS/State',
  '42 CFR §431.600 (varies by state)',
  'Medicaid Managed Care Breach Notification',
  'Requires Medicaid managed care organizations to report breaches of beneficiary information to the state Medicaid agency. Timelines and procedures vary by state but most require notification within 10-30 days.',
  'Varies by state (typically 10-30 days)',
  '["Medicaid Managed Care Organization", "MCO"]',
  'demo-bcbs-001',
  50000,
  '["State Medicaid Agency", "State Department of Health"]',
  '["Breach description", "Beneficiary impact", "State-specific reporting elements"]',
  '["Per state-specific exemptions"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Marketplace (ACA) Breach Notification
-- 45 CFR §155.260 - 10-day notification requirement
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-marketplace-10day',
  'ACA/Marketplace',
  '45 CFR §155.260',
  'Marketplace 10-Day Breach Notification',
  'Requires issuers and qualified health plan sponsors to notify the Marketplace and HHS of breaches involving personally identifiable information (PII) or PHI related to Marketplace enrollees.',
  '10 calendar days from breach discovery',
  '["QHP Issuer", "Marketplace Plan Sponsor"]',
  'demo-bcbs-001',
  100000,
  '["Marketplace", "HHS Office of Consumer Information and Insurance Oversight (OCIIO)"]',
  '["Affected enrollee information", "Breach details", "Remediation steps"]',
  '["Encrypted per Marketplace security standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STATE LEGAL OBLIGATIONS - BREACH NOTIFICATION LAWS
-- Selected states with strict requirements for healthcare payers
-- ============================================================================

-- California - CCPA + CMIA
-- California Consumer Privacy Act + Confidentiality of Medical Information Act
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-ca-ccpa-cmia',
  'California',
  'Civil Code §1798.82, §1798.29 (CCPA) + Civil Code §56.121 (CMIA)',
  'California Breach Notification (CCPA + CMIA)',
  'California law requires notification of breaches involving California residents. For medical information, CMIA imposes stricter requirements including notification to the California Department of Public Health. CCPA allows for private right of action for data breaches.',
  '30 days from breach discovery (AG guidance)',
  '["Any entity handling California resident data"]',
  'demo-bcbs-001',
  2500_per_record,
  '["Affected California Residents", "California Attorney General", "California Department of Public Health (for medical information)"]',
  '["Breach description", "Data types exposed", "Remediation steps", ' ||
   '"California-specific contact information (1-800-952-5225 for AG guidance)"]',
  '["Encrypted data meeting California standards", "De-identified data"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- New York - SHIELD Act
-- New York Stop Hacks and Improve Electronic Data Security Act
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-ny-shield-act',
  'New York',
  'General Business Law §899-aa',
  'New York SHIELD Act Breach Notification',
  'New York''s SHIELD Act expanded breach notification requirements to include all private information (not just SSN). Requires notification to NY Attorney General, Department of State, and affected New York residents. Health care information and biometric data are covered.',
  '30 days from breach discovery',
  '["Any entity handling New York resident data"]',
  'demo-bcbs-001',
  5000_per_record,
  '["Affected New York Residents", "NY Attorney General", "NY Department of State", ' ||
   '"NY Department of Health (for healthcare info)", "Credit bureaus (if >5000 NY residents)"]',
  '["Breach description", "Data types exposed", "Remediation steps", ' ||
   '"NY-specific consumer guidance"]',
  '["Encrypted data per NY standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Massachusetts - Data Security Regulation
-- 201 CMR 17.00 - Strict data security requirements
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-ma-data-security',
  'Massachusetts',
  '201 CMR 17.00 + General Laws Chapter 93H',
  'Massachusetts Data Security + Breach Notification',
  'Massachusetts has one of the strictest data security regulations in the US. Requires a comprehensive written information security program (WISP), encryption for portable devices, and breach notification within a reasonable time (AG guidance: within 30 days).',
  '30 days from breach discovery (AG guidance)',
  '["Any entity handling Massachusetts resident data"]',
  'demo-bcbs-001',
  5000_per_record,
  '["Affected Massachusetts Residents", "Massachusetts Attorney General", ' ||
   '"Massachusetts Office of Consumer Affairs and Business Regulation"]',
  '["Breach description", "Data types exposed", "WISP compliance details", ' ||
   '"Remediation steps", "Massachusetts-specific guidance"]',
  '["Encrypted data per 201 CMR 17.00 standards", "De-identified data"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Texas - HB 300
-- Texas Identity Theft Enforcement and Protection Act
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-tx-hb300',
  'Texas',
  'Business & Commerce Code §521.001-521.155',
  'Texas HB 300 Breach Notification',
  'Texas HB 300 strengthened breach notification requirements beyond HIPAA. Requires notification within 30 days of breach discovery. Includes electronic PHI, personal health information, and personally identifying information. Texas residents must be notified.',
  '30 days from breach discovery',
  '["Any entity handling Texas resident data"]',
  'demo-bcbs-001',
  5000_per_record,
  '["Affected Texas Residents", "Texas Attorney General", ' ||
   '"Texas Department of Insurance (for health plans)"]',
  '["Breach description", "Data types exposed", "Remediation steps", ' ||
   '"Texas-specific contact information (1-800-252-8011)"]',
  '["Encrypted data per Texas standards", "De-identified data"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Florida - Florida Information Protection Act
-- Section 501.171, Florida Statutes
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-fl-fipa',
  'Florida',
  'Florida Statutes §501.171',
  'Florida Information Protection Act (FIPA)',
  'Florida law requires breach notification within 30 days of discovery. Florida residents must be notified. For breaches involving 500+ Floridians, notification to the Florida Department of Legal Affairs is required.',
  '30 days from breach discovery',
  '["Any entity handling Florida resident data"]',
  'demo-bcbs-001',
  50000,
  '["Affected Florida Residents", "Florida Department of Legal Affairs", ' ||
   '"Florida Office of Insurance Regulation (for health plans)"]',
  '["Breach description", "Data types exposed", "Remediation steps", ' ||
   '"Florida-specific guidance"]',
  '["Encrypted data meeting Florida standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Illinois - Personal Information Protection Act
-- 815 ILCS 530/1-6
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-il-pipa',
  'Illinois',
  '815 ILCS 530/1-6',
  'Illinois Personal Information Protection Act (PIPA)',
  'Illinois law requires notification of breaches involving Illinois residents. Timeline is "without unreasonable delay" but AG guidance indicates within 30 days. For breaches of medical information, additional requirements may apply.',
  '30 days from breach discovery (AG guidance)',
  '["Any entity handling Illinois resident data"]',
  'demo-bcbs-001',
  2500_per_record,
  '["Affected Illinois Residents", "Illinois Attorney General"]',
  '["Breach description", "Data types exposed", "Remediation steps"]',
  '["Encrypted data per Illinois standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Pennsylvania - Breach of Personal Information Notification Act
-- 73 Pa. Cons. Stat. §2301-2309
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-pa-breach-act',
  'Pennsylvania',
  '73 Pa. Cons. Stat. §2304',
  'Pennsylvania Breach Notification Act',
  'Pennsylvania law requires notification within 7 days of breach discovery if immediate harm is likely, otherwise within a reasonable time (typically interpreted as within 30 days). Pennsylvania residents and the Attorney General must be notified.',
  '7 days (if immediate harm) or 30 days (typical)',
  '["Any entity handling Pennsylvania resident data"]',
  'demo-bcbs-001',
  3000_per_record,
  '["Affected Pennsylvania Residents", "Pennsylvania Attorney General", ' ||
   '"Pennsylvania Insurance Department (for health plans)"]',
  '["Breach description", "Data types exposed", "Assessment of harm", "Remediation steps"]',
  '["Encrypted data per Pennsylvania standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Ohio - Data Protection Act
-- Ohio Revised Code §1347.12, §1349.19
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-oh-data-protection',
  'Ohio',
  'Ohio Revised Code §1347.12, §1349.19',
  'Ohio Data Protection Act',
  'Ohio law requires notification of breaches involving Ohio residents. Timeline is "without unreasonable delay" but within 30 days is considered compliant. For health information, Ohio Insurance Department may require additional reporting.',
  '30 days from breach discovery',
  '["Any entity handling Ohio resident data"]',
  'demo-bcbs-001',
  5000_per_record,
  '["Affected Ohio Residents", "Ohio Attorney General", ' ||
   '"Ohio Department of Insurance (for health plans)"]',
  '["Breach description", "Data types exposed", "Remediation steps"]',
  '["Encrypted data per Ohio standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Michigan - Identity Theft Protection Act
-- Michigan Compiled Laws §445.63-69
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-mi-identity-theft',
  'Michigan',
  'Michigan Compiled Laws §445.63',
  'Michigan Identity Theft Protection Act',
  'Michigan law requires notification of breaches involving Michigan residents. Notification must be made "without unreasonable delay" and within 30 days of breach discovery. For medical information, Department of Insurance and Financial Services may require additional reporting.',
  '30 days from breach discovery',
  '["Any entity handling Michigan resident data"]',
  'demo-bcbs-001',
  2500_per_record,
  '["Affected Michigan Residents", "Michigan Attorney General", ' ||
   '"Michigan Department of Insurance and Financial Services (for health plans)"]',
  '["Breach description", "Data types exposed", "Remediation steps"]',
  '["Encrypted data per Michigan standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Georgia - Personal Identity Protection Act
-- O.C.G.A. §10-1-910-916
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-ga-pipa',
  'Georgia',
  'O.C.G.A. §10-1-912',
  'Georgia Personal Identity Protection Act',
  'Georgia law requires notification of breaches involving Georgia residents. Notification must be made within 30 days of breach discovery. Georgia Insurance Department may require additional reporting for health information breaches.',
  '30 days from breach discovery',
  '["Any entity handling Georgia resident data"]',
  'demo-bcbs-001',
  5000_per_record,
  '["Affected Georgia Residents", "Georgia Attorney General", ' ||
   '"Georgia Insurance Department (for health plans)"]',
  '["Breach description", "Data types exposed", "Remediation steps"]',
  '["Encrypted data per Georgia standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- North Carolina - Identity Theft Protection Act
-- N.C. Gen. Stat. §75-61-67
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-nc-identity-theft',
  'North Carolina',
  'N.C. Gen. Stat. §75-64',
  'North Carolina Identity Theft Protection Act',
  'North Carolina law requires notification of breaches involving North Carolina residents. Notification must be made within a reasonable time (typically within 30 days). North Carolina Department of Justice maintains a breach reporting portal.',
  '30 days from breach discovery',
  '["Any entity handling North Carolina resident data"]',
  'demo-bcbs-001',
  5000_per_record,
  '["Affected North Carolina Residents", "North Carolina Department of Justice"]',
  '["Breach description", "Data types exposed", "Remediation steps"]',
  '["Encrypted data per North Carolina standards"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADDITIONAL FEDERAL OBLIGATIONS
-- Other federal requirements relevant to healthcare payers
-- ============================================================================

-- NAIC Insurance Data Security Model Law
-- Adopted by most states (requirements for insurers)
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-naic-data-security',
  'NAIC',
  'NAIC Insurance Data Security Model Law (2022)',
  'NAIC Insurance Data Security Model Law',
  'Model law adopted by most states establishing data security requirements for insurers. Requires written information security program, employee training, vendor risk management, and breach notification to state insurance commissioners. Most states have adopted this model.',
  'Varies by state (typically 30 days); Report to state insurance commissioner',
  '["Health Insurer", "Licensed Insurance Entity"]',
  'demo-bcbs-001',
  100000,
  '["State Insurance Commissioner", "State regulators"]',
  '["Written Information Security Program", "Incident Response Plan", ' ||
   '"Employee Training Records", "Vendor Risk Management", "Breach Notification Details"]',
  '["Varies by state implementation"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ERISA - Employee Retirement Income Security Act
-- For self-funded employer health plans
INSERT INTO legal_obligations (
  id,
  source,
  citation,
  name,
  description,
  notification_timeline,
  applicability,
  organization_id,
  max_penalty_amount,
  notification_recipients,
  required_elements,
  exemptions,
  last_updated
) VALUES (
  'lo-erisa-breach',
  'DOL/EBSA',
  '29 U.S.C. §1182b + EBSA Guidance',
  'ERISA Welfare Plan Breach Notification',
  'For self-funded ERISA group health plans, breach notification requirements apply under ERISA. Plan sponsors must notify plan participants, DOL, and potentially other entities following a breach of personal health information.',
  '30 days from breach discovery (EBSA guidance)',
  '["ERISA Plan Sponsor", "Self-Funded Health Plan"]',
  'demo-bcbs-001',
  110_per_day,
  '["Plan Participants", "Department of Labor (EBSA)", "Plan Fiduciaries"]',
  '["Breach description", "Participant impact", "Remediation steps", "ERISA-specific reporting"]',
  '["Fully insured plans (state law applies)"]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- After running this seed, you should have:
-- - 20 Legal Obligations (2 HIPAA, 4 CMS/ACA, 12 State, 2 Federal)
-- - All obligations linked to demo-bcbs-001 organization
-- - Notification timelines ranging from 1 day (CMS Part D) to 60 days (HIPAA)
-- - Penalties ranging from $110/day (ERISA) to $68,928 (HIPAA) per violation
-- - Coverage across all 10 BCBS markets (CA, NY, TX, FL, IL, PA, OH, MI, GA, NC)
-- ============================================================================

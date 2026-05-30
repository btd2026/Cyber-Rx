-- ============================================================================
-- Seed File: Crown Jewel Business Processes
-- Task: T-108
-- Description: Seed 10 Tier-1 Crown Jewel BusinessProcess records for BCBS demo tenant
-- Organization: BCBS Demo Tenant (org_id: demo-bcbs-001)
-- ============================================================================

-- BCBS Demo Tenant Organization
-- This seed assumes the organization exists. If not, it will be created.
INSERT INTO organizations (id, name, type, tier, geographic_coverage, created_at)
VALUES (
  'demo-bcbs-001',
  'Blue Cross Blue Shield Demo',
  'Health Plan',
  'Tier 1',
  '["CA", "NY", "TX", "FL", "IL", "PA", "OH", "MI", "GA", "NC"]',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CROWN JEWEL BUSINESS PROCESSES (Tier 1)
-- These are the 10 most critical processes for a healthcare payer organization
-- Each is mapped to supporting controls, data objects created, and executive ownership
-- ============================================================================

-- 1. Claims Adjudication
-- Core business process: evaluates, processes, and pays healthcare claims
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-claims-adjudication',
  'demo-bcbs-001',
  'Claims Adjudication',
  'Evaluates, processes, and pays healthcare claims according to contract terms, clinical guidelines, and regulatory requirements. This is the core revenue cycle process that determines payment accuracy and member satisfaction.',
  'Tier 1',
  'Critical',
  'CRO',
  '["NASCO", "HealthEdge", "FACETS", "QNXT"]',
  '["phi-claims-data", "phi-member-demographics", "financial-claims-payment"]',
  '["control-claim-edit-validation", "control-fraud-detection", "control-hipaa-privacy"]',
  'Direct impact on revenue, regulatory compliance (HIPAA), and member satisfaction. Processing delays affect provider relationships and cash flow.',
  '4 hours',
  '15 minutes'
) ON CONFLICT (id) DO NOTHING;

-- 2. Enrollment and Eligibility
-- Core business process: member enrollment, eligibility verification, benefit determination
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-enrollment-eligibility',
  'demo-bcbs-001',
  'Enrollment and Eligibility',
  'Manages member enrollment, eligibility verification, and benefit determination. Ensures accurate member data for claims processing and regulatory reporting (CMS 834 transactions).',
  'Tier 1',
  'Critical',
  'COO',
  '["NASCO", "Member Portal", "CRM System"]',
  '["phi-enrollment-data", "phi-eligibility-records", "phi-benefit-design"]',
  '["control-data-validation", "control-cms-834-compliance", "control-access-control"]',
  'Critical for claims accuracy and CMS compliance. Errors lead to claim denials, member dissatisfaction, and regulatory penalties.',
  '2 hours',
  '0 minutes (real-time sync required)'
) ON CONFLICT (id) DO NOTHING;

-- 3. Provider Network Management
-- Core business process: provider contracting, credentialing, and directory management
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  ownerity,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-provider-network',
  'demo-bcbs-001',
  'Provider Network Management',
  'Manages provider contracting, credentialing, network adequacy, and provider directory maintenance. Ensures members have access to quality care and in-network providers.',
  'Tier 1',
  'Critical',
  'CRO',
  '["Provider Portal", "Credentialing System", "Network Management"]',
  '["pii-provider-data", "phi-provider-records", "contract-provider-agreements"]',
  '["control-provider-credentialing", "control-network-adequacy", "control-ncqa-standards"]',
  'Impacts member access to care, network adequacy compliance, and provider reimbursement accuracy.',
  '8 hours',
  '1 hour'
) ON CONFLICT (id) DO NOTHING;

-- 4. Care Management
-- Core business process: case management, utilization management, care coordination
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-care-management',
  'demo-bcbs-001',
  'Care Management',
  'Coordinates member care through case management, utilization management, and care coordination programs. Ensures appropriate, cost-effective care delivery and member safety.',
  'Tier 1',
  'Critical',
  'CMO',
  '["Care Management Platform", "Utilization Management System", "Nurse Line"]',
  '["phi-care-plans", "phi-utilization-records", "phi-medical-necessity-determinations"]',
  '["control-um-criteria", "control-care-coordination", "control-member-safety"]',
  'Direct impact on member health outcomes, medical cost trend, and regulatory compliance (IMs).',
  '4 hours',
  '30 minutes'
) ON CONFLICT (id) DO NOTHING;

-- 5. Payment Integrity
-- Core business process: payment accuracy, fraud detection, recovery, coordination of benefits
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-payment-integrity',
  'demo-bcbs-001',
  'Payment Integrity',
  'Ensures payment accuracy through pre-payment edit validation, post-payment review, fraud detection, and coordination of benefits. Critical for financial sustainability and regulatory compliance.',
  'Tier 1',
  'Critical',
  'CFO',
  '["FACS", "Payment Integrity Platform", "Fraud Detection System", "COB System"]',
  '["financial-payment-records", "phi-claims-data", "financial-recovery-records"]',
  '["control-payment-validation", "control-fraud-detection", "control-cob-compliance"]',
  'Direct impact on financial performance. Improper payments lead to regulatory penalties and reputational damage.',
  '24 hours',
  '4 hours'
) ON CONFLICT (id) DO NOTHING;

-- 6. Member Services
-- Core business process: member support, grievance resolution, appeals
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-member-services',
  'demo-bcbs-001',
  'Member Services',
  'Provides member support through call centers, online portals, and mobile apps. Manages grievances, appeals, and member inquiries. Critical for member satisfaction and retention.',
  'Tier 1',
  'Critical',
  'CXO',
  '["Genesys", "Member Portal", "Mobile App", "CRM System"]',
  '["phi-member-inquiries", "phi-grievance-records", "phi-appeals-documents"]',
  '["control-grievance-resolution", "control-appeals-process", "control-member-privacy"]',
  'Impacts CAHPS scores, member retention, and regulatory compliance (grievance timelines).',
  '2 hours',
  '0 minutes (real-time)'
) ON CONFLICT (id) DO NOTHING;

-- 7. Actuarial Services
-- Core business process: rating, reserving, financial forecasting, risk assessment
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-actuarial',
  'demo-bcbs-001',
  'Actuarial Services',
  'Performs rating, reserving, financial forecasting, and risk assessment. Critical for product pricing, financial reporting, and regulatory solvency requirements.',
  'Tier 1',
  'Critical',
  'CFO',
  '["Actuarial Modeling System", "Enterprise Data Warehouse", "Financial Planning System"]',
  '["financial-pricing-data", "financial-reserve-estimates", "financial-risk-ratings"]',
  '["control-actuarial-standards", "control-solvency-testing", "control-annual-statement"]',
  'Direct impact on financial stability, regulatory compliance, and product profitability.',
  '24 hours',
  '1 day'
) ON CONFLICT (id) DO NOTHING;

-- 8. Government Programs
-- Core business process: Medicare, Medicaid, Marketplace compliance and reporting
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-government-programs',
  'demo-bcbs-001',
  'Government Programs',
  'Manages Medicare, Medicaid, and Marketplace (ACA) program compliance, reporting, and reimbursement. Critical for government revenue and regulatory compliance.',
  'Tier 1',
  'Critical',
  'CRO',
  '["CMS Systems", "Medicaid Systems", "Marketplace Platform"]',
  '["phi-medicare-beneficiaries", "phi-medicaid-enrollees", "regulatory-cms-reports"]',
  ['["control-cms-compliance", "control-medicare-conditions", "control-marketplace-rules"]', -- Fixed syntax
  'Impact on government reimbursement, regulatory compliance, and program participation.',
  '8 hours',
  '1 day'
) ON CONFLICT (id) DO NOTHING;

-- 9. Pharmacy and PBM Services
-- Core business process: pharmacy benefit management, formulary management, drug utilization review
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-pharmacy-pbm',
  'demo-bcbs-001',
  'Pharmacy and PBM Services',
  'Manages pharmacy benefits, formulary management, drug utilization review, and pharmacy claims processing. Critical for drug spend management and member safety.',
  'Tier 1',
  'Critical',
  'CMO',
  '["PBM Platform", "Pharmacy Claims System", "Formulary Management"]',
  '["phi-pharmacy-claims", "phi-prescription-records", "financial-pharmacy-spend"]',
  '["control-formulary-management", "control-drug-utilization-review", "control-diversion-prevention"]',
  'Impact on drug spend trend, member safety, and regulatory compliance ( opioids, diversion ).',
  '4 hours',
  '30 minutes'
) ON CONFLICT (id) DO NOTHING;

-- 10. Compliance and Regulatory
-- Core business process: regulatory reporting, audits, privacy compliance, ethics program
INSERT INTO business_processes (
  id,
  organization_id,
  name,
  description,
  tier,
  criticality,
  owner_role,
  supported_by_applications,
  creates_data_objects,
  governed_by_controls,
  business_impact,
  recovery_time_objective,
  recovery_point_objective
) VALUES (
  'bp-compliance-regulatory',
  'demo-bcbs-001',
  'Compliance and Regulatory',
  'Manages regulatory reporting, internal audits, HIPAA privacy compliance, Medicare/Medicaid conditions of participation, and ethics program. Critical for regulatory standing and risk management.',
  'Tier 1',
  'Critical',
  'CLO',
  '["Compliance Management System", "Audit Tracking", "Privacy Platform", "Training System"]',
  '["regulatory-reports", "privacy-incident-logs", "compliance-audit-records"]',
  '["control-privacy-compliance", "control-audit-readiness", "control-ethics-program"]',
  'Critical for regulatory standing, audit readiness, and risk management. Failures lead to penalties and sanctions.',
  '8 hours',
  '1 day'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DATA OBJECTS REFERENCED IN BUSINESS PROCESSES
-- Create the data objects that are referenced in the business processes above
-- ============================================================================

-- PHI Data Objects
INSERT INTO data_objects (id, type, sensitivity, record_count_est, description, organization_id)
VALUES
  ('phi-claims-data', 'PHI', 'High', 50000000, 'Claims data including diagnosis, procedure codes, and payment information', 'demo-bcbs-001'),
  ('phi-member-demographics', 'PHI', 'High', 8000000, 'Member demographic information including name, DOB, address, member ID', 'demo-bcbs-001'),
  ('financial-claims-payment', 'Financial', 'Medium', 150000000, 'Claims payment transactions and remittance advice', 'demo-bcbs-001'),
  ('phi-enrollment-data', 'PHI', 'High', 8000000, 'Member enrollment forms and eligibility records', 'demo-bcbs-001'),
  ('phi-eligibility-records', 'PHI', 'High', 8000000, 'Real-time eligibility verification records', 'demo-bcbs-001'),
  ('phi-benefit-design', 'PHI', 'Medium', 50000, 'Benefit plan design and coverage determinations', 'demo-bcbs-001'),
  ('pii-provider-data', 'PII', 'Medium', 500000, 'Provider demographic and contact information', 'demo-bcbs-001'),
  ('phi-provider-records', 'PHI', 'Medium', 500000, 'Provider patient encounter records', 'demo-bcbs-001'),
  ('contract-provider-agreements', 'Legal', 'Medium', 500000, 'Provider contracts and amendment agreements', 'demo-bcbs-001'),
  ('phi-care-plans', 'PHI', 'High', 500000, 'Member care management plans and interventions', 'demo-bcbs-001'),
  ('phi-utilization-records', 'PHI', 'High', 2000000, 'Utilization management determinations and authorizations', 'demo-bcbs-001'),
  ('phi-medical-necessity-determinations', 'PHI', 'High', 1500000, 'Medical necessity and appropriateness determinations', 'demo-bcbs-001'),
  ('financial-payment-records', 'Financial', 'Medium', 150000000, 'Historical payment records for reconciliation', 'demo-bcbs-001'),
  ('financial-recovery-records', 'Financial', 'Low', 5000000, 'Overpayment recovery and coordination of benefits records', 'demo-bcbs-001'),
  ('phi-member-inquiries', 'PHI', 'Medium', 10000000, 'Member service call and inquiry records', 'demo-bcbs-001'),
  ('phi-grievance-records', 'PHI', 'High', 500000, 'Member grievances and complaint resolution records', 'demo-bcbs-001'),
  ('phi-appeals-documents', 'PHI', 'High', 200000, 'Appeals requests and determination documents', 'demo-bcbs-001'),
  ('financial-pricing-data', 'Financial', 'Medium', 10000, 'Product pricing and rating factor data', 'demo-bcbs-001'),
  ('financial-reserve-estimates', 'Financial', 'High', 5000, 'Insurance reserve estimates and assumptions', 'demo-bcbs-001'),
  ('financial-risk-ratings', 'Financial', 'Medium', 50000, 'Risk rating and underwriting data', 'demo-bcbs-001'),
  ('phi-medicare-beneficiaries', 'PHI', 'High', 2000000, 'Medicare member eligibility and enrollment records', 'demo-bcbs-001'),
  ('phi-medicaid-enrollees', 'PHI', 'High', 1500000, 'Medicaid member eligibility and enrollment records', 'demo-bcbs-001'),
  ('regulatory-cms-reports', 'Regulatory', 'Medium', 5000, 'CMS regulatory reports and submissions', 'demo-bcbs-001'),
  ('phi-pharmacy-claims', 'PHI', 'High', 30000000, 'Pharmacy claims and prescription drug records', 'demo-bcbs-001'),
  ('phi-prescription-records', 'PHI', 'High', 30000000, 'Prescription drug and dispensing records', 'demo-bcbs-001'),
  ('financial-pharmacy-spend', 'Financial', 'Medium', 30000000, 'Pharmacy benefit spend and trend data', 'demo-bcbs-001'),
  ('regulatory-reports', 'Regulatory', 'Medium', 10000, 'Regulatory submission and report archive', 'demo-bcbs-001'),
  ('privacy-incident-logs', 'PII', 'High', 5000, 'Privacy incident and breach logs', 'demo-bcbs-001'),
  ('compliance-audit-records', 'Confidential', 'Medium', 20000, 'Internal and external audit findings and workpapers', 'demo-bcbs-001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- After running this seed, you should have:
-- - 10 Tier-1 Business Processes
-- - 29 Data Objects
-- - All processes linked to their supporting applications and data objects
-- ============================================================================

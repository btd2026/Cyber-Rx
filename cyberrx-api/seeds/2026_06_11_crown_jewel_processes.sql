-- ============================================================================
-- Seed File: Crown Jewel Business Processes for BCBS Demo Tenant
-- Date: 2026-06-11
-- Task: #41 - Implement Business Process Module
--
-- Description:
-- Pre-populates 10 Crown Jewel business processes for BCBS (Blue Cross Blue Shield)
-- These are the most critical healthcare payer business processes that require
-- maximum protection and oversight.
--
-- Organization: BCBS Demo Tenant (org_id: demo-bcbs-001)
-- ============================================================================

-- Ensure BCBS Demo Tenant exists
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
-- TIER 1: PRIMARY CROWN JEWELS (7 processes)
-- Core business operations - revenue-generating, member-facing, regulated
-- ============================================================================

-- 1. Claims & Payment Operations
-- The heartbeat of the business - processes claims, makes payments
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_claims_payment_ops',
  'Claims & Payment Operations',
  'Primary',
  'Critical',
  'CIO',
  'Evaluates, processes, and pays healthcare claims according to contract terms, clinical guidelines, and regulatory requirements. This is the core revenue cycle process that determines payment accuracy, provider relationships, and member satisfaction.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. Membership & Enrollment
-- Member onboarding, eligibility determination, plan enrollment
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_membership_enrollment',
  'Membership & Enrollment',
  'Primary',
  'Critical',
  'CIO',
  'Handles new member enrollment, eligibility verification, plan selection, and member data maintenance. Critical for revenue recognition, regulatory compliance, and member access to care.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. Provider Operations
-- Provider network management, credentialing, contracting
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_provider_operations',
  'Provider Operations',
  'Primary',
  'Critical',
  'CIO',
  'Manages provider network relationships, credentialing, contract negotiations, and provider performance monitoring. Essential for ensuring access to care and maintaining provider networks.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. Care Management
-- Case management, utilization management, care coordination
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_care_management',
  'Care Management',
  'Primary',
  'High',
  'CIO',
  'Coordinates member care through case management, utilization review, prior authorization, and care coordination programs. Balances quality of care with cost containment and regulatory compliance.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 5. Payment Integrity / Fraud, Waste & Abuse (FWA)
-- Claims auditing, fraud detection, overpayment recovery
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_payment_integrity_fwa',
  'Payment Integrity / Fraud, Waste & Abuse',
  'Primary',
  'High',
  'CFO',
  'Detects and prevents fraudulent claims, waste, and abuse through advanced analytics, claim auditing, and investigation. Critical for financial integrity and regulatory compliance.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 6. Member Services
-- Customer service, grievance resolution, member support
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_member_services',
  'Member Services',
  'Primary',
  'High',
  'CIO',
  'Provides member support through call centers, online portals, and mobile apps. Handles inquiries, grievances, appeals, and member communications. Direct impact on member satisfaction and retention.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 7. Government Programs
-- Medicare, Medicaid, FEP, other government program administration
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_government_programs',
  'Government Programs',
  'Primary',
  'Critical',
  'CIO',
  'Administers Medicare, Medicaid, FEP, and other government-sponsored health programs. Highly regulated with strict compliance requirements and significant audit risk.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- TIER 2: STRATEGIC CROWN JEWELS (3 processes)
-- Long-term capabilities, cross-cutting infrastructure, data platforms
-- ============================================================================

-- 8. Actuarial & Financial Analytics
-- Risk assessment, pricing, financial forecasting, analytics
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_actuarial_financial_analytics',
  'Actuarial & Financial Analytics',
  'Strategic',
  'High',
  'CFO',
  'Performs risk assessment, pricing strategy, financial forecasting, and business analytics. Critical for product profitability, financial planning, and regulatory reporting.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 9. Identity & Access Ecosystem
-- Identity management, authentication, authorization, access governance
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_identity_access_ecosystem',
  'Identity & Access Ecosystem',
  'Strategic',
  'Critical',
  'CISO',
  'Manages user identities, authentication, authorization, and access governance across all systems. Foundation of cybersecurity defense and regulatory compliance.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 10. Enterprise PHI Data Platforms
-- PHI data lakes, data warehousing, analytics platforms
INSERT INTO business_processes (
  id,
  name,
  tier,
  criticality,
  owner,
  description,
  organization_id,
  supported_by_systems,
  creates_data_objects,
  governed_by_controls,
  created_at,
  updated_at
) VALUES (
  'bp_enterprise_phi_data_platforms',
  'Enterprise PHI Data Platforms',
  'Strategic',
  'Critical',
  'CISO',
  'Centralized PHI data platforms, data lakes, warehousing, and analytics infrastructure. Stores and processes the organization''s most sensitive data assets.',
  'demo-bcbs-001',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  criticality = EXCLUDED.criticality,
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Verify all 10 processes were created
-- SELECT tier, criticality, owner, COUNT(*) as process_count
-- FROM business_processes
-- WHERE organization_id = 'demo-bcbs-001'
-- GROUP BY tier, criticality, owner
-- ORDER BY tier, criticality DESC;

-- Expected output:
-- Primary | Critical | CIO    | 3  (Claims, Membership, Provider, Government Programs)
-- Primary | Critical | CIO    | 1  (Government Programs)
-- Primary | High     | CIO    | 2  (Care Management, Member Services)
-- Primary | High     | CFO    | 1  (Payment Integrity/FWA)
-- Strategic| High     | CFO    | 1  (Actuarial & Financial Analytics)
-- Strategic| Critical | CISO   | 2  (Identity & Access, Enterprise PHI Data Platforms)
-- Total: 10 processes

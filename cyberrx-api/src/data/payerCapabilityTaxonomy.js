'use strict';

/**
 * payerCapabilityTaxonomy — the canonical, plan-agnostic payer capability model
 * (Phase 1 reference content). SHARED and versioned; contains NO plan-identifying
 * data. Three content tiers:
 *   A_universal — capabilities every health-insurance payer has.
 *   B_blue      — Blue-specific programs (BlueCard/Inter-Plan, FEP, BCBSA).
 *   C_extension — per-plan extensions (none shipped centrally; added per tenant).
 *
 * Each node: id, optional parent (function -> capability), content_tier,
 * kind ('function' | 'capability'), name, default criticality tier (1|2|3),
 * and default RTO. A tenant inherits these defaults and may override per-process.
 *
 * `dependencyCatalog` lists common payer third-party dependencies (vendors as
 * dependency-graph nodes, not connectors) used to seed tenant graphs in the
 * wizard — kept here as reference data, instantiated per tenant later.
 */

const VERSION = { id: 'payerlib_v1', label: 'Payer Capability Library', version: '1.0.0' };

const CAPABILITIES = [
  // ── Tier A — universal payer functions & capabilities ──────────────────────
  { id: 'fn.enrollment', tier: 'A_universal', kind: 'function', name: 'Enrollment & Eligibility', crit: 1, rto: '24h' },
  { id: 'cap.enroll.intake', parent: 'fn.enrollment', tier: 'A_universal', kind: 'capability', name: 'Member Enrollment & Intake', crit: 1, rto: '24h' },
  { id: 'cap.enroll.eligibility', parent: 'fn.enrollment', tier: 'A_universal', kind: 'capability', name: 'Eligibility Determination', crit: 1, rto: '24h' },
  { id: 'cap.enroll.idcards', parent: 'fn.enrollment', tier: 'A_universal', kind: 'capability', name: 'ID Card Issuance', crit: 2, rto: '72h' },

  { id: 'fn.claims', tier: 'A_universal', kind: 'function', name: 'Claims & Encounters', crit: 1, rto: '4h' },
  { id: 'cap.claims.intake', parent: 'fn.claims', tier: 'A_universal', kind: 'capability', name: 'Claims Intake / EDI', crit: 1, rto: '4h' },
  { id: 'cap.claims.adjudication', parent: 'fn.claims', tier: 'A_universal', kind: 'capability', name: 'Claims Adjudication', crit: 1, rto: '4h' },
  { id: 'cap.claims.payment', parent: 'fn.claims', tier: 'A_universal', kind: 'capability', name: 'Provider Payment & Remittance', crit: 1, rto: '24h' },
  { id: 'cap.claims.encounters', parent: 'fn.claims', tier: 'A_universal', kind: 'capability', name: 'Encounter Submission', crit: 2, rto: '72h' },

  { id: 'fn.provider', tier: 'A_universal', kind: 'function', name: 'Provider Network Management', crit: 2, rto: '72h' },
  { id: 'cap.provider.contracting', parent: 'fn.provider', tier: 'A_universal', kind: 'capability', name: 'Provider Contracting', crit: 2, rto: '72h' },
  { id: 'cap.provider.credentialing', parent: 'fn.provider', tier: 'A_universal', kind: 'capability', name: 'Provider Credentialing', crit: 2, rto: '72h' },
  { id: 'cap.provider.directory', parent: 'fn.provider', tier: 'A_universal', kind: 'capability', name: 'Provider Directory', crit: 2, rto: '72h' },

  { id: 'fn.member', tier: 'A_universal', kind: 'function', name: 'Member Services', crit: 1, rto: '24h' },
  { id: 'cap.member.support', parent: 'fn.member', tier: 'A_universal', kind: 'capability', name: 'Member Contact Center', crit: 1, rto: '24h' },
  { id: 'cap.member.portal', parent: 'fn.member', tier: 'A_universal', kind: 'capability', name: 'Member Portal & Mobile App', crit: 2, rto: '24h' },
  { id: 'cap.member.grievances', parent: 'fn.member', tier: 'A_universal', kind: 'capability', name: 'Grievances & Appeals', crit: 2, rto: '72h' },

  { id: 'fn.um', tier: 'A_universal', kind: 'function', name: 'Care & Utilization Management', crit: 1, rto: '24h' },
  { id: 'cap.um.priorauth', parent: 'fn.um', tier: 'A_universal', kind: 'capability', name: 'Prior Authorization', crit: 1, rto: '24h' },
  { id: 'cap.um.casemgmt', parent: 'fn.um', tier: 'A_universal', kind: 'capability', name: 'Case & Disease Management', crit: 2, rto: '72h' },
  { id: 'cap.um.concurrent', parent: 'fn.um', tier: 'A_universal', kind: 'capability', name: 'Concurrent Review', crit: 2, rto: '72h' },

  { id: 'fn.payint', tier: 'A_universal', kind: 'function', name: 'Payment Integrity', crit: 2, rto: '72h' },
  { id: 'cap.payint.fwa', parent: 'fn.payint', tier: 'A_universal', kind: 'capability', name: 'Fraud, Waste & Abuse Detection', crit: 2, rto: '72h' },
  { id: 'cap.payint.cob', parent: 'fn.payint', tier: 'A_universal', kind: 'capability', name: 'Coordination of Benefits', crit: 2, rto: '72h' },
  { id: 'cap.payint.subrogation', parent: 'fn.payint', tier: 'A_universal', kind: 'capability', name: 'Subrogation & Recovery', crit: 3, rto: '1w' },

  { id: 'fn.actuarial', tier: 'A_universal', kind: 'function', name: 'Actuarial & Underwriting', crit: 2, rto: '72h' },
  { id: 'cap.act.pricing', parent: 'fn.actuarial', tier: 'A_universal', kind: 'capability', name: 'Premium Rating & Pricing', crit: 2, rto: '72h' },
  { id: 'cap.act.underwriting', parent: 'fn.actuarial', tier: 'A_universal', kind: 'capability', name: 'Underwriting', crit: 2, rto: '72h' },
  { id: 'cap.act.reserving', parent: 'fn.actuarial', tier: 'A_universal', kind: 'capability', name: 'Reserving (IBNR)', crit: 2, rto: '1w' },

  { id: 'fn.finance', tier: 'A_universal', kind: 'function', name: 'Finance & Treasury', crit: 2, rto: '72h' },
  { id: 'cap.fin.gl', parent: 'fn.finance', tier: 'A_universal', kind: 'capability', name: 'General Ledger & Financial Reporting', crit: 2, rto: '72h' },
  { id: 'cap.fin.treasury', parent: 'fn.finance', tier: 'A_universal', kind: 'capability', name: 'Treasury & Disbursements', crit: 1, rto: '24h' },
  { id: 'cap.fin.statutory', parent: 'fn.finance', tier: 'A_universal', kind: 'capability', name: 'Statutory & Regulatory Reporting', crit: 2, rto: '1w' },

  { id: 'fn.compliance', tier: 'A_universal', kind: 'function', name: 'Compliance & Regulatory', crit: 2, rto: '72h' },
  { id: 'cap.comp.privacy', parent: 'fn.compliance', tier: 'A_universal', kind: 'capability', name: 'Privacy & HIPAA Compliance', crit: 1, rto: '72h' },
  { id: 'cap.comp.regfilings', parent: 'fn.compliance', tier: 'A_universal', kind: 'capability', name: 'Regulatory Filings', crit: 2, rto: '1w' },
  { id: 'cap.comp.audit', parent: 'fn.compliance', tier: 'A_universal', kind: 'capability', name: 'Audit & Internal Controls', crit: 3, rto: '1w' },

  { id: 'fn.pharmacy', tier: 'A_universal', kind: 'function', name: 'Pharmacy Benefits', crit: 2, rto: '24h' },
  { id: 'cap.rx.claims', parent: 'fn.pharmacy', tier: 'A_universal', kind: 'capability', name: 'Pharmacy Claims (PBM)', crit: 1, rto: '24h' },
  { id: 'cap.rx.formulary', parent: 'fn.pharmacy', tier: 'A_universal', kind: 'capability', name: 'Formulary Management', crit: 2, rto: '72h' },

  { id: 'fn.sales', tier: 'A_universal', kind: 'function', name: 'Sales & Marketing', crit: 3, rto: '1w' },
  { id: 'cap.sales.quoting', parent: 'fn.sales', tier: 'A_universal', kind: 'capability', name: 'Quoting & Proposals', crit: 3, rto: '1w' },
  { id: 'cap.sales.broker', parent: 'fn.sales', tier: 'A_universal', kind: 'capability', name: 'Broker & Agent Management', crit: 3, rto: '1w' },

  { id: 'fn.itsec', tier: 'A_universal', kind: 'function', name: 'IT & Security Operations', crit: 1, rto: '4h' },
  { id: 'cap.it.identity', parent: 'fn.itsec', tier: 'A_universal', kind: 'capability', name: 'Identity & Access Management', crit: 1, rto: '4h' },
  { id: 'cap.it.infra', parent: 'fn.itsec', tier: 'A_universal', kind: 'capability', name: 'Core Infrastructure & Network', crit: 1, rto: '4h' },
  { id: 'cap.it.secops', parent: 'fn.itsec', tier: 'A_universal', kind: 'capability', name: 'Security Operations (SOC)', crit: 1, rto: '4h' },
  { id: 'cap.it.data', parent: 'fn.itsec', tier: 'A_universal', kind: 'capability', name: 'Data Platform & Analytics', crit: 2, rto: '24h' },

  // ── Tier B — Blue-specific programs ────────────────────────────────────────
  { id: 'fn.blue', tier: 'B_blue', kind: 'function', name: 'Blue Cross Blue Shield Programs', crit: 1, rto: '24h' },
  { id: 'cap.blue.bluecard', parent: 'fn.blue', tier: 'B_blue', kind: 'capability', name: 'BlueCard / Inter-Plan Programs', crit: 1, rto: '24h' },
  { id: 'cap.blue.fep', parent: 'fn.blue', tier: 'B_blue', kind: 'capability', name: 'Federal Employee Program (FEP)', crit: 1, rto: '24h' },
  { id: 'cap.blue.its', parent: 'fn.blue', tier: 'B_blue', kind: 'capability', name: 'Inter-Plan Settlement (ITS)', crit: 1, rto: '24h' },
  { id: 'cap.blue.bcbsa', parent: 'fn.blue', tier: 'B_blue', kind: 'capability', name: 'BCBSA Governance & Brand Compliance', crit: 2, rto: '1w' },
  { id: 'cap.blue.licensure', parent: 'fn.blue', tier: 'B_blue', kind: 'capability', name: 'Blue Plan Licensure & NAIC', crit: 2, rto: '1w' },
];

// Packs group capabilities; business types select packs (A always; B for Blue).
const PACKS = {
  universal_payer: CAPABILITIES.filter((c) => c.tier === 'A_universal').map((c) => c.id),
  blue: CAPABILITIES.filter((c) => c.tier === 'B_blue').map((c) => c.id),
};

// Business type (matches the intake orgType choices) -> packs to load.
const BUSINESS_TYPE_PACKS = {
  'BCBS Plan': ['universal_payer', 'blue'],
  'Commercial Health Plan': ['universal_payer'],
  'Medicare Advantage Plan': ['universal_payer'],
  'Medicaid Managed Care': ['universal_payer'],
  'Multi-line Health Insurer': ['universal_payer'],
  'Regional Health Plan': ['universal_payer'],
  'Other Payer': ['universal_payer'],
};

// Common payer third-party DEPENDENCIES (graph nodes, NOT connectors). Reference
// list only; instantiated per tenant during onboarding. Not plan-identifying.
const DEPENDENCY_CATALOG = [
  { id: 'dep.nasco', name: 'NASCO', kind: 'claims_platform', tier: 'B_blue', supports: ['cap.claims.adjudication', 'cap.claims.intake'] },
  { id: 'dep.availity', name: 'Availity', kind: 'edi_clearinghouse', tier: 'A_universal', supports: ['cap.claims.intake'] },
  { id: 'dep.change_healthcare', name: 'Change Healthcare', kind: 'edi_clearinghouse', tier: 'A_universal', supports: ['cap.claims.intake', 'cap.claims.payment'] },
  { id: 'dep.prime', name: 'Prime Therapeutics', kind: 'pbm', tier: 'B_blue', supports: ['cap.rx.claims'] },
  { id: 'dep.cotiviti', name: 'Cotiviti', kind: 'payment_integrity', tier: 'A_universal', supports: ['cap.payint.fwa', 'cap.payint.cob'] },
];

module.exports = { VERSION, CAPABILITIES, PACKS, BUSINESS_TYPE_PACKS, DEPENDENCY_CATALOG };

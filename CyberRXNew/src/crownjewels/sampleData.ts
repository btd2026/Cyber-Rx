import type { GraphModel, CrownJewelSummary } from './types'

export const sampleSummary: CrownJewelSummary = {
  org_id: 'demo',
  generated_at: new Date().toISOString(),
  material_exposure_usd: 94_000_000,
  material_exposure_basis: 'Open risks on crown-jewel assets (risk register)',
  material_exposure_items: [
    { risk: 'Ransomware Attack on EHR System', asset_id: 'A1', exposure_usd: 45_000_000, severity: 'Critical' },
    { risk: 'PHI Data Breach via Application Vulnerability', asset_id: 'A3', exposure_usd: 25_000_000, severity: 'Critical' },
    { risk: 'Cloud Storage Misconfiguration', asset_id: 'A4', exposure_usd: 15_000_000, severity: 'Critical' },
    { risk: 'Third-Party Vendor Data Breach', asset_id: 'A5', exposure_usd: 9_000_000, severity: 'High' },
  ],
  counts: {
    assets: 8,
    processes: 4,
    risks: 12,
    crown_jewels: 3,
    dependency_edges: 10,
    control_applications: 45,
    control_gaps: 7,
  },
  crown_jewels: [
    {
      id: 'A1', name: 'EHR Primary Database', type: 'database', tier: 'tier1', score: 95,
      breakdown: { max_process_crit: 0.35, process_concentration: 0.12, data_sensitivity: 0.25, exposure: 0.15, spof: 0.08 },
      rationale: 'Internet-facing PHI database supporting Claims and Patient Care — single point of failure for critical processes.',
    },
    {
      id: 'A3', name: 'Clinical Lab Results Portal', type: 'application', tier: 'tier1', score: 88,
      breakdown: { max_process_crit: 0.30, process_concentration: 0.10, data_sensitivity: 0.25, exposure: 0.15, spof: 0.08 },
      rationale: 'Internet-facing application with PHI data supporting laboratory services.',
    },
    {
      id: 'A4', name: 'AWS S3 - Clinical Data Lake', type: 'storage', tier: 'tier2', score: 76,
      breakdown: { max_process_crit: 0.25, process_concentration: 0.08, data_sensitivity: 0.22, exposure: 0.12, spof: 0.09 },
      rationale: 'Cloud storage with PHI/Financial data supporting Data Analytics & Reporting.',
    },
  ],
}

export const sampleGraph: GraphModel = {
  nodes: [
    { id: 'proc:P1', type: 'process', label: 'Patient Care Delivery', attrs: { criticality: 'Critical' } },
    { id: 'proc:P2', type: 'process', label: 'Claims Processing', attrs: { criticality: 'Critical' } },
    { id: 'proc:P3', type: 'process', label: 'Laboratory Services', attrs: { criticality: 'High' } },
    { id: 'proc:P4', type: 'process', label: 'Data Analytics & Reporting', attrs: { criticality: 'Medium' } },

    { id: 'asset:A1', type: 'asset', label: 'EHR Primary Database', attrs: { crown_jewel_tier: 'tier1', score: 0.95 } },
    { id: 'asset:A2', type: 'asset', label: 'Provider SSO Gateway', attrs: { crown_jewel_tier: 'none', score: 0.45 } },
    { id: 'asset:A3', type: 'asset', label: 'Clinical Lab Portal', attrs: { crown_jewel_tier: 'tier1', score: 0.88 } },
    { id: 'asset:A4', type: 'asset', label: 'Clinical Data Lake', attrs: { crown_jewel_tier: 'tier2', score: 0.76 } },
    { id: 'asset:A5', type: 'asset', label: 'Vendor Integration API', attrs: { crown_jewel_tier: 'none', score: 0.55 } },
    { id: 'asset:A6', type: 'asset', label: 'Patient Portal', attrs: { crown_jewel_tier: 'none', score: 0.52 } },
    { id: 'asset:A7', type: 'asset', label: 'Financial ERP', attrs: { crown_jewel_tier: 'none', score: 0.48 } },
    { id: 'asset:A8', type: 'asset', label: 'Active Directory', attrs: { crown_jewel_tier: 'none', score: 0.60 } },

    { id: 'risk:R1', type: 'risk', label: 'Ransomware Attack', attrs: { severity: 'Critical' } },
    { id: 'risk:R2', type: 'risk', label: 'PHI Data Breach', attrs: { severity: 'Critical' } },
    { id: 'risk:R3', type: 'risk', label: 'Cloud Misconfiguration', attrs: { severity: 'Critical' } },
    { id: 'risk:R4', type: 'risk', label: 'Credential Stuffing', attrs: { severity: 'High' } },
    { id: 'risk:R5', type: 'risk', label: 'Supply Chain Compromise', attrs: { severity: 'High' } },
    { id: 'risk:R6', type: 'risk', label: 'Insider Threat', attrs: { severity: 'High' } },

    { id: 'ctrl:NIST_SP_800-53:AC-2', type: 'control', label: 'AC-2', attrs: { gap: true, documentation_status: 'not_documented' } },
    { id: 'ctrl:NIST_SP_800-53:SC-7', type: 'control', label: 'SC-7', attrs: { gap: false, documentation_status: 'documented' } },
    { id: 'ctrl:NIST_SP_800-53:SI-4', type: 'control', label: 'SI-4', attrs: { gap: true, documentation_status: 'partially' } },
    { id: 'ctrl:NIST_SP_800-53:CP-9', type: 'control', label: 'CP-9', attrs: { gap: true, documentation_status: 'not_documented' } },
  ],
  edges: [
    { source: 'proc:P1', target: 'asset:A1', type: 'supports', confidence: 1, origin: 'explicit' },
    { source: 'proc:P1', target: 'asset:A6', type: 'supports', confidence: 1, origin: 'explicit' },
    { source: 'proc:P2', target: 'asset:A1', type: 'supports', confidence: 1, origin: 'explicit' },
    { source: 'proc:P2', target: 'asset:A7', type: 'supports', confidence: 1, origin: 'explicit' },
    { source: 'proc:P3', target: 'asset:A3', type: 'supports', confidence: 1, origin: 'explicit' },
    { source: 'proc:P4', target: 'asset:A4', type: 'supports', confidence: 1, origin: 'explicit' },
    { source: 'proc:P1', target: 'asset:A8', type: 'supports', confidence: 0.85, origin: 'inferred' },
    { source: 'proc:P2', target: 'asset:A5', type: 'supports', confidence: 0.78, origin: 'inferred' },

    { source: 'risk:R1', target: 'asset:A1', type: 'threatens', confidence: 0.85, origin: 'register' },
    { source: 'risk:R2', target: 'asset:A3', type: 'threatens', confidence: 0.85, origin: 'threat_library' },
    { source: 'risk:R3', target: 'asset:A4', type: 'threatens', confidence: 0.85, origin: 'threat_library' },
    { source: 'risk:R4', target: 'asset:A2', type: 'threatens', confidence: 0.85, origin: 'register' },
    { source: 'risk:R5', target: 'asset:A5', type: 'threatens', confidence: 0.85, origin: 'threat_library' },
    { source: 'risk:R6', target: 'asset:A8', type: 'threatens', confidence: 0.80, origin: 'register' },

    { source: 'ctrl:NIST_SP_800-53:AC-2', target: 'asset:A1', type: 'applies_to', confidence: 0.9, origin: 'baseline_attribute_driven' },
    { source: 'ctrl:NIST_SP_800-53:SC-7', target: 'asset:A1', type: 'applies_to', confidence: 0.9, origin: 'baseline_attribute_driven' },
    { source: 'ctrl:NIST_SP_800-53:SI-4', target: 'asset:A3', type: 'applies_to', confidence: 0.9, origin: 'baseline_attribute_driven' },
    { source: 'ctrl:NIST_SP_800-53:CP-9', target: 'asset:A4', type: 'applies_to', confidence: 0.9, origin: 'baseline_attribute_driven' },
  ],
}

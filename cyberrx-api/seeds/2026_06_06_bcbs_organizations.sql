-- BCBS State-Specific Organization Profiles
-- Seed Date: 2026-06-06
-- Description: Creates 3 BCBS organizations (Massachusetts, Texas, Virginia) with complete setup_json profiles

-- Massachusetts Organization
INSERT INTO orgs (id, name, type, tier, geographic_coverage, bcbs_affiliated, setup_json)
VALUES (
  'bcbs-mass-001',
  'Blue Cross Blue Shield of Massachusetts',
  'Health Plan',
  'Tier 1',
  '["Massachusetts"]',
  true,
  '{
    "primaryDomicile": "Massachusetts",
    "hqLocation": "Boston, MA",
    "memberVolume": "2.8M",
    "providerCount": "48K",
    "keySystems": ["TriZetto Facets", "HealthEdge", "Salesforce Health Cloud"],
    "regulators": ["MA DPH", "CMS Region 1", "NAIC"],
    "executiveLeadership": {
      "CEO": "President & CEO",
      "CIO": "Chief Information Officer",
      "CISO": "Chief Information Security Officer",
      "CFO": "Chief Financial Officer"
    },
    "programs": ["Medicare Advantage", "Commercial", "Medicaid"],
    "compliancePrograms": ["HIPAA", "MA 201 CMR 17.00", "SOC 2", "NIST CSF"],
    "stateFocus": "Academic medical center partnerships, Medicare Advantage STAR ratings",
    "providerNetworkType": "Mixed (Academic + Community)",
    "regulatoryComplexity": "High (State + Federal + MA-specific privacy law)"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Texas Organization
INSERT INTO orgs (id, name, type, tier, geographic_coverage, bcbs_affiliated, setup_json)
VALUES (
  'bcbs-texas-001',
  'Blue Cross Blue Shield of Texas',
  'Health Plan',
  'Tier 1',
  '["Texas"]',
  true,
  '{
    "primaryDomicile": "Texas",
    "hqLocation": "Richardson, TX",
    "memberVolume": "6M",
    "providerCount": "70K",
    "keySystems": ["QNXT", "FACETS", "HealthEdge", "Salesforce Health Cloud"],
    "regulators": ["Texas DSHS", "Texas HHSC", "CMS Region 6", "NAIC"],
    "executiveLeadership": {
      "CEO": "President",
      "CIO": "Chief Information Officer",
      "CISO": "Chief Information Security Officer",
      "CFO": "Chief Financial Officer"
    },
    "programs": ["Medicaid Managed Care (STAR)", "CHIP", "Commercial", "Medicare Advantage"],
    "compliancePrograms": ["HIPAA", "TX HB 300", "SOC 2", "NIST CSF", "ISO 27001"],
    "stateFocus": "Texas Medicaid STAR & CHIP programs, Rural health access",
    "providerNetworkType": "Statewide (Urban + Rural)",
    "regulatoryComplexity": "Very High (Texas HB 300 + CMS + State Medicaid requirements)"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Virginia Organization
INSERT INTO orgs (id, name, type, tier, geographic_coverage, bcbs_affiliated, setup_json)
VALUES (
  'bcbs-virginia-001',
  'Blue Cross Blue Shield of Virginia (CareFirst BCBS)',
  'Health Plan',
  'Tier 1',
  '["Virginia", "Washington DC", "Maryland"]',
  true,
  '{
    "primaryDomicile": "Virginia",
    "hqLocation": "Falls Church, VA",
    "memberVolume": "2.2M",
    "providerCount": "35K",
    "keySystems": ["Change Healthcare", "Salesforce Service Cloud", "HealthEdge", "Availity"],
    "regulators": ["Virginia Bureau of Insurance", "DC Department of Insurance", "MDOC", "CMS Region 3", "NAIC"],
    "executiveLeadership": {
      "CEO": "President & CEO",
      "CIO": "Chief Information Officer",
      "CISO": "Chief Information Security Officer",
      "CFO": "Chief Financial Officer"
    },
    "programs": ["Federal Employee Program (FEP)", "Medicare Advantage", "Commercial", "Marketplace"],
    "compliancePrograms": ["HIPAA", "FEP OPM Requirements", "SOC 2", "NIST CSF", "CIS v8"],
    "stateFocus": "Federal Employee Program (FEP), Multi-state (DC/VA/MD) coordination",
    "providerNetworkType": "Multi-state (DC/VA/MD)",
    "regulatoryComplexity": "High (Federal + 3 State jurisdictions + OPM requirements)"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Verification Query:
-- SELECT id, name, type, tier, geographic_coverage FROM orgs WHERE id LIKE 'bcbs-%';

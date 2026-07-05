// Sample test data fixtures for Nerion API tests

// Sample organization (BCBS plan)
exports.sampleOrganization = {
  id: 1,
  name: 'Blue Cross Blue Shield of Test State',
  state: 'TS',
  state_name: 'Test State',
  type: 'bcbs',
  created_at: new Date('2024-01-01T00:00:00Z')
};

// Sample users with different roles
exports.sampleUsers = {
  cio: {
    id: 1,
    email: 'cio@testbcbs.com',
    name: 'Jane Chief',
    role: 'cio',
    organization_id: 1,
    created_at: new Date('2024-01-01T00:00:00Z')
  },
  ciso: {
    id: 2,
    email: 'ciso@testbcbs.com',
    name: 'John Security',
    role: 'ciso',
    organization_id: 1,
    created_at: new Date('2024-01-01T00:00:00Z')
  },
  clo: {
    id: 3,
    email: 'clo@testbcbs.com',
    name: 'Julie Legal',
    role: 'clo',
    organization_id: 1,
    created_at: new Date('2024-01-01T00:00:00Z')
  },
  cfo: {
    id: 4,
    email: 'cfo@testbcbs.com',
    name: 'James Finance',
    role: 'cfo',
    organization_id: 1,
    created_at: new Date('2024-01-01T00:00:00Z')
  }
};

// Sample security findings
exports.sampleFindings = {
  criticalCVE: {
    id: 1,
    title: 'Critical CVE-2024-1234 in Claims Processing System',
    severity: 'critical',
    status: 'open',
    source: ' RecordedFuture',
    source_type: 'threat_intelligence',
    description: 'Remote code execution vulnerability in claims processing API',
    affected_systems: ['claims-api.testbcbs.com'],
    cve_id: 'CVE-2024-1234',
    cvss_score: 9.8,
    organization_id: 1,
    created_at: new Date('2024-01-15T00:00:00Z')
  },
  phishingCampaign: {
    id: 2,
    title: 'Targeted Phishing Campaign Against HR Staff',
    severity: 'high',
    status: 'investigating',
    source: 'GuidePoint',
    source_type: 'mdr',
    description: 'Spear phishing emails targeting HR department with malware payloads',
    affected_users: 12,
    first_seen: new Date('2024-01-20T00:00:00Z'),
    organization_id: 1,
    created_at: new Date('2024-01-20T00:00:00Z')
  },
  vendorRisk: {
    id: 3,
    title: 'Third-Party Vendor Data Exfiltration Risk',
    severity: 'medium',
    status: 'monitoring',
    source: 'RiskRecon',
    source_type: 'vendor_risk',
    description: 'Vendor showing signs of data exfiltration and unusual network traffic',
    vendor_name: 'Third Party Claims Processor',
    vendor_score: 72,
    organization_id: 1,
    created_at: new Date('2024-01-25T00:00:00Z')
  },
  complianceGap: {
    id: 4,
    title: 'HIPAA Access Control Gap Detected',
    severity: 'low',
    status: 'open',
    source: 'HHS OCR',
    source_type: 'compliance',
    description: 'Missing unique user identification for PHI access',
    control_id: 'AC-1',
    framework: 'HIPAA Security Rule',
    organization_id: 1,
    created_at: new Date('2024-01-10T00:00:00Z')
  }
};

// Sample business processes
exports.sampleBusinessProcesses = {
  claimsProcessing: {
    id: 1,
    name: 'Claims Processing',
    description: 'Healthcare claims adjudication and processing workflow',
    criticality: 'high',
    systems: ['claims-api', 'claims-db', 'claims-ui'],
    data_elements: ['PHI', 'PCI', 'PII'],
    risk_score: 85,
    organization_id: 1
  },
  membershipManagement: {
    id: 2,
    name: 'Membership Management',
    description: 'Member enrollment and eligibility management',
    criticality: 'high',
    systems: ['membership-api', 'membership-db'],
    data_elements: ['PHI', 'PII'],
    risk_score: 78,
    organization_id: 1
  },
  providerNetwork: {
    id: 3,
    name: 'Provider Network Management',
    description: 'Healthcare provider network and credentialing',
    criticality: 'medium',
    systems: ['provider-api', 'provider-db'],
    data_elements: ['PII'],
    risk_score: 65,
    organization_id: 1
  }
};

// Sample vendor risk data
exports.sampleVendors = {
  claimsProcessor: {
    id: 1,
    name: 'Third Party Claims Processor',
    tier: 'critical',
    risk_score: 72,
    findings_count: 8,
    last_assessed: new Date('2024-01-25T00:00:00Z'),
    issues: [
      { severity: 'high', description: 'Unencrypted data transmission' },
      { severity: 'medium', description: 'Missing MFA on admin accounts' }
    ],
    organization_id: 1
  },
  cloudProvider: {
    id: 2,
    name: 'Cloud Infrastructure Provider',
    tier: 'critical',
    risk_score: 45,
    findings_count: 2,
    last_assessed: new Date('2024-01-28T00:00:00Z'),
    issues: [
      { severity: 'low', description: 'Incomplete logging for some services' }
    ],
    organization_id: 1
  },
  benefitsAdmin: {
    id: 3,
    name: 'Benefits Administration System',
    tier: 'high',
    risk_score: 58,
    findings_count: 4,
    last_assessed: new Date('2024-01-22T00:00:00Z'),
    issues: [
      { severity: 'medium', description: 'Outdated SSL certificate' },
      { severity: 'low', description: 'Missing security headers' }
    ],
    organization_id: 1
  }
};

// Sample correlation results
exports.sampleCorrelations = {
  criticalPhishing: {
    id: 1,
    title: 'Critical Security Incident: Phishing + Claims System Compromise',
    confidence_score: 0.92,
    related_findings: [1, 2], // criticalCVE + phishingCampaign
    impact_summary: {
      affected_systems: 3,
      data_at_risk: 'PHI, PII',
      business_impact: 'high',
      estimated_cost: 250000
    },
    recommended_actions: [
      'Isolate affected systems immediately',
      'Rotate all credentials for claims processing',
      'Activate incident response plan'
    ],
    organization_id: 1,
    created_at: new Date('2024-01-21T00:00:00Z')
  },
  vendorBreach: {
    id: 2,
    title: 'Third-Party Risk: Vendor Breach + Data Exfiltration',
    confidence_score: 0.78,
    related_findings: [3],
    impact_summary: {
      affected_systems: 1,
      data_at_risk: 'PHI',
      business_impact: 'medium',
      estimated_cost: 75000
    },
    recommended_actions: [
      'Engage vendor for incident details',
      'Assess breach scope and notification requirements',
      'Review vendor contract for penalties'
    ],
    organization_id: 1,
    created_at: new Date('2024-01-26T00:00:00Z')
  }
};

// Sample metrics data
exports.sampleMetrics = {
  securityPosture: {
    total_findings: 156,
    critical: 3,
    high: 12,
    medium: 45,
    low: 96,
    mttc: 72, // Mean time to close (hours)
    open_findings: 89
  },
  complianceStatus: {
    frameworks: ['HIPAA', 'NIST'],
    overall_score: 87,
    controls_assessed: 234,
    controls_passing: 204,
    controls_failing: 30,
    upcoming_deadlines: 5
  },
  vendorRisk: {
    total_vendors: 48,
    critical_tier: 8,
    high_tier: 15,
    medium_tier: 18,
    low_tier: 7,
    avg_risk_score: 62,
    findings_requiring_action: 23
  }
};

// Helper to insert sample data into test database
exports.insertSampleData = async (pool) => {
  // Insert organization
  await pool.query(
    'INSERT INTO test_organizations (id, name, state, type) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
    [exports.sampleOrganization.id, exports.sampleOrganization.name, exports.sampleOrganization.state, exports.sampleOrganization.type]
  );

  // Insert users
  for (const [role, user] of Object.entries(exports.sampleUsers)) {
    await pool.query(
      'INSERT INTO test_users (id, email, name, role, organization_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
      [user.id, user.email, user.name, user.role, user.organization_id]
    );
  }

  // Insert findings
  for (const [key, finding] of Object.entries(exports.sampleFindings)) {
    await pool.query(
      `INSERT INTO test_findings (id, title, severity, status, source, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [finding.id, finding.title, finding.severity, finding.status, finding.source, finding.organization_id]
    );
  }
};

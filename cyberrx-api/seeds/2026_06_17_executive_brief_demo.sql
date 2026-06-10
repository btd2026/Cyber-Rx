-- Executive Brief demo dataset
-- ----------------------------------------------------------------------------
-- Populates a coherent, realistic healthcare-payer dataset for the org the
-- running app actually uses (orgName slug "Blue Cross Blue Shield of
-- Massachusetts" -> "blue-cross-blue-shield-of-massachusetts"), so every
-- executive agent brief renders meaningful, dollar-quantified numbers instead
-- of a zero state.
--
-- Idempotent: every row uses a fixed id with ON CONFLICT DO NOTHING.

-- Organization -------------------------------------------------------------
INSERT INTO orgs (id, name, type, has_fep, bcbs_affiliated, setup_json)
VALUES (
  'blue-cross-blue-shield-of-massachusetts',
  'Blue Cross Blue Shield of Massachusetts',
  'BCBS Plan', true, true,
  '{"revenue":"$8B-$12B","members":"2.9M","phiRecords":"3,000,000"}'
)
ON CONFLICT (id) DO NOTHING;

-- Business processes (crown jewels) ----------------------------------------
INSERT INTO business_processes (id, name, tier, criticality, owner, organization_id, description) VALUES
  ('bp-claims',     'Claims Adjudication',      'Primary',   'Critical', 'CIO', 'blue-cross-blue-shield-of-massachusetts', 'Core claims processing on NASCO'),
  ('bp-enroll',     'Membership & Enrollment',  'Primary',   'Critical', 'CIO', 'blue-cross-blue-shield-of-massachusetts', 'Member enrollment and eligibility'),
  ('bp-portal',     'Member Portal',            'Primary',   'High',     'CIO', 'blue-cross-blue-shield-of-massachusetts', 'Member-facing web and mobile portal'),
  ('bp-payint',     'Payment Integrity',        'Primary',   'Critical', 'CFO', 'blue-cross-blue-shield-of-massachusetts', 'Fraud, waste and abuse detection'),
  ('bp-provider',   'Provider Network',         'Strategic', 'High',     'COO', 'blue-cross-blue-shield-of-massachusetts', 'Provider contracting and credentialing'),
  ('bp-pbm',        'Pharmacy / PBM',           'Strategic', 'High',     'COO', 'blue-cross-blue-shield-of-massachusetts', 'Pharmacy benefit management')
ON CONFLICT (id) DO NOTHING;

-- Legal obligations --------------------------------------------------------
INSERT INTO legal_obligations (id, name, source, organization_id, citation, notification_timeline, description, max_penalty_amount, jurisdiction) VALUES
  ('lo-hipaa-breach', 'HIPAA Breach Notification Rule', 'HIPAA',    'blue-cross-blue-shield-of-massachusetts', '45 CFR 164.404', '60 days',  'Notify affected individuals and HHS OCR of PHI breaches', 1900000, 'Federal'),
  ('lo-cms-422',      'CMS Medicare Advantage Reporting','CMS',      'blue-cross-blue-shield-of-massachusetts', '42 CFR 422.504', '5 days',   'Report security incidents affecting Medicare Advantage', 5000000, 'Federal'),
  ('lo-ma-201cmr17',  'MA 201 CMR 17.00',               'State',    'blue-cross-blue-shield-of-massachusetts', '201 CMR 17.00',  '30 days',  'Massachusetts personal information protection standards', 5000, 'Massachusetts'),
  ('lo-hitech',       'HITECH Act',                     'HIPAA',    'blue-cross-blue-shield-of-massachusetts', 'HITECH 13402',   '60 days',  'Enhanced breach notification and enforcement', 1500000, 'Federal'),
  ('lo-vendor-baa',   'Business Associate Agreements',  'Contract', 'blue-cross-blue-shield-of-massachusetts', 'BAA',            'Per contract', 'Vendor security and breach obligations', 0, 'Contractual'),
  ('lo-naic',         'NAIC Insurance Data Security',   'NAIC',     'blue-cross-blue-shield-of-massachusetts', 'NAIC MDL-668',   '72 hours', 'Insurance data security model law', 0, 'Massachusetts')
ON CONFLICT (id) DO NOTHING;

-- Threat scenarios ---------------------------------------------------------
INSERT INTO threat_scenarios (id, name, type, organization_id, probability, impact_level, description, mitre_tactic, mitigation_strategy) VALUES
  ('ts-ransomware',  'LockBit ransomware on claims platform', 'ransomware',   'blue-cross-blue-shield-of-massachusetts', 62, 'Critical', 'Ransomware encrypting NASCO claims systems', 'Impact',          'Immutable backups, network segmentation, EDR'),
  ('ts-phishing',    'Credential phishing / BEC',             'phishing',     'blue-cross-blue-shield-of-massachusetts', 48, 'High',     'Targeted phishing of finance and admin staff', 'Initial Access',  'MFA, security awareness, email filtering'),
  ('ts-supplychain', 'Clearinghouse supply-chain outage',     'supply_chain', 'blue-cross-blue-shield-of-massachusetts', 55, 'High',     'Critical vendor compromise disrupting claims', 'Initial Access',  'Fourth-party monitoring, contractual SLAs'),
  ('ts-misconfig',   'Cloud misconfiguration PHI exposure',   'misconfig',    'blue-cross-blue-shield-of-massachusetts', 40, 'Medium',   'Misconfigured storage exposing PHI records', 'Exfiltration',    'CSPM, least-privilege, encryption')
ON CONFLICT (id) DO NOTHING;

-- Risks --------------------------------------------------------------------
INSERT INTO risks
  (id, title, severity, status, organization_id, description, likelihood,
   business_process_ids, threat_scenario_id, financial_exposure, cost_to_remediate,
   legal_obligation_ids, regulatory_citation, executive_owner, remediation_owner, audit_evidence_required)
VALUES
  ('rk-001', 'Critical CVE on NASCO claims server', 'Critical', 'open',
   'blue-cross-blue-shield-of-massachusetts', 'Unpatched RCE on the primary claims adjudication platform', 'High',
   '["bp-claims"]', 'ts-ransomware', 217000000, 2400000,
   '["lo-hipaa-breach","lo-cms-422"]', 'HIPAA 164.308(a)(5)', 'CIO', 'CISO', 'Penetration test'),
  ('rk-002', 'Member portal credential stuffing', 'High', 'mitigating',
   'blue-cross-blue-shield-of-massachusetts', 'Account takeover attempts against the member portal', 'High',
   '["bp-portal"]', 'ts-phishing', 28000000, 600000,
   '["lo-ma-201cmr17"]', '201 CMR 17.00', 'CISO', 'CISO', 'Access log review'),
  ('rk-003', 'Clearinghouse vendor concentration risk', 'Critical', 'open',
   'blue-cross-blue-shield-of-massachusetts', 'Single clearinghouse dependency for claims submission', 'Medium',
   '["bp-claims","bp-provider"]', 'ts-supplychain', 22000000, 900000,
   '["lo-vendor-baa"]', 'BAA', 'CRO', 'CIO', 'Vendor SOC 2'),
  ('rk-004', 'Unpatched EHR integration gateway', 'High', 'open',
   'blue-cross-blue-shield-of-massachusetts', 'End-of-life integration engine for provider data', 'Medium',
   '["bp-provider"]', 'ts-misconfig', 9000000, 750000,
   '[]', NULL, 'CIO', 'CIO', 'Configuration review'),
  ('rk-005', 'Business email compromise exposure', 'Medium', 'open',
   'blue-cross-blue-shield-of-massachusetts', 'Finance staff targeted by invoice fraud', 'Medium',
   '["bp-payint"]', 'ts-phishing', 4000000, 200000,
   '[]', NULL, 'CFO', 'CISO', 'Email security attestation'),
  ('rk-006', 'Misconfigured storage exposing PHI', 'Critical', 'open',
   'blue-cross-blue-shield-of-massachusetts', 'Cloud storage bucket exposing 3M PHI records', 'High',
   '["bp-enroll"]', 'ts-misconfig', 5000000, 300000,
   '["lo-hipaa-breach","lo-hitech"]', 'HIPAA 164.312(a)(1)', 'CISO', 'CIO', 'Cloud config scan')
ON CONFLICT (id) DO NOTHING;

-- Financial impacts (CFO model) --------------------------------------------
INSERT INTO financial_impacts
  (id, risk_id, organization_id, breach_response_cost, regulatory_fine, business_interruption,
   fraud_loss, reputational_loss, legal_cost, recovery_cost, total_gross, insurance_coverage, net_exposure)
VALUES
  ('fi-001', 'rk-001', 'blue-cross-blue-shield-of-massachusetts', 45000000, 30000000, 90000000, 0, 35000000, 12000000, 5000000, 217000000, 40000000, 177000000),
  ('fi-002', 'rk-002', 'blue-cross-blue-shield-of-massachusetts',  8000000,  4000000,  9000000, 0,  5000000,  1500000,  500000,  28000000,  5000000,  23000000),
  ('fi-003', 'rk-003', 'blue-cross-blue-shield-of-massachusetts',  3000000,  2000000, 14000000, 0,  2000000,   800000,  200000,  22000000,  3000000,  19000000),
  ('fi-004', 'rk-004', 'blue-cross-blue-shield-of-massachusetts',  2000000,  1000000,  4000000, 0,  1500000,   400000,  100000,   9000000,  1000000,   8000000),
  ('fi-005', 'rk-005', 'blue-cross-blue-shield-of-massachusetts',   500000,   500000,  1000000, 1500000, 300000, 150000,   50000,   4000000,  1000000,   3000000),
  ('fi-006', 'rk-006', 'blue-cross-blue-shield-of-massachusetts',  2000000,  1500000,   500000, 0,   800000,  150000,   50000,   5000000,        0,   5000000)
ON CONFLICT (id) DO NOTHING;

-- Controls -----------------------------------------------------------------
INSERT INTO controls (id, organization_id, control_id, framework, title, implementation_status, effectiveness_score, control_type, tier) VALUES
  ('ct-001', 'blue-cross-blue-shield-of-massachusetts', 'PR.AA-2', 'NIST-CSF', 'MFA for privileged accounts',   'Implemented', 88, 'Preventive', 'Tier 1'),
  ('ct-002', 'blue-cross-blue-shield-of-massachusetts', 'PR.PS-1', 'NIST-CSF', 'Patch & vulnerability mgmt',    'Partial',     60, 'Corrective', 'Tier 1'),
  ('ct-003', 'blue-cross-blue-shield-of-massachusetts', 'DE.CM-1', 'NIST-CSF', 'Continuous monitoring (SIEM)',  'Implemented', 82, 'Detective',  'Tier 1'),
  ('ct-004', 'blue-cross-blue-shield-of-massachusetts', '164.312', 'HIPAA',    'Encryption at rest',            'Implemented', 90, 'Preventive', 'Tier 1'),
  ('ct-005', 'blue-cross-blue-shield-of-massachusetts', '8.2',     'CIS-v8',   'Email & web protections',       'Implemented', 75, 'Preventive', 'Tier 2'),
  ('ct-006', 'blue-cross-blue-shield-of-massachusetts', '11.1',    'CIS-v8',   'Data recovery / backups',       'Implemented', 70, 'Corrective', 'Tier 1'),
  ('ct-007', 'blue-cross-blue-shield-of-massachusetts', 'GV.SC-1', 'NIST-CSF', 'Third-party risk management',   'None',        40, 'Preventive', 'Tier 2'),
  ('ct-008', 'blue-cross-blue-shield-of-massachusetts', 'PR.DS-2', 'NIST-CSF', 'Cloud security posture (CSPM)',  'None',        45, 'Detective',  'Tier 2'),
  ('ct-009', 'blue-cross-blue-shield-of-massachusetts', '14.1',    'CIS-v8',   'Security awareness training',    'Implemented', 80, 'Preventive', 'Tier 2'),
  ('ct-010', 'blue-cross-blue-shield-of-massachusetts', 'RC.RP-1', 'NIST-CSF', 'Incident response plan',        'Implemented', 72, 'Corrective', 'Tier 1')
ON CONFLICT (id) DO NOTHING;

-- Remediation tasks (3 overdue) --------------------------------------------
INSERT INTO remediation_tasks (id, organization_id, title, source_risk_id, assigned_team, priority, status, target_date, estimated_cost) VALUES
  ('tk-001', 'blue-cross-blue-shield-of-massachusetts', 'Patch NASCO claims servers',          'rk-001', 'Infrastructure', 'Critical', 'In Progress', CURRENT_DATE - 7,  2400000),
  ('tk-002', 'blue-cross-blue-shield-of-massachusetts', 'Enforce MFA + rate limiting on portal','rk-002', 'IAM',           'High',     'In Progress', CURRENT_DATE - 3,   600000),
  ('tk-003', 'blue-cross-blue-shield-of-massachusetts', 'Add secondary clearinghouse',          'rk-003', 'Vendor Mgmt',   'High',     'Pending',     CURRENT_DATE - 14,  900000),
  ('tk-004', 'blue-cross-blue-shield-of-massachusetts', 'Replace EOL integration gateway',      'rk-004', 'Infrastructure', 'High',    'Pending',     CURRENT_DATE + 30,  750000),
  ('tk-005', 'blue-cross-blue-shield-of-massachusetts', 'Deploy CSPM and remediate buckets',    'rk-006', 'Cloud',         'Critical', 'Pending',     CURRENT_DATE + 10,  300000),
  ('tk-006', 'blue-cross-blue-shield-of-massachusetts', 'Phishing-resistant controls rollout',  'rk-005', 'Security',      'Medium',   'Pending',     CURRENT_DATE + 21,  200000)
ON CONFLICT (id) DO NOTHING;

-- Findings (2 repeats) -----------------------------------------------------
INSERT INTO findings (id, title, description, severity, status, organization_id, discovered_date, risk_id, business_process_id, is_repeat, repeat_count, tool, source) VALUES
  ('fd-001', 'CVE-2024-1234 unpatched on NASCO', 'Critical RCE detected by vulnerability scan', 'Critical', 'open',        'blue-cross-blue-shield-of-massachusetts', NOW() - INTERVAL '5 days',  'rk-001', 'bp-claims', false, 0, 'Tenable', 'scan'),
  ('fd-002', 'Excessive failed logins on portal', 'Credential stuffing pattern detected',       'High',     'in_progress', 'blue-cross-blue-shield-of-massachusetts', NOW() - INTERVAL '2 days',  'rk-002', 'bp-portal', false, 0, 'Splunk',  'siem'),
  ('fd-003', 'Public storage bucket with PHI',    'Misconfigured bucket exposing member data',   'Critical', 'open',        'blue-cross-blue-shield-of-massachusetts', NOW() - INTERVAL '1 days',  'rk-006', 'bp-enroll', false, 0, 'CSPM',    'scan'),
  ('fd-004', 'EOL software on integration engine','Unsupported OS reached end of life',          'High',     'open',        'blue-cross-blue-shield-of-massachusetts', NOW() - INTERVAL '20 days', 'rk-004', 'bp-provider', true, 2, 'Qualys',  'scan'),
  ('fd-005', 'Missing MFA on service accounts',   'Privileged service accounts without MFA',     'High',     'open',        'blue-cross-blue-shield-of-massachusetts', NOW() - INTERVAL '12 days', 'rk-002', 'bp-portal', true, 3, 'Okta',    'iam')
ON CONFLICT (id) DO NOTHING;

-- Vendor risk signals ------------------------------------------------------
INSERT INTO vendor_risk_signals
  (id, organization_id, vendor_id, vendor_name, source_name, source_type, signal_category,
   signal_name, severity, confidence, observed_at, status, description, recommended_action)
VALUES
  ('vs-001', 'blue-cross-blue-shield-of-massachusetts', 'vnd-clearing', 'National Clearinghouse Co', 'Breach Feed', 'api', 'Breach/Incident Intelligence', 'Reported ransomware incident', 'Critical', 90, NOW() - INTERVAL '3 days', 'active', 'Critical clearinghouse vendor disclosed a ransomware event', 'Activate secondary clearinghouse; request impact assessment'),
  ('vs-002', 'blue-cross-blue-shield-of-massachusetts', 'vnd-pbm',      'PBM Partner Inc',          'External Scan','api', 'External Attack Surface',       'Exposed management interface','High',     75, NOW() - INTERVAL '6 days', 'active', 'PBM vendor exposing an admin interface to the internet', 'Require vendor to restrict access; revalidate BAA'),
  ('vs-003', 'blue-cross-blue-shield-of-massachusetts', 'vnd-mail',     'Member Mailing Vendor',    'Dark Web',     'web_scrape','Dark Web/Credential Exposure', 'Leaked employee credentials',  'Medium',   65, NOW() - INTERVAL '9 days', 'active', 'Vendor employee credentials found on dark web', 'Request forced password reset and MFA attestation'),
  ('vs-004', 'blue-cross-blue-shield-of-massachusetts', 'vnd-cloud',    'Cloud Hosting Provider',   'Compliance',   'file_upload','Compliance Evidence',        'SOC 2 report overdue',         'Medium',   60, NOW() - INTERVAL '15 days','active', 'Vendor SOC 2 Type II report is past due', 'Escalate evidence request; flag in contract review')
ON CONFLICT (id) DO NOTHING;

-- Technology assets (CIO inventory) ----------------------------------------
INSERT INTO assets
  (id, name, type, organization_id, hostname, owner, description,
   business_process_ids, data_classification, cloud_provider, location,
   criticality, tier, supported, end_of_support_date, vuln_critical, vuln_high, patch_pct)
VALUES
  ('as-nasco',   'NASCO Claims Platform',       'server',   'blue-cross-blue-shield-of-massachusetts', 'nasco-prod-01',  'Infrastructure', 'Primary claims adjudication system',
   '["bp-claims"]',   '["PHI"]',        'On-Prem', 'Quincy DC',  'Critical', 'Tier 1', true,  NULL,           2, 5, 71),
  ('as-enroll',  'Enrollment Engine',           'app',      'blue-cross-blue-shield-of-massachusetts', 'enroll-app-01',  'App Eng',        'Membership and eligibility processing',
   '["bp-enroll"]',   '["PHI","PII"]',  'Azure',   'East US',    'Critical', 'Tier 1', true,  NULL,           0, 3, 88),
  ('as-portal',  'Member Portal',               'app',      'blue-cross-blue-shield-of-massachusetts', 'portal-web-01',  'Digital',        'Member-facing web/mobile portal',
   '["bp-portal"]',   '["PII"]',        'AWS',     'us-east-1',  'High',     'Tier 2', true,  NULL,           1, 4, 80),
  ('as-edw',     'Enterprise Data Warehouse',   'database', 'blue-cross-blue-shield-of-massachusetts', 'edw-db-01',      'Data',           'Analytics warehouse with PHI',
   '["bp-claims","bp-payint"]', '["PHI"]', 'On-Prem','Quincy DC','Critical', 'Tier 1', true,  NULL,           1, 2, 76),
  ('as-integ',   'Provider Integration Gateway','server',   'blue-cross-blue-shield-of-massachusetts', 'integ-eol-01',   'Infrastructure', 'EOL integration engine (Win Server 2012)',
   '["bp-provider"]', '["PHI"]',        'On-Prem', 'Quincy DC',  'High',     'Tier 2', false, '2023-10-10',   3, 6, 41),
  ('as-pbm',     'PBM Interface',               'API',      'blue-cross-blue-shield-of-massachusetts', 'pbm-api-01',     'App Eng',        'Pharmacy benefit manager interface',
   '["bp-pbm"]',      '["PHI"]',        'AWS',     'us-east-1',  'High',     'Tier 2', true,  NULL,           0, 2, 84),
  ('as-clearing','Clearinghouse Connector',     'API',      'blue-cross-blue-shield-of-massachusetts', 'clearing-01',    'EDI',            'External claims clearinghouse link',
   '["bp-claims"]',   '["PHI"]',        'On-Prem', 'Quincy DC',  'Critical', 'Tier 1', true,  NULL,           1, 1, 79),
  ('as-payint',  'Payment Integrity Engine',    'app',      'blue-cross-blue-shield-of-massachusetts', 'payint-01',      'SIU',            'FWA detection and payment integrity',
   '["bp-payint"]',   '["PHI","Financial"]', 'Azure','East US',  'High',     'Tier 2', true,  NULL,           0, 1, 90),
  ('as-vdi',     'Member Services VDI',         'endpoint', 'blue-cross-blue-shield-of-massachusetts', 'vdi-pool-01',    'EUC',            'Virtual desktops for member services',
   '["bp-portal"]',   '["PII"]',        'Azure',   'East US',    'Medium',   'Tier 3', true,  NULL,           0, 2, 86),
  ('as-legacy',  'Legacy Imaging Store',        'server',   'blue-cross-blue-shield-of-massachusetts', 'img-eol-02',     'Infrastructure', 'Unsupported document imaging (RHEL 6)',
   '["bp-claims"]',   '["PHI"]',        'On-Prem', 'Quincy DC',  'Medium',   'Tier 3', false, '2024-06-30',   2, 4, 38)
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- METRIC INPUTS — the editable "database of mock numbers" driving dashboards
-- Edit value to change what the dashboards display. ON CONFLICT DO NOTHING so
-- that edits made via the API/SQL are preserved across re-seeds.
-- ===========================================================================

-- Shared coefficients / assumptions (apply to every org's formulas) ---------
INSERT INTO metric_inputs (org_id, key, value, category, label, unit) VALUES
  ('_defaults','phi_notif_per_record',      35,        'coefficient','PHI breach notification cost per record','$/record'),
  ('_defaults','breach_fixed',              62000000,  'coefficient','Fixed breach response costs (OCR/forensics/PR/credit)','$'),
  ('_defaults','breach_classaction_per_record', 60,    'coefficient','Class-action exposure per record','$/record'),
  ('_defaults','breach_classaction_cap',    250000000, 'coefficient','Class-action exposure cap','$'),
  ('_defaults','regulatory_surplus_pct',    0.138,     'coefficient','Regulatory fine scenario as % of surplus','ratio'),
  ('_defaults','fwa_rev_pct',               0.03,      'coefficient','Fraud/waste/abuse loss as % of revenue','ratio'),
  ('_defaults','phi_darkweb_per_record',    22,        'coefficient','Dark-web/fraud value per PHI record','$/record'),
  ('_defaults','reput_rev_pct',             0.04,      'coefficient','Reputational churn loss as % of revenue','ratio'),
  ('_defaults','interrupt_rev_pct',         0.0137,    'coefficient','Business interruption as % of revenue','ratio'),
  ('_defaults','interrupt_fixed',           55000000,  'coefficient','Fixed interruption/CMS sanction cost','$'),
  ('_defaults','legal_fixed',               50000000,  'coefficient','Base legal exposure','$'),
  ('_defaults','recovery_it_pct',           0.037,     'coefficient','IT recovery cost as % of IT budget','ratio'),
  ('_defaults','ponemon_per_record',        429,       'coefficient','Per-record breach cost (IBM/Ponemon)','$/record'),
  ('_defaults','ops_rev_pct',               0.017,     'coefficient','Operations disruption as % of revenue','ratio'),
  ('_defaults','capital_legal_base',        50000000,  'coefficient','Capital-at-risk legal base','$'),
  ('_defaults','security_spend_pct_of_it',  0.6,       'coefficient','Security spend as % of IT budget','ratio'),
  ('_defaults','avoided_loss',              380000000, 'coefficient','Annual avoided loss (ROSI model)','$'),
  ('_defaults','annual_loss_exp',           115000000, 'coefficient','Annual expected loss','$'),
  ('_defaults','prob_significant_breach',   0.23,      'coefficient','Annual probability of significant PHI breach','ratio'),
  ('_defaults','prob_catastrophic',         0.08,      'coefficient','Annual probability of catastrophic event','ratio'),
  ('_defaults','catastrophic_multiplier',   3.4,       'coefficient','Catastrophic loss multiplier vs stress','x'),
  ('_defaults','catastrophic_ibnr_pct',     0.145,     'coefficient','Catastrophic IBNR add as % of IBNR','ratio'),
  ('_defaults','rbc_min',                   200,       'coefficient','RBC regulatory minimum','%'),
  ('_defaults','rbc_warning',               250,       'coefficient','RBC warning threshold','%'),
  ('_defaults','claims_risk',               217000000, 'coefficient','Claims-at-risk (vs IBNR)','$'),
  ('_defaults','it_risk',                   11000000,  'coefficient','IT recovery risk (vs IT budget)','$')
ON CONFLICT (org_id, key) DO NOTHING;

-- BCBS-MA inputs — setup-quiz responses captured as numbers -----------------
INSERT INTO metric_inputs (org_id, key, value, category, label, unit) VALUES
  ('blue-cross-blue-shield-of-massachusetts','revenue',          10000000000,'setup','Annual revenue','$'),
  ('blue-cross-blue-shield-of-massachusetts','surplus',          2500000000, 'setup','Statutory surplus','$'),
  ('blue-cross-blue-shield-of-massachusetts','ibnr',             1500000000, 'setup','IBNR reserves','$'),
  ('blue-cross-blue-shield-of-massachusetts','it_budget',        300000000,  'setup','Annual IT budget','$'),
  ('blue-cross-blue-shield-of-massachusetts','phi_records',      3000000,    'setup','PHI records held','records'),
  ('blue-cross-blue-shield-of-massachusetts','member_count',     2900000,    'setup','Members covered','members'),
  ('blue-cross-blue-shield-of-massachusetts','ins_limit',        50000000,   'setup','Cyber insurance limit','$'),
  ('blue-cross-blue-shield-of-massachusetts','ins_deductible',   0,          'setup','Cyber insurance deductible','$'),
  ('blue-cross-blue-shield-of-massachusetts','rbc_ratio_current',420,        'setup','Current RBC ratio','%'),
  ('blue-cross-blue-shield-of-massachusetts','mfa_pct',          78,         'posture','MFA coverage','%'),
  ('blue-cross-blue-shield-of-massachusetts','edr_pct',          71,         'posture','EDR coverage','%'),
  ('blue-cross-blue-shield-of-massachusetts','siem_days',        14,         'posture','SIEM retention','days'),
  ('blue-cross-blue-shield-of-massachusetts','phishing_pct',     9.2,        'posture','Phishing failure rate','%'),
  ('blue-cross-blue-shield-of-massachusetts','patch_pct',        63,         'posture','Patch SLA compliance','%'),
  ('blue-cross-blue-shield-of-massachusetts','mttd_hrs',         47,         'posture','Mean time to detect','hours'),
  ('blue-cross-blue-shield-of-massachusetts','mttr_hrs',         6.8,        'posture','Mean time to respond','hours'),
  ('blue-cross-blue-shield-of-massachusetts','training_pct',     82,         'posture','Security training completion','%'),
  ('blue-cross-blue-shield-of-massachusetts','pam_pct',          64,         'posture','PAM coverage','%'),
  ('blue-cross-blue-shield-of-massachusetts','vuln_sla_pct',     71,         'posture','Vulnerability SLA compliance','%'),
  ('blue-cross-blue-shield-of-massachusetts','endpoints',        18000,      'setup','Managed endpoints','count'),
  ('blue-cross-blue-shield-of-massachusetts','priv_accts',       850,        'setup','Privileged accounts','count')
ON CONFLICT (org_id, key) DO NOTHING;

-- Audit evidence (for the Internal Audit dashboard) -------------------------
INSERT INTO evidence (id, organization_id, title, evidence_type, related_control_id, related_finding_id, evidence_date, validity_start, validity_end, status, uploaded_by) VALUES
  ('ev-001','blue-cross-blue-shield-of-massachusetts','MFA enforcement screenshot (Okta)','Screenshot','ct-001',NULL, CURRENT_DATE - 20, CURRENT_DATE - 20, CURRENT_DATE + 160,'Valid','IAM Team'),
  ('ev-002','blue-cross-blue-shield-of-massachusetts','SIEM retention configuration export','Config','ct-003',NULL, CURRENT_DATE - 35, CURRENT_DATE - 35, CURRENT_DATE + 145,'Valid','SecOps'),
  ('ev-003','blue-cross-blue-shield-of-massachusetts','Encryption-at-rest attestation','Document','ct-004',NULL, CURRENT_DATE - 60, CURRENT_DATE - 60, CURRENT_DATE + 120,'Valid','Infrastructure'),
  ('ev-004','blue-cross-blue-shield-of-massachusetts','Quarterly access review log','Log','ct-001',NULL, CURRENT_DATE - 120, CURRENT_DATE - 120, CURRENT_DATE - 10,'Expired','IAM Team'),
  ('ev-005','blue-cross-blue-shield-of-massachusetts','Penetration test report (NASCO)','Document',NULL,'fd-001', CURRENT_DATE - 15, CURRENT_DATE - 15, CURRENT_DATE + 350,'Valid','External Auditor'),
  ('ev-006','blue-cross-blue-shield-of-massachusetts','Backup restore test results','Test','ct-006',NULL, CURRENT_DATE - 45, CURRENT_DATE - 45, CURRENT_DATE + 135,'Valid','Infrastructure'),
  ('ev-007','blue-cross-blue-shield-of-massachusetts','Security awareness completion report','Document','ct-009',NULL, CURRENT_DATE - 25, CURRENT_DATE - 25, CURRENT_DATE + 155,'Valid','HR / Security')
ON CONFLICT (id) DO NOTHING;

-- Multi-org demo dataset
-- ----------------------------------------------------------------------------
-- Gives Cigna Healthcare (strong posture) and Meridian Health Plan (weak
-- posture) their own complete, DISTINCT risk picture — business processes,
-- risks, financial impacts, legal obligations, threat scenarios, controls,
-- remediation tasks, findings, vendor signals, assets, and financial setup
-- inputs — so every executive agent brief renders real numbers for whichever
-- org is signed in (not just BCBS-MA).
--
-- Idempotent: org-prefixed ids + ON CONFLICT DO NOTHING.

INSERT INTO orgs (id, name, type) VALUES
  ('cigna-healthcare', 'Cigna Healthcare', 'Commercial'),
  ('meridian-health-plan-demo', 'Meridian Health Plan (Demo)', 'Medicaid MCO')
ON CONFLICT (id) DO NOTHING;

-- Financial / setup inputs (drive CFO/CRO/Board formulas) --------------------
INSERT INTO metric_inputs (org_id, key, value, category, label, unit) VALUES
  -- Cigna: very large, well-capitalized, well-insured
  ('cigna-healthcare','revenue',          60000000000,'setup','Annual revenue','$'),
  ('cigna-healthcare','surplus',          12000000000,'setup','Statutory surplus','$'),
  ('cigna-healthcare','ibnr',             6000000000, 'setup','IBNR reserves','$'),
  ('cigna-healthcare','it_budget',        1200000000, 'setup','Annual IT budget','$'),
  ('cigna-healthcare','phi_records',      18000000,   'setup','PHI records held','records'),
  ('cigna-healthcare','member_count',     17000000,   'setup','Members covered','members'),
  ('cigna-healthcare','ins_limit',        300000000,  'setup','Cyber insurance limit','$'),
  ('cigna-healthcare','ins_deductible',   10000000,   'setup','Cyber insurance deductible','$'),
  ('cigna-healthcare','rbc_ratio_current',520,        'setup','Current RBC ratio','%'),
  ('cigna-healthcare','endpoints',        95000,      'setup','Managed endpoints','count'),
  ('cigna-healthcare','priv_accts',       2200,       'setup','Privileged accounts','count'),
  -- Meridian: small Medicaid MCO, thin capital, under-insured
  ('meridian-health-plan-demo','revenue',          3000000000,'setup','Annual revenue','$'),
  ('meridian-health-plan-demo','surplus',          400000000, 'setup','Statutory surplus','$'),
  ('meridian-health-plan-demo','ibnr',             250000000, 'setup','IBNR reserves','$'),
  ('meridian-health-plan-demo','it_budget',        60000000,  'setup','Annual IT budget','$'),
  ('meridian-health-plan-demo','phi_records',      1200000,   'setup','PHI records held','records'),
  ('meridian-health-plan-demo','member_count',     1100000,   'setup','Members covered','members'),
  ('meridian-health-plan-demo','ins_limit',        15000000,  'setup','Cyber insurance limit','$'),
  ('meridian-health-plan-demo','ins_deductible',   2000000,   'setup','Cyber insurance deductible','$'),
  ('meridian-health-plan-demo','rbc_ratio_current',230,       'setup','Current RBC ratio','%'),
  ('meridian-health-plan-demo','endpoints',        4200,      'setup','Managed endpoints','count'),
  ('meridian-health-plan-demo','priv_accts',       280,       'setup','Privileged accounts','count')
ON CONFLICT (org_id, key) DO NOTHING;

-- ===========================================================================
-- CIGNA HEALTHCARE — strong posture, well-insured, few critical risks
-- ===========================================================================
INSERT INTO business_processes (id, name, tier, criticality, owner, organization_id, description) VALUES
  ('cigna-bp-claims',   'Claims Adjudication',     'Primary',   'Critical', 'CIO', 'cigna-healthcare', 'Commercial claims on Facets'),
  ('cigna-bp-enroll',   'Membership & Enrollment', 'Primary',   'Critical', 'CIO', 'cigna-healthcare', 'Group and individual enrollment'),
  ('cigna-bp-portal',   'Member Portal',           'Primary',   'High',     'CIO', 'cigna-healthcare', 'myCigna member portal'),
  ('cigna-bp-payint',   'Payment Integrity',       'Primary',   'High',     'CFO', 'cigna-healthcare', 'FWA and payment integrity'),
  ('cigna-bp-provider', 'Provider Network',        'Strategic', 'High',     'COO', 'cigna-healthcare', 'Provider contracting'),
  ('cigna-bp-pbm',      'Pharmacy / PBM (Express Scripts)', 'Strategic', 'High', 'COO', 'cigna-healthcare', 'Integrated PBM')
ON CONFLICT (id) DO NOTHING;

INSERT INTO threat_scenarios (id, name, type, organization_id, probability, impact_level, description, mitre_tactic, mitigation_strategy) VALUES
  ('cigna-ts-ransomware',  'Ransomware (contained by EDR)',   'ransomware',   'cigna-healthcare', 35, 'High',   'Ransomware attempt on claims estate', 'Impact',         'Immutable backups, mature EDR'),
  ('cigna-ts-phishing',    'Targeted phishing',               'phishing',     'cigna-healthcare', 30, 'Medium', 'Spear-phishing of finance staff',     'Initial Access', 'MFA, awareness, DMARC'),
  ('cigna-ts-supplychain', 'PBM data-feed compromise',        'supply_chain', 'cigna-healthcare', 40, 'High',   'Compromise of pharmacy data feed',    'Initial Access', 'Fourth-party monitoring')
ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (id, name, source, organization_id, citation, notification_timeline, description, max_penalty_amount, jurisdiction) VALUES
  ('cigna-lo-hipaa',  'HIPAA Breach Notification Rule', 'HIPAA',    'cigna-healthcare', '45 CFR 164.404', '60 days', 'Notify individuals and OCR', 1900000, 'Federal'),
  ('cigna-lo-cms',    'CMS Reporting',                  'CMS',      'cigna-healthcare', '42 CFR 422.504', '5 days',  'Report incidents affecting MA', 5000000, 'Federal'),
  ('cigna-lo-ct',     'CT Insurance Data Security Law', 'State',    'cigna-healthcare', 'CT PA 21-15',    '72 hours','Connecticut data security', 50000, 'Connecticut'),
  ('cigna-lo-hitech', 'HITECH Act',                     'HIPAA',    'cigna-healthcare', 'HITECH 13402',   '60 days', 'Enhanced enforcement', 1500000, 'Federal'),
  ('cigna-lo-baa',    'Business Associate Agreements',  'Contract', 'cigna-healthcare', 'BAA',            'Per contract', 'Vendor obligations', 0, 'Contractual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO risks (id, title, severity, status, organization_id, description, likelihood, business_process_ids, threat_scenario_id, financial_exposure, cost_to_remediate, legal_obligation_ids, regulatory_citation, executive_owner, remediation_owner, audit_evidence_required) VALUES
  ('cigna-rk-001','Pharmacy data-feed exposure','Critical','open','cigna-healthcare','Sensitive data feed to PBM lacks field encryption','Medium','["cigna-bp-pbm"]','cigna-ts-supplychain',60000000,1200000,'["cigna-lo-hipaa","cigna-lo-hitech"]','HIPAA 164.312','CISO','CIO','Vendor SOC 2'),
  ('cigna-rk-002','Member portal session fixation','High','open','cigna-healthcare','Session handling weakness on myCigna','Medium','["cigna-bp-portal"]','cigna-ts-phishing',25000000,500000,'["cigna-lo-ct"]','CT PA 21-15','CISO','CISO','Access log review'),
  ('cigna-rk-003','Legacy VPN appliance CVE','High','mitigating','cigna-healthcare','Known CVE on remote-access appliance','Medium','["cigna-bp-claims"]','cigna-ts-ransomware',30000000,800000,'[]',NULL,'CIO','CISO','Pen test'),
  ('cigna-rk-004','Third-party analytics oversharing','Medium','open','cigna-healthcare','Analytics vendor receives excess PHI fields','Low','["cigna-bp-payint"]','cigna-ts-supplychain',12000000,300000,'["cigna-lo-baa"]','BAA','CLO','CIO','Data minimization review')
ON CONFLICT (id) DO NOTHING;

INSERT INTO financial_impacts (id, risk_id, organization_id, breach_response_cost, regulatory_fine, business_interruption, fraud_loss, reputational_loss, legal_cost, recovery_cost, total_gross, insurance_coverage, net_exposure) VALUES
  ('cigna-fi-001','cigna-rk-001','cigna-healthcare',18000000,9000000,20000000,0,8000000,3000000,2000000,60000000,50000000,10000000),
  ('cigna-fi-002','cigna-rk-002','cigna-healthcare',8000000,3000000,8000000,0,4000000,1500000,500000,25000000,22000000,3000000),
  ('cigna-fi-003','cigna-rk-003','cigna-healthcare',9000000,4000000,10000000,0,4000000,2000000,1000000,30000000,28000000,2000000),
  ('cigna-fi-004','cigna-rk-004','cigna-healthcare',3000000,2000000,3000000,0,2000000,1500000,500000,12000000,10000000,2000000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO controls (id, organization_id, control_id, framework, title, implementation_status, effectiveness_score, control_type, tier) VALUES
  ('cigna-ct-01','cigna-healthcare','PR.AA-2','NIST-CSF','MFA for privileged accounts','Implemented',95,'Preventive','Tier 1'),
  ('cigna-ct-02','cigna-healthcare','PR.PS-1','NIST-CSF','Patch & vulnerability mgmt','Implemented',88,'Corrective','Tier 1'),
  ('cigna-ct-03','cigna-healthcare','DE.CM-1','NIST-CSF','Continuous monitoring (SIEM)','Implemented',90,'Detective','Tier 1'),
  ('cigna-ct-04','cigna-healthcare','164.312','HIPAA','Encryption at rest','Implemented',92,'Preventive','Tier 1'),
  ('cigna-ct-05','cigna-healthcare','8.2','CIS-v8','Email & web protections','Implemented',86,'Preventive','Tier 2'),
  ('cigna-ct-06','cigna-healthcare','11.1','CIS-v8','Data recovery / backups','Implemented',90,'Corrective','Tier 1'),
  ('cigna-ct-07','cigna-healthcare','GV.SC-1','NIST-CSF','Third-party risk management','Partial',72,'Preventive','Tier 2'),
  ('cigna-ct-08','cigna-healthcare','PR.DS-2','NIST-CSF','Cloud security posture (CSPM)','Implemented',84,'Detective','Tier 2'),
  ('cigna-ct-09','cigna-healthcare','14.1','CIS-v8','Security awareness training','Implemented',89,'Preventive','Tier 2'),
  ('cigna-ct-10','cigna-healthcare','RC.RP-1','NIST-CSF','Incident response plan','Implemented',87,'Corrective','Tier 1'),
  ('cigna-ct-11','cigna-healthcare','PR.AA-5','NIST-CSF','Privileged access management','Implemented',82,'Preventive','Tier 1'),
  ('cigna-ct-12','cigna-healthcare','DE.AE-2','NIST-CSF','UEBA / anomaly detection','Partial',70,'Detective','Tier 2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO remediation_tasks (id, organization_id, title, source_risk_id, assigned_team, priority, status, target_date, estimated_cost) VALUES
  ('cigna-tk-01','cigna-healthcare','Encrypt PBM data-feed fields','cigna-rk-001','Data Eng','Critical','In Progress',CURRENT_DATE + 21,1200000),
  ('cigna-tk-02','cigna-healthcare','Patch remote-access appliance','cigna-rk-003','Infrastructure','High','In Progress',CURRENT_DATE + 7,800000),
  ('cigna-tk-03','cigna-healthcare','Harden portal session handling','cigna-rk-002','App Eng','High','Pending',CURRENT_DATE + 30,500000),
  ('cigna-tk-04','cigna-healthcare','Reduce analytics PHI fields','cigna-rk-004','Privacy','Medium','Pending',CURRENT_DATE + 45,300000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO findings (id, title, description, severity, status, organization_id, discovered_date, risk_id, business_process_id, is_repeat, repeat_count, tool, source) VALUES
  ('cigna-fd-01','Unencrypted PBM feed fields','Field-level encryption missing on pharmacy feed','High','open','cigna-healthcare',NOW() - INTERVAL '6 days','cigna-rk-001','cigna-bp-pbm',false,0,'CSPM','scan'),
  ('cigna-fd-02','CVE on VPN appliance','Known CVE detected by scan','High','in_progress','cigna-healthcare',NOW() - INTERVAL '3 days','cigna-rk-003','cigna-bp-claims',false,0,'Tenable','scan'),
  ('cigna-fd-03','Excess PHI shared with analytics vendor','Data minimization gap','Medium','open','cigna-healthcare',NOW() - INTERVAL '10 days','cigna-rk-004','cigna-bp-payint',false,0,'DLP','review')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_risk_signals (id, organization_id, vendor_id, vendor_name, source_name, source_type, signal_category, signal_name, severity, confidence, observed_at, status, description, recommended_action) VALUES
  ('cigna-vs-01','cigna-healthcare','cigna-vnd-pbm','Express Scripts','External Scan','api','External Attack Surface','Exposed test endpoint','Medium',70,NOW() - INTERVAL '8 days','active','Non-prod endpoint exposed','Request remediation; confirm not prod')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assets (id, name, type, organization_id, hostname, owner, business_process_ids, data_classification, criticality, tier, supported, end_of_support_date, vuln_critical, vuln_high, patch_pct) VALUES
  ('cigna-as-claims','Facets Claims Platform','server','cigna-healthcare','facets-prod','Infrastructure','["cigna-bp-claims"]','["PHI"]','Critical','Tier 1',true,NULL,0,2,90),
  ('cigna-as-portal','myCigna Portal','app','cigna-healthcare','mycigna-web','Digital','["cigna-bp-portal"]','["PII"]','High','Tier 2',true,NULL,1,3,88),
  ('cigna-as-edw','Enterprise Data Warehouse','database','cigna-healthcare','edw-prod','Data','["cigna-bp-payint"]','["PHI"]','Critical','Tier 1',true,NULL,0,1,92),
  ('cigna-as-pbm','PBM Interface','API','cigna-healthcare','pbm-api','App Eng','["cigna-bp-pbm"]','["PHI"]','High','Tier 2',true,NULL,1,2,85),
  ('cigna-as-vpn','Remote Access Appliance','server','cigna-healthcare','vpn-gw','Infrastructure','["cigna-bp-claims"]','["PII"]','High','Tier 2',true,NULL,1,2,79)
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- MERIDIAN HEALTH PLAN (DEMO) — weak posture, under-insured, many critical risks
-- ===========================================================================
INSERT INTO business_processes (id, name, tier, criticality, owner, organization_id, description) VALUES
  ('mer-bp-claims',   'Claims Adjudication',     'Primary',   'Critical', 'CIO', 'meridian-health-plan-demo', 'Medicaid claims processing'),
  ('mer-bp-enroll',   'Membership & Enrollment', 'Primary',   'Critical', 'CIO', 'meridian-health-plan-demo', 'Medicaid eligibility & enrollment'),
  ('mer-bp-portal',   'Member Portal',           'Primary',   'High',     'CIO', 'meridian-health-plan-demo', 'Member portal'),
  ('mer-bp-payint',   'Payment Integrity',       'Primary',   'Critical', 'CFO', 'meridian-health-plan-demo', 'FWA detection'),
  ('mer-bp-provider', 'Provider Network',        'Strategic', 'High',     'COO', 'meridian-health-plan-demo', 'Provider network')
ON CONFLICT (id) DO NOTHING;

INSERT INTO threat_scenarios (id, name, type, organization_id, probability, impact_level, description, mitre_tactic, mitigation_strategy) VALUES
  ('mer-ts-ransomware',  'Ransomware on under-protected estate','ransomware',   'meridian-health-plan-demo', 70, 'Critical','High likelihood: gaps in EDR/backups','Impact',         'Deploy EDR, immutable backups'),
  ('mer-ts-phishing',    'Credential phishing / BEC',           'phishing',     'meridian-health-plan-demo', 60, 'High',    'High click rate, low MFA','Initial Access','MFA, awareness'),
  ('mer-ts-supplychain', 'Clearinghouse concentration',         'supply_chain', 'meridian-health-plan-demo', 55, 'High',    'Single clearinghouse dependency','Initial Access','Secondary clearinghouse'),
  ('mer-ts-misconfig',   'Unencrypted legacy database',         'misconfig',    'meridian-health-plan-demo', 50, 'High',    'PHI at rest unencrypted','Exfiltration',   'Encrypt, CSPM'),
  ('mer-ts-insider',     'Orphaned privileged access',          'insider',      'meridian-health-plan-demo', 45, 'Medium',  'Terminated users retain access','Privilege Escalation','IGA, access reviews')
ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_obligations (id, name, source, organization_id, citation, notification_timeline, description, max_penalty_amount, jurisdiction) VALUES
  ('mer-lo-hipaa',  'HIPAA Breach Notification Rule', 'HIPAA',    'meridian-health-plan-demo', '45 CFR 164.404', '60 days', 'Notify individuals and OCR', 1900000, 'Federal'),
  ('mer-lo-cms',    'CMS / State Medicaid Reporting', 'CMS',      'meridian-health-plan-demo', '42 CFR 438',     '24 hours','Report incidents to state Medicaid', 5000000, 'Federal'),
  ('mer-lo-mi',     'Michigan Data Breach Law',       'State',    'meridian-health-plan-demo', 'MCL 445.72',     '45 days', 'Michigan breach notification', 750000, 'Michigan'),
  ('mer-lo-hitech', 'HITECH Act',                     'HIPAA',    'meridian-health-plan-demo', 'HITECH 13402',   '60 days', 'Enhanced enforcement', 1500000, 'Federal'),
  ('mer-lo-baa',    'Business Associate Agreements',  'Contract', 'meridian-health-plan-demo', 'BAA',            'Per contract', 'Vendor obligations', 0, 'Contractual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO risks (id, title, severity, status, organization_id, description, likelihood, business_process_ids, threat_scenario_id, financial_exposure, cost_to_remediate, legal_obligation_ids, regulatory_citation, executive_owner, remediation_owner, audit_evidence_required) VALUES
  ('mer-rk-001','Ransomware-exposed claims server (no EDR)','Critical','open','meridian-health-plan-demo','Primary claims server lacks EDR and tested backups','High','["mer-bp-claims"]','mer-ts-ransomware',95000000,2200000,'["mer-lo-hipaa","mer-lo-cms"]','HIPAA 164.308','CIO','CISO','Pen test'),
  ('mer-rk-002','Unencrypted PHI in legacy database','Critical','open','meridian-health-plan-demo','Member PHI at rest unencrypted','High','["mer-bp-enroll"]','mer-ts-misconfig',70000000,900000,'["mer-lo-hipaa","mer-lo-hitech"]','HIPAA 164.312','CISO','CIO','Config scan'),
  ('mer-rk-003','Credential theft on member portal','High','open','meridian-health-plan-demo','Account takeover; weak MFA coverage','High','["mer-bp-portal"]','mer-ts-phishing',30000000,600000,'["mer-lo-mi"]','MCL 445.72','CISO','CISO','Access logs'),
  ('mer-rk-004','Single clearinghouse dependency','Critical','open','meridian-health-plan-demo','No failover for claims submission','Medium','["mer-bp-claims","mer-bp-provider"]','mer-ts-supplychain',40000000,1100000,'["mer-lo-baa"]','BAA','CRO','CIO','Vendor SOC 2'),
  ('mer-rk-005','Terminated-user access not revoked','High','open','meridian-health-plan-demo','Orphaned privileged accounts active','Medium','["mer-bp-payint"]','mer-ts-insider',18000000,300000,'[]',NULL,'CISO','CIO','Access review'),
  ('mer-rk-006','Vendor BAA gaps','Medium','open','meridian-health-plan-demo','Several vendors lack current BAAs','Medium','["mer-bp-provider"]','mer-ts-supplychain',8000000,150000,'["mer-lo-baa"]','BAA','CLO','CLO','Contract review'),
  ('mer-rk-007','Phishing-driven BEC','Critical','mitigating','meridian-health-plan-demo','Finance targeted; invoice fraud attempts','High','["mer-bp-payint"]','mer-ts-phishing',22000000,250000,'[]',NULL,'CFO','CISO','Email security')
ON CONFLICT (id) DO NOTHING;

INSERT INTO financial_impacts (id, risk_id, organization_id, breach_response_cost, regulatory_fine, business_interruption, fraud_loss, reputational_loss, legal_cost, recovery_cost, total_gross, insurance_coverage, net_exposure) VALUES
  ('mer-fi-001','mer-rk-001','meridian-health-plan-demo',25000000,15000000,40000000,0,10000000,3000000,2000000,95000000,8000000,87000000),
  ('mer-fi-002','mer-rk-002','meridian-health-plan-demo',22000000,18000000,15000000,0,10000000,3000000,2000000,70000000,5000000,65000000),
  ('mer-fi-003','mer-rk-003','meridian-health-plan-demo',9000000,4000000,9000000,0,5000000,2000000,1000000,30000000,4000000,26000000),
  ('mer-fi-004','mer-rk-004','meridian-health-plan-demo',5000000,3000000,26000000,0,3000000,2000000,1000000,40000000,5000000,35000000),
  ('mer-fi-005','mer-rk-005','meridian-health-plan-demo',4000000,2000000,5000000,3000000,2000000,1500000,500000,18000000,2000000,16000000),
  ('mer-fi-006','mer-rk-006','meridian-health-plan-demo',2000000,1000000,2000000,0,1500000,1000000,500000,8000000,1000000,7000000),
  ('mer-fi-007','mer-rk-007','meridian-health-plan-demo',3000000,1000000,3000000,12000000,1500000,1000000,500000,22000000,3000000,19000000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO controls (id, organization_id, control_id, framework, title, implementation_status, effectiveness_score, control_type, tier) VALUES
  ('mer-ct-01','meridian-health-plan-demo','PR.AA-2','NIST-CSF','MFA for privileged accounts','Partial',55,'Preventive','Tier 1'),
  ('mer-ct-02','meridian-health-plan-demo','PR.PS-1','NIST-CSF','Patch & vulnerability mgmt','Partial',48,'Corrective','Tier 1'),
  ('mer-ct-03','meridian-health-plan-demo','DE.CM-1','NIST-CSF','Continuous monitoring (SIEM)','None',30,'Detective','Tier 1'),
  ('mer-ct-04','meridian-health-plan-demo','164.312','HIPAA','Encryption at rest','None',25,'Preventive','Tier 1'),
  ('mer-ct-05','meridian-health-plan-demo','8.2','CIS-v8','Email & web protections','Partial',52,'Preventive','Tier 2'),
  ('mer-ct-06','meridian-health-plan-demo','11.1','CIS-v8','Data recovery / backups','Partial',45,'Corrective','Tier 1'),
  ('mer-ct-07','meridian-health-plan-demo','GV.SC-1','NIST-CSF','Third-party risk management','None',35,'Preventive','Tier 2'),
  ('mer-ct-08','meridian-health-plan-demo','14.1','CIS-v8','Security awareness training','Partial',58,'Preventive','Tier 2'),
  ('mer-ct-09','meridian-health-plan-demo','RC.RP-1','NIST-CSF','Incident response plan','Planned',40,'Corrective','Tier 1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO remediation_tasks (id, organization_id, title, source_risk_id, assigned_team, priority, status, target_date, estimated_cost) VALUES
  ('mer-tk-01','meridian-health-plan-demo','Deploy EDR + tested backups on claims','mer-rk-001','Infrastructure','Critical','Pending',CURRENT_DATE - 12,2200000),
  ('mer-tk-02','meridian-health-plan-demo','Encrypt legacy member database','mer-rk-002','Data','Critical','In Progress',CURRENT_DATE - 5,900000),
  ('mer-tk-03','meridian-health-plan-demo','Enforce MFA + rate limiting on portal','mer-rk-003','IAM','High','Pending',CURRENT_DATE - 3,600000),
  ('mer-tk-04','meridian-health-plan-demo','Stand up secondary clearinghouse','mer-rk-004','Vendor Mgmt','High','Pending',CURRENT_DATE - 20,1100000),
  ('mer-tk-05','meridian-health-plan-demo','Revoke orphaned privileged access','mer-rk-005','IAM','High','Pending',CURRENT_DATE + 10,300000),
  ('mer-tk-06','meridian-health-plan-demo','Phishing-resistant controls rollout','mer-rk-007','Security','Medium','Pending',CURRENT_DATE + 21,250000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO findings (id, title, description, severity, status, organization_id, discovered_date, risk_id, business_process_id, is_repeat, repeat_count, tool, source) VALUES
  ('mer-fd-01','No EDR on claims servers','23 servers without EDR sensor','Critical','open','meridian-health-plan-demo',NOW() - INTERVAL '4 days','mer-rk-001','mer-bp-claims',false,0,'CrowdStrike','scan'),
  ('mer-fd-02','Unencrypted PHI at rest','Member DB stores PHI unencrypted','Critical','open','meridian-health-plan-demo',NOW() - INTERVAL '2 days','mer-rk-002','mer-bp-enroll',false,0,'CSPM','scan'),
  ('mer-fd-03','Excessive failed logins on portal','Credential stuffing pattern','High','in_progress','meridian-health-plan-demo',NOW() - INTERVAL '6 days','mer-rk-003','mer-bp-portal',false,0,'Splunk','siem'),
  ('mer-fd-04','Orphaned admin accounts','14 post-termination accounts active','High','open','meridian-health-plan-demo',NOW() - INTERVAL '18 days','mer-rk-005','mer-bp-payint',true,2,'SailPoint','iam'),
  ('mer-fd-05','Missing MFA on service accounts','Privileged service accounts without MFA','High','open','meridian-health-plan-demo',NOW() - INTERVAL '25 days','mer-rk-003','mer-bp-portal',true,3,'Okta','iam')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_risk_signals (id, organization_id, vendor_id, vendor_name, source_name, source_type, signal_category, signal_name, severity, confidence, observed_at, status, description, recommended_action) VALUES
  ('mer-vs-01','meridian-health-plan-demo','mer-vnd-clearing','State Clearinghouse','Breach Feed','api','Breach/Incident Intelligence','Reported incident','Critical',88,NOW() - INTERVAL '3 days','active','Clearinghouse disclosed an incident','Activate failover; assess impact'),
  ('mer-vs-02','meridian-health-plan-demo','mer-vnd-mail','Mailing Vendor','Dark Web','web_scrape','Dark Web/Credential Exposure','Leaked credentials','High',70,NOW() - INTERVAL '9 days','active','Vendor creds on dark web','Force reset + MFA'),
  ('mer-vs-03','meridian-health-plan-demo','mer-vnd-cloud','Cloud Host','Compliance','file_upload','Compliance Evidence','SOC 2 overdue','Medium',60,NOW() - INTERVAL '15 days','active','SOC 2 past due','Escalate evidence request')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assets (id, name, type, organization_id, hostname, owner, business_process_ids, data_classification, criticality, tier, supported, end_of_support_date, vuln_critical, vuln_high, patch_pct) VALUES
  ('mer-as-claims','Medicaid Claims Server','server','meridian-health-plan-demo','claims-prod','Infrastructure','["mer-bp-claims"]','["PHI"]','Critical','Tier 1',true,NULL,3,6,48),
  ('mer-as-legacydb','Legacy Member Database','database','meridian-health-plan-demo','memberdb-eol','Data','["mer-bp-enroll"]','["PHI"]','Critical','Tier 1',false,'2023-12-31',2,4,40),
  ('mer-as-portal','Member Portal','app','meridian-health-plan-demo','portal-web','Digital','["mer-bp-portal"]','["PII"]','High','Tier 2',true,NULL,1,3,55),
  ('mer-as-clearing','Clearinghouse Connector','API','meridian-health-plan-demo','clearing-api','EDI','["mer-bp-claims"]','["PHI"]','Critical','Tier 1',true,NULL,1,2,60),
  ('mer-as-imaging','Legacy Imaging System','server','meridian-health-plan-demo','imaging-eol','Infrastructure','["mer-bp-claims"]','["PHI"]','Medium','Tier 3',false,'2024-03-31',2,5,35)
ON CONFLICT (id) DO NOTHING;

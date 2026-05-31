-- Seed: Healthcare Threat Scenarios for BCBS Organization
-- This pre-populates realistic threat scenarios for healthcare payer environment
-- Each threat includes MITRE ATT&CK techniques and probability/impact assessments

-- Get BCBS organization ID (assuming it exists)
DO $$
DECLARE
  v_org_id UUID;
  v_claims_process_id UUID;
  v_enrollment_process_id UUID;
  v_phishing_threat_id UUID;
  v_ransomware_claims_id UUID;
BEGIN
  -- Get BCBS organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'BCBS' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'BCBS organization not found, skipping threat scenario seed';
    RETURN;
  END IF;

  -- Get business process IDs for mapping
  SELECT id INTO v_claims_process_id FROM business_processes
    WHERE organization_id = v_org_id AND name LIKE '%Claims%' LIMIT 1;

  SELECT id INTO v_enrollment_process_id FROM business_processes
    WHERE organization_id = v_org_id AND name LIKE '%Enrollment%' LIMIT 1;

  -- 1. Ransomware on Claims System (Critical, 70% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'Ransomware on Claims System',
    'ransomware',
    v_org_id,
    70,
    'Critical',
    'Ransomware attack encrypting claims processing system, disrupting payment operations and potentially exposing PHI. Impact: 3M PHI records at risk, $10M+ daily losses in delayed payments.',
    ARRAY['T1486']::jsonb, -- Data Encrypted for Impact
    ARRAY['risk_claims_availability']::jsonb,
    'Impact',
    'Implement offline backups, network segmentation, endpoint detection, incident response plan. Test restoration quarterly.',
    65
  );

  -- 2. Ransomware on Enrollment System (Critical, 65% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'Ransomware on Enrollment System',
    'ransomware',
    v_org_id,
    65,
    'Critical',
    'Ransomware targeting member enrollment system, preventing new member onboarding and plan changes. Impact: Member acquisition disruption, regulatory penalties for enrollment delays.',
    ARRAY['T1486']::jsonb,
    ARRAY['risk_enrollment_availability']::jsonb,
    'Impact',
    'Implement application whitelisting, immutable backups, zero-trust network access, regular restoration drills.',
    60
  );

  -- 3. Phishing Campaign targeting C-Suite (High, 80% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'Phishing Campaign targeting C-Suite',
    'phishing',
    v_org_id,
    80,
    'High',
    'Sophisticated phishing campaign targeting C-suite executives with business email compromise (BEC) and credential theft. Impact: Account takeover, fraudulent wire transfers, data exfiltration.',
    ARRAY['T1566', 'T1598']::jsonb, -- Phishing, Spearphishing
    ARRAY['risk_executive_compromise']::jsonb,
    'Initial Access',
    'Implement DMARC, DKIM, SPF, email filtering, executive training, MFA for all accounts, transaction verification.',
    70
  );

  -- 4. Insider Threat - PHI Data Exfiltration (High, 40% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'Insider Threat - PHI Data Exfiltration',
    'insider',
    v_org_id,
    40,
    'High',
    'Malicious insider with legitimate access exfiltrating PHI for personal gain or activism. Impact: Regulatory penalties (HIPAA), reputational damage, civil lawsuits.',
    ARRAY['T1567', 'T1052']::jsonb, -- Exfiltration Over Web Service, Exfiltration Over Physical Medium
    ARRAY['risk_phi_confidentiality']::jsonb,
    'Exfiltration',
    'Implement DLP on all egress points, UEBA analytics, least privilege access, quarterly access reviews, insider threat program.',
    75
  );

  -- 5. DDoS on Member Portal (Medium, 60% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'DDoS on Member Portal',
    'ddos',
    v_org_id,
    60,
    'Medium',
    'Distributed denial of service attack overwhelming member portal, preventing members from accessing benefits, claims status, and provider search. Impact: Member dissatisfaction, call center surge.',
    ARRAY['T1498', 'T1499']::jsonb, -- Network Denial of Service, System Shutdown
    ARRAY['risk_portal_availability']::jsonb,
    'Impact',
    'Implement cloud-based DDoS protection, CDN, rate limiting, geo-blocking, traffic analysis, incident response plan.',
    80
  );

  -- 6. Supply Chain Attack via NASCO (Critical, 30% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'Supply Chain Attack via NASCO',
    'supply_chain',
    v_org_id,
    30,
    'Critical',
    'Compromise of NASCO (claims clearinghouse) affecting all Blue Cross plans. Impact: Widespread claims processing disruption, PHI exposure across multiple payers.',
    ARRAY['T1195']::jsonb, -- Supply Chain Compromise
    ARRAY['risk_third_party_risk']::jsonb,
    'Initial Access',
    'Monitor NASCO security posture, vendor risk assessments, implement zero-trust with NASCO integration, contingency plans.',
    50
  );

  -- 7. API Abuse on Provider Portal (High, 50% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'API Abuse on Provider Portal',
    'api_abuse',
    v_org_id,
    50,
    'High',
    'Attackers exploiting API vulnerabilities in provider portal to scrape PHI, submit fraudulent claims, or escalate privileges. Impact: PHI exposure, fraudulent payments.',
    ARRAY['T1190', 'T1602']::jsonb, -- Exploit Public-Facing Application, Design of Infrastructure as a Service
    ARRAY['risk_api_security']::jsonb,
    'Initial Access',
    'Implement API security (WAF, rate limiting, input validation), API gateway, OAuth 2.0, regular penetration testing.',
    65
  );

  -- 8. Cloud Misconfiguration (S3 Bucket Exposure) (Critical, 45% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'Cloud Misconfiguration (S3 Bucket Exposure)',
    'misconfig',
    v_org_id,
    45,
    'Critical',
    'Publicly exposed S3 bucket containing PHI, claims data, or backups due to misconfiguration. Impact: Massive PHI breach, regulatory penalties, public scrutiny.',
    ARRAY['T1530', 'T1537']::jsonb, -- Data from Cloud Storage, Transfer Data to Cloud Account
    ARRAY['risk_cloud_security']::jsonb,
    'Collection',
    'Implement CSPM (cloud security posture management), automated scanning, IaC policies, least privilege IAM, regular audits.',
    55
  );

  -- 9. Third-Party Data Breach (Change Healthcare) (Critical, 25% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'Third-Party Data Breach (Change Healthcare)',
    'supply_chain',
    v_org_id,
    25,
    'Critical',
    'Change Healthcare breach affecting claims adjudication and pharmacy claims. Impact: Widespread disruption, PHI exposure across healthcare ecosystem.',
    ARRAY['T1195', 'T1566']::jsonb, -- Supply Chain Compromise, Phishing
    ARRAY['risk_third_party_breach']::jsonb,
    'Initial Access',
    'Vendor risk management, data minimization with third parties, monitor vendor breach notifications, breach response playbooks.',
    40
  );

  -- 10. Zero-Day Exploit on EHR Interface (Critical, 15% probability)
  INSERT INTO threat_scenarios (
    id, name, type, organization_id, probability, impact_level, description,
    mitre_technique, exploited_risks, mitre_tactic, mitigation_strategy, control_effectiveness
  ) VALUES (
    gen_random_uuid(),
    'Zero-Day Exploit on EHR Interface',
    'zero_day',
    v_org_id,
    15,
    'Critical',
    'Unknown vulnerability in EHR system interface exploited to gain access to PHI and healthcare operations. Impact: System compromise, PHI exfiltration, patient care disruption.',
    ARRAY['T1190', 'T1210']::jsonb, -- Exploit Public-Facing Application, Exploitation of Remote Services
    ARRAY['risk_zero_day']::jsonb,
    'Initial Access',
    'Defense in depth, network segmentation, application whitelisting, zero-trust, vulnerability management, threat hunting.',
    35
  );

  RAISE NOTICE 'Healthcare threat scenarios seeded successfully for organization %', v_org_id;

END $$;

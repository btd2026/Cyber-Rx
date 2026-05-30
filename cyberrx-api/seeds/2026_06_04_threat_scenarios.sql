-- ============================================================================
-- Seed File: Threat Scenarios with MITRE ATT&CK Mapping
-- Task: T-111
-- Description: Seed ThreatScenario library mapped to MITRE ATT&CK techniques
-- Organization: BCBS Demo Tenant (org_id: demo-bcbs-001)
-- References: MITRE_SCENARIOS from App.jsx lines 12851-13193
-- ============================================================================

-- ============================================================================
-- CRITICAL THREAT SCENARIOS FOR HEALTHCARE PAYERS
-- Each scenario includes MITRE ATT&CK technique mapping, probability, and impact
-- Based on Verizon DBIR 2025, HHS OCR breach reporting, and healthcare threat landscape
-- ============================================================================

-- 1. Ransomware (Modern Healthcare's #1 Threat)
-- MITRE: T1486 - Data Encrypted for Impact
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-ransomware-001',
  'demo-bcbs-001',
  'Ransomware - Data Encryption and Extortion',
  'ransomware',
  'Malicious software encrypts critical systems and data, demanding payment for decryption. Healthcare is prime target due to time-sensitive operations. Modern variants exfiltrate data for double extortion (encryption + leak threat). Payor claims systems are high-value targets affecting cash flow and member services.',
  'T1486',
  'Data Encrypted for Impact',
  '["Impact", "Execution"]',
  72,
  'Critical',
  '[1000000, 10000000]',
  '["Sudden file encryption", "Ransom note", "Exfiltration warning", ' ||
   '"System-wide unavailability", "Backup encryption attempts"]',
  '["End-user training", "Email filtering", "EDR/XDR", "Immutable backups", ' ||
   '"Network segmentation", "Incident response plan", "Cyber insurance"]',
  'Verizon DBIR 2025, HHS OCR Wall of Shame 2024',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Business Email Compromise (BEC)
-- MITRE: T1566 - Phishing, T1659 - Impersonation
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-bec-001',
  'demo-bcbs-001',
  'Business Email Compromise - Executive Impersonation',
  'phishing',
  'Attackers compromise or impersonate executive email accounts to authorize fraudulent payments, wire transfers, or data exfiltration. Healthcare CFO and CRO are common targets due to high-value transactions. Indirectly affects claims payment integrity.',
  'T1566,T1659',
  'Phishing,Impersonation',
  '["Social Engineering", "Initial Access"]',
  68,
  'High',
  '[500000, 5000000]',
  '["Urgent payment requests", "Executive email spoofing", ' ||
   '"Invoice fraud", "Wire transfer instructions", "Account takeover indicators"]',
  '["MFA on email", "DMARC/DKIM/SPF", "Payment validation procedures", ' ||
   '"Executive verification protocols", "Transaction monitoring"]',
  'FBI IC3 2024 Report, Verizon DBIR 2025',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Supply Chain Compromise
-- MITRE: T1195 - Supply Chain Compromise
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-supply-chain-001',
  'demo-bcbs-001',
  'Supply Chain Compromise - Third-Party Breach',
  'supply_chain',
  'Attackers compromise trusted third-party vendors (PBM, claims clearinghouse, TPA) to gain access to payer systems. Healthcare has extensive third-party connections creating attack surface. NASCO clearinghouse integration is a critical path.',
  'T1195',
  'Supply Chain Compromise',
  '["Initial Access", "Persistence"]',
  58,
  'Critical',
  '[2000000, 15000000]',
  '["Vendor credential compromise", "Indirect system access", ' ||
   '"Lateral movement from vendor", "Data exfiltration via trusted channel"]',
  '["Vendor risk management", "Third-party security assessments", ' ||
   '"Zero-trust network architecture", "Vendor access controls", ' ||
   '"Continuous monitoring"]',
  'CISA 2024 Advisory, Mandiant 2024 Trends',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Insider Threat - Data Exfiltration
-- MITRE: T1567 - Exfiltration, T1114 - Email Collection
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-insider-001',
  'demo-bcbs-001',
  'Insider Threat - PHI Data Exfiltration',
  'insider',
  'Malicious or careless employees exfiltrate protected health information for personal gain or accidental disclosure. Call center staff, claims processors, and care managers with PHI access are high-risk roles. Member data black market value drives theft.',
  'T1567,T1114',
  'Exfiltration Over Web Service,Email Collection',
  '["Collection", "Exfiltration"]',
  45,
  'High',
  '[250000, 2000000]',
  '["Unusual bulk access", "After-hours activity", ' ||
   '"Large data downloads", "USB device usage", "Personal email forwarding"]',
  '["Data loss prevention (DLP)", "User behavior analytics (UBA)", ' ||
   '"Access review processes", "Least privilege enforcement", ' ||
   '"Mandatory vacation policies"]',
  'Verizon DBIR 2025 Insider Threat Report',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. Credential Stuffing / Account Takeover
-- MITRE: T1110 - Brute Force, T1078 - Valid Accounts
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-credential-stuffing-001',
  'demo-bcbs-001',
  'Credential Stuffing - Account Takeover',
  'credential_theft',
  'Attackers use compromised credentials from data breaches to gain unauthorized access to member/provider portals. Password reuse and credential stuffing attacks target authentication systems. Member portal and provider portal are primary targets.',
  'T1110,T1078',
  'Brute Force,Valid Accounts',
  '["Initial Access", "Credential Access"]',
  65,
  'High',
  '[200000, 1000000]',
  '["Brute force attempts", "Credential stuffing patterns", ' ||
   '"Geographic anomalies", "Impossible travel", "Bulk login failures"]',
  '["MFA enforcement", "Password policies", ' ||
   '"Rate limiting and account lockout", "Anomaly detection", ' ||
   '"Compromised credential monitoring"]',
  'HHS OCR 2024, Have I Been Pwned 2024 Statistics',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 6. API Abuse and Data Scraping
-- MITRE: T1210 - Exploitation of Remote Services, T1659 - Application Exploitation
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-api-abuse-001',
  'demo-bcbs-001',
  'API Abuse - Bulk Data Scraping',
  'api_abuse',
  'Automated scripts abuse legitimate API endpoints to exfiltrate bulk member/provider data. Eligibility verification APIs and provider directory APIs are common targets. Lack of rate limiting and authentication weakness enables abuse.',
  'T1210,T1659',
  'Exploitation of Remote Services,Application Exploitation',
  '['Initial Access", "Collection"]',
  55,
  'Medium',
  '[100000, 750000]',
  '["Bulk API calls", "High volume from single source", ' ||
   '"Automated access patterns", "Unusual data request patterns"]',
  '["API authentication", "Rate limiting", ' ||
   '"API security testing", "Input validation", ' ||
   '"API gateway monitoring", "Data volume controls"]',
  'OWASP API Security Top 10 2023',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 7. Cloud Misconfiguration / Data Exposure
-- MITRE: T1530 - Data from Cloud Storage Object
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-cloud-misconfig-001',
  'demo-bcbs-001',
  'Cloud Misconfiguration - Public Data Exposure',
  'cloud_misconfiguration',
  'Improperly secured cloud storage buckets or S3 buckets expose sensitive data to public internet. Healthcare cloud migration increases this risk. Member document storage, claims attachments, and provider files are at risk.',
  'T1530',
  'Data from Cloud Storage Object',
  '["Collection"]',
  42,
  'Critical',
  '[500000, 5000000]',
  '["Public S3 buckets", "Open cloud storage", ' ||
   '"Unauthenticated access", "Data indexed by search engines"]',
  '["Cloud security posture management", "Automated configuration checks", ' ||
   '"Data classification", "Least privilege cloud access", ' ||
   '"Encryption at rest"]',
  'CISA 2024, Gartner Cloud Security 2024',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 8. Man-in-the-Middle (MitM) / Network Interception
-- MITRE: T1557 - Adversary-in-the-Middle
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-mitm-001',
  'demo-bcbs-001',
  'Man-in-the-Middle - Network Traffic Interception',
  'mitm',
  'Attackers intercept network communications between payor systems and external parties (providers, members, CMS). Legacy systems without TLS encryption are vulnerable. NASCO and HealthEdge integrations require secure channels.',
  'T1557',
  'Adversary-in-the-Middle',
  '["Collection", "Credential Access"]',
  38,
  'Medium',
  '[150000, 1000000]',
  '["TLS downgrade attacks", "Certificate spoofing", ' ||
   '"Network traffic anomalies", "Unexpected proxy servers"]',
  '["TLS 1.3 enforcement", "Certificate pinning", ' ||
   '"Network segmentation", "HSM protection", ' ||
   '"Certificate management"]',
  'NIST SP 800-52r2, PCI DSS 4.0',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 9. SQL Injection - Database Compromise
-- MITRE: T1190 - Exploit Public-Facing Application
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-sql-injection-001',
  'demo-bcbs-001',
  'SQL Injection - Database Compromise',
  'sql_injection',
  'Attackers inject malicious SQL into web application inputs to exfiltrate or manipulate database contents. Member portal and provider portal web forms are high-risk entry points. Claims database is high-value target.',
  'T1190',
  'Exploit Public-Facing Application',
  '["Initial Access", "Execution"]',
  35,
  'Critical',
  '[500000, 3000000]',
  '["SQL syntax in inputs", "Database error messages", ' ||
   '"Timing-based blind SQL patterns", "UNION operators in URLs"]',
  '["Input validation", ' ||
   '"Parameterized queries", "Web application firewall (WAF)", ' ||
   '"Secure coding practices", "Application security testing"]',
  'OWASP Top 10 2021, Veracode 2024 State of Software Security',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 10. Zero-Day Exploitation
-- MITRE: T1204 - User Execution, T1068 - Exploitation for Privilege Escalation
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-zero-day-001',
  'demo-bcbs-001',
  'Zero-Day Exploitation - Unknown Vulnerability',
  'zero_day',
  'Attackers exploit previously unknown software vulnerabilities before patches are available. Healthcare legacy systems (NASCO mainframe, FACETS) with long patch cycles are vulnerable. Zero-day broker market increases threat.',
  'T1204,T1068',
  'User Execution,Exploitation for Privilege Escalation',
  '["Initial Access", "Execution", "Privilege Escalation"]',
  25,
  'Critical',
  '[1000000, 20000000]',
  '["Exploit kits", "Unknown vulnerability signatures", ' ||
   '"Unexpected code execution", "Privilege escalation patterns"]',
  '["Vulnerability management", "Patch management", ' ||
   '"Application allow-listing", "Behavior-based EDR", ' ||
   '"Threat intelligence feeds", "Zero-trust architecture"]',
  'Mandiant M-Trends 2024, Zero Day Initiative 2024',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 11. Web Shell / Backdoor
-- MITRE: T1505 - Server Software Component, T1011 - Exfiltration Over Other Network Medium
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-webshell-001',
  'demo-bcbs-001',
  'Web Shell / Backdoor - Persistent Access',
  'webshell',
  'Attackers implant malicious code on web servers to maintain persistent remote access. Member portal and provider portal servers are common targets. Enables data exfiltration, further compromise, and ransomware deployment.',
  'T1505,T1011',
  'Server Software Component,Exfiltration Over Other Network Medium',
  '["Persistence", "Command and Control"]',
  42,
  'High',
  '[300000, 2000000]',
  '["Suspicious file uploads", ' ||
   '"Obfuscated script files", "Unusual process execution", ' ||
   '"Outbound C2 communications"]',
  '["Web application firewall (WAF)", "File integrity monitoring", ' ||
   '"Server hardening", "Antivirus/EDR on servers", ' ||
   '"Outbound traffic monitoring"]',
  'CISA 2024 Top Routinely Exploited Vulnerabilities',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 12. Cross-Site Scripting (XSS)
-- MITRE: T1059 - Command and Scripting Interpreter, T1204 - User Execution
INSERT INTO threat_scenarios (
  id,
  organization_id,
  name,
  type,
  description,
  mitre_technique_id,
  mitre_technique_name,
  mitre_tactics,
  probability_percent,
  impact_level,
  financial_impact_range,
  typical_indicators,
  mitigation_controls,
  source_reference,
  last_updated
) VALUES (
  'ts-xss-001',
  'demo-bcbs-001',
  'Cross-Site Scripting - Session Hijacking',
  'xss',
  'Attackers inject malicious scripts into web pages viewed by other users. Enables session hijacking, credential theft, and redirection to phishing sites. Member portal provider search and claims status pages are vulnerable.',
  'T1059,T1204',
  'Command and Scripting Interpreter,User Execution',
  '["Execution", "Initial Access"]',
  40,
  'Medium',
  '[100000, 500000]',
  '["Script tags in inputs", "JavaScript in URLs", ' ||
   '"Session manipulation", "Unusual redirects"]',
  '["Input validation and encoding", ' ||
   '"Content Security Policy (CSP)", "Output encoding", ' ||
   '"HttpOnly cookies", "SameSite cookie attributes"]',
  'OWASP Top 10 2021',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- THREAT SCENARIO SUMMARY
-- Total: 12 comprehensive threat scenarios covering:
-- - Ransomware (highest probability at 72%)
-- - Phishing/BEC (68%)
-- - Supply chain compromise (58%)
-- - Insider threats (45%)
-- - Credential theft (65%)
-- - API abuse (55%)
-- - Cloud misconfiguration (42%)
-- - Network attacks (38%)
-- - Injection attacks (35%)
-- - Zero-day exploits (25%)
-- - Web shells (42%)
-- - XSS (40%)
--
-- All scenarios include:
-- - MITRE ATT&CK technique mapping
-- - Probability percentage (based on industry data)
-- - Financial impact range estimates
-- - Typical indicators for detection
-- - Mitigation controls
-- - Source references
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERY
-- After running this seed, you should have:
-- - 12 Threat Scenarios covering major healthcare threat vectors
-- - All scenarios mapped to MITRE ATT&CK techniques
-- - Probability scores ranging from 25% to 72%
-- - Financial impact estimates for each scenario
-- - Mitigation controls for each scenario
-- ============================================================================

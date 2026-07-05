'use strict';

/**
 * industryProfiles — the industry-agnostic backbone of Nerion.
 *
 * Nerion used to be hard-wired to a health-insurance payer. This registry makes
 * the platform adapt to ANY industry the customer selects during setup. Each
 * profile drives:
 *   - the industry-specific intake questions added to the base interview,
 *   - the suggested key business processes and technology categories,
 *   - the regulations / frameworks that matter for that industry,
 *   - the "crown-jewel" data type the program is protecting,
 *   - an industry-appropriate demo posture (processes, regulations, top risks)
 *     so a fresh org's executive dashboards are populated with relevant content.
 *
 * Real customer data (uploaded processes, app inventory, live control evidence)
 * always overrides the demo block; the profile only shapes scoping + defaults.
 */

// Intake question shape mirrors NistCsfService EVIDENCE_QUESTIONS so the two
// merge cleanly: { key, category, doc, question, options:{yes,partial,no} }.
const q = (key, question, doc) => ({ key, category: 'INDUSTRY', doc, question, options: { yes: 90, partial: 55, no: 15 }, source: 'industry' });

const PROFILES = {
  healthcare_payer: {
    id: 'healthcare_payer', name: 'Health Insurance (Payer)', icon: '🏥',
    crownJewelData: 'PHI — member health, claims, and eligibility data',
    regulations: ['HIPAA', 'HITECH', 'CMS', 'State Breach Laws', 'NAIC Model Law'],
    keyProcesses: ['Claims Adjudication', 'Member Enrollment & Eligibility', 'Provider Payments', 'Care / Utilization Management', 'Pharmacy Benefits', 'Member Portal & Services'],
    techCategories: ['Core Claims Platform', 'EDI / Clearinghouse', 'Member Portal', 'CRM', 'Data Warehouse / Analytics', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR', 'DLP'],
    intakeQuestions: [
      q('ind_phi_volume', 'Do you maintain a current inventory of systems that store or process PHI (members, claims, eligibility)?', 'PHI system inventory'),
      q('ind_baa', 'Do you have signed Business Associate Agreements with every vendor that touches PHI?', 'BAA register'),
      q('ind_cms_edi', 'Are your EDI / clearinghouse and CMS-facing interfaces covered by monitored, authenticated connections?', 'EDI/CMS interface controls'),
    ],
    demo: {
      crownJewel: 'PHI (member health & claims data)',
      processes: [
        { name: 'Claims Adjudication', tier: 1, criticality: 'Critical', owner: 'VP Claims' },
        { name: 'Member Portal & Eligibility', tier: 1, criticality: 'Critical', owner: 'VP Member Svcs' },
        { name: 'Provider Payments', tier: 1, criticality: 'Critical', owner: 'VP Finance Ops' },
        { name: 'Clearinghouse Integration', tier: 2, criticality: 'High', owner: 'Director EDI' },
      ],
      regulations: [
        { name: 'HIPAA Breach Notification', source: 'HIPAA', citation: '45 CFR §164.404', notificationTimeline: '60 days', maxPenalty: 1900000 },
        { name: 'CMS Incident Reporting', source: 'CMS', citation: 'CMS ARS', notificationTimeline: '72 hours', maxPenalty: 500000 },
        { name: 'State Breach Law (multi-state)', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 750000 },
      ],
      topRisks: [
        'Unpatched internet-facing KEV vulnerabilities', 'Privileged access without MFA on claims systems',
        'Public cloud storage exposing PHI', 'Third-party clearinghouse with weak controls',
        'Ransomware recovery not restore-tested', 'DLP gaps on member-services SaaS',
      ],
    },
  },

  healthcare_provider: {
    id: 'healthcare_provider', name: 'Hospital / Health System (Provider)', icon: '🩺',
    crownJewelData: 'PHI — electronic health records and clinical systems',
    regulations: ['HIPAA', 'HITECH', 'CMS Conditions of Participation', 'FDA (medical devices)', 'State Breach Laws'],
    keyProcesses: ['Patient Registration & Admissions', 'Electronic Health Records (EHR)', 'Clinical Order Entry', 'Revenue Cycle / Billing', 'Pharmacy & Medication', 'Medical Device / IoMT Operations'],
    techCategories: ['EHR Platform', 'PACS / Imaging', 'Medical Devices (IoMT)', 'Revenue Cycle System', 'Lab / LIS', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR', 'Network Segmentation'],
    intakeQuestions: [
      q('ind_ehr_access', 'Do you have role-based access controls and audit logging across the EHR and clinical systems?', 'EHR access controls'),
      q('ind_iomt', 'Do you maintain an inventory of connected medical devices (IoMT) and segment them from the clinical network?', 'Medical device inventory & segmentation'),
      q('ind_phi_provider', 'Do you have signed BAAs and breach-notification processes for clinical vendors?', 'Clinical vendor BAAs'),
    ],
    demo: {
      crownJewel: 'PHI (electronic health records)',
      processes: [
        { name: 'Electronic Health Records (EHR)', tier: 1, criticality: 'Critical', owner: 'CMIO' },
        { name: 'Patient Registration & Admissions', tier: 1, criticality: 'Critical', owner: 'VP Patient Access' },
        { name: 'Revenue Cycle / Billing', tier: 1, criticality: 'Critical', owner: 'VP Revenue Cycle' },
        { name: 'Medical Device / IoMT Operations', tier: 2, criticality: 'High', owner: 'Director Clinical Eng' },
      ],
      regulations: [
        { name: 'HIPAA Breach Notification', source: 'HIPAA', citation: '45 CFR §164.404', notificationTimeline: '60 days', maxPenalty: 1900000 },
        { name: 'CMS Conditions of Participation', source: 'CMS', citation: '42 CFR §482', notificationTimeline: 'per condition', maxPenalty: 500000 },
        { name: 'State Breach Law (multi-state)', source: 'State AG', citation: 'Various', notificationTimeline: '30–60 days', maxPenalty: 750000 },
      ],
      topRisks: [
        'Ransomware impacting EHR availability', 'Unsegmented legacy medical devices (IoMT)',
        'Privileged clinical access without MFA', 'Phishing targeting clinical staff',
        'Unpatched imaging / PACS systems', 'Third-party billing vendor exposure',
      ],
    },
  },

  bank: {
    id: 'bank', name: 'Banking', icon: '🏦',
    crownJewelData: 'Customer financial data, account credentials, and funds-transfer systems',
    regulations: ['GLBA', 'FFIEC', 'PCI DSS', 'SOX', 'OCC / FDIC Guidance', 'NYDFS 500'],
    keyProcesses: ['Core Banking / Deposits', 'Payments & Wire Transfer', 'Lending & Underwriting', 'Card Processing', 'Online & Mobile Banking', 'Fraud Detection'],
    techCategories: ['Core Banking Platform', 'Payment / Wire System', 'Card Processing', 'Online/Mobile Banking', 'Fraud Engine', 'Data Warehouse', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR'],
    intakeQuestions: [
      q('ind_wire_controls', 'Do you enforce dual control and out-of-band verification on wire / funds-transfer systems?', 'Wire transfer controls'),
      q('ind_pci', 'Are cardholder-data environments segmented and PCI DSS scoped/assessed?', 'PCI DSS scoping'),
      q('ind_nydfs', 'Do you have a documented program meeting FFIEC / NYDFS 500 expectations (CISO, testing, reporting)?', 'FFIEC/NYDFS program'),
    ],
    demo: {
      crownJewel: 'Customer financial data & funds-transfer systems',
      processes: [
        { name: 'Payments & Wire Transfer', tier: 1, criticality: 'Critical', owner: 'Head of Payments' },
        { name: 'Core Banking / Deposits', tier: 1, criticality: 'Critical', owner: 'VP Core Banking' },
        { name: 'Online & Mobile Banking', tier: 1, criticality: 'Critical', owner: 'VP Digital' },
        { name: 'Card Processing', tier: 2, criticality: 'High', owner: 'Director Cards' },
      ],
      regulations: [
        { name: 'GLBA Safeguards Rule', source: 'FTC/GLBA', citation: '16 CFR Part 314', notificationTimeline: '30 days', maxPenalty: 100000 },
        { name: 'NYDFS Cyber Event Reporting', source: 'NYDFS', citation: '23 NYCRR 500.17', notificationTimeline: '72 hours', maxPenalty: 1000000 },
        { name: 'PCI DSS Reporting', source: 'PCI SSC', citation: 'PCI DSS v4', notificationTimeline: 'immediate', maxPenalty: 500000 },
      ],
      topRisks: [
        'Business email compromise / wire fraud', 'Account takeover via credential stuffing',
        'Unpatched internet-facing banking apps', 'Privileged access without MFA',
        'Card data environment scope creep', 'Third-party fintech / API exposure',
      ],
    },
  },

  insurance_pc: {
    id: 'insurance_pc', name: 'Property & Casualty Insurance', icon: '📋',
    crownJewelData: 'Policyholder PII, underwriting and claims data',
    regulations: ['NAIC Model Law', 'State Insurance Regs', 'GLBA', 'SOX', 'State Breach Laws'],
    keyProcesses: ['Underwriting', 'Policy Administration', 'Claims Processing', 'Billing & Collections', 'Agent / Broker Portal', 'Actuarial & Pricing'],
    techCategories: ['Policy Admin System', 'Claims System', 'Underwriting / Rating Engine', 'Agent Portal', 'Billing', 'Data Warehouse', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR'],
    intakeQuestions: [
      q('ind_naic', 'Do you maintain an information-security program meeting the NAIC Insurance Data Security Model Law?', 'NAIC program'),
      q('ind_agent_portal', 'Are agent / broker portal identities governed with MFA and least privilege?', 'Agent portal access'),
    ],
    demo: {
      crownJewel: 'Policyholder PII & claims data',
      processes: [
        { name: 'Claims Processing', tier: 1, criticality: 'Critical', owner: 'VP Claims' },
        { name: 'Policy Administration', tier: 1, criticality: 'Critical', owner: 'VP Policy Ops' },
        { name: 'Underwriting', tier: 2, criticality: 'High', owner: 'Chief Underwriter' },
        { name: 'Agent / Broker Portal', tier: 2, criticality: 'High', owner: 'Director Distribution' },
      ],
      regulations: [
        { name: 'NAIC Data Security Event', source: 'State DOI', citation: 'NAIC §6', notificationTimeline: '72 hours', maxPenalty: 500000 },
        { name: 'State Breach Law (multi-state)', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 750000 },
        { name: 'GLBA Safeguards Rule', source: 'FTC/GLBA', citation: '16 CFR Part 314', notificationTimeline: '30 days', maxPenalty: 100000 },
      ],
      topRisks: [
        'Claims fraud via account takeover', 'Privileged access without MFA',
        'Unpatched policy-admin systems', 'Agent-portal credential exposure',
        'Third-party data aggregator risk', 'Ransomware on claims operations',
      ],
    },
  },

  retail_ecommerce: {
    id: 'retail_ecommerce', name: 'Retail / E-commerce', icon: '🛒',
    crownJewelData: 'Cardholder data, customer PII, and order systems',
    regulations: ['PCI DSS', 'CCPA / CPRA', 'GDPR', 'State Breach Laws', 'FTC Act'],
    keyProcesses: ['E-commerce Storefront', 'Payment & Checkout', 'Order Management & Fulfillment', 'Inventory & Supply Chain', 'Customer Accounts', 'Point of Sale (POS)'],
    techCategories: ['E-commerce Platform', 'Payment Gateway', 'POS Systems', 'Order Management', 'Inventory / ERP', 'CDN / WAF', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR'],
    intakeQuestions: [
      q('ind_pci_retail', 'Is the cardholder-data environment segmented and PCI DSS assessed across web and POS?', 'PCI DSS scoping'),
      q('ind_ecom_waf', 'Do you protect the storefront and checkout with a WAF and bot / fraud controls?', 'Storefront protection'),
      q('ind_privacy', 'Do you honor consumer privacy rights (CCPA/GDPR) and maintain a data-processing inventory?', 'Privacy compliance'),
    ],
    demo: {
      crownJewel: 'Cardholder data & customer PII',
      processes: [
        { name: 'Payment & Checkout', tier: 1, criticality: 'Critical', owner: 'VP Digital Commerce' },
        { name: 'E-commerce Storefront', tier: 1, criticality: 'Critical', owner: 'VP E-commerce' },
        { name: 'Order Management & Fulfillment', tier: 1, criticality: 'Critical', owner: 'VP Operations' },
        { name: 'Point of Sale (POS)', tier: 2, criticality: 'High', owner: 'Director Retail Ops' },
      ],
      regulations: [
        { name: 'PCI DSS Reporting', source: 'PCI SSC', citation: 'PCI DSS v4', notificationTimeline: 'immediate', maxPenalty: 500000 },
        { name: 'CCPA / CPRA', source: 'CA AG', citation: 'Cal. Civ. Code §1798', notificationTimeline: 'without delay', maxPenalty: 750000 },
        { name: 'State Breach Law (multi-state)', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 500000 },
      ],
      topRisks: [
        'Web-skimming / Magecart on checkout', 'Account takeover & credential stuffing',
        'Unpatched internet-facing storefront', 'POS malware', 'Third-party plugin / supply-chain risk',
        'Card data environment scope creep',
      ],
    },
  },

  saas_tech: {
    id: 'saas_tech', name: 'Software / SaaS', icon: '💻',
    crownJewelData: 'Customer data, source code, and production infrastructure',
    regulations: ['SOC 2', 'ISO 27001', 'GDPR', 'CCPA / CPRA', 'Customer Contractual (DPA)'],
    keyProcesses: ['Product / Platform Delivery', 'Software Development (SDLC)', 'CI/CD & Release', 'Customer Onboarding', 'Cloud Operations', 'Support & Incident Response'],
    techCategories: ['Cloud Infrastructure (IaaS)', 'CI/CD Pipeline', 'Source Code / SCM', 'Container / Kubernetes', 'Secrets Management', 'Identity & Access', 'SIEM', 'EDR', 'CSPM', 'DLP'],
    intakeQuestions: [
      q('ind_sdlc', 'Do you enforce secure-SDLC controls (code review, SAST/SCA, secrets scanning) in CI/CD?', 'Secure SDLC'),
      q('ind_cspm', 'Do you continuously monitor cloud posture (CSPM) and enforce IaC guardrails?', 'Cloud posture management'),
      q('ind_soc2', 'Do you maintain a current SOC 2 / ISO 27001 attestation covering production systems?', 'SOC 2 / ISO 27001'),
    ],
    demo: {
      crownJewel: 'Customer data & production infrastructure',
      processes: [
        { name: 'Product / Platform Delivery', tier: 1, criticality: 'Critical', owner: 'VP Engineering' },
        { name: 'CI/CD & Release', tier: 1, criticality: 'Critical', owner: 'Director DevOps' },
        { name: 'Cloud Operations', tier: 1, criticality: 'Critical', owner: 'Head of SRE' },
        { name: 'Customer Onboarding', tier: 2, criticality: 'High', owner: 'VP Customer Success' },
      ],
      regulations: [
        { name: 'Customer breach-notification (DPA)', source: 'Contractual', citation: 'Customer DPAs', notificationTimeline: '24–72 hours', maxPenalty: 1000000 },
        { name: 'GDPR Breach Notification', source: 'EU DPA', citation: 'GDPR Art. 33', notificationTimeline: '72 hours', maxPenalty: 2000000 },
        { name: 'CCPA / CPRA', source: 'CA AG', citation: 'Cal. Civ. Code §1798', notificationTimeline: 'without delay', maxPenalty: 750000 },
      ],
      topRisks: [
        'Leaked secrets / API keys in code', 'Cloud misconfiguration exposing customer data',
        'Supply-chain compromise in dependencies', 'Privileged access to production without MFA',
        'Unpatched container / Kubernetes nodes', 'Tenant-isolation failure (multi-tenant)',
      ],
    },
  },

  manufacturing: {
    id: 'manufacturing', name: 'Manufacturing', icon: '🏭',
    crownJewelData: 'Operational technology (OT/ICS), production systems, and IP',
    regulations: ['NIST CSF', 'IEC 62443', 'CMMC (defense)', 'Trade Secret / IP', 'State Breach Laws'],
    keyProcesses: ['Production / Plant Operations', 'Supply Chain & Procurement', 'Industrial Control Systems (OT/ICS)', 'Product Engineering / R&D', 'Warehouse & Logistics', 'Quality Management'],
    techCategories: ['OT / ICS / SCADA', 'MES (Manufacturing Execution)', 'ERP', 'PLM / CAD', 'Warehouse Management', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR', 'OT Network Monitoring'],
    intakeQuestions: [
      q('ind_ot_segmentation', 'Is your OT/ICS network segmented (IT/OT boundary) and monitored separately from IT?', 'IT/OT segmentation'),
      q('ind_ics_inventory', 'Do you maintain an inventory of ICS/SCADA assets and their patch/lifecycle status?', 'ICS asset inventory'),
      q('ind_ip', 'Do you protect product IP / trade secrets with access controls and DLP?', 'IP protection'),
    ],
    demo: {
      crownJewel: 'OT/ICS production systems & product IP',
      processes: [
        { name: 'Production / Plant Operations', tier: 1, criticality: 'Critical', owner: 'VP Operations' },
        { name: 'Industrial Control Systems (OT/ICS)', tier: 1, criticality: 'Critical', owner: 'Director OT' },
        { name: 'Supply Chain & Procurement', tier: 2, criticality: 'High', owner: 'VP Supply Chain' },
        { name: 'Product Engineering / R&D', tier: 2, criticality: 'High', owner: 'VP Engineering' },
      ],
      regulations: [
        { name: 'State Breach Law (multi-state)', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 500000 },
        { name: 'CMMC (if defense supplier)', source: 'DoD', citation: '32 CFR Part 170', notificationTimeline: '72 hours', maxPenalty: 1000000 },
        { name: 'IEC 62443 conformance', source: 'IEC', citation: 'IEC 62443', notificationTimeline: 'per contract', maxPenalty: 250000 },
      ],
      topRisks: [
        'Ransomware halting plant production', 'Flat IT/OT network enabling lateral movement',
        'Unpatched legacy ICS / SCADA', 'IP / trade-secret exfiltration',
        'Third-party / supplier compromise', 'Remote-access (VPN) into OT without MFA',
      ],
    },
  },

  energy_utilities: {
    id: 'energy_utilities', name: 'Energy / Utilities', icon: '⚡',
    crownJewelData: 'Grid / SCADA control systems and critical infrastructure',
    regulations: ['NERC CIP', 'TSA Security Directives', 'NIST CSF', 'State PUC', 'State Breach Laws'],
    keyProcesses: ['Grid / Generation Operations', 'SCADA / Control Center', 'Metering & Billing', 'Field / Remote Operations', 'Outage Management', 'Customer Systems'],
    techCategories: ['SCADA / EMS', 'OT Network', 'Metering (AMI)', 'GIS / Outage Mgmt', 'ERP / Billing', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR', 'OT Monitoring'],
    intakeQuestions: [
      q('ind_nerc', 'Do you maintain NERC CIP compliance for bulk electric system cyber assets?', 'NERC CIP compliance'),
      q('ind_scada', 'Is the SCADA / control-center environment isolated, monitored, and access-controlled?', 'SCADA isolation'),
    ],
    demo: {
      crownJewel: 'Grid / SCADA control systems',
      processes: [
        { name: 'SCADA / Control Center', tier: 1, criticality: 'Critical', owner: 'Director Grid Ops' },
        { name: 'Grid / Generation Operations', tier: 1, criticality: 'Critical', owner: 'VP Operations' },
        { name: 'Outage Management', tier: 2, criticality: 'High', owner: 'Director Reliability' },
        { name: 'Metering & Billing', tier: 2, criticality: 'High', owner: 'VP Customer Ops' },
      ],
      regulations: [
        { name: 'NERC CIP Reporting', source: 'NERC', citation: 'CIP-008', notificationTimeline: '1–24 hours', maxPenalty: 1000000 },
        { name: 'TSA Security Directive', source: 'TSA', citation: 'SD Pipeline', notificationTimeline: '24 hours', maxPenalty: 500000 },
        { name: 'State Breach Law (multi-state)', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 500000 },
      ],
      topRisks: [
        'Nation-state targeting of grid control', 'Flat IT/OT network', 'Unpatched SCADA / EMS',
        'Remote access to OT without MFA', 'Third-party / vendor remote support risk', 'Ransomware on operations',
      ],
    },
  },

  government: {
    id: 'government', name: 'Government / Public Sector', icon: '🏛️',
    crownJewelData: 'Citizen PII and government services / records',
    regulations: ['FISMA', 'NIST 800-53', 'CJIS', 'StateRAMP / FedRAMP', 'State Breach Laws'],
    keyProcesses: ['Citizen Services / Portal', 'Benefits / Eligibility', 'Records Management', 'Public Safety Systems', 'Tax / Revenue', 'Procurement'],
    techCategories: ['Citizen Portal', 'Case Management', 'Records System', 'Public Safety (CJIS)', 'ERP / Financials', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR', 'DLP'],
    intakeQuestions: [
      q('ind_fisma', 'Do you maintain an authorization (ATO) and continuous monitoring per FISMA / NIST 800-53?', 'FISMA / ATO'),
      q('ind_cjis', 'If you handle criminal-justice information, do you meet CJIS Security Policy requirements?', 'CJIS compliance'),
    ],
    demo: {
      crownJewel: 'Citizen PII & government records',
      processes: [
        { name: 'Citizen Services / Portal', tier: 1, criticality: 'Critical', owner: 'CIO' },
        { name: 'Benefits / Eligibility', tier: 1, criticality: 'Critical', owner: 'Program Director' },
        { name: 'Public Safety Systems', tier: 1, criticality: 'Critical', owner: 'Director Public Safety' },
        { name: 'Records Management', tier: 2, criticality: 'High', owner: 'Records Officer' },
      ],
      regulations: [
        { name: 'FISMA Incident Reporting', source: 'CISA', citation: 'US-CERT', notificationTimeline: '1 hour', maxPenalty: 0 },
        { name: 'State Breach Law', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 500000 },
        { name: 'CJIS Reporting', source: 'FBI CJIS', citation: 'CJIS SP', notificationTimeline: 'immediate', maxPenalty: 0 },
      ],
      topRisks: [
        'Ransomware on citizen services', 'Legacy / end-of-life systems', 'Phishing of government staff',
        'Privileged access without MFA', 'Third-party / contractor exposure', 'Public-facing app vulnerabilities',
      ],
    },
  },

  higher_ed: {
    id: 'higher_ed', name: 'Higher Education', icon: '🎓',
    crownJewelData: 'Student PII (FERPA), research data, and health records',
    regulations: ['FERPA', 'GLBA (financial aid)', 'HIPAA (student health)', 'State Breach Laws', 'Research (CUI/NIST 800-171)'],
    keyProcesses: ['Student Information System', 'Admissions & Enrollment', 'Financial Aid', 'Research Computing', 'Learning Management', 'Campus Services'],
    techCategories: ['Student Information System', 'LMS', 'Research / HPC', 'Financial Aid System', 'Email / Collaboration', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR', 'Network'],
    intakeQuestions: [
      q('ind_ferpa', 'Do you control and audit access to student education records per FERPA?', 'FERPA access controls'),
      q('ind_research', 'For sponsored research with CUI, do you meet NIST 800-171 requirements?', 'Research data (800-171)'),
    ],
    demo: {
      crownJewel: 'Student PII & research data',
      processes: [
        { name: 'Student Information System', tier: 1, criticality: 'Critical', owner: 'Registrar / CIO' },
        { name: 'Financial Aid', tier: 1, criticality: 'Critical', owner: 'Director Financial Aid' },
        { name: 'Research Computing', tier: 2, criticality: 'High', owner: 'VP Research' },
        { name: 'Learning Management', tier: 2, criticality: 'High', owner: 'Director Academic Tech' },
      ],
      regulations: [
        { name: 'FERPA', source: 'US DoE', citation: '34 CFR Part 99', notificationTimeline: 'without delay', maxPenalty: 0 },
        { name: 'GLBA Safeguards (financial aid)', source: 'FTC/GLBA', citation: '16 CFR Part 314', notificationTimeline: '30 days', maxPenalty: 100000 },
        { name: 'State Breach Law', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 500000 },
      ],
      topRisks: [
        'Phishing / account takeover (students & staff)', 'Ransomware on campus systems',
        'Open / unsegmented research networks', 'Unpatched legacy systems',
        'Financial-aid fraud', 'Third-party EdTech vendor exposure',
      ],
    },
  },

  generic: {
    id: 'generic', name: 'Other / General', icon: '🏢',
    crownJewelData: 'Sensitive business data and critical operational systems',
    regulations: ['NIST CSF 2.0', 'NIST SP 800-53', 'CIS Controls', 'SOC 2', 'State Breach Laws'],
    keyProcesses: ['Core Business Operations', 'Finance & Accounting', 'Customer Management', 'Supply Chain / Procurement', 'HR & Payroll', 'IT Operations'],
    techCategories: ['ERP', 'CRM', 'Email / Collaboration', 'Data Warehouse', 'Cloud Infrastructure', 'Identity & Access', 'SIEM', 'EDR', 'Backup', 'DLP'],
    intakeQuestions: [
      q('ind_crown_jewels', 'Have you identified the data and systems most critical to your business (your "crown jewels")?', 'Crown-jewel identification'),
      q('ind_critical_vendors', 'Do you maintain an inventory of critical third-party vendors and their access?', 'Critical vendor inventory'),
    ],
    demo: {
      crownJewel: 'Sensitive business data & critical systems',
      processes: [
        { name: 'Core Business Operations', tier: 1, criticality: 'Critical', owner: 'COO' },
        { name: 'Finance & Accounting', tier: 1, criticality: 'Critical', owner: 'Controller' },
        { name: 'Customer Management', tier: 2, criticality: 'High', owner: 'VP Sales' },
        { name: 'IT Operations', tier: 2, criticality: 'High', owner: 'IT Director' },
      ],
      regulations: [
        { name: 'State Breach Law (multi-state)', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 500000 },
        { name: 'SOC 2 (customer commitments)', source: 'Contractual', citation: 'SOC 2', notificationTimeline: 'per contract', maxPenalty: 250000 },
        { name: 'GDPR (if EU data)', source: 'EU DPA', citation: 'GDPR Art. 33', notificationTimeline: '72 hours', maxPenalty: 1000000 },
      ],
      topRisks: [
        'Ransomware on core operations', 'Business email compromise', 'Privileged access without MFA',
        'Unpatched internet-facing systems', 'Third-party / vendor exposure', 'Backups not restore-tested',
      ],
    },
  },
};

const DEFAULT_INDUSTRY = 'generic';

function listIndustries() {
  return Object.values(PROFILES).map((p) => ({ id: p.id, name: p.name, icon: p.icon, crownJewelData: p.crownJewelData, regulations: p.regulations }));
}

function getProfile(id) {
  return PROFILES[id] || PROFILES[DEFAULT_INDUSTRY];
}

function industryQuestions(id) {
  return getProfile(id).intakeQuestions || [];
}

module.exports = { PROFILES, DEFAULT_INDUSTRY, listIndustries, getProfile, industryQuestions };

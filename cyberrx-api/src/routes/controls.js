'use strict';

const express = require('express');
const router = express.Router();
const Control = require('../models/Control');

// Middleware to extract org ID from header
const extractOrgId = (req, res, next) => {
  req.orgId = req.headers['x-org-id'] || req.query.org_id;
  next();
};

router.use(extractOrgId);

/**
 * GET /api/controls
 * List all controls for an organization with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { org_id } = req.headers;
    const { framework, min_effectiveness, implementation_status, tier } = req.query;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const filters = {};
    if (framework) filters.framework = framework;
    if (min_effectiveness !== undefined) filters.minEffectiveness = parseInt(min_effectiveness);
    if (implementation_status) filters.implementationStatus = implementation_status;
    if (tier) filters.tier = tier;

    const controls = await Control.findByOrganization(org_id, filters);
    res.json({ data: controls, total: controls.length });
  } catch (error) {
    console.error('Error fetching controls:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/controls
 * Create a new control
 */
router.post('/', async (req, res) => {
  try {
    const { org_id } = req.headers;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const controlData = { ...req.body, organizationId: org_id };
    const control = await Control.create(controlData);

    res.status(201).json({ data: control });
  } catch (error) {
    console.error('Error creating control:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/controls/statistics
 * Get control statistics for organization
 */
router.get('/statistics', async (req, res) => {
  try {
    const { org_id } = req.headers;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const stats = await Control.getStatistics(org_id);
    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching control statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/controls/seed/:framework
 * Get seed data for a framework
 */
router.get('/seed/:framework', async (req, res) => {
  try {
    const { framework } = req.params;

    // Return seed data for the requested framework
    const seedData = getSeedDataForFramework(framework);
    res.json({ data: seedData, framework });
  } catch (error) {
    console.error('Error fetching seed data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/controls/effectiveness/:min
 * Get low-effectiveness controls
 */
router.get('/effectiveness/:min', async (req, res) => {
  try {
    const { org_id } = req.headers;
    const { min } = req.params;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const controls = await Control.findLowEffectiveness(org_id, parseInt(min));
    res.json({ data: controls, total: controls.length });
  } catch (error) {
    console.error('Error fetching low-effectiveness controls:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/controls/framework/:framework
 * Get controls by framework
 */
router.get('/framework/:framework', async (req, res) => {
  try {
    const { org_id } = req.headers;
    const { framework } = req.params;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const controls = await Control.findByFramework(org_id, framework);
    res.json({ data: controls, total: controls.length });
  } catch (error) {
    console.error('Error fetching controls by framework:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/controls/:id
 * Get a single control by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const control = await Control.findById(id);

    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }

    res.json({ data: control });
  } catch (error) {
    console.error('Error fetching control:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/controls/:id
 * Update a control
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const control = await Control.update(id, req.body);
    res.json({ data: control });
  } catch (error) {
    console.error('Error updating control:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/controls/:id
 * Delete a control
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Control.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Control not found' });
    }

    res.json({ message: 'Control deleted successfully' });
  } catch (error) {
    console.error('Error deleting control:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/controls/:id/test
 * Record test results for a control
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { result, testedBy, evidenceIds, notes } = req.body;

    const control = await Control.recordTest(id, {
      result,
      testedBy,
      evidenceIds,
      notes
    });

    res.json({ data: control });
  } catch (error) {
    console.error('Error recording test result:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get seed data for a framework
 */
function getSeedDataForFramework(framework) {
  const nistCSF20 = [
    // Governance (GV)
    { controlId: 'NIST-CSF-GV-1', framework: 'NIST-CSF', title: 'Organizational Context', description: 'The organization understands the cybersecurity context of its systems, assets, and capabilities.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-GV-2', framework: 'NIST-CSF', title: 'Risk Management Strategy', description: 'Risk management strategy, expectations, and priorities are established and communicated.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-GV-3', framework: 'NIST-CSF', title: 'Roles and Responsibilities', description: 'Roles and responsibilities for cybersecurity risk management are established and communicated.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-GV-4', framework: 'NIST-CSF', title: 'Supply Chain Risk Management', description: 'Supply chain risk management processes are established.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-GV-5', framework: 'NIST-CSF', title: 'Cybersecurity Policy', description: 'Cybersecurity policies are established and communicated.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-GV-6', framework: 'NIST-CSF', title: 'Legal and Regulatory Requirements', description: 'Legal and regulatory requirements regarding cybersecurity are understood and managed.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-GV-7', framework: 'NIST-CSF', title: 'Risk Assessment Process', description: 'Risk assessments are performed at a frequency and with a method that enables effective risk prioritization.', tier: 'Tier 2', controlType: 'Detective' },
    // Identify (ID)
    { controlId: 'NIST-CSF-ID-1', framework: 'NIST-CSF', title: 'Asset Management', description: 'Physical devices and systems are inventoried and managed.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-ID-2', framework: 'NIST-CSF', title: 'Software Platform and Services', description: 'Software platforms and applications are inventoried and managed.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-ID-3', framework: 'NIST-CSF', title: 'Data Security', description: 'Internal and external data is categorized and managed according to sensitivity.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-ID-4', framework: 'NIST-CSF', title: 'Identity Management', description: 'Identities and credentials are issued, managed, verified, revoked, and audited.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-ID-5', framework: 'NIST-CSF', title: 'Authentication', description: 'Authenticators and assertions are issued, managed, verified, revoked, and audited.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-ID-6', framework: 'NIST-CSF', title: 'Network Management', description: 'Networks are managed and secured.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-ID-7', framework: 'NIST-CSF', title: 'Workforce Awareness', description: 'Cybersecurity workforce awareness and training are established.', tier: 'Tier 2', controlType: 'Preventive' },
    // Protect (PR)
    { controlId: 'NIST-CSF-PR-1', framework: 'NIST-CSF', title: 'Access Control', description: 'Access to assets is limited to authorized users, processes, and devices.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-PR-2', framework: 'NIST-CSF', title: 'Data Security', description: 'Data is protected according to sensitivity.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-PR-3', framework: 'NIST-CSF', title: 'Platform Security', description: 'Platforms are secured.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-PR-4', framework: 'NIST-CSF', title: 'System Security', description: 'Systems are secured.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-PR-5', framework: 'NIST-CSF', title: 'Network Security', description: 'Networks are secured.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-PR-6', framework: 'NIST-CSF', title: 'Physical Security', description: 'Physical devices and systems are secured.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-PR-7', framework: 'NIST-CSF', title: 'Encryption', description: 'Cryptographic controls are implemented.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-PR-8', framework: 'NIST-CSF', title: 'Data Disposal', description: 'Data is destroyed according to policy.', tier: 'Tier 2', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-PR-9', framework: 'NIST-CSF', title: 'Vulnerability Management', description: 'Vulnerabilities are managed.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-PR-10', framework: 'NIST-CSF', title: 'Configuration Management', description: 'Configurations are managed.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'NIST-CSF-PR-11', framework: 'NIST-CSF', title: 'Maintenance', description: 'Maintenance is performed.', tier: 'Tier 2', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-PR-12', framework: 'NIST-CSF', title: 'Data Backup', description: 'Data is backed up.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-PR-13', framework: 'NIST-CSF', title: 'Secure Lifecycle', description: 'Secure development lifecycle is implemented.', tier: 'Tier 2', controlType: 'Preventive' },
    // Detect (DE)
    { controlId: 'NIST-CSF-DE-1', framework: 'NIST-CSF', title: 'Continuous Monitoring', description: 'Assets are continuously monitored.', tier: 'Tier 1', controlType: 'Detective' },
    { controlId: 'NIST-CSF-DE-2', framework: 'NIST-CSF', title: 'Anomalous Activity', description: 'Anomalous activity is detected and addressed.', tier: 'Tier 1', controlType: 'Detective' },
    { controlId: 'NIST-CSF-DE-3', framework: 'NIST-CSF', title: 'Incident Detection', description: 'Incident detection is optimized.', tier: 'Tier 1', controlType: 'Detective' },
    // Respond (RS)
    { controlId: 'NIST-CSF-RS-1', framework: 'NIST-CSF', title: 'Incident Response Plan', description: 'Incident response plan is established and communicated.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-RS-2', framework: 'NIST-CSF', title: 'Incident Analysis', description: 'Incidents are analyzed.', tier: 'Tier 1', controlType: 'Detective' },
    { controlId: 'NIST-CSF-RS-3', framework: 'NIST-CSF', title: 'Incident Mitigation', description: 'Incidents are mitigated.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-RS-4', framework: 'NIST-CSF', title: 'Incident Reporting', description: 'Incidents are reported.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-RS-5', framework: 'NIST-CSF', title: 'Knowledge Sharing', description: 'Knowledge is shared.', tier: 'Tier 2', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-RS-6', framework: 'NIST-CSF', title: 'Improvements', description: 'Incident response activities are improved.', tier: 'Tier 2', controlType: 'Corrective' },
    // Recover (RC)
    { controlId: 'NIST-CSF-RC-1', framework: 'NIST-CSF', title: 'Recovery Plan', description: 'Recovery plan is established and communicated.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-RC-2', framework: 'NIST-CSF', title: 'Restoration', description: 'Systems are restored.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'NIST-CSF-RC-3', framework: 'NIST-CSF', title: 'Recovery Communications', description: 'Recovery communications are coordinated.', tier: 'Tier 2', controlType: 'Corrective' }
  ];

  const cisV8 = [
    { controlId: 'CIS-1', framework: 'CIS-v8', title: 'Inventory of Authorized and Unauthorized Devices', description: 'Actively manage (inventory, track, and correct) all hardware devices on the network so that only authorized devices are present.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'CIS-2', framework: 'CIS-v8', title: 'Inventory of Authorized and Unauthorized Software', description: 'Actively manage (inventory, track, and correct) all software on the network so that only authorized software is installed and can execute.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'CIS-3', framework: 'CIS-v8', title: 'Secure Configuration for Hardware and Software', description: 'Manage, track, and control secure configurations of hardware and software.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'CIS-4', framework: 'CIS-v8', title: 'Continuous Vulnerability Management', description: 'Continuously acquire, assess, and take action on new information to identify vulnerabilities, remediate, and mitigate risks.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'CIS-5', framework: 'CIS-v8', title: 'Access Control', description: 'Strictly control and limit access to critical assets.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'CIS-6', framework: 'CIS-v8', title: 'Secure Logging and Monitoring', description: 'Collect, monitor, and analyze security event logs to detect and respond to anomalies.', tier: 'Tier 1', controlType: 'Detective' },
    { controlId: 'CIS-7', framework: 'CIS-v8', title: 'Email and Web Browser Protections', description: 'Minimize the attack surface and opportunities for attackers to manipulate human behavior through their interaction with email and web browsers.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'CIS-8', framework: 'CIS-v8', title: 'Malware Defenses', description: 'Prevent or control the installation, spread, and execution of malicious code and malware.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'CIS-9', framework: 'CIS-v8', title: 'Data Recovery', description: 'Ensure processes and tools are in place for data recovery and backup.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'CIS-10', framework: 'CIS-v8', title: 'Incident Response', description: 'Protect the organization and respond to incidents effectively.', tier: 'Tier 1', controlType: 'Corrective' }
  ];

  const hipaa = [
    { controlId: 'HIPAA-164.308(a)(1)', framework: 'HIPAA', title: 'Security Management Process', description: 'Implement policies and procedures to prevent, detect, contain, and correct security violations.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.308(a)(2)', framework: 'HIPAA', title: 'Assigned Security Responsibility', description: 'Identify the security official responsible for developing and implementing policies and procedures.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.308(a)(3)', framework: 'HIPAA', title: 'Workforce Security', description: 'Implement policies and procedures for workforce security.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.308(a)(4)', framework: 'HIPAA', title: 'Information Access Management', description: 'Implement policies and procedures for granting access to electronic health information.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.308(a)(5)', framework: 'HIPAA', title: 'Security Awareness and Training', description: 'Implement a security awareness and training program.', tier: 'Tier 2', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.308(a)(6)', framework: 'HIPAA', title: 'Security Incident Procedures', description: 'Implement policies and procedures for security incident procedures.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'HIPAA-164.308(a)(7)', framework: 'HIPAA', title: 'Contingency Plan', description: 'Establish policies and procedures for responding to emergencies.', tier: 'Tier 1', controlType: 'Corrective' },
    { controlId: 'HIPAA-164.308(a)(8)', framework: 'HIPAA', title: 'Evaluation', description: 'Perform periodic technical and non-technical evaluations.', tier: 'Tier 2', controlType: 'Detective' },
    { controlId: 'HIPAA-164.308(b)(1)', framework: 'HIPAA', title: 'Business Associate Contracts', description: 'Ensure contracts with business partners include required security provisions.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.310(d)(1)', framework: 'HIPAA', title: 'Access Control', description: 'Implement technical policies and procedures to allow only authorized persons to access electronic health information.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.310(d)(2)', framework: 'HIPAA', title: 'Audit Controls', description: 'Implement hardware, software, and procedural mechanisms to record and examine activity in systems.', tier: 'Tier 1', controlType: 'Detective' },
    { controlId: 'HIPAA-164.312(a)(1)', framework: 'HIPAA', title: 'Integrity Controls', description: 'Implement policies and procedures to protect electronic health information from improper alteration or destruction.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.312(a)(2)', framework: 'HIPAA', title: 'Encryption/Decryption', description: 'Implement a mechanism to encrypt and decrypt electronic health information.', tier: 'Tier 1', controlType: 'Preventive' },
    { controlId: 'HIPAA-164.312(b)', framework: 'HIPAA', title: 'Transmission Security', description: 'Implement technical security measures to guard against unauthorized access to electronic health information transmitted over a network.', tier: 'Tier 1', controlType: 'Preventive' }
  ];

  switch (framework.toLowerCase()) {
    case 'nist-csf':
    case 'nist-csf-2.0':
      return nistCSF20;
    case 'cis-v8':
    case 'cis':
      return cisV8;
    case 'hipaa':
      return hipaa;
    default:
      return [];
  }
}

module.exports = router;

'use strict';

/**
 * POST /api/documents/analyze — server-side document evidence analysis.
 *
 * Accepts a multipart file upload + doc_type, extracts text, matches against
 * control-requirement keywords, and returns coverage / maturity / gaps.
 *
 * Falls back to binary-string extraction when no PDF parser is available.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const logger = require('../utils/logger');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const DOC_KEYWORDS = {
  d1: ['information security', 'acceptable use', 'security policy', 'data protection', 'governance', 'scope', 'enforcement', 'roles and responsibilities'],
  d2: ['risk assessment', 'risk management', 'risk register', 'risk appetite', 'risk tolerance', 'likelihood', 'impact', 'inherent', 'residual', 'risk owner'],
  d3: ['third.party', 'vendor', 'supplier', 'due diligence', 'vendor risk', 'supply chain', 'subcontractor', 'sla', 'right to audit'],
  d4: ['access control', 'least privilege', 'role.based', 'authorization', 'need.to.know', 'segregation', 'rbac', 'provisioning', 'deprovisioning'],
  d5: ['multi.factor', 'mfa', 'authentication', 'password', 'credential', 'identity verification', 'biometric', 'totp', 'fido'],
  d6: ['incident response', 'incident management', 'escalation', 'containment', 'eradication', 'recovery', 'playbook', 'severity', 'lessons learned'],
  d7: ['business continuity', 'disaster recovery', 'bcp', 'drp', 'rto', 'rpo', 'failover', 'backup', 'resilience', 'tabletop'],
  d8: ['change management', 'change control', 'cab', 'change advisory', 'release management', 'rollback', 'approval', 'emergency change'],
  d9: ['configuration', 'hardening', 'baseline', 'cis benchmark', 'stig', 'patch management', 'golden image', 'vulnerability scan'],
  d10: ['data classification', 'data handling', 'data retention', 'data disposal', 'sensitive data', 'confidential', 'restricted', 'labeling'],
  d11: ['encryption', 'cryptography', 'key management', 'tls', 'aes', 'at rest', 'in transit', 'certificate', 'hsm'],
  d12: ['privacy', 'consent', 'data subject', 'gdpr', 'hipaa', 'notice', 'personal data', 'pii', 'right to delete', 'dpia'],
  d13: ['soc 2', 'type ii', 'service organization', 'trust services', 'criteria', 'control environment', 'monitoring'],
  d14: ['penetration test', 'pentest', 'vulnerability assessment', 'findings', 'remediation', 'exploit', 'cvss', 'scope'],
  d15: ['security awareness', 'training', 'phishing simulation', 'social engineering', 'completion rate', 'annual training'],
  d16: ['audit log', 'logging', 'monitoring', 'log retention', 'siem', 'event', 'alert', 'tamper', 'centralized logging'],
};

function extractText(buffer, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['txt', 'csv', 'md'].includes(ext)) {
    return buffer.toString('utf8');
  }
  // Binary extraction: pull readable ASCII strings from PDF/docx
  let text = '';
  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];
    if (c >= 32 && c <= 126) text += String.fromCharCode(c);
    else if (c === 10 || c === 13) text += ' ';
  }
  return text;
}

function analyze(text, docType) {
  const lower = text.toLowerCase();
  const keywords = DOC_KEYWORDS[docType] || [];
  if (!keywords.length) return { coverage: 0, maturity: 'Unknown', matched: 0, total: 0, gaps: [] };

  const found = keywords.filter(k => new RegExp(k, 'i').test(lower));
  const gaps = keywords.filter(k => !new RegExp(k, 'i').test(lower));
  const coverage = Math.round((found.length / keywords.length) * 100);
  let maturity;
  if (coverage >= 80) maturity = 'Optimized';
  else if (coverage >= 60) maturity = 'Defined';
  else if (coverage >= 40) maturity = 'Developing';
  else maturity = 'Initial';

  const words = text.split(/\s+/).filter(Boolean).length;

  return {
    coverage,
    maturity,
    matched: found.length,
    total: keywords.length,
    gaps: gaps.slice(0, 5),
    matchedKeywords: found,
    words,
  };
}

router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const docType = req.body.doc_type || '';
    const text = extractText(req.file.buffer, req.file.originalname);

    if (!text || text.trim().length < 20) {
      return res.status(422).json({ error: 'Could not extract readable text from this file.' });
    }

    const result = analyze(text, docType);
    result.filename = req.file.originalname;
    result.size = req.file.size;

    logger.info('document analyzed', { docType, filename: req.file.originalname, coverage: result.coverage, maturity: result.maturity });
    res.json(result);
  } catch (e) {
    logger.error('document analysis failed', { error: e.message });
    res.status(500).json({ error: 'Document analysis failed: ' + e.message });
  }
});

module.exports = router;

'use strict';

/**
 * scripts/genVendorEvidence.js
 * ----------------------------
 * Generates realistic, upload-ready VENDOR assurance documents — the kind you
 * upload per vendor to establish their security posture (SOC 2 Type II,
 * HITRUST, ISO 27001, penetration test, BAA, PCI AoC, cyber insurance, etc.).
 *
 * Written for a fictional vendor "Northwind Cloud Services". Each document
 * contains MOST but NOT ALL of what its type requires; the intentional gap is
 * recorded in README.md so testers can confirm the review agent (Saraqael)
 * scores accuracy + completeness and flags the gap.
 *
 * Output: pilot-sample-evidence/vendor/*.pdf + README.md
 * Run:    node scripts/genVendorEvidence.js
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUT = path.join(__dirname, '../../pilot-sample-evidence/vendor');
const VENDOR = 'Northwind Cloud Services, Inc.';

const DOCS = [
  {
    file: 'soc2_type2.pdf', docType: 'soc2', title: 'SOC 2 Type II Report (Independent Service Auditor’s Report)',
    covers: ['Type II', 'Audit firm', 'Audit period', 'Security + Availability TSC', 'One exception noted'],
    omits: ['Confidentiality/Privacy criteria not in scope', 'Audit period ends >9 months ago (bridge letter needed)'],
    body: [
      ['Report Type', 'This is a SOC 2 Type II report covering the operating effectiveness of controls over a period of time.'],
      ['Auditor', 'Audited by Sterling & Pratt CPA LLP, an AICPA-registered firm.'],
      ['Audit Period', 'The examination covered the period 2024-01-01 to 2024-12-31.'],
      ['Trust Services Criteria', 'In scope: Security and Availability. (Confidentiality, Processing Integrity, and Privacy were not included.)'],
      ['Exceptions', 'Exception noted: user access reviews were not completed in Q3 2024 for the production environment. Management response provided.'],
      ['Scope / System', 'The Northwind hosting platform and supporting infrastructure are described in Section III.'],
    ],
  },
  {
    file: 'hitrust_r2.pdf', docType: 'hitrust', title: 'HITRUST CSF Validated Assessment — Certification Letter',
    covers: ['r2 validated', 'Expiry date', 'Scope statement'],
    omits: ['Issue date not stated', 'Two open corrective action plans (CAPs) disclosed', 'Interim review status absent'],
    body: [
      ['Certification', 'Northwind has achieved HITRUST CSF r2 Validated certification.'],
      ['Validity', 'This certification expires 2026-08-31.'],
      ['Scope', 'Certification scope covers the multi-tenant SaaS platform and the data centers in US-East and US-West.'],
      ['Corrective Actions', 'There are 2 corrective action plans (CAPs) open at time of certification, tracked to closure with the assessor.'],
    ],
  },
  {
    file: 'iso27001_cert.pdf', docType: 'iso27001', title: 'ISO/IEC 27001:2022 Certificate of Registration',
    covers: ['Certificate number', 'Accredited body (UKAS)', 'Expiry date', 'Scope statement'],
    omits: ['Issue date not printed', 'Surveillance-audit status not shown'],
    body: [
      ['Certificate', 'Certificate Number: NW-ISMS-44182.'],
      ['Certification Body', 'Issued by BSI, a UKAS-accredited certification body.'],
      ['Validity', 'Valid until 2026-03-15.'],
      ['Scope', 'The Information Security Management System covering the provision of cloud hosting and managed services from the US-East facility.'],
    ],
  },
  {
    file: 'pentest_report.pdf', docType: 'pentest', title: 'External Penetration Test — Executive Summary',
    covers: ['Test firm', 'OWASP methodology', 'Findings by severity', 'Remediation status'],
    omits: ['Test date is 14 months old (annual requirement)', 'In-scope IP ranges not listed'],
    body: [
      ['Firm', 'Testing performed by RedCedar Security.'],
      ['Methodology', 'Testing followed the OWASP Testing Guide and PTES.'],
      ['Date', 'Fieldwork conducted 2024-09-20.'],
      ['Findings', 'Results: 1 critical, 4 high, 9 medium findings identified.'],
      ['Remediation', 'The critical finding (exposed admin interface) was remediated and retested as resolved on 2024-10-05; highs in progress.'],
    ],
  },
  {
    file: 'baa.pdf', docType: 'baa', title: 'HIPAA Business Associate Agreement',
    covers: ['Permitted uses', 'Safeguards', 'Breach notification', 'Return/destruction'],
    omits: ['Subcontractor flow-down clause (§164.308(b)) missing', 'Execution/signature date absent'],
    body: [
      ['Permitted Uses', 'Business Associate may use and disclose PHI only as permitted by this Agreement and the Privacy Rule.'],
      ['Safeguards', 'Business Associate will implement administrative, physical, and technical safeguards for PHI.'],
      ['Breach Notification', 'Business Associate will notify Covered Entity of any breach of unsecured PHI without unreasonable delay.'],
      ['Return/Destruction', 'On termination, Business Associate will return or destroy all PHI where feasible.'],
    ],
  },
  {
    file: 'cyber_insurance.pdf', docType: 'cyberinsurance', title: 'Certificate of Cyber Liability Insurance',
    covers: ['Named insured', 'Cyber liability policy', 'Policy expiry'],
    omits: ['Coverage limit below $1M (low for data exposure)'],
    body: [
      ['Named Insured', 'Named Insured: Northwind Cloud Services, Inc.'],
      ['Policy Type', 'Coverage: Cyber Liability and Data Breach Response.'],
      ['Limit', 'Aggregate limit of $500,000.'],
      ['Term', 'Policy in force through 2026-01-31.'],
    ],
  },
  {
    file: 'pci_aoc.pdf', docType: 'pci_aoc', title: 'PCI DSS Attestation of Compliance (AoC)',
    covers: ['AoC type (SAQ)', 'Compliance status', 'Assessment date'],
    omits: ['Self-assessed (SAQ) without a QSA', 'Assessment >12 months old (annual requirement)'],
    body: [
      ['Type', 'This attestation is based on SAQ A-EP.'],
      ['Status', 'Northwind attests it is Compliant with PCI DSS v4.0 for the assessed scope.'],
      ['Date', 'Self-assessment completed 2024-08-01.'],
    ],
  },
  {
    file: 'vuln_scan.pdf', docType: 'vulnscan', title: 'Quarterly Vulnerability Scan Summary',
    covers: ['Scan date', 'Critical/high counts', 'Oldest open finding age'],
    omits: ['SLA-compliance percentage not reported', '2 open critical CVEs exceed policy'],
    body: [
      ['Scanner', 'Authenticated scans performed with Tenable.io.'],
      ['Date', 'Most recent scan: 2025-10-15.'],
      ['Findings', '2 critical and 11 high CVEs were open at scan time.'],
      ['Aging', 'Oldest open finding is 124 days old.'],
    ],
  },
];

function render(doc, meta) {
  doc.fontSize(9).fillColor('#64748b').text(VENDOR, { continued: true })
    .text('     VENDOR ASSURANCE — sample evidence', { align: 'right' });
  doc.moveDown(0.5);
  doc.fontSize(17).fillColor('#0f172a').text(meta.title);
  doc.fontSize(9).fillColor('#64748b').text(`Provided to: Meridian Health Plan (pilot)   ·   Document type: ${meta.docType}`);
  doc.moveTo(doc.x, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.8);
  meta.body.forEach(([h, p]) => {
    doc.fontSize(11.5).fillColor('#0f172a').text(h);
    doc.fontSize(10).fillColor('#1f2733').text(p, { lineGap: 1.5 });
    doc.moveDown(0.5);
  });
  doc.moveDown(1);
  doc.fontSize(8).fillColor('#94a3b8').text('Fictional vendor document generated for CyberRx pilot testing. ' +
    'Intentionally omits some required elements so the review agent (Saraqael) flags the gap and scores completeness/accuracy.', { lineGap: 1 });
}

function genOne(meta) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const out = fs.createWriteStream(path.join(OUT, meta.file));
    out.on('finish', resolve); out.on('error', reject);
    doc.pipe(out); render(doc, meta); doc.end();
  });
}

function manifest() {
  const rows = DOCS.map((d, i) => `### ${i + 1}. ${d.title}\n` +
    `- **File:** \`vendor/${d.file}\`\n` +
    `- **Upload as document type:** \`${d.docType}\`\n` +
    `- **Elements included:** ${d.covers.join('; ')}\n` +
    `- **Intentionally omitted (gap the agent should flag):** ${d.omits.join('; ')}\n`).join('\n');
  const header = [
    '# Vendor Assurance — Sample Evidence',
    '',
    `Eight sample assurance documents from a fictional vendor **${VENDOR}** — the kind you upload`,
    'per vendor to establish their security posture (SOC 2 Type II, HITRUST, ISO 27001, pen test,',
    'BAA, cyber insurance, PCI AoC, vuln scan).',
    '',
    '**How to test:** for each vendor, upload the PDF and select the listed document type. Saraqael',
    'reads the file, extracts the expected elements, and returns a per-document **completeness %**,',
    '**accuracy %**, and **overall score**, plus findings. Each document deliberately omits a required',
    'element — the "Intentionally omitted" line is what the agent should flag, and a clean full score',
    'should NOT appear. (With an ANTHROPIC_API_KEY set, extraction is AI-driven and more precise; without',
    'one, a deterministic text reader is used.)',
    '',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'README.md'), header + rows + '\n');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const d of DOCS) await genOne(d);
  manifest();
  console.log(`Generated ${DOCS.length} vendor sample PDFs + README.md in pilot-sample-evidence/vendor/`);
}

main().catch((e) => { console.error(e); process.exit(1); });

'use strict';

/**
 * scripts/genPilotEvidence.js
 * ---------------------------
 * Generates realistic, upload-ready sample evidence documents — one for every
 * document the Nerion setup asks an organization to upload (the 19 NIST CSF
 * evidence slots in NistCsfService.EVIDENCE_QUESTIONS).
 *
 * Each document is written for the pilot org "Meridian Health Plan" and
 * deliberately contains MOST but NOT ALL of the elements the control expects —
 * the intentional gap is recorded in the manifest (README.md) so a tester can
 * confirm the evidence-review agent flags it.
 *
 * Output: pilot-sample-evidence/*.pdf  +  pilot-sample-evidence/README.md
 * Run:    node scripts/genPilotEvidence.js
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUT = path.join(__dirname, '../../pilot-sample-evidence');
const ORG = 'Meridian Health Plan';
const DATED = 'Document date: 2025-11-15';

// Each doc: the upload slot it fills, the intake answer it corresponds to,
// the body (sections), the elements it COVERS, and the elements intentionally
// OMITTED (the gap the reviewer/tester should catch).
const DOCS = [
  {
    file: '01_organizational_context.pdf', key: 'gv_oc_context', category: 'GV.OC',
    title: 'Organizational Context & Stakeholder Analysis', answer: 'partial',
    covers: ['Mission statement', 'Internal & external stakeholder map', 'Critical services list'],
    omits: ['No mapping of state breach-notification laws / multi-state regulatory landscape'],
    body: [
      ['1. Mission', 'Meridian Health Plan provides managed-care coverage to 480,000 members across the Midwest. Our mission is to deliver affordable, high-quality healthcare while safeguarding member health information.'],
      ['2. Stakeholders', 'Internal: Board of Directors, Executive Leadership, Members Services, Claims, IT/Security. External: members, contracted providers, CMS, state Medicaid agencies, reinsurers, and key technology vendors.'],
      ['3. Critical Services', 'Claims adjudication, member enrollment, provider network management, care management, and member portal. These depend on the core claims platform, the EDW, and the member portal.'],
      ['4. Regulatory Landscape', 'HIPAA Privacy & Security Rules and HITECH apply enterprise-wide. (Detailed mapping of individual state breach-notification statutes is maintained separately and is still in progress.)'],
    ],
  },
  {
    file: '02_risk_appetite_statement.pdf', key: 'gv_rm_appetite', category: 'GV.RM',
    title: 'Cyber Risk Appetite Statement (DRAFT)', answer: 'draft',
    covers: ['Qualitative appetite by risk category', 'Escalation thresholds'],
    omits: ['No board approval signature/date', 'No quantitative risk tolerances ($ exposure limits)'],
    body: [
      ['1. Purpose', 'This statement defines the level of cyber risk Meridian is willing to accept in pursuit of its objectives.'],
      ['2. Appetite by Category', 'Member data confidentiality: LOW appetite. Service availability: LOW appetite. Emerging-tech adoption: MODERATE appetite. Regulatory non-compliance: ZERO appetite.'],
      ['3. Escalation', 'Risks rated High or above are escalated to the Executive Risk Committee within 5 business days.'],
      ['Status', 'DRAFT — pending review by the Risk Committee and formal Board approval. Quantitative tolerance bands (annualized loss expectancy limits) to be added in the next revision.'],
    ],
  },
  {
    file: '03_ciso_charter.pdf', key: 'gv_rr_roles', category: 'GV.RR',
    title: 'Information Security Leadership Charter', answer: 'informal',
    covers: ['Named security leader', 'Responsibilities list'],
    omits: ['Authorities/decision rights not documented', 'Reporting line & dedicated budget not specified'],
    body: [
      ['1. Role', 'The Director of Information Security leads the security program and is the designated HIPAA Security Official.'],
      ['2. Responsibilities', 'Maintain the security program, oversee risk assessments, manage security operations, coordinate incident response, and report security posture to leadership.'],
      ['3. Reporting', 'The Director currently reports through the IT organization. A formal charter defining independent authorities, decision rights, and a ring-fenced security budget has not yet been ratified.'],
    ],
  },
  {
    file: '04_information_security_policy.pdf', key: 'gv_po_policy', category: 'GV.PO',
    title: 'Information Security Policy', answer: 'outdated',
    covers: ['Acceptable use', 'Access control', 'Data protection', 'Incident reporting'],
    omits: ['Last reviewed 18 months ago (exceeds 12-month review requirement)', 'No cloud/SaaS or AI-tool usage section'],
    body: [
      ['1. Scope', 'This policy applies to all workforce members, contractors, and systems that access Meridian information assets.'],
      ['2. Acceptable Use', 'Information systems are for authorized business use. Users must protect credentials and report suspected misuse.'],
      ['3. Access Control', 'Access is granted on least-privilege and reviewed periodically. Privileged access requires additional approval.'],
      ['4. Data Protection', 'PHI must be encrypted and handled per the data classification standard.'],
      ['5. Incident Reporting', 'Suspected incidents must be reported to the security team immediately.'],
      ['Review History', 'Approved by the Board. Last reviewed: 2024-05-10. (Annual review is overdue.)'],
    ],
  },
  {
    file: '05_board_briefing.pdf', key: 'gv_ov_board', category: 'GV.OV',
    title: 'Board Cybersecurity Briefing — H1 2025', answer: 'semiannual',
    covers: ['Posture summary', 'Top risks', 'Program roadmap'],
    omits: ['Cadence is semiannual (quarterly is the target)', 'No KRIs/metrics trend pack'],
    body: [
      ['1. Posture Summary', 'Overall security posture is rated Moderate. Key investments this period: MFA expansion and EDR rollout.'],
      ['2. Top Risks', 'Third-party exposure, legacy claims platform, and phishing remain the leading risks.'],
      ['3. Roadmap', 'H2 priorities: complete privileged-access vaulting, formalize the IR tabletop program.'],
      ['Cadence', 'Security is presented to the Board twice per year (H1/H2). Quarterly reporting is under consideration.'],
    ],
  },
  {
    file: '06_vendor_assessment_reports.pdf', key: 'gv_sc_vendors', category: 'GV.SC',
    title: 'Third-Party Security Assessment Summary', answer: 'some',
    covers: ['Assessments for top vendors', 'Risk ratings', 'Remediation tracking'],
    omits: ['Only 8 of 23 critical vendors assessed', 'No continuous monitoring of vendor ratings'],
    body: [
      ['1. Scope', 'Security assessments completed for 8 of our 23 critical vendors during the last cycle.'],
      ['2. Method', 'Standardized security questionnaire plus SOC 2 review where available; findings risk-rated High/Medium/Low.'],
      ['3. Results', 'Two vendors had High findings (remediation in progress). Remaining critical vendors are queued for assessment.'],
      ['Gap', 'Continuous external monitoring (e.g., security ratings) is not yet in place; assessments are point-in-time.'],
    ],
  },
  {
    file: '07_post_incident_reviews.pdf', key: 'id_im_pir', category: 'ID.IM',
    title: 'Post-Incident Review Records', answer: 'sometimes',
    covers: ['PIR template', 'Two completed reviews'],
    omits: ['PIRs not performed for all incidents', 'Lessons-learned not tracked to closure'],
    body: [
      ['1. Process', 'A post-incident review is conducted for major incidents to capture root cause and corrective actions.'],
      ['2. Recent Reviews', 'PIR-2025-03 (phishing) and PIR-2025-07 (misconfigured S3 bucket) completed with action items.'],
      ['Gap', 'Lower-severity incidents do not consistently receive a PIR, and action items are not tracked centrally to verified closure.'],
    ],
  },
  {
    file: '08_encryption_standard.pdf', key: 'pr_ds_encryption', category: 'PR.DS',
    title: 'Encryption Standard & Data-Flow Overview', answer: 'partially',
    covers: ['At-rest standard (AES-256)', 'In-transit standard (TLS 1.2+)', 'Partial data-flow diagram'],
    omits: ['Legacy claims database not yet encrypted at rest', 'Data-flow map incomplete for batch/EDI interfaces'],
    body: [
      ['1. At Rest', 'Databases and storage use AES-256 encryption. Exception: the legacy claims database (CLAIMS-LEGACY) remains unencrypted pending migration.'],
      ['2. In Transit', 'External and internal service traffic uses TLS 1.2 or higher. Email to providers uses opportunistic TLS.'],
      ['3. Data Flows', 'Primary member-data flows are diagrammed. Batch/EDI interfaces with clearinghouses are not yet fully mapped.'],
    ],
  },
  {
    file: '09_dlp_deployment.pdf', key: 'pr_ds_dlp', category: 'PR.DS',
    title: 'Data Loss Prevention Deployment Summary', answer: 'partial',
    covers: ['Email DLP', 'Endpoint DLP', 'PHI detection rules'],
    omits: ['No DLP coverage for cloud/SaaS (e.g., file sharing, AI tools)', 'No blocking on removable media'],
    body: [
      ['1. Coverage', 'DLP is deployed on email gateways and managed endpoints with PHI/PII detection patterns.'],
      ['2. Actions', 'Outbound email containing unencrypted PHI is quarantined; endpoint copy of PHI to USB generates an alert.'],
      ['Gap', 'Cloud/SaaS egress (sanctioned file-sharing, GenAI assistants) is not covered by DLP, and removable-media writes are alerted but not blocked.'],
    ],
  },
  {
    file: '10_backup_dr_architecture.pdf', key: 'pr_ir_resilience', category: 'PR.IR',
    title: 'Backup Test Results & Resilience Architecture', answer: 'backups-only',
    covers: ['Backup schedule', 'Quarterly restore tests', 'Immutable backup copies'],
    omits: ['Critical systems lack full redundancy/HA', 'No multi-region failover for the member portal'],
    body: [
      ['1. Backups', 'Daily incremental and weekly full backups; immutable copies retained 35 days. Last restore test: 2025-10-02 (successful).'],
      ['2. Resilience', 'Core claims platform runs in a single data center with nightly replication to a warm site. The member portal is single-region.'],
      ['Gap', 'Automated high-availability/failover for critical systems is not implemented; recovery is manual.'],
    ],
  },
  {
    file: '11_soc_coverage.pdf', key: 'de_ae_soc', category: 'DE.AE',
    title: 'Security Operations Monitoring Coverage', answer: 'business-hours',
    covers: ['SIEM in place', 'Use cases/alerts', 'Business-hours staffing'],
    omits: ['No 24x7 coverage (nights/weekends unmonitored)', 'No documented MSSP after-hours escalation'],
    body: [
      ['1. Tooling', 'A SIEM aggregates logs from endpoints, network, and cloud with correlation rules for common attack patterns.'],
      ['2. Staffing', 'Security analysts monitor alerts during business hours (8x5). After-hours alerts are reviewed the next business day.'],
      ['Gap', 'There is no 24x7 SOC or contracted MSSP for nights/weekends; detection-to-response time outside business hours is extended.'],
    ],
  },
  {
    file: '12_incident_response_plan.pdf', key: 'rs_ma_irplan', category: 'RS.MA',
    title: 'Incident Response Plan', answer: 'plan-only',
    covers: ['IR phases', 'Roles & contacts', 'Severity matrix'],
    omits: ['No tabletop exercise conducted in the last 12 months', 'Third-party/IR-firm coordination steps thin'],
    body: [
      ['1. Phases', 'Preparation, Detection & Analysis, Containment, Eradication, Recovery, and Post-Incident Activity.'],
      ['2. Roles', 'Incident Commander, Security Lead, Legal, Communications, and Executive Sponsor with a contact roster.'],
      ['3. Severity', 'A four-tier severity matrix drives escalation and notification timelines.'],
      ['Gap', 'The most recent tabletop exercise was in 2023; no exercise has validated this plan in the past 12 months.'],
    ],
  },
  {
    file: '13_forensics_capability.pdf', key: 'rs_an_forensics', category: 'RS.AN',
    title: 'Incident Analysis & Forensics Capability', answer: 'retainer',
    covers: ['DFIR retainer with external firm', 'Evidence-handling note'],
    omits: ['No in-house forensic capability/tooling', 'No documented chain-of-custody procedure'],
    body: [
      ['1. Retainer', 'Meridian maintains a digital-forensics & incident-response (DFIR) retainer with an external firm, with a 4-hour response SLA.'],
      ['2. In-House', 'There is no in-house forensic tooling or trained examiner; deep analysis depends on the retained firm.'],
      ['Gap', 'A formal evidence chain-of-custody procedure is not yet documented.'],
    ],
  },
  {
    file: '14_breach_notification_procedures.pdf', key: 'rs_co_notify', category: 'RS.CO',
    title: 'Breach Notification Procedures', answer: 'partial',
    covers: ['HHS/OCR notification steps', 'State AG notification', 'Member notification template'],
    omits: ['CMS notification timelines for Medicaid not documented', 'No media-notification threshold (500+ individuals)'],
    body: [
      ['1. OCR', 'Breaches of unsecured PHI are reported to HHS/OCR within the required timelines; >500 individuals reported without unreasonable delay.'],
      ['2. State', 'State Attorney General notification follows applicable state statutes; member notification uses the approved template.'],
      ['Gap', 'CMS/Medicaid-specific notification timelines and the media-notice process for large breaches are not yet documented.'],
    ],
  },
  {
    file: '15_dr_test_report.pdf', key: 'rc_rp_drtest', category: 'RC.RP',
    title: 'Disaster Recovery Test Report & BCP-DR Plan', answer: 'over-12mo',
    covers: ['DR plan', 'RTO/RPO targets', 'Last full test results'],
    omits: ['Last full DR test was 14 months ago (exceeds annual)', 'RTO not met for the claims platform in last test'],
    body: [
      ['1. Plan', 'The BCP-DR plan defines recovery procedures and an RTO of 8 hours / RPO of 1 hour for tier-1 systems.'],
      ['2. Last Test', 'The last full failover test was conducted 2024-09-12. The claims platform recovered in 11 hours, exceeding its 8-hour RTO.'],
      ['Gap', 'No full DR test has been performed in the past 12 months, and the prior test did not meet the claims-platform RTO.'],
    ],
  },
  {
    file: '16_recovery_communication_plan.pdf', key: 'rc_co_comms', category: 'RC.CO',
    title: 'Recovery Communication Plan', answer: 'yes',
    covers: ['Member comms', 'Regulator comms', 'Internal status cadence'],
    omits: ['No media/press holding statements', 'No pre-approved spokesperson list'],
    body: [
      ['1. Audiences', 'Defines messaging for members, contracted providers, and regulators during recovery from a major disruption.'],
      ['2. Cadence', 'Internal status updates every 2 hours during an active recovery; member updates via portal and email.'],
      ['Gap', 'Press/media holding statements and a pre-approved spokesperson list are not included.'],
    ],
  },
  {
    file: '17_asset_inventory.pdf', key: 'id_am_inventory', category: 'ID.AM',
    title: 'Asset Inventory (CMDB Export)', answer: 'partial',
    covers: ['Servers & endpoints', 'Software inventory', 'Owners for most assets'],
    omits: ['Cloud and IoT/medical devices not fully inventoried', 'Data classification field missing for many records'],
    body: [
      ['1. Hardware', 'CMDB tracks 3,120 endpoints and 410 servers with hostname, OS, and owner for most records.'],
      ['2. Software', 'Installed software is inventoried via the endpoint agent and reconciled monthly.'],
      ['Gap', 'Cloud workloads and IoT/medical devices are only partially represented, and the data-classification attribute is unpopulated for ~30% of assets.'],
    ],
  },
  {
    file: '18_risk_assessment_report.pdf', key: 'id_ra_assessment', category: 'ID.RA',
    title: 'Cyber Risk Assessment Report (NIST SP 800-30 style)', answer: 'occasional',
    covers: ['Threat/vulnerability analysis', 'Risk register', 'Likelihood/impact ratings'],
    omits: ['Performed occasionally, not on an annual cadence', 'No quantified financial impact'],
    body: [
      ['1. Methodology', 'Risks identified via threat modeling and vulnerability data, rated by likelihood and impact per NIST SP 800-30.'],
      ['2. Findings', 'Top risks: third-party compromise, ransomware on the legacy platform, and credential phishing.'],
      ['Gap', 'Assessments are performed occasionally (last completed 19 months ago) rather than annually, and impact is qualitative only.'],
    ],
  },
  {
    file: '19_remediation_sla_policy.pdf', key: 'rs_mi_process', category: 'RS.MI',
    title: 'Vulnerability Remediation SLA Policy', answer: 'ad-hoc',
    covers: ['Severity-based SLA targets', 'Scanning cadence'],
    omits: ['Owners/due dates not tracked or enforced', 'No exception-approval workflow'],
    body: [
      ['1. SLAs', 'Target remediation: Critical 7 days, High 30 days, Medium 90 days from validated detection.'],
      ['2. Scanning', 'Authenticated vulnerability scans run weekly across the server estate.'],
      ['Gap', 'Remediation owners and due dates are not consistently assigned or tracked, and there is no formal risk-acceptance/exception workflow, so SLAs are aspirational.'],
    ],
  },
];

function render(doc, meta) {
  doc.fontSize(9).fillColor('#64748b').text(ORG, { continued: true })
    .text('     CONFIDENTIAL — Pilot sample evidence', { align: 'right' });
  doc.moveDown(0.5);
  doc.fontSize(18).fillColor('#0f172a').text(meta.title);
  doc.fontSize(9).fillColor('#64748b').text(`${DATED}   ·   Maps to NIST CSF ${meta.category}`);
  doc.moveTo(doc.x, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.8);
  meta.body.forEach(([h, p]) => {
    doc.fontSize(11.5).fillColor('#0f172a').text(h);
    doc.fontSize(10).fillColor('#1f2733').text(p, { lineGap: 1.5 });
    doc.moveDown(0.5);
  });
  doc.moveDown(1);
  doc.fontSize(8).fillColor('#94a3b8')
    .text('Sample document generated for Nerion pilot testing. Fictional organization; not real PHI. ' +
      'This document intentionally omits some required elements so reviewers can verify gap detection.', { lineGap: 1 });
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
  const rows = DOCS.map((d, i) => {
    const q = i + 1;
    return `### ${q}. ${d.title}\n` +
      `- **File:** \`${d.file}\`\n` +
      `- **Upload slot:** NIST CSF \`${d.category}\` (intake key \`${d.key}\`)\n` +
      `- **Pick this answer at setup:** \`${d.answer}\`\n` +
      `- **Elements included:** ${d.covers.join('; ')}\n` +
      `- **Intentionally omitted (the gap to verify):** ${d.omits.join('; ')}\n`;
  }).join('\n');
  const header = [
    '# Pilot Sample Evidence — Nerion',
    '',
    `Nineteen sample evidence documents for the pilot org **${ORG}** (fictional — no real PHI),`,
    'one for every document the Nerion setup asks you to upload (the NIST CSF evidence interview).',
    '',
    '**How to test:** for each item below, on the CSF scorecard answer the question with the',
    'listed answer and upload the matching PDF. Then open the post-intake document review',
    '(Zadkiel) — it should report a partial/gap finding and a recommendation for every document,',
    'because each one deliberately leaves out some required element. The "Intentionally omitted"',
    'line tells you exactly what the reviewer should catch.',
    '',
    'Each document covers MOST but NOT ALL of its requirement, so a fully-passing score should',
    'NOT appear — if it does, the review/scoring is not working.',
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
  console.log(`Generated ${DOCS.length} sample PDFs + README.md in pilot-sample-evidence/`);
}

main().catch((e) => { console.error(e); process.exit(1); });

'use strict';

/**
 * Labeled eval dataset for the grounded assessor (Stage 9). Each case pairs a
 * determination statement with policy excerpt(s) and a gold status. Includes
 * clear positives, partials, plain negatives, NA, and — most importantly — HARD
 * NEGATIVES ("traps") where related vocabulary is present but the requirement is
 * NOT actually satisfied. Those guard against false "addressed" verdicts.
 *
 * The hand-authored CORE is expanded with cross-paired negatives (a statement +
 * an unrelated excerpt is, by construction, Not addressed) to reach ~100 cases.
 * Determination statements are generic/paraphrased; excerpts are invented sample
 * policy text — no copyrighted framework content.
 */

let seq = 0;
const C = (statement, excerpts, gold, topic) => ({ id: `EV-${String(++seq).padStart(3, '0')}`, determination_statement: statement, excerpts: excerpts.map((t, i) => (typeof t === 'string' ? { section_ref: `§${i + 1}`, text: t } : t)), gold, topic });

const CORE = [
  // ---- Clear positives (Fully addressed) ----
  C('multi-factor authentication is required for remote access', ['All remote access to corporate systems requires multi-factor authentication.'], 'Fully addressed', 'mfa'),
  C('dormant accounts are disabled after a defined period of inactivity', ['User accounts inactive for 45 days are automatically disabled by the identity platform.'], 'Fully addressed', 'dormant'),
  C('data at rest is encrypted', ['All production databases encrypt data at rest using AES-256.'], 'Fully addressed', 'enc_rest'),
  C('backups are performed regularly', ['Full backups are taken nightly and incremental backups every four hours.'], 'Fully addressed', 'backup'),
  C('user access is reviewed periodically', ['Access to sensitive systems is reviewed quarterly by the respective data owners.'], 'Fully addressed', 'access_review'),
  C('security awareness training is provided to personnel', ['All employees and contractors complete security awareness training upon hire and annually thereafter.'], 'Fully addressed', 'training'),
  C('audit logs are retained for a defined period', ['Security audit logs are retained in the SIEM for 365 days.'], 'Fully addressed', 'log_retention'),
  C('critical patches are applied within a defined timeframe', ['Critical and high severity patches are deployed within 14 days of release.'], 'Fully addressed', 'patch'),
  C('an incident response plan is documented', ['The organization maintains a documented incident response plan reviewed annually.'], 'Fully addressed', 'irplan'),
  C('passwords meet complexity requirements', ['Passwords must be at least 14 characters and include upper, lower, number and symbol.'], 'Fully addressed', 'pwd'),
  C('privileged access is restricted to authorized personnel', ['Administrative privileges are granted only via approved role-based access requests and reviewed monthly.'], 'Fully addressed', 'priv'),
  C('vendors are assessed for security risk', ['All third-party vendors undergo a security risk assessment before onboarding and annually.'], 'Fully addressed', 'vendor'),

  // ---- Partials (some of the statement covered, a gap remains) ----
  C('multi-factor authentication is required for all access', ['Multi-factor authentication is required for remote access.'], 'Partially addressed', 'mfa'),
  C('user access is reviewed and recertified quarterly', ['User access is reviewed quarterly.'], 'Partially addressed', 'access_review'),
  C('data is encrypted in transit and at rest', ['Data in transit is protected using TLS 1.2 or higher.'], 'Partially addressed', 'enc'),
  C('vulnerabilities are scanned weekly and remediated within SLA', ['Vulnerability scans are run weekly across all assets.'], 'Partially addressed', 'vuln'),
  C('audit logs are retained for one year and reviewed daily', ['Audit logs are retained for 365 days.'], 'Partially addressed', 'log_retention'),
  C('backups are performed nightly and tested by restore quarterly', ['Backups are performed nightly to offsite storage.'], 'Partially addressed', 'backup'),

  // ---- Hard negatives / traps (related words, requirement NOT met) ----
  C('multi-factor authentication is required for remote access', ['Users authenticate to the VPN with a username and password.'], 'Not addressed', 'mfa'),
  C('data at rest is encrypted', ['All data in transit is encrypted using TLS.'], 'Not addressed', 'enc_rest'),
  C('dormant accounts are disabled after a defined period of inactivity', ['The policy defines account naming conventions and the account creation workflow.'], 'Not addressed', 'dormant'),
  C('backups are stored offsite', ['Backups are written nightly to a local disk array.'], 'Not addressed', 'backup'),
  C('the incident response plan is tested annually via tabletop exercise', ['The organization maintains an incident response plan.'], 'Not addressed', 'irplan'),
  C('audit logs are reviewed daily for anomalies', ['Audit logging is enabled on all servers.'], 'Not addressed', 'log_review'),
  C('privileged accounts use multi-factor authentication', ['Privileged accounts are documented in a central inventory.'], 'Not addressed', 'priv'),
  C('encryption keys are rotated annually', ['Data is encrypted at rest using AES-256.'], 'Not addressed', 'keys'),

  // ---- Plain negatives (unrelated excerpt) ----
  C('a hardware asset inventory is maintained for all enterprise assets', ['All remote access requires multi-factor authentication.'], 'Not addressed', 'inventory'),
  C('a software bill of materials is maintained for applications', ['Security awareness training is completed annually.'], 'Not addressed', 'sbom'),
  C('physical access to data centers is restricted', ['Passwords must be at least 14 characters.'], 'Not addressed', 'physical'),

  // ---- Not applicable ----
  C('consent is obtained before processing personal data', ['The organization processes no personal data and stores no PII of any kind.'], 'Not applicable', 'pii'),
  C('industrial control system networks are segmented', ['The organization operates no OT or ICS environments; it is a cloud-only SaaS provider.'], 'Not applicable', 'ics'),
];

// Cross-pair statements with unrelated excerpts -> Not addressed (correct by construction).
function generatedNegatives(target) {
  const out = [];
  const positives = CORE.filter((c) => c.gold === 'Fully addressed' || c.gold === 'Partially addressed');
  for (let i = 0; out.length < target; i += 1) {
    const a = positives[i % positives.length];
    const b = positives[(i * 3 + 5) % positives.length];
    if (a.topic === b.topic) continue;
    out.push(C(a.determination_statement, b.excerpts.map((e) => e.text), 'Not addressed', `xneg_${a.topic}_${b.topic}`));
  }
  return out;
}

function buildDataset(total = 100) {
  const need = Math.max(0, total - CORE.length);
  return [...CORE, ...generatedNegatives(need)];
}

module.exports = { CORE, buildDataset };

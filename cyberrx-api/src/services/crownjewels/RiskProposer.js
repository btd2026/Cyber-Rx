'use strict';

/**
 * RiskProposer — Nerion's self-contained, OFFLINE cyber-risk proposer.
 *
 * When an organization has no cyber risk register, Nerion proposes a starter set
 * of risks from each application's characteristics (data classes it holds, whether
 * it's internet-facing, end-of-life, and its supporting-process criticality),
 * using a curated knowledge base aligned to MITRE ATT&CK tactics and common breach
 * patterns. It makes NO network calls and pulls in NO external data — the knowledge
 * is baked in at build time — so it is deterministic and can't leak or fabricate
 * from the internet.
 *
 * Every proposed risk is flagged (proposed:true) and its exposure is a clearly
 * labelled MODELLED estimate meant to be reviewed and replaced with the org's own
 * assessed figure — never presented as a measured fact.
 *
 * Pure + deterministic (no DB, no network) so it is unit-tested.
 */

const has = (s, re) => re.test(String(s || ''));
const norm = (s) => String(s || '');

// Data class → the primary confidentiality/integrity risk it carries. Ordered most-
// severe first; the first match on an asset's data wins as its headline risk.
const DATA_RISKS = [
  { re: /PHI/i, title: 'PHI breach & exfiltration', sev: 'Critical', tactic: 'Exfiltration', why: 'holds protected health information — the primary regulated-data breach path' },
  { re: /PCI|CARDHOLDER/i, title: 'Cardholder-data theft (PCI)', sev: 'Critical', tactic: 'Collection / Exfiltration', why: 'processes cardholder data in PCI scope' },
  { re: /CLASSIFIED|ITAR|SECRET/i, title: 'Nation-state espionage / classified-data breach', sev: 'Critical', tactic: 'Exfiltration', why: 'holds classified / export-controlled data targeted by nation-state actors' },
  { re: /\bCUI\b/i, title: 'CUI compromise (regulated data)', sev: 'Critical', tactic: 'Exfiltration', why: 'holds Controlled Unclassified Information subject to regulatory protection' },
  { re: /\bIP\b|SOURCE\s*CODE|DESIGN\s*DATA|PROPRIETARY/i, title: 'Intellectual-property theft', sev: 'Critical', tactic: 'Collection / Exfiltration', why: 'holds intellectual property / source code sought by competitors and nation-states' },
  { re: /PII/i, title: 'Personal-data breach (PII)', sev: 'High', tactic: 'Exfiltration', why: 'holds personal data triggering breach-notification obligations' },
  { re: /FINANCIAL/i, title: 'Financial-data manipulation & fraud', sev: 'High', tactic: 'Impact', why: 'processes financial transactions exposed to fraud and manipulation' },
];

// Modelled starting exposure by severity ($). A labelled estimate to be replaced.
const SEV_BASE = { Critical: 25e6, High: 8e6, Medium: 3e6, Low: 1e6 };

const isInternet = (host) => has(host, /internet|public|web|saas|api|gateway/i);
const isEol = (eol) => eol === true || has(eol, /^(y|yes|true|eol|end.of.life|unsupported)/i);
const isOt = (data) => has(data, /\bOT\b|SCADA|ICS|CRITICAL\s*INFRASTRUCTURE|OPERATIONAL\s*TECH/i);

function estExposure(sev, { internet, eol }) {
  let v = SEV_BASE[sev] || SEV_BASE.Medium;
  if (internet) v *= 1.3;
  if (eol) v *= 1.25;
  return Math.round(v / 1e5) * 1e5; // round to $0.1M
}

const TAG = 'Proposed by Nerion (offline model) — review & accept. ';
const EST = ' Exposure is a modelled estimate; replace with your assessed figure.';

/**
 * @param {Array} apps  onboarding app rows {name, host, data, eol, recovery}
 * @param {object} opts { industry } (reserved for future sector weighting)
 * @returns {Array} onboarding-shaped risk rows {title, severity, asset, financial_exposure, status, description, proposed}
 */
function proposeRisks(apps = [], opts = {}) {
  const out = [];
  (apps || []).filter((a) => a && a.name).forEach((a) => {
    const name = String(a.name).trim();
    const data = norm(a.data);
    const internet = isInternet(a.host);
    const eol = isEol(a.eol);
    const ot = isOt(data);
    const flags = { internet, eol };

    // 1) Headline confidentiality/integrity risk from the top data class it holds.
    const dr = DATA_RISKS.find((d) => has(data, d.re));
    if (dr) {
      out.push({
        title: `${dr.title} — ${name}`, severity: dr.sev, asset: name, status: 'open',
        financial_exposure: estExposure(dr.sev, flags), proposed: true,
        description: `${TAG}${name} ${dr.why}${internet ? ', and is internet-facing (widens the attack surface)' : ''}. MITRE ATT&CK: ${dr.tactic}.${EST}`,
      });
    }

    // 2) Availability risk — ransomware (OT-flavoured when it's an OT/ICS asset).
    const availSev = (dr && dr.sev === 'Critical') || ot || internet ? 'Critical' : 'High';
    out.push({
      title: `${ot ? 'OT/ICS ransomware' : 'Ransomware'} disrupting ${name}`, severity: availSev, asset: name, status: 'open',
      financial_exposure: estExposure(availSev, flags), proposed: true,
      description: `${TAG}An outage of ${name} halts the processes it supports${ot ? '; OT/ICS recovery is slower than IT' : ''}. MITRE ATT&CK: Impact (Data Encrypted for Impact).${EST}`,
    });

    // 3) Exposure risk for internet-facing or end-of-life systems.
    if (internet || eol) {
      out.push({
        title: `${eol ? 'End-of-life-system exploit' : 'Exploitation of internet-facing service'} — ${name}`, severity: 'High', asset: name, status: 'open',
        financial_exposure: estExposure('High', flags), proposed: true,
        description: `${TAG}${eol ? `${name} is end-of-life / unsupported — a known-vulnerability entry point.` : `${name} is internet-facing — an initial-access entry point.`} MITRE ATT&CK: Initial Access.${EST}`,
      });
    }
  });
  // Keep the register manageable: top 3 per asset already; cap total to the 24
  // highest-exposure proposals so a huge inventory doesn't produce noise.
  return out.sort((x, y) => (y.financial_exposure || 0) - (x.financial_exposure || 0)).slice(0, 24);
}

module.exports = { proposeRisks, DATA_RISKS, estExposure };

'use strict';

/**
 * riskLanes.js — the two risk lanes a crown jewel can carry (Phase E guardrail 2).
 *
 * Not every risk is an adversary. The ATT&CK mapping covers the ADVERSARIAL lane; a parallel
 * NON-ADVERSARIAL lane covers the ways a crown jewel is lost WITHOUT an attacker. A crown jewel can
 * carry risks in BOTH lanes — nothing is forced through ATT&CK.
 *
 * Non-adversarial categories are Nerion's own taxonomy (copyright-clean). Each maps to the seat(s)
 * that own it, so the lane surfaces in the right cockpit.
 */

const ADVERSARIAL = {
  id: 'adversarial',
  label: 'Adversarial (ATT&CK)',
  note: 'A deliberate attacker — mapped to MITRE ATT&CK techniques with control-presence + detection coverage.',
};

const NON_ADVERSARIAL = {
  id: 'non_adversarial',
  label: 'Non-adversarial',
  note: 'Loss without an attacker — availability, integrity, people, dependencies and obligation.',
  categories: [
    { id: 'outage_dr', label: 'Outage / disaster recovery', owner: 'COO / CIO', note: 'Availability loss — outage, failed failover, RTO/RPO miss.' },
    { id: 'data_corruption', label: 'Data corruption / integrity', owner: 'CIO / CISO', note: 'Silent corruption, bad deploy, backup that does not restore.' },
    { id: 'insider', label: 'Insider (non-malicious & malicious)', owner: 'CISO / CHRO', note: 'Error, misconfiguration or abuse by a trusted person.' },
    { id: 'third_party_supply_chain', label: 'Third-party / supply-chain', owner: 'CISO / Procurement', note: 'A vendor or dependency failing — not an intrusion of ours.' },
    { id: 'privacy_regulatory', label: 'Privacy / regulatory', owner: 'CLO', note: 'Obligation breach — retention, cross-border, consent, disclosure clocks.' },
  ],
};

const LANES = [ADVERSARIAL, NON_ADVERSARIAL];
const NON_ADVERSARIAL_IDS = NON_ADVERSARIAL.categories.map((c) => c.id);

/** Validate a non-adversarial category id against the taxonomy. */
function isNonAdversarialCategory(id) { return NON_ADVERSARIAL_IDS.indexOf(String(id)) >= 0; }
/** Look up a non-adversarial category descriptor. */
function nonAdversarialCategory(id) { return NON_ADVERSARIAL.categories.find((c) => c.id === id) || null; }

module.exports = { LANES, ADVERSARIAL, NON_ADVERSARIAL, NON_ADVERSARIAL_IDS, isNonAdversarialCategory, nonAdversarialCategory };

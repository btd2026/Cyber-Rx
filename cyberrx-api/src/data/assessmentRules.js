'use strict';

/**
 * Declarative, VERSIONED assessment rules — rules are DATA, not code.
 * ------------------------------------------------------------------
 * A control's verdict is computed from a rule that says: for population P, the metric M must
 * hold at >= `met` to be `met`, at >= `partial` to be `partially met`, else `not met`. Because
 * the rules are data and versioned, the risk team can tune a threshold without a release, and
 * every historical verdict records which rule VERSION produced it — which is what makes scores
 * recomputable when a rule changes (replay history under the version that was in effect).
 *
 * Each control maps to an ordered list of rule versions (ascending). `ruleFor(id, atVersion)`
 * returns the highest version <= atVersion (or the latest). Controls with no telemetry rule
 * fall back to a method default so every one of the 106 is still evaluable.
 */

// method → default grading when a control has no explicit telemetry rule (attestation etc.).
const METHOD_DEFAULT = {
  live: { metric: 'coverage_pct', met: 90, partial: 60 },
  hybrid: { metric: 'coverage_pct', met: 85, partial: 55 },
  attestation: { metric: 'artifact_fresh', met: 1, partial: 1 }, // present+fresh = met; else engine decays it
};

// Explicit, versioned rules for the telemetry-assessable controls (illustrative but real-shaped).
const RULES = {
  'PR.AA-01': [{ version: 1, population: 'identities', metric: 'managed_pct', met: 95, partial: 80 }],
  'PR.AA-03': [
    { version: 1, population: 'identities', metric: 'mfa_enforced_pct', met: 90, partial: 70 },
    { version: 2, population: 'identities', metric: 'mfa_enforced_pct', met: 95, partial: 80 }, // tightened
  ],
  'PR.AA-05': [{ version: 1, population: 'privileged_accounts', metric: 'least_privilege_pct', met: 90, partial: 70 }],
  'DE.CM-01': [{ version: 1, population: 'assets', metric: 'monitored_pct', met: 95, partial: 75 }],
  'DE.CM-03': [{ version: 1, population: 'identities', metric: 'activity_monitored_pct', met: 90, partial: 70 }],
  'ID.AM-01': [{ version: 1, population: 'hardware', metric: 'inventoried_pct', met: 95, partial: 80 }],
  'ID.AM-02': [{ version: 1, population: 'software', metric: 'inventoried_pct', met: 95, partial: 80 }],
  'PR.DS-11': [{ version: 1, population: 'critical_systems', metric: 'backup_pct', met: 98, partial: 85 }],
  'PR.PS-02': [{ version: 1, population: 'assets', metric: 'patched_pct', met: 90, partial: 70 }],
};

/** The rule for a control at a given version (highest <= atVersion), or its latest. */
function ruleFor(controlId, atVersion) {
  const versions = RULES[controlId];
  if (!versions || !versions.length) return null;
  const sorted = versions.slice().sort((a, b) => a.version - b.version);
  if (atVersion == null) return sorted[sorted.length - 1];
  let chosen = null;
  for (const r of sorted) { if (r.version <= atVersion) chosen = r; }
  return chosen || sorted[0];
}

/** Grade a metric value into a graded verdict against a rule (never binary). */
function evaluateRule(rule, signal) {
  const value = signal && signal.value != null ? Number(signal.value) : null;
  const known = signal && signal.known != null ? Number(signal.known) : null;
  const observed = signal && signal.observed != null ? Number(signal.observed) : known;
  const coveragePct = (known && known > 0) ? Math.round((observed / known) * 100) : null;
  let verdict = 'not_assessed';
  if (value != null) verdict = value >= rule.met ? 'met' : value >= rule.partial ? 'partial' : 'not_met';
  return { verdict, value, coveragePct, ruleVersion: rule.version, metric: rule.metric, population: rule.population };
}

module.exports = { RULES, METHOD_DEFAULT, ruleFor, evaluateRule };

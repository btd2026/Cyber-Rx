// CyberRx — FAIR-lite financial exposure engine (Phase 9).
//
// Turns the engine's computed maturity (PULLED from evidence) plus the org's
// OWNED assumptions into an annualized loss exposure — deterministically, with
// every leaf labeled by provenance. Nothing is invented: each figure is either
// `pulled` (traces to evidence-derived maturity) or `assumption` (an owned value
// with a stated basis). Model: ALE = LEF × LM, where LEF = TEF × Vulnerability
// and Vulnerability falls as control maturity rises.

export type LeafSource = 'pulled' | 'assumption'
export type Leaf = { key: string; label: string; value: number; unit: string; source: LeafSource; basis: string }

export type FairAssumptions = {
  currency: string
  recordsHeld: number            // sensitive records held
  breachCostPerRecord: number    // $/record
  downtimeCostPerHour: number    // $/hour of outage
  downtimeHoursPerEvent: number  // expected outage length
  breachTEF: number              // threat events/yr (breach)
  ransomwareTEF: number          // threat events/yr (ransomware)
  insuranceCoverage: number      // $ cover per event (offsets residual)
}

// Maturity inputs are CMMI 0..5, computed from evidence (pulled).
export type FairMaturity = { protect: number; identify: number; detect: number; recover: number }

export type FairScenario = {
  key: string
  name: string
  vulnerability: number   // 0..1
  lef: number             // loss events / yr
  lossMagnitude: number   // $ per event
  aleGross: number        // $/yr before insurance
  aleResidual: number     // $/yr after per-event insurance
  leaves: Leaf[]          // every input, with provenance
}

export type FairResult = {
  currency: string
  scenarios: FairScenario[]
  aleGross: number
  aleResidual: number
  leaves: Leaf[]          // deduped union of inputs, for a provenance summary
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Higher maturity ⇒ lower residual vulnerability. Floored at 0.05 (never zero
 *  risk), capped at 1.0 (no controls). */
export function vulnFromMaturity(cmmi: number): number {
  return clamp(1 - cmmi / 5, 0.05, 1)
}

export function computeFair(a: FairAssumptions, m: FairMaturity): FairResult {
  const cur = a.currency || 'USD'
  const insLeaf: Leaf = { key: 'insurance_coverage', label: 'Cyber-insurance coverage', value: a.insuranceCoverage, unit: cur, source: 'assumption', basis: 'onboarding' }

  // ── Scenario 1: data breach (PHI/PII exfiltration) ──────────────────────────
  const breachVuln = vulnFromMaturity((m.protect + m.identify) / 2)
  const breachLM = a.recordsHeld * a.breachCostPerRecord
  const breachLEF = a.breachTEF * breachVuln
  const breach: FairScenario = {
    key: 'data_breach',
    name: 'Data breach (PHI/PII exfiltration)',
    vulnerability: breachVuln,
    lef: breachLEF,
    lossMagnitude: breachLM,
    aleGross: breachLEF * breachLM,
    aleResidual: breachLEF * Math.max(0, breachLM - a.insuranceCoverage),
    leaves: [
      { key: 'records_held', label: 'Sensitive records held', value: a.recordsHeld, unit: 'records', source: 'assumption', basis: 'org profile' },
      { key: 'breach_cost_per_record', label: 'Breach cost per record', value: a.breachCostPerRecord, unit: cur, source: 'assumption', basis: 'industry default' },
      { key: 'breach_tef', label: 'Threat event frequency (breach)', value: a.breachTEF, unit: 'events/yr', source: 'assumption', basis: 'industry default' },
      { key: 'protect_maturity', label: 'Protect maturity', value: m.protect, unit: 'CMMI', source: 'pulled', basis: 'computed from evidence' },
      { key: 'identify_maturity', label: 'Identify maturity', value: m.identify, unit: 'CMMI', source: 'pulled', basis: 'computed from evidence' },
      insLeaf,
    ],
  }

  // ── Scenario 2: ransomware / operational outage ─────────────────────────────
  const ransVuln = vulnFromMaturity((m.protect + m.detect + m.recover) / 3)
  const ransLM = a.downtimeCostPerHour * a.downtimeHoursPerEvent
  const ransLEF = a.ransomwareTEF * ransVuln
  const ransomware: FairScenario = {
    key: 'ransomware',
    name: 'Ransomware / operational outage',
    vulnerability: ransVuln,
    lef: ransLEF,
    lossMagnitude: ransLM,
    aleGross: ransLEF * ransLM,
    aleResidual: ransLEF * Math.max(0, ransLM - a.insuranceCoverage),
    leaves: [
      { key: 'downtime_cost_per_hour', label: 'Downtime cost per hour', value: a.downtimeCostPerHour, unit: cur, source: 'assumption', basis: 'industry default' },
      { key: 'downtime_hours', label: 'Expected downtime per event', value: a.downtimeHoursPerEvent, unit: 'hours', source: 'assumption', basis: 'industry default' },
      { key: 'ransomware_tef', label: 'Threat event frequency (ransomware)', value: a.ransomwareTEF, unit: 'events/yr', source: 'assumption', basis: 'industry default' },
      { key: 'protect_maturity', label: 'Protect maturity', value: m.protect, unit: 'CMMI', source: 'pulled', basis: 'computed from evidence' },
      { key: 'detect_maturity', label: 'Detect maturity', value: m.detect, unit: 'CMMI', source: 'pulled', basis: 'computed from evidence' },
      { key: 'recover_maturity', label: 'Recover maturity', value: m.recover, unit: 'CMMI', source: 'pulled', basis: 'computed from evidence' },
      insLeaf,
    ],
  }

  const scenarios = [breach, ransomware]
  const aleGross = scenarios.reduce((s, x) => s + x.aleGross, 0)
  const aleResidual = scenarios.reduce((s, x) => s + x.aleResidual, 0)
  const seen = new Map<string, Leaf>()
  for (const sc of scenarios) for (const l of sc.leaves) if (!seen.has(l.key)) seen.set(l.key, l)
  return { currency: cur, scenarios, aleGross, aleResidual, leaves: [...seen.values()] }
}

// Industry-default magnitude/frequency assumptions (healthcare-payer baseline,
// matching the mock). Owned + editable; insurance + currency come from the tenant.
export const DEFAULT_FAIR_ASSUMPTIONS: Omit<FairAssumptions, 'insuranceCoverage' | 'currency'> = {
  recordsHeld: 2_400_000,
  breachCostPerRecord: 165,
  downtimeCostPerHour: 250_000,
  downtimeHoursPerEvent: 24,
  breachTEF: 0.3,
  ransomwareTEF: 0.5,
}

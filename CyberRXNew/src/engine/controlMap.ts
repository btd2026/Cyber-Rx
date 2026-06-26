// CyberRx — evidence → control mapping (Phase 8d).
//
// Bridges pulled evidence to the framework controls it actually evidences, and
// GRADES the measured value into a 0..1 coverage the deterministic scorer turns
// into CMMI. This is the link that makes a real Okta MFA-coverage reading move
// the exact NIST CSF control it proves — never an invented number. Pure: same
// evidence in ⇒ same score out.

import { scoreControl, type ControlScore, type ControlSignal } from './scorer.ts'

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export type Grader = (value: Record<string, unknown>) => number // → 0..1

export type MapEntry = {
  /** Framework control ids this evidence kind evidences (NIST CSF 2.0). */
  controls: string[]
  /** Human label for the drill-to-evidence panel. */
  label: string
  /** Turn the measured value into a 0..1 control coverage. */
  grade: Grader
}

// Keep these grading rules conservative and explainable — each is a defensible
// reading of the pulled value. Add an entry here when a new adapter ships.
export const EVIDENCE_CONTROL_MAP: Record<string, MapEntry> = {
  identity_mfa_coverage: {
    controls: ['PR.AA-05'],
    label: 'MFA enrollment coverage',
    grade: (v) => clamp01(num(v.coverage_ratio)),
  },
  itsm_open_security_incidents: {
    controls: ['RS.MA-01'],
    label: 'Open security incidents (fewer is better)',
    // 0 open high-priority ⇒ 1.0; ≥10 ⇒ 0. A remediation-throughput proxy.
    grade: (v) => clamp01(1 - num(v.open_high_priority) / 10),
  },
  siem_log_ingestion: {
    controls: ['DE.CM-01'],
    label: 'Security monitoring / log ingestion',
    grade: (v) => (v.log_ingestion_present ? 1 : 0),
  },
  edr_secure_score: {
    controls: ['PR.PS-01'],
    label: 'Defender Secure Score (posture)',
    grade: (v) => clamp01(num(v.ratio)),
  },
  mdm_device_compliance: {
    controls: ['PR.PS-01'],
    label: 'Device compliance (MDM)',
    grade: (v) => clamp01(num(v.ratio)),
  },
  vuln_findings: {
    controls: ['ID.RA-01'],
    label: 'Open vulnerabilities (critical-weighted)',
    // 0 critical/high ⇒ 1.0; criticals weigh 2×. ~25 weighted findings ⇒ 0.
    grade: (v) => clamp01(1 - (num(v.critical) * 2 + num(v.high)) / 50),
  },
  cspm_findings: {
    controls: ['PR.PS-01'],
    label: 'Cloud posture (CSPM)',
    // Prefer the standards compliance pass rate; else fall back to severity counts.
    grade: (v) => {
      const passed = num(v.compliance_passed), failed = num(v.compliance_failed)
      if (passed + failed > 0) return clamp01(passed / (passed + failed))
      return clamp01(1 - (num(v.critical) * 2 + num(v.high)) / 50)
    },
  },
  backup_success_rate: {
    controls: ['RC.RP-01'],
    label: 'Backup success rate (recovery readiness)',
    grade: (v) => clamp01(num(v.success_rate)),
  },
}

export type EvidenceRow = { kind: string; value: Record<string, unknown>; collected_at: string; source_system?: string }

export type ControlEvidence = {
  /** Graded 0..1 (averaged across all evidence mapped to this control). */
  coverage: number
  /** Freshest mapped-evidence age, in hours. */
  ageHours: number
  sources: { kind: string; label: string; grade: number; source: string; collectedAt: string }[]
}

/** Fold evidence rows into a per-control graded coverage + freshness. */
export function mapEvidenceToControls(rows: EvidenceRow[], nowMs: number): Record<string, ControlEvidence> {
  const acc: Record<string, { grades: number[]; ages: number[]; sources: ControlEvidence['sources'] }> = {}
  for (const row of rows) {
    const entry = EVIDENCE_CONTROL_MAP[row.kind]
    if (!entry) continue
    const grade = clamp01(entry.grade(row.value ?? {}))
    const ageHours = Math.max(0, (nowMs - Date.parse(row.collected_at)) / 3_600_000)
    for (const cid of entry.controls) {
      const a = (acc[cid] ??= { grades: [], ages: [], sources: [] })
      a.grades.push(grade)
      a.ages.push(ageHours)
      a.sources.push({ kind: row.kind, label: entry.label, grade, source: row.source_system ?? row.kind, collectedAt: row.collected_at })
    }
  }
  const out: Record<string, ControlEvidence> = {}
  for (const [cid, a] of Object.entries(acc)) {
    out[cid] = {
      coverage: a.grades.reduce((x, y) => x + y, 0) / a.grades.length,
      ageHours: Math.min(...a.ages),
      sources: a.sources,
    }
  }
  return out
}

// Build fine-grained signals from a graded coverage so the scorer preserves the
// measured value to ~1% (the seed model uses a coarse 5-signal split).
export function scoreFromGrade(coverage: number, ageHours: number): ControlScore {
  const N = 100
  const present = Math.round(clamp01(coverage) * N)
  const signals: ControlSignal[] = Array.from({ length: N }, (_, i) => ({ id: `g${i}`, present: i < present, ageHours }))
  return scoreControl(signals)
}

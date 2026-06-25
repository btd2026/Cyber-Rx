import data from './evidence.data.json'

// One evidence record per drillable claim — what justifies a value. Ported from
// the approved mock; in production these are computed from signed, cited
// telemetry by the deterministic engine (Phase 4), never generated.
export type EvidenceQA = { q: string; a: string }
export type EvidenceScenario = { rk: string; cls: string; t: string; impact: string; body: string }
export type EvidenceEntry = {
  claim: string
  val: string
  valCls: 'ok' | 'warn' | 'crit'
  what: string
  sources: string[]
  detail: string[][]
  freshness: string
  confidence: string
  links: [string, string][]
  // Richer optional fields present in the current mock:
  questions?: EvidenceQA[]
  scope?: string[]
  why?: string
  signals?: string
  detailLabel?: string
  scenarios?: EvidenceScenario[]
  aggregate?: string
  tells?: string
}

export const EVIDENCE = data as unknown as Record<string, EvidenceEntry>

export const getEvidence = (key: string): EvidenceEntry | undefined => EVIDENCE[key]

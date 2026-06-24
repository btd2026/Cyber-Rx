import data from './evidence.data.json'

// One evidence record per drillable claim — what justifies a value. Ported from
// the approved mock; in production these are computed from signed, cited
// telemetry by the deterministic engine (Phase 4), never generated.
export type EvidenceEntry = {
  claim: string
  val: string
  valCls: 'ok' | 'warn' | 'crit'
  what: string
  sources: string[]
  signals: string
  detail: [string, string, string][]
  freshness: string
  confidence: string
  links: [string, string][]
}

export const EVIDENCE = data as unknown as Record<string, EvidenceEntry>

export const getEvidence = (key: string): EvidenceEntry | undefined => EVIDENCE[key]

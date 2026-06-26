// CyberRx — Executive Twin core (Phase 5, anti-hallucination per brief §2)
//
// The Twin is a TRANSLATOR on a locked spec sheet — it never introduces facts.
// Two gates run before any answer:
//   Gate 1 (scope router): is the question about cyber AND this org? else refuse.
//   Gate 2 (retrieval gate): is there evidence in THIS tenant's data? else say so.
// Only when both pass do we produce a GROUNDED answer over retrieved evidence.
//
// Deterministic and demo-safe: in the browser it grounds answers straight from
// the engine's evidence (no LLM, so it cannot hallucinate). In production the
// same retrieved evidence + engine values are handed to a server-side Anthropic
// call that only phrases them (see supabase/functions/twin). The evidence map is
// injected (not imported) so the gates are pure and unit-testable.

import type { EvidenceEntry } from '../seats/ciso/evidence'

export type EvidenceMap = Record<string, EvidenceEntry>

export type TwinVerdict =
  | { kind: 'refused'; gate: 'scope' | 'retrieval'; message: string }
  | { kind: 'grounded'; answer: string; citations: string[]; confidence: string; evidenceKey: string }

const CYBER_TERMS = [
  'cyber', 'security', 'risk', 'threat', 'attack', 'compromise', 'breach', 'ransomware',
  'phishing', 'vulnerab', 'exposure', 'incident', 'control', 'compliance', 'audit', 'posture',
  'mfa', 'identity', 'access', 'pam', 'recovery', 'backup', 'detect', 'malware', 'data', 'phi',
  'exfiltrat', 'maturity', 'cmmi', 'framework', 'insurance', 'liability', 'decision', 'evidence',
]

const strip = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').trim()
const tokens = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? []

/** Gate 1 — scope router. In-scope only if the question is about cyber. The org
 *  dimension is implicit: the Twin only ever has this tenant's data loaded. */
export function scopeRouter(question: string): { inScope: boolean; message: string } {
  const t = tokens(question)
  const cyber = t.some((w) => CYBER_TERMS.some((term) => w.startsWith(term)))
  if (!cyber) {
    return {
      inScope: false,
      message:
        "I can only answer cyber-risk questions about your organization — that one is outside my scope. Try one of the suggested questions.",
    }
  }
  return { inScope: true, message: '' }
}

/** Gate 2 — retrieval gate. Find this tenant's evidence relevant to the question;
 *  if retrieval is thin (< 2 overlapping terms), we say so rather than guess. */
export function retrievalGate(
  question: string,
  evidence: EvidenceMap,
): { key: string; entry: EvidenceEntry; score: number } | null {
  const qt = new Set(tokens(question).filter((w) => w.length > 3))
  if (qt.size === 0) return null
  let best: { key: string; entry: EvidenceEntry; score: number } | null = null
  for (const [key, entry] of Object.entries(evidence)) {
    const hay = tokens(`${entry.claim} ${strip(entry.what)} ${key.replace(/-/g, ' ')}`)
    let score = 0
    for (const w of hay) if (qt.has(w)) score++
    if (!best || score > best.score) best = { key, entry, score }
  }
  return best && best.score >= 2 ? best : null
}

/** Full Twin pipeline: gates → grounded answer. Deterministic (demo path). */
export function askTwin(question: string, evidence: EvidenceMap): TwinVerdict {
  const scope = scopeRouter(question)
  if (!scope.inScope) return { kind: 'refused', gate: 'scope', message: scope.message }

  const hit = retrievalGate(question, evidence)
  if (!hit) {
    return {
      kind: 'refused',
      gate: 'retrieval',
      message:
        "I don't have evidence in your data for that. I won't guess — connect the relevant system or rephrase toward what's monitored.",
    }
  }

  const e = hit.entry
  // Grounded answer: phrased ONLY from retrieved evidence + engine values.
  const answer = `${strip(e.claim)} — ${e.val}. ${strip(e.what)}`
  return { kind: 'grounded', answer, citations: e.sources, confidence: e.confidence, evidenceKey: hit.key }
}

const CHIP_QUESTIONS: Record<string, string> = {
  intrusions: 'Are we compromised right now?',
  'exp-claims': "What's our material exposure on claims?",
  controls: 'Are our critical controls holding?',
  'det-rec': 'How is our recovery testing trending?',
  'cfo-appetite': 'Is loss exposure within appetite?',
  'clo-disclosure': 'Do we have a disclosure obligation today?',
}

/** Suggested chips, generated from the evidence the org actually has (always
 *  answerable — a safe on-ramp, per brief §2). */
export function suggestedChips(evidence: EvidenceMap): { label: string; key: string }[] {
  return ['intrusions', 'exp-claims', 'controls', 'det-rec', 'cfo-appetite', 'clo-disclosure']
    .filter((k) => k in evidence)
    .slice(0, 4)
    .map((k) => ({ label: CHIP_QUESTIONS[k] ?? strip(evidence[k].claim), key: k }))
}

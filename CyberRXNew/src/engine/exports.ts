// CyberRx — signed exports (Phase 4d)
//
// Generates REAL downloadable artifacts (auditor report + evidence manifest) and
// signs them with a SHA-256 hash, mirroring the signed decision ledger. In demo
// the hash is computed in the browser; in production exports are generated and
// signed server-side over the cited, signed evidence.

import type { ControlScore } from './scorer'

export type ScoredControl = { id: string; title: string; score: ControlScore; coverage: number; ageHours: number }
export type ScoredCategory = { id: string; title: string; controls: ScoredControl[] }
export type ScoredFunction = { key: string; name: string; cmmi: number; confidence: number; categories: ScoredCategory[] }

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString()

/** Auditor report — a Markdown narrative over the computed posture, signed. */
export async function exportAuditorReport(frameworkLabel: string, fns: ScoredFunction[]) {
  const when = stamp()
  const lines: string[] = []
  lines.push(`# CyberRx — Auditor Report`)
  lines.push(`Framework: **${frameworkLabel}**  ·  Generated: ${when}`)
  lines.push('')
  lines.push(`> CMMI maturity is computed by the deterministic engine from evidence coverage and freshness — not generated. Each figure traces to cited evidence.`)
  lines.push('')
  for (const fn of fns) {
    lines.push(`## ${fn.name} — CMMI ${fn.cmmi} (confidence ${Math.round(fn.confidence * 100)}%)`)
    for (const cat of fn.categories) {
      lines.push(`### ${cat.id} · ${cat.title}`)
      lines.push('')
      lines.push('| Control | Title | CMMI | Status | Confidence | Coverage | Evidence age |')
      lines.push('| --- | --- | --- | --- | --- | --- | --- |')
      for (const c of cat.controls) {
        lines.push(`| ${c.id} | ${c.title} | ${c.score.cmmi} | ${c.score.status} | ${Math.round(c.score.confidence * 100)}% | ${Math.round(c.coverage * 100)}% | ${c.ageHours}h |`)
      }
      lines.push('')
    }
  }
  const body = lines.join('\n')
  const sig = await sha256Hex(body)
  const signed = `${body}\n\n---\nSHA-256: ${sig}\n(Tamper-evident: re-hash the content above to verify. Production signs server-side over the signed evidence chain.)\n`
  download(`cyberrx-auditor-report-${frameworkLabel.replace(/\W+/g, '-')}.md`, signed, 'text/markdown')
  return sig
}

/** Evidence manifest — a machine-readable JSON of controls + scores, signed. */
export async function exportEvidenceManifest(frameworkLabel: string, fns: ScoredFunction[]) {
  const when = stamp()
  const controls = fns.flatMap((fn) =>
    fn.categories.flatMap((cat) =>
      cat.controls.map((c) => ({
        function: fn.key,
        category: cat.id,
        control_id: c.id,
        title: c.title,
        cmmi: c.score.cmmi,
        status: c.score.status,
        confidence: c.score.confidence,
        coverage: c.coverage,
        evidence_age_hours: c.ageHours,
      })),
    ),
  )
  const payload = { framework: frameworkLabel, generated_at: when, control_count: controls.length, controls }
  const body = JSON.stringify(payload, null, 2)
  const sig = await sha256Hex(body)
  const signed = JSON.stringify({ ...payload, signature: { alg: 'SHA-256', hash: sig } }, null, 2)
  download(`cyberrx-evidence-manifest-${frameworkLabel.replace(/\W+/g, '-')}.json`, signed, 'application/json')
  return sig
}

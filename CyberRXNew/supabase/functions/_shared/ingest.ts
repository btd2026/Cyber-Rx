// CyberRx — ingestion core (Phase 8): turn adapter signals into evidence rows.
//
// The orchestrator owns isolation + persistence + signing. This module is the
// pure transform: RawSignal[] → evidence insert rows, each with a content_hash
// (sha256 of the canonical value) so every figure is citable & tamper-evident.

import type { RawSignal } from './adapters/types.ts'

// Stable stringify (sorted keys) so the same value always hashes the same.
function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type EvidenceRow = {
  tenant_id: string
  connector_id: string
  source_system: string
  kind: string
  value: Record<string, unknown>
  collected_at: string
  freshness_seconds: number | null
  content_hash: string
  leaf_type: 'pulled'
}

export async function toEvidenceRows(
  tenantId: string, connectorId: string, signals: RawSignal[],
): Promise<EvidenceRow[]> {
  const rows: EvidenceRow[] = []
  for (const s of signals) {
    rows.push({
      tenant_id: tenantId,
      connector_id: connectorId,
      source_system: s.sourceSystem,
      kind: s.kind,
      value: s.value,
      collected_at: s.collectedAt,
      freshness_seconds: s.freshnessSeconds ?? null,
      // content_hash binds the value to its provenance — pulled evidence, never invented.
      content_hash: await sha256Hex(`${s.sourceSystem}|${s.kind}|${canonical(s.value)}`),
      leaf_type: 'pulled',
    })
  }
  return rows
}

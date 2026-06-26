// Splunk adapter — SIEM / log analytics (kind: 'siem').
//
// Free forever on the self-hosted Splunk Free license (500MB/day); REST API on
// the management port :8089. (Splunk *Cloud* trial blocks the API — use Free.)
// Auth is a bearer authentication token. We sum index event counts to confirm
// log ingestion — the same `siem_log_ingestion` signal Elasticsearch emits, so
// it maps to DE.CM-01 with no new control mapping. Self-signed cert.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

type IndexEntry = { content?: { totalEventCount?: number; currentDBSizeMB?: number } }

export const splunkAdapter: ConnectorAdapter = {
  provider: 'splunk',
  kind: 'siem',
  displayName: 'Splunk Free (self-hosted)',
  secretFields: [{ key: 'token', label: 'Authentication token', placeholder: 'Bearer token', secret: true }],
  configFields: [{ key: 'baseUrl', label: 'Management URL', placeholder: 'https://localhost:8089' }],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const base = String(ctx.config.baseUrl ?? '').replace(/\/$/, '')
    const token = ctx.secret.token
    if (!base || !token) throw new Error('Splunk needs config.baseUrl and secret.token')

    // A single GET over the index catalog — no async search job needed.
    const r = await ctx.fetch(`${base}/services/data/indexes?output_mode=json&count=0`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    })
    if (!r.ok) throw new Error(`Splunk indexes ${r.status}`)
    const entries = ((await r.json())?.entry ?? []) as IndexEntry[]
    let totalEvents = 0
    for (const e of entries) totalEvents += Number(e?.content?.totalEventCount ?? 0)
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Splunk',
        kind: 'siem_log_ingestion',
        value: { total_docs: totalEvents, log_ingestion_present: totalEvents > 0, indexes: entries.length },
        collectedAt: now,
        freshnessSeconds: 3600,
      },
    ]
    return { signals, health: { ok: true, total_events: totalEvents, indexes: entries.length, last_sync: now } }
  },
}

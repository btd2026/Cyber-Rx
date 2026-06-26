// Elasticsearch adapter — SIEM / log analytics (kind: 'siem').
//
// Free forever on the self-managed Basic license (zero signup: `docker run
// elasticsearch`). Auth is an API key (`Authorization: ApiKey <base64>`). We
// confirm log-ingestion presence and bucket security events by severity — a
// detection-coverage signal.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

export const elasticAdapter: ConnectorAdapter = {
  provider: 'elastic',
  kind: 'siem',
  displayName: 'Elasticsearch (Basic)',
  secretFields: [{ key: 'apiKey', label: 'API key', placeholder: 'base64 ApiKey' }],
  configFields: [
    { key: 'baseUrl', label: 'Base URL', placeholder: 'http://localhost:9200' },
    { key: 'index', label: 'Index pattern', placeholder: 'logs-*' },
  ],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const base = String(ctx.config.baseUrl ?? '').replace(/\/$/, '')
    const index = String(ctx.config.index ?? 'logs-*')
    const apiKey = ctx.secret.apiKey
    if (!base || !apiKey) throw new Error('Elastic needs config.baseUrl and secret.apiKey')
    const headers = { authorization: `ApiKey ${apiKey}`, 'content-type': 'application/json', accept: 'application/json' }

    // Doc volume (ingestion presence).
    const cnt = await ctx.fetch(`${base}/${encodeURIComponent(index)}/_count`, { headers })
    if (!cnt.ok) throw new Error(`Elastic _count ${cnt.status}`)
    const docCount = Number((await cnt.json())?.count ?? 0)

    // Severity histogram over a bounded recent window.
    const agg = await ctx.fetch(`${base}/${encodeURIComponent(index)}/_search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        size: 0,
        query: { range: { '@timestamp': { gte: ctx.since ?? 'now-24h' } } },
        aggs: { by_severity: { terms: { field: 'event.severity', size: 10 } } },
      }),
    })
    const bySeverity: Record<string, number> = {}
    if (agg.ok) {
      const buckets = (await agg.json())?.aggregations?.by_severity?.buckets ?? []
      for (const b of buckets) bySeverity[String(b.key)] = Number(b.doc_count)
    }
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Elasticsearch',
        kind: 'siem_log_ingestion',
        value: { index, total_docs: docCount, log_ingestion_present: docCount > 0, events_by_severity_24h: bySeverity },
        collectedAt: now,
        freshnessSeconds: 3600,
      },
    ]
    return { signals, health: { ok: true, total_docs: docCount, last_sync: now } }
  },
}

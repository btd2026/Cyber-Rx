// Nessus Essentials adapter — Vulnerability management (kind: 'vuln').
//
// Free forever (16-IP cap) from tenable.com/products/nessus/nessus-essentials;
// self-hosted scanner exposing a local REST API on :8834. Auth is API keys via
// the `X-ApiKeys` header (Settings → My Account → API Keys). We aggregate
// critical/high finding counts across recent scans — a vulnerability-exposure
// signal. NOTE: the local scanner uses a self-signed cert.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

const MAX_SCANS = 25

type ScanHost = { critical?: number; high?: number; medium?: number; low?: number }

export const nessusAdapter: ConnectorAdapter = {
  provider: 'nessus',
  kind: 'vuln',
  displayName: 'Nessus Essentials',
  secretFields: [
    { key: 'accessKey', label: 'Access key' },
    { key: 'secretKey', label: 'Secret key' },
  ],
  configFields: [{ key: 'baseUrl', label: 'Base URL', placeholder: 'https://localhost:8834' }],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const base = String(ctx.config.baseUrl ?? '').replace(/\/$/, '')
    const { accessKey, secretKey } = ctx.secret
    if (!base || !accessKey || !secretKey) throw new Error('Nessus needs config.baseUrl and secret.accessKey/secretKey')
    const headers = { 'x-apikeys': `accessKey=${accessKey}; secretKey=${secretKey}`, accept: 'application/json' }

    const list = await ctx.fetch(`${base}/scans`, { headers })
    if (!list.ok) throw new Error(`Nessus /scans ${list.status}`)
    const scans = ((await list.json())?.scans ?? []) as { id: number }[]

    let critical = 0, high = 0, medium = 0, low = 0
    for (const s of scans.slice(0, MAX_SCANS)) {
      const d = await ctx.fetch(`${base}/scans/${s.id}`, { headers })
      if (!d.ok) continue
      const hosts = ((await d.json())?.hosts ?? []) as ScanHost[]
      for (const h of hosts) {
        critical += Number(h.critical ?? 0)
        high += Number(h.high ?? 0)
        medium += Number(h.medium ?? 0)
        low += Number(h.low ?? 0)
      }
    }
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Nessus',
        kind: 'vuln_findings',
        value: { critical, high, medium, low, scans_scanned: Math.min(scans.length, MAX_SCANS) },
        collectedAt: now,
        freshnessSeconds: 12 * 3600,
      },
    ]
    return { signals, health: { ok: true, critical, high, last_sync: now } }
  },
}

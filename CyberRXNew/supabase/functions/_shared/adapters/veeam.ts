// Veeam Backup & Replication adapter — Backup / DR (kind: 'backup').
//
// Free forever on Veeam Community Edition (≤10 workloads); the REST API ships in
// the same binary on :9419. Auth is OAuth2 password-grant. We read recent backup
// job sessions and derive a success rate + last-successful-backup — a recovery-
// readiness signal that lights up the CSF Recover function. NOTE: self-hosted,
// self-signed cert; the `x-api-version` header is mandatory and version-specific.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

const API_VERSION_DEFAULT = '1.1-rev1'

type Session = { result?: string | { result?: string }; endTime?: string }

export const veeamAdapter: ConnectorAdapter = {
  provider: 'veeam',
  kind: 'backup',
  displayName: 'Veeam Backup & Replication (Community)',
  secretFields: [
    { key: 'username', label: 'Username', placeholder: 'Administrator' },
    { key: 'password', label: 'Password' },
  ],
  configFields: [
    { key: 'baseUrl', label: 'Base URL', placeholder: 'https://veeam-host:9419' },
    { key: 'apiVersion', label: 'API version', placeholder: '1.1-rev1' },
  ],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const base = String(ctx.config.baseUrl ?? '').replace(/\/$/, '')
    const apiVersion = String(ctx.config.apiVersion || API_VERSION_DEFAULT)
    const { username, password } = ctx.secret
    if (!base || !username || !password) throw new Error('Veeam needs config.baseUrl and secret.username/password')

    // OAuth2 password grant → bearer token.
    const tok = await ctx.fetch(`${base}/api/oauth2/token`, {
      method: 'POST',
      headers: { 'x-api-version': apiVersion, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'password', username, password }),
    })
    if (!tok.ok) throw new Error(`Veeam token ${tok.status}`)
    const accessToken = (await tok.json()).access_token as string

    // Recent job sessions, newest first.
    const r = await ctx.fetch(`${base}/api/v1/sessions?limit=200&orderColumn=EndTime&orderAsc=false`, {
      headers: { authorization: `Bearer ${accessToken}`, 'x-api-version': apiVersion, accept: 'application/json' },
    })
    if (!r.ok) throw new Error(`Veeam sessions ${r.status}`)
    const sessions = ((await r.json())?.data ?? []) as Session[]

    let success = 0, warning = 0, failed = 0
    let lastSuccessfulAt: string | null = null
    for (const s of sessions) {
      const raw = typeof s.result === 'string' ? s.result : s.result?.result
      const res = String(raw ?? '').toLowerCase()
      if (res === 'success') { success++; if (!lastSuccessfulAt && s.endTime) lastSuccessfulAt = s.endTime }
      else if (res === 'warning') warning++
      else if (res === 'failed') failed++
    }
    const total = success + warning + failed
    // Warnings count as half-credit toward the rate.
    const rate = total ? (success + warning * 0.5) / total : 0
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Veeam',
        kind: 'backup_success_rate',
        value: { total_sessions: total, successful: success, warnings: warning, failed, success_rate: Number(rate.toFixed(4)), last_successful_at: lastSuccessfulAt },
        collectedAt: now,
        freshnessSeconds: 12 * 3600,
      },
    ]
    return { signals, health: { ok: true, total_sessions: total, last_sync: now } }
  },
}

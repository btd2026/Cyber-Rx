// ServiceNow adapter — ITSM / GRC (kind: 'grc').
//
// Free to integrate against a ServiceNow Personal Developer Instance (PDI) from
// developer.servicenow.com (instant, no sales; note PDIs hibernate after ~10 days
// idle). Auth is Basic (admin creds) or OAuth2. We read open security-incident
// counts via the Aggregate API — an incident-response/remediation maturity proxy.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

async function statCount(ctx: AdapterContext, base: string, auth: string, query: string): Promise<number> {
  const url = `${base}/api/now/stats/incident?sysparm_count=true&sysparm_query=${encodeURIComponent(query)}`
  const r = await ctx.fetch(url, { headers: { authorization: auth, accept: 'application/json' } })
  if (!r.ok) throw new Error(`ServiceNow stats ${r.status}`)
  const body = await r.json()
  return Number(body?.result?.stats?.count ?? 0)
}

export const serviceNowAdapter: ConnectorAdapter = {
  provider: 'servicenow',
  kind: 'grc',
  displayName: 'ServiceNow (Developer Instance)',
  secretFields: [
    { key: 'username', label: 'Username', placeholder: 'admin' },
    { key: 'password', label: 'Password' },
  ],
  configFields: [{ key: 'instance', label: 'Instance', placeholder: 'dev123456' }],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const instance = String(ctx.config.instance ?? '').replace(/\.service-now\.com.*$/, '').replace(/^https?:\/\//, '')
    const { username, password } = ctx.secret
    if (!instance || !username || !password) throw new Error('ServiceNow needs config.instance and secret.username/password')
    const base = `https://${instance}.service-now.com`
    const auth = `Basic ${btoa(`${username}:${password}`)}`

    const openSecurity = await statCount(ctx, base, auth, 'active=true^category=security')
    const openHigh = await statCount(ctx, base, auth, 'active=true^category=security^priority<=2')
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'ServiceNow',
        kind: 'itsm_open_security_incidents',
        value: { open_security_incidents: openSecurity, open_high_priority: openHigh },
        collectedAt: now,
        freshnessSeconds: 6 * 3600,
      },
    ]
    return { signals, health: { ok: true, last_sync: now } }
  },
}

// Okta adapter — Identity Provider (kind: 'idp').
//
// Free to integrate against an Okta Developer Edition org (developer.okta.com —
// free forever, instant signup). Auth is an SSWS API token. We derive MFA
// enrollment coverage — a strong identity-maturity signal — by sampling active
// users and checking their enrolled factors. Pagination is bounded so we stay
// well within free-tier rate limits.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

const MAX_PAGES = 10 // bounded: up to ~2000 users at limit=200

type OktaUser = { id: string; status: string }
type OktaFactor = { status: string; factorType: string }

async function listActiveUsers(ctx: AdapterContext, base: string, token: string): Promise<OktaUser[]> {
  const users: OktaUser[] = []
  let url: string | null = `${base}/api/v1/users?filter=${encodeURIComponent('status eq "ACTIVE"')}&limit=200`
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const r = await ctx.fetch(url, { headers: { authorization: `SSWS ${token}`, accept: 'application/json' } })
    if (!r.ok) throw new Error(`Okta users ${r.status}`)
    users.push(...(await r.json()) as OktaUser[])
    // Okta paginates via a Link header with rel="next".
    const link = r.headers.get('link') ?? ''
    const next = link.split(',').find((p) => /rel="next"/.test(p))
    url = next ? (next.match(/<([^>]+)>/)?.[1] ?? null) : null
  }
  return users
}

export const oktaAdapter: ConnectorAdapter = {
  provider: 'okta',
  kind: 'idp',
  displayName: 'Okta (Developer Edition)',
  secretFields: [{ key: 'token', label: 'API token (SSWS)', placeholder: '00ab...' }],
  configFields: [{ key: 'orgUrl', label: 'Org URL', placeholder: 'https://dev-12345.okta.com' }],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const base = String(ctx.config.orgUrl ?? '').replace(/\/$/, '')
    const token = ctx.secret.token
    if (!base || !token) throw new Error('Okta adapter needs config.orgUrl and secret.token')

    const users = await listActiveUsers(ctx, base, token)
    let withMfa = 0
    // Check factors per user. Bounded by the same page cap above.
    for (const u of users) {
      const r = await ctx.fetch(`${base}/api/v1/users/${u.id}/factors`, {
        headers: { authorization: `SSWS ${token}`, accept: 'application/json' },
      })
      if (!r.ok) continue
      const factors = (await r.json()) as OktaFactor[]
      if (factors.some((f) => f.status === 'ACTIVE')) withMfa++
    }
    const total = users.length
    const ratio = total ? withMfa / total : 0
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Okta',
        kind: 'identity_mfa_coverage',
        value: { total_active_users: total, users_with_mfa: withMfa, coverage_ratio: Number(ratio.toFixed(4)) },
        collectedAt: now,
        freshnessSeconds: 24 * 3600,
      },
    ]
    return { signals, health: { ok: true, sampled_users: total, last_sync: now } }
  },
}

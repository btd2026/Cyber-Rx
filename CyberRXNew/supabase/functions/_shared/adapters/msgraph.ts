// Microsoft Graph adapter — Identity (kind: 'idp'), alternative to Okta.
//
// Free via a self-serve Azure account → new Entra tenant. OAuth2 client-credentials
// (app registration with AuditLog.Read.All + User.Read.All). The richest single
// MFA signal of any vendor: one call to the userRegistrationDetails report returns
// per-user isMfaRegistered + isAdmin, so coverage and admin count come from one
// paginated endpoint. CAVEAT: that report requires Entra ID P1/P2 (start a free P2
// trial to light it up on a Free tenant).

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

const MAX_PAGES = 20

// Shared Graph OAuth2 client-credentials token — reused by the Secure Score and
// Intune adapters (same app registration, same secret shape).
export async function graphToken(ctx: AdapterContext, tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const r = await ctx.fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })
  if (!r.ok) throw new Error(`Entra token ${r.status}`)
  return (await r.json()).access_token as string
}

type RegRow = { isMfaRegistered?: boolean; isAdmin?: boolean }

export const msGraphAdapter: ConnectorAdapter = {
  provider: 'msgraph',
  kind: 'idp',
  displayName: 'Microsoft Entra ID (Graph)',
  secretFields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret' },
  ],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const { tenantId, clientId, clientSecret } = ctx.secret
    if (!tenantId || !clientId || !clientSecret) throw new Error('Graph needs secret.tenantId/clientId/clientSecret')
    const at = await graphToken(ctx, tenantId, clientId, clientSecret)

    let url: string | null = 'https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?$top=200'
    let total = 0, withMfa = 0, admins = 0
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const r = await ctx.fetch(url, { headers: { authorization: `Bearer ${at}`, accept: 'application/json' } })
      if (!r.ok) throw new Error(`Graph report ${r.status}`)
      const body = await r.json()
      for (const row of (body.value ?? []) as RegRow[]) {
        total++
        if (row.isMfaRegistered) withMfa++
        if (row.isAdmin) admins++
      }
      url = body['@odata.nextLink'] ?? null
    }
    const ratio = total ? withMfa / total : 0
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Microsoft Entra ID',
        kind: 'identity_mfa_coverage',
        value: { total_users: total, users_with_mfa: withMfa, coverage_ratio: Number(ratio.toFixed(4)), privileged_admins: admins },
        collectedAt: now,
        freshnessSeconds: 24 * 3600,
      },
    ]
    return { signals, health: { ok: true, total_users: total, last_sync: now } }
  },
}

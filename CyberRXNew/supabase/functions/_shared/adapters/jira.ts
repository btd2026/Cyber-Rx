// Jira Cloud adapter — ITSM / GRC (kind: 'grc').
//
// Free on the Atlassian Cloud Free plan (≤10 users, perpetual; REST API fully
// available). Auth is Basic `email:api_token` (token from id.atlassian.com). We
// count open security/remediation tickets via the JQL approximate-count endpoint
// — a remediation-throughput signal that feeds the same RS.MA-01 control as
// ServiceNow (the mapping keys on the signal kind, not the vendor).

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

async function count(ctx: AdapterContext, base: string, auth: string, jql: string): Promise<number> {
  const r = await ctx.fetch(`${base}/rest/api/3/search/approximate-count`, {
    method: 'POST',
    headers: { authorization: auth, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ jql }),
  })
  if (!r.ok) throw new Error(`Jira count ${r.status}`)
  return Number((await r.json())?.count ?? 0)
}

export const jiraAdapter: ConnectorAdapter = {
  provider: 'jira',
  kind: 'grc',
  displayName: 'Jira Cloud (Free)',
  secretFields: [
    { key: 'email', label: 'Atlassian account email', placeholder: 'you@org.com' },
    { key: 'apiToken', label: 'API token', placeholder: 'from id.atlassian.com' },
  ],
  configFields: [
    { key: 'baseUrl', label: 'Site URL', placeholder: 'https://your-site.atlassian.net' },
    { key: 'jql', label: 'JQL filter', placeholder: 'project = SEC AND statusCategory != Done' },
  ],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const base = String(ctx.config.baseUrl ?? '').replace(/\/$/, '')
    const jql = String(ctx.config.jql ?? 'statusCategory != Done')
    const { email, apiToken } = ctx.secret
    if (!base || !email || !apiToken) throw new Error('Jira needs config.baseUrl and secret.email/apiToken')
    const auth = `Basic ${btoa(`${email}:${apiToken}`)}`

    const open = await count(ctx, base, auth, jql)
    const high = await count(ctx, base, auth, `(${jql}) AND priority in (High, Highest)`)
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Jira',
        kind: 'itsm_open_security_incidents',
        value: { open_security_incidents: open, open_high_priority: high },
        collectedAt: now,
        freshnessSeconds: 6 * 3600,
      },
    ]
    return { signals, health: { ok: true, last_sync: now } }
  },
}

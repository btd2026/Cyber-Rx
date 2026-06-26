// Microsoft Defender Secure Score adapter — EDR / posture (kind: 'edr').
//
// Free via the M365 Developer Program E5 tenant (or any tenant with Defender),
// same Graph app registration as the Entra adapter (add SecureScore.Read.All).
// Secure Score is Microsoft's normalized posture metric; currentScore/maxScore
// is a clean endpoint/configuration-hardening signal.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'
import { graphToken } from './msgraph.ts'

export const msGraphSecureScoreAdapter: ConnectorAdapter = {
  provider: 'msgraph_secure_score',
  kind: 'edr',
  displayName: 'Defender Secure Score (Graph)',
  secretFields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret' },
  ],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const { tenantId, clientId, clientSecret } = ctx.secret
    if (!tenantId || !clientId || !clientSecret) throw new Error('Secure Score needs secret.tenantId/clientId/clientSecret')
    const at = await graphToken(ctx, tenantId, clientId, clientSecret)

    // Latest secure score (the list is newest-first).
    const r = await ctx.fetch('https://graph.microsoft.com/v1.0/security/secureScores?$top=1', {
      headers: { authorization: `Bearer ${at}`, accept: 'application/json' },
    })
    if (!r.ok) throw new Error(`Graph secureScores ${r.status}`)
    const latest = (await r.json())?.value?.[0]
    if (!latest) throw new Error('no secure score available')
    const current = Number(latest.currentScore ?? 0)
    const max = Number(latest.maxScore ?? 0)
    const ratio = max > 0 ? current / max : 0
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Microsoft Defender',
        kind: 'edr_secure_score',
        value: { current_score: current, max_score: max, ratio: Number(ratio.toFixed(4)) },
        collectedAt: now,
        freshnessSeconds: 24 * 3600,
      },
    ]
    return { signals, health: { ok: true, current, max, last_sync: now } }
  },
}

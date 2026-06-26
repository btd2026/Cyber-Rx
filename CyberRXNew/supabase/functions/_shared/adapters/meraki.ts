// Cisco Meraki adapter — Firewall / Network (kind: 'fw').
//
// Free to integrate against a Cisco DevNet always-on Meraki sandbox (free Cisco
// account, no sales) or any Meraki org. Auth is an API key (Bearer). We read the
// MX appliance L3 firewall rules and score rule hygiene — overly-permissive
// any/any allow rules and rules without logging drag the score down. Lab data in
// the sandbox; real data with your own org/network.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'

type L3Rule = { policy?: string; protocol?: string; srcCidr?: string; destCidr?: string; syslogEnabled?: boolean }

export const merakiAdapter: ConnectorAdapter = {
  provider: 'meraki',
  kind: 'fw',
  displayName: 'Cisco Meraki (DevNet/API)',
  secretFields: [{ key: 'apiKey', label: 'Meraki API key', secret: true }],
  configFields: [
    { key: 'baseUrl', label: 'API base', placeholder: 'https://api.meraki.com/api/v1' },
    { key: 'networkId', label: 'Network ID', placeholder: 'L_123456789' },
  ],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const base = String(ctx.config.baseUrl || 'https://api.meraki.com/api/v1').replace(/\/$/, '')
    const networkId = String(ctx.config.networkId ?? '')
    const apiKey = ctx.secret.apiKey
    if (!networkId || !apiKey) throw new Error('Meraki needs config.networkId and secret.apiKey')

    const r = await ctx.fetch(`${base}/networks/${networkId}/appliance/firewall/l3FirewallRules`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
    })
    if (!r.ok) throw new Error(`Meraki l3FirewallRules ${r.status}`)
    const rules = ((await r.json())?.rules ?? []) as L3Rule[]

    const total = rules.length
    const isAny = (c?: string) => !c || c.toLowerCase() === 'any'
    const allowAny = rules.filter((x) => (x.policy ?? '').toLowerCase() === 'allow' && isAny(x.srcCidr) && isAny(x.destCidr) && isAny(x.protocol)).length
    const noLogging = rules.filter((x) => x.syslogEnabled === false).length
    // Hygiene: penalize any/any allows and unlogged rules (each up to half weight).
    const hygiene = total > 0 ? Math.max(0, 1 - (allowAny / total) * 0.7 - (noLogging / total) * 0.3) : 0
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Cisco Meraki',
        kind: 'firewall_rule_hygiene',
        value: { total_rules: total, allow_any_rules: allowAny, rules_without_logging: noLogging, hygiene_ratio: Number(hygiene.toFixed(4)) },
        collectedAt: now,
        freshnessSeconds: 12 * 3600,
      },
    ]
    return { signals, health: { ok: true, total_rules: total, last_sync: now } }
  },
}

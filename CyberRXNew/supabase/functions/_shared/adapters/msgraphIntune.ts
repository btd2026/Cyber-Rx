// Microsoft Intune adapter — Device management / MDM (kind: 'mdm').
//
// Free via the M365 Developer Program E5 tenant, same Graph app registration
// (add DeviceManagementManagedDevices.Read.All). We page managed devices and
// compute the compliant fraction — a device-hygiene signal. CAVEAT: a bare dev
// tenant has no real hardware unless you enroll test devices/VMs.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'
import { graphToken } from './msgraph.ts'

const MAX_PAGES = 20

export const msGraphIntuneAdapter: ConnectorAdapter = {
  provider: 'msgraph_intune',
  kind: 'mdm',
  displayName: 'Intune device compliance (Graph)',
  secretFields: [
    { key: 'tenantId', label: 'Directory (tenant) ID' },
    { key: 'clientId', label: 'Application (client) ID' },
    { key: 'clientSecret', label: 'Client secret' },
  ],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const { tenantId, clientId, clientSecret } = ctx.secret
    if (!tenantId || !clientId || !clientSecret) throw new Error('Intune needs secret.tenantId/clientId/clientSecret')
    const at = await graphToken(ctx, tenantId, clientId, clientSecret)

    let url: string | null = "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$select=complianceState&$top=200"
    let total = 0, compliant = 0
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const r = await ctx.fetch(url, { headers: { authorization: `Bearer ${at}`, accept: 'application/json' } })
      if (!r.ok) throw new Error(`Graph managedDevices ${r.status}`)
      const body = await r.json()
      for (const d of (body.value ?? []) as { complianceState?: string }[]) {
        total++
        if (d.complianceState === 'compliant') compliant++
      }
      url = body['@odata.nextLink'] ?? null
    }
    const ratio = total ? compliant / total : 0
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'Microsoft Intune',
        kind: 'mdm_device_compliance',
        value: { total_devices: total, compliant_devices: compliant, ratio: Number(ratio.toFixed(4)) },
        collectedAt: now,
        freshnessSeconds: 24 * 3600,
      },
    ]
    return { signals, health: { ok: true, total_devices: total, last_sync: now } }
  },
}

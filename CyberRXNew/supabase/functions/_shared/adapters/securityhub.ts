// AWS Security Hub adapter — Cloud security posture / CSPM (kind: 'cloud').
//
// Free to read on the AWS free tier (GetFindings reads are within limits). Auth
// is AWS SigV4 (IAM access key, or temporary creds with a session token) — see
// _shared/aws/sigv4.ts, validated against AWS's official test vectors. We page
// active findings, bucket them by severity, and derive a compliance pass rate
// from standards findings — a cloud-misconfiguration / config-hardening signal.

import type { ConnectorAdapter, AdapterContext, RawSignal } from './types.ts'
import { signedHeaders } from '../aws/sigv4.ts'

const MAX_PAGES = 5 // up to ~500 findings — bounded & cheap

type Finding = { Severity?: { Label?: string }; Compliance?: { Status?: string } }

export const securityHubAdapter: ConnectorAdapter = {
  provider: 'securityhub',
  kind: 'cloud',
  displayName: 'AWS Security Hub',
  secretFields: [
    { key: 'accessKeyId', label: 'Access key ID' },
    { key: 'secretAccessKey', label: 'Secret access key' },
    { key: 'sessionToken', label: 'Session token (optional)' },
  ],
  configFields: [{ key: 'region', label: 'AWS region', placeholder: 'us-east-1' }],
  async pull(ctx): Promise<{ signals: RawSignal[]; health: Record<string, unknown> }> {
    const region = String(ctx.config.region ?? 'us-east-1')
    const { accessKeyId, secretAccessKey, sessionToken } = ctx.secret
    if (!accessKeyId || !secretAccessKey) throw new Error('Security Hub needs secret.accessKeyId/secretAccessKey')
    const host = `securityhub.${region}.amazonaws.com`
    const creds = { accessKeyId, secretAccessKey, sessionToken: sessionToken || undefined }

    const sev: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    let passed = 0, failed = 0, total = 0
    let nextToken: string | undefined
    for (let page = 0; page < MAX_PAGES; page++) {
      const body = JSON.stringify({
        Filters: {
          RecordState: [{ Comparison: 'EQUALS', Value: 'ACTIVE' }],
          WorkflowStatus: [{ Comparison: 'EQUALS', Value: 'NEW' }, { Comparison: 'EQUALS', Value: 'NOTIFIED' }],
        },
        MaxResults: 100,
        ...(nextToken ? { NextToken: nextToken } : {}),
      })
      const headers = await signedHeaders({ method: 'POST', service: 'securityhub', region, host, path: '/findings', body, creds, contentType: 'application/json' })
      const r = await ctx.fetch(`https://${host}/findings`, { method: 'POST', headers, body })
      if (!r.ok) throw new Error(`Security Hub GetFindings ${r.status}`)
      const data = await r.json()
      for (const f of (data.Findings ?? []) as Finding[]) {
        total++
        const label = String(f?.Severity?.Label ?? '').toLowerCase()
        if (label in sev) sev[label]++
        const cs = f?.Compliance?.Status
        if (cs === 'PASSED') passed++
        else if (cs === 'FAILED') failed++
      }
      nextToken = data.NextToken
      if (!nextToken) break
    }
    const rate = passed + failed > 0 ? passed / (passed + failed) : 0
    const now = new Date().toISOString()

    const signals: RawSignal[] = [
      {
        sourceSystem: 'AWS Security Hub',
        kind: 'cspm_findings',
        value: {
          critical: sev.critical, high: sev.high, medium: sev.medium, low: sev.low,
          total_active: total, compliance_passed: passed, compliance_failed: failed,
          compliance_pass_rate: Number(rate.toFixed(4)),
        },
        collectedAt: now,
        freshnessSeconds: 12 * 3600,
      },
    ]
    return { signals, health: { ok: true, total_active: total, last_sync: now } }
  },
}

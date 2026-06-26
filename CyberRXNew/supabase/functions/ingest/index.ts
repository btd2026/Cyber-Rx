// CyberRx — ingestion orchestrator (Phase 8). Supabase Edge Function (Deno).
//
// The ONLY component that writes evidence. It authenticates the caller (an Admin
// of the tenant, or a scheduled cron with the shared CRON_SECRET), loads that
// tenant's connectors + their service-role-only secrets, runs each adapter
// READ-ONLY against the vendor API, and inserts normalized, content-hashed
// evidence. Per-connector outcome is recorded on the connector row and a single
// summary line is written to the signed audit_log.
//
// Deploy:  supabase functions deploy ingest
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, [CRON_SECRET]
//
// Request: Authorization: Bearer <admin jwt>  OR  X-Cron-Key: <CRON_SECRET>
//          { tenantId: string, connectorId?: string }   // omit connectorId = all
// Response: { ran: [{ connectorId, provider, ok, evidence, error? }] }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { adapterFor } from '../_shared/adapters/registry.ts'
import { toEvidenceRows } from '../_shared/ingest.ts'
import type { AdapterContext } from '../_shared/adapters/types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

// SSRF guard. Connector baseUrls are set by tenant Admins (trusted), but the
// orchestrator runs in our cloud, so we hard-block the classic metadata/link-local
// escalation targets that NO adapter ever needs. (Private RFC1918 / loopback are
// left reachable on purpose — customers point self-hosted tools at them.)
const BLOCKED_HOSTS = new Set(['169.254.169.254', 'metadata.google.internal', 'metadata', '[fd00:ec2::254]', 'fd00:ec2::254'])
function isBlockedUrl(input: unknown): boolean {
  try {
    const u = new URL(String(input))
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return true
    const host = u.hostname.toLowerCase()
    if (BLOCKED_HOSTS.has(host)) return true
    if (host.startsWith('169.254.')) return true // IPv4 link-local (incl. cloud metadata)
    if (host.startsWith('fe80:') || host.startsWith('[fe80:')) return true // IPv6 link-local
    return false
  } catch {
    return true // unparseable URL — refuse
  }
}

// A fetch with a hard timeout + SSRF guard, handed to adapters so a hung or
// malicious endpoint can't stall us or reach internal metadata.
function boundedFetch(ms = 20_000): typeof fetch {
  return ((input: any, init?: any) => {
    if (isBlockedUrl(typeof input === 'string' ? input : input?.url)) {
      return Promise.reject(new Error('blocked host (SSRF guard)'))
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t))
  }) as typeof fetch
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!SERVICE_ROLE_KEY) return json({ error: 'ingest not configured' }, 500)
  const { tenantId, connectorId } = await req.json().catch(() => ({}))
  if (typeof tenantId !== 'string' || !/^[0-9a-f-]{36}$/i.test(tenantId)) return json({ error: 'tenantId required' }, 400)

  // ── Authorize: scheduled cron OR an Admin of this tenant ────────────────────
  const cronKey = req.headers.get('X-Cron-Key') ?? ''
  const authz = req.headers.get('Authorization') ?? ''
  let authorized = !!CRON_SECRET && cronKey === CRON_SECRET
  if (!authorized) {
    if (!authz.startsWith('Bearer ')) return json({ error: 'authentication required' }, 401)
    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authz } } })
    const { data: u } = await asUser.auth.getUser()
    if (!u?.user) return json({ error: 'invalid session' }, 401)
    // RLS lets a user read their own memberships; require Admin for this tenant.
    const { data: m } = await asUser.from('memberships').select('role').eq('tenant_id', tenantId).eq('role', 'Admin')
    if (!m || m.length === 0) return json({ error: 'admin role required for this tenant' }, 403)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // ── Load connectors (optionally one) + their secrets ────────────────────────
  let q = admin.from('connectors').select('id, kind, provider, config').eq('tenant_id', tenantId)
  if (connectorId) q = q.eq('id', connectorId)
  const { data: connectors, error: cErr } = await q
  if (cErr) return json({ error: `load connectors: ${cErr.message}` }, 500)

  const fetchImpl = boundedFetch()
  const ran: any[] = []

  for (const c of connectors ?? []) {
    const adapter = c.provider ? adapterFor(c.provider) : undefined
    if (!adapter) { ran.push({ connectorId: c.id, provider: c.provider ?? null, ok: false, evidence: 0, error: 'no adapter / provider not set' }); continue }

    const { data: sec } = await admin.from('connector_secrets').select('secret').eq('connector_id', c.id).maybeSingle()
    if (!sec?.secret) { ran.push({ connectorId: c.id, provider: c.provider, ok: false, evidence: 0, error: 'no credentials configured' }); continue }

    try {
      const ctx: AdapterContext = { config: c.config ?? {}, secret: sec.secret as Record<string, string>, fetch: fetchImpl }
      const { signals, health } = await adapter.pull(ctx)
      const rows = await toEvidenceRows(tenantId, c.id, signals)
      if (rows.length) {
        const { error: insErr } = await admin.from('evidence').insert(rows)
        if (insErr) throw new Error(`evidence insert: ${insErr.message}`)
      }
      await admin.from('connectors').update({ status: 'healthy', last_sync_at: new Date().toISOString(), health: health ?? {} }).eq('id', c.id)
      await admin.from('audit_log').insert({ tenant_id: tenantId, action: 'ingest', object_type: 'connector', object_id: c.id, detail: { provider: c.provider, signals: rows.length } })
      ran.push({ connectorId: c.id, provider: c.provider, ok: true, evidence: rows.length })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'pull failed'
      await admin.from('connectors').update({ status: 'error', health: { error: msg } }).eq('id', c.id)
      await admin.from('audit_log').insert({ tenant_id: tenantId, action: 'ingest', object_type: 'connector', object_id: c.id, detail: { provider: c.provider, error: msg } })
      ran.push({ connectorId: c.id, provider: c.provider, ok: false, evidence: 0, error: msg })
    }
  }

  return json({ ran })
})

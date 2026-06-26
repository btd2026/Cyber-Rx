// CyberRx — store a connector's vendor credentials (Phase 8). Edge Function.
//
// connector_secrets has no client RLS policy, so the browser cannot write it
// directly. This function validates that the caller is an Admin of the tenant,
// then upserts the secret + the chosen provider/config with the service-role key.
// Secrets are write-only from the client's perspective: there is no read path.
//
// Deploy:  supabase functions deploy set-connector-secret
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Request: Authorization: Bearer <admin jwt>
//          { tenantId, connectorId, provider, secret: {..}, config?: {..} }
// Response: { ok: true } | { error }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!SERVICE_ROLE_KEY) return json({ error: 'not configured' }, 500)
  const authz = req.headers.get('Authorization') ?? ''
  if (!authz.startsWith('Bearer ')) return json({ error: 'authentication required' }, 401)

  const { tenantId, connectorId, provider, secret, config } = await req.json().catch(() => ({}))
  if (!tenantId || !connectorId || !provider || !secret || typeof secret !== 'object') {
    return json({ error: 'tenantId, connectorId, provider, secret required' }, 400)
  }
  const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)
  if (!isUuid(tenantId) || !isUuid(connectorId)) return json({ error: 'invalid tenantId/connectorId' }, 400)
  if (typeof provider !== 'string' || provider.length > 64) return json({ error: 'invalid provider' }, 400)

  // Verify the caller is an Admin of this tenant (RLS lets them read own memberships).
  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authz } } })
  const { data: u } = await asUser.auth.getUser()
  if (!u?.user) return json({ error: 'invalid session' }, 401)
  const { data: m } = await asUser.from('memberships').select('role').eq('tenant_id', tenantId).eq('role', 'Admin')
  if (!m || m.length === 0) return json({ error: 'admin role required' }, 403)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // Confirm the connector belongs to this tenant before touching it.
  const { data: conn } = await admin.from('connectors').select('id, config').eq('id', connectorId).eq('tenant_id', tenantId).maybeSingle()
  if (!conn) return json({ error: 'connector not found for tenant' }, 404)

  const { error: sErr } = await admin.from('connector_secrets').upsert({
    connector_id: connectorId, tenant_id: tenantId, provider, secret, updated_by: u.user.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'connector_id' })
  if (sErr) return json({ error: `secret upsert: ${sErr.message}` }, 500)

  const mergedConfig = { ...(conn.config ?? {}), ...(config && typeof config === 'object' ? config : {}) }
  await admin.from('connectors').update({ provider, config: mergedConfig, status: 'not_configured' }).eq('id', connectorId)

  return json({ ok: true })
})

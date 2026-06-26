// CyberRx — Tenant provisioning (server-side, Phase 7). Supabase Edge Function.
//
// Tenant + membership creation is PRIVILEGED: `tenants` and `memberships` have no
// client INSERT policy (RLS), so a browser cannot bootstrap an org. This function
// validates the caller's JWT, then uses the service-role key to create the tenant,
// grant the caller Admin + CISO membership, and write the onboarding rows — all
// tagged to the new tenant_id and the validated user. After this runs, the client
// is a member and can read/write its own tenant data under RLS normally.
//
// Deploy:  supabase functions deploy provision
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-set by
//          Supabase, except service-role which you set explicitly).
//
// Request:  Authorization: Bearer <user jwt>  +  { onboarding: OnboardingPayload }
// Response: { tenantId } | { error }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const str = (v: unknown) => (typeof v === 'string' ? v : '')
// Cap arrays so a caller can't drive an unbounded mass-insert via one provision call.
const MAX_ROWS = 200
const arr = (v: unknown) => (Array.isArray(v) ? v.slice(0, MAX_ROWS) : [])
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const authz = req.headers.get('Authorization') ?? ''
  if (!authz.startsWith('Bearer ')) return json({ error: 'authentication required' }, 401)
  if (!SERVICE_ROLE_KEY) return json({ error: 'provisioning not configured on the server' }, 500)

  // 1) Validate the caller's identity from their JWT (anon client + their token).
  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authz } } })
  const { data: u } = await asUser.auth.getUser()
  const userId = u?.user?.id
  if (!userId) return json({ error: 'invalid session' }, 401)

  const body = await req.json().catch(() => ({}))
  const ob = body?.onboarding ?? {}
  const org = ob.org ?? {}
  if (!str(org.name).trim()) return json({ error: 'organization name required' }, 400)

  // 2) Everything below runs as service_role (bypasses RLS) — but every row is
  //    pinned to the new tenant and the validated user; nothing trusts the client
  //    for identity.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // Anti-abuse: cap how many tenants one user can provision (each makes them an
  // Admin). Prevents a single account from mass-creating tenants.
  const MAX_TENANTS_PER_USER = 10
  const { count } = await admin.from('memberships').select('tenant_id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'Admin')
  if ((count ?? 0) >= MAX_TENANTS_PER_USER) return json({ error: 'tenant limit reached for this account' }, 429)

  // tenant
  const materialityM = num(org.materiality)
  const { data: tenant, error: tErr } = await admin
    .from('tenants')
    .insert({
      name: str(org.name).trim(),
      industry: str(org.industry) || null,
      ownership: str(org.ownership) || null,
      regions: arr(org.regions).map(str),
      regulated_data_types: arr(org.regulatedData).map(str),
      primary_currency: (str(org.currency) || 'USD').slice(0, 3),
      // entered in millions of the primary currency → store the absolute amount.
      materiality_threshold: materialityM == null ? null : materialityM * 1_000_000,
    })
    .select('id')
    .single()
  if (tErr || !tenant) return json({ error: `tenant insert failed: ${tErr?.message}` }, 500)
  const tenantId = tenant.id as string

  // memberships — caller is the Admin and (so the app has a default seat) CISO.
  const { error: mErr } = await admin.from('memberships').insert([
    { tenant_id: tenantId, user_id: userId, role: 'Admin' },
    { tenant_id: tenantId, user_id: userId, role: 'CISO' },
  ])
  if (mErr) return json({ error: `membership insert failed: ${mErr.message}` }, 500)

  // connectors (config metadata only — never secrets)
  const connectors = arr(ob.connectors)
    .map((c: any) => ({ tenant_id: tenantId, kind: str(c.kind), display_name: str(c.display_name) || str(c.kind) }))
    .filter((c) => c.kind)
  if (connectors.length) await admin.from('connectors').insert(connectors)

  // assumptions (owned exec values: insurance coverage, risk appetite)
  const assumptions = arr(ob.assumptions)
    .map((a: any) => ({
      tenant_id: tenantId, key: str(a.key), value: num(a.value) ?? 0,
      currency: a.currency ? str(a.currency).slice(0, 3) : null, unit: str(a.unit) || null,
      owner_user_id: userId, basis: str(a.basis) || null,
    }))
    .filter((a) => a.key)
  if (assumptions.length) await admin.from('assumptions').insert(assumptions)

  // org inventory (processes / applications, with crown-jewel flags)
  const processes = arr(ob.processes)
    .map((p: any) => ({ tenant_id: tenantId, name: str(p.name), business_value: str(p.business_value) || null, is_crown_jewel: !!p.is_crown_jewel }))
    .filter((p) => p.name.trim())
  if (processes.length) await admin.from('org_processes').insert(processes)

  const apps = arr(ob.apps)
    .map((a: any) => ({ tenant_id: tenantId, name: str(a.name), is_crown_jewel: !!a.is_crown_jewel }))
    .filter((a) => a.name.trim())
  if (apps.length) await admin.from('org_applications').insert(apps)

  // incident plan + 24/7 call tree
  const { data: plan } = await admin
    .from('incident_plan')
    .insert({ tenant_id: tenantId, document_path: str(ob.incidentPlan?.planDoc) || null })
    .select('id')
    .single()
  const contacts = arr(ob.incidentPlan?.contacts)
    .map((c: any) => ({
      tenant_id: tenantId, incident_plan_id: plan?.id ?? null,
      role: str(c.role), name: str(c.name), phone: str(c.phone), is_external: !!c.is_external,
    }))
    .filter((c) => c.role && c.name.trim())
  if (contacts.length) await admin.from('contacts').insert(contacts)

  return json({ tenantId })
})

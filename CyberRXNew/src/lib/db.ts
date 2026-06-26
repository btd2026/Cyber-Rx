// CyberRx — client persistence layer (Phase 7, production wiring).
//
// Every function here is a no-op that returns null/[] when Supabase isn't wired
// (`supabaseConfigured === false`), so demo mode runs unchanged on seed data +
// localStorage. With a backend wired, these read/write the real, RLS-protected,
// signed tables. Identity is never trusted from the client: writes rely on the
// caller's JWT, and tenant provisioning goes through a service-role Edge Function.

import { supabase, supabaseConfigured } from './supabase'
import type { SeatId } from '../seats/seats'
import type { OnboardingState } from '../onboarding/onboardingStore'
import { CONNECTORS } from '../onboarding/data'
import type { LedgerDecision, Ticket, RecordPayload } from '../ledger/LedgerProvider'

// ── role ↔ seat mapping ──────────────────────────────────────────────────────
export type AppRole = 'CEO' | 'CISO' | 'CFO' | 'CIO' | 'CLO' | 'CRO' | 'Board' | 'Admin'

const ROLE_TO_SEAT: Record<AppRole, SeatId> = {
  CEO: 'ceo', CISO: 'ciso', CFO: 'cfo', CIO: 'cio', CLO: 'clo', CRO: 'cro', Board: 'board',
  Admin: 'ciso', // Admin has no dashboard seat of its own — default to the CISO view.
}
const SEAT_TO_ROLE: Record<SeatId, AppRole> = {
  ceo: 'CEO', ciso: 'CISO', cfo: 'CFO', cio: 'CIO', clo: 'CLO', cro: 'CRO', board: 'Board',
}
export const roleToSeat = (r: AppRole): SeatId => ROLE_TO_SEAT[r] ?? 'ciso'
export const seatToRole = (s: SeatId): AppRole => SEAT_TO_ROLE[s]

// ── membership / tenant resolution ───────────────────────────────────────────
export type Membership = { tenantId: string; tenantName: string; role: AppRole }

/** The signed-in user's memberships (tenant + role), via RLS. [] in demo. */
export async function loadMemberships(): Promise<Membership[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('memberships')
    .select('tenant_id, role, tenants(name)')
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((m: { tenant_id: string; role: AppRole; tenants: { name: string } | { name: string }[] | null }) => ({
    tenantId: m.tenant_id,
    role: m.role,
    tenantName: Array.isArray(m.tenants) ? (m.tenants[0]?.name ?? '') : (m.tenants?.name ?? ''),
  }))
}

// ── go-live: provision a tenant from the onboarding state ─────────────────────
const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : '')

/** Shape the onboarding form into the provisioning payload (connected sources,
 *  owned assumptions, inventory, incident plan). */
function toProvisionPayload(s: OnboardingState) {
  const connectors = CONNECTORS.filter((c) => s.connectors[c.id]).map((c) => ({ kind: c.id, display_name: c.cat }))
  const assumptions = [
    s.assumptions.insurance.trim() && { key: 'cyber_insurance_coverage', value: Number(s.assumptions.insurance) * 1_000_000, currency: s.org.currency, unit: 'currency', basis: 'onboarding' },
    s.assumptions.appetite && { key: 'risk_appetite', value: { Low: 1, Moderate: 2, High: 3 }[s.assumptions.appetite] ?? 2, unit: 'ordinal', basis: 'onboarding' },
  ].filter(Boolean)
  const crown = new Set(s.crownJewels)
  const processes = s.processes.filter((p) => p.name.trim()).map((p) => ({ name: p.name, business_value: p.value, is_crown_jewel: crown.has(p.name) }))
  const apps = s.apps.filter((a) => a.name.trim()).map((a) => ({ name: a.name, is_crown_jewel: crown.has(a.name) }))
  return {
    org: { ...s.org, regulatedData: s.org.regulatedData },
    connectors, assumptions, processes, apps,
    incidentPlan: {
      planDoc: s.incidentPlan.planDoc,
      contacts: s.incidentPlan.contacts.filter((c) => c.name.trim()).map((c) => ({ ...c, is_external: /external|insurer|FBI|forensics/i.test(c.role) })),
    },
  }
}

export type ProvisionResult = { ok: true; tenantId: string } | { ok: false; error: string }

/** Create the tenant + membership + onboarding rows server-side. Returns a
 *  sentinel in demo so the caller can fall back to localStorage. */
export async function provisionTenant(s: OnboardingState): Promise<ProvisionResult | null> {
  if (!supabaseConfigured || !supabase || !FUNCTIONS_BASE) return null
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, error: 'You must be signed in to go live.' }
  try {
    const r = await fetch(`${FUNCTIONS_BASE}/provision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ onboarding: toProvisionPayload(s) }),
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, error: body?.error ?? `Provisioning failed (${r.status}).` }
    return { ok: true, tenantId: body.tenantId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error during provisioning.' }
  }
}

// ── connectors / ingestion ────────────────────────────────────────────────────
async function authedPost(path: string, body: unknown): Promise<{ ok: boolean; data: any }> {
  if (!supabaseConfigured || !supabase || !FUNCTIONS_BASE) return { ok: false, data: { error: 'backend not configured' } }
  const { data: sess } = await supabase.auth.getSession()
  const token = sess.session?.access_token
  if (!token) return { ok: false, data: { error: 'not signed in' } }
  try {
    const r = await fetch(`${FUNCTIONS_BASE}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    return { ok: r.ok, data: await r.json().catch(() => ({})) }
  } catch (e) {
    return { ok: false, data: { error: e instanceof Error ? e.message : 'network error' } }
  }
}

export type ConnectorRow = { id: string; kind: string; provider: string | null; display_name: string; status: string; last_sync_at: string | null; health: Record<string, unknown> }

export async function loadConnectors(tenantId: string): Promise<ConnectorRow[]> {
  if (!supabaseConfigured || !supabase || !tenantId) return []
  const { data } = await supabase.from('connectors').select('id, kind, provider, display_name, status, last_sync_at, health').eq('tenant_id', tenantId)
  return (data as ConnectorRow[]) ?? []
}

/** Store vendor credentials for a connector (admin only; write-only via Edge Fn). */
export async function setConnectorSecret(
  tenantId: string, connectorId: string, provider: string, secret: Record<string, string>, config?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const { ok, data } = await authedPost('set-connector-secret', { tenantId, connectorId, provider, secret, config })
  return ok ? { ok: true } : { ok: false, error: data?.error ?? 'failed' }
}

/** Trigger a read-only ingestion run (one connector, or all for the tenant). */
export async function runIngest(tenantId: string, connectorId?: string): Promise<{ ok: boolean; ran?: any[]; error?: string }> {
  const { ok, data } = await authedPost('ingest', { tenantId, connectorId })
  return ok ? { ok: true, ran: data?.ran } : { ok: false, error: data?.error ?? 'failed' }
}

/** Read pulled evidence for the tenant (RLS-scoped), optionally by kind. */
export async function loadEvidence(tenantId: string, kind?: string): Promise<any[]> {
  if (!supabaseConfigured || !supabase || !tenantId) return []
  let q = supabase.from('evidence').select('source_system, kind, value, collected_at, freshness_seconds, content_hash').eq('tenant_id', tenantId).order('collected_at', { ascending: false }).limit(200)
  if (kind) q = q.eq('kind', kind)
  const { data } = await q
  return data ?? []
}

export type ControlStatusEntry = { controlId: string; cmmi: number; status: string; confidence: number; citation: unknown }

/** Record the engine's computed maturity per control (proposed_by='engine', with
 *  an evidence citation). Resolves CSF control ids → controls.id; RLS requires the
 *  caller be CISO/Admin. Best-effort: no-ops if catalogs aren't loaded. */
export async function persistControlStatus(tenantId: string, frameworkKey: string, entries: ControlStatusEntry[]): Promise<void> {
  if (!supabaseConfigured || !supabase || !tenantId || entries.length === 0) return
  const { data: fw } = await supabase.from('frameworks').select('id').eq('key', frameworkKey).maybeSingle()
  if (!fw) return
  const { data: ctrls } = await supabase.from('controls').select('id, control_id').eq('framework_id', fw.id).in('control_id', entries.map((e) => e.controlId))
  if (!ctrls?.length) return
  const byCid = new Map((ctrls as { id: string; control_id: string }[]).map((c) => [c.control_id, c.id]))
  const rows = entries.filter((e) => byCid.has(e.controlId)).map((e) => ({
    tenant_id: tenantId, control_id: byCid.get(e.controlId), cmmi_maturity: e.cmmi, status: e.status,
    confidence: e.confidence, proposed_by: 'engine', citation: e.citation, analyst_review_state: 'unreviewed',
    updated_at: new Date().toISOString(),
  }))
  if (rows.length) await supabase.from('control_status').upsert(rows, { onConflict: 'tenant_id,control_id' })
}

// ── decisions (signed, append-only ledger) ───────────────────────────────────
type DecisionRow = {
  id: string; seat: string; title: string; rationale: string | null
  chosen_option: { name?: string; cost?: string; riskRemoved?: string } | null
  evidence_snapshot: LedgerDecision['evidenceSnapshot']
  prev_hash: string | null; row_hash: string | null; recorded_at: string
}

const rowToDecision = (r: DecisionRow, owner: string): LedgerDecision => ({
  id: r.id, seat: r.seat, title: r.title, owner,
  optionName: r.chosen_option?.name ?? '', cost: r.chosen_option?.cost ?? '',
  riskRemoved: r.chosen_option?.riskRemoved ?? '', rationale: r.rationale ?? '',
  evidenceSnapshot: r.evidence_snapshot, recordedAt: r.recorded_at,
  prevHash: r.prev_hash ?? '', rowHash: r.row_hash ?? '',
})

/** Load the tenant's decision ledger (newest-first preserved by caller). [] in demo. */
export async function loadDecisions(tenantId: string, owner: string): Promise<LedgerDecision[]> {
  if (!supabaseConfigured || !supabase || !tenantId) return []
  const { data, error } = await supabase
    .from('decisions')
    .select('id, seat, title, rationale, chosen_option, evidence_snapshot, prev_hash, row_hash, recorded_at')
    .eq('tenant_id', tenantId)
    .order('recorded_at', { ascending: true })
  if (error || !data) return []
  return (data as DecisionRow[]).map((r) => rowToDecision(r, owner))
}

/** Insert a decision; the DB trigger computes the hash chain. Returns the signed
 *  row, or null in demo (caller signs client-side). */
export async function insertDecision(
  tenantId: string, seat: AppRole, ownerUserId: string, owner: string, p: RecordPayload, rationale: string,
): Promise<LedgerDecision | null> {
  if (!supabaseConfigured || !supabase || !tenantId) return null
  const { data, error } = await supabase
    .from('decisions')
    .insert({
      tenant_id: tenantId, seat, title: p.title, owner_user_id: ownerUserId, rationale,
      chosen_option: { name: p.optionName, cost: p.cost, riskRemoved: p.riskRemoved },
      evidence_snapshot: p.evidenceSnapshot,
    })
    .select('id, seat, title, rationale, chosen_option, evidence_snapshot, prev_hash, row_hash, recorded_at')
    .single()
  if (error || !data) return null
  return rowToDecision(data as DecisionRow, owner)
}

// ── tickets ──────────────────────────────────────────────────────────────────
type TicketRow = { id: string; decision_id: string | null; external_system: string; external_id: string | null; title: string; status: string | null; due_date: string | null; created_at: string }
const rowToTicket = (r: TicketRow): Ticket => ({
  id: r.id, decisionId: r.decision_id ?? '', system: r.external_system, externalId: r.external_id ?? '',
  title: r.title, status: r.status ?? 'Open', dueDate: r.due_date ?? '', createdAt: r.created_at,
})

export async function loadTickets(tenantId: string): Promise<Ticket[]> {
  if (!supabaseConfigured || !supabase || !tenantId) return []
  const { data, error } = await supabase
    .from('tickets')
    .select('id, decision_id, external_system, external_id, title, status, due_date, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as TicketRow[]).map(rowToTicket)
}

export async function insertTicket(
  tenantId: string, decisionId: string, system: string, externalId: string, title: string, status: string, dueDate: string,
): Promise<Ticket | null> {
  if (!supabaseConfigured || !supabase || !tenantId) return null
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      tenant_id: tenantId, decision_id: decisionId || null, external_system: system,
      external_id: externalId || null, title, status, due_date: dueDate || null,
    })
    .select('id, decision_id, external_system, external_id, title, status, due_date, created_at')
    .single()
  if (error || !data) return null
  return rowToTicket(data as TicketRow)
}

export async function updateTicketStatus(tenantId: string, id: string, status: string): Promise<void> {
  if (!supabaseConfigured || !supabase || !tenantId) return
  await supabase.from('tickets').update({ status }).eq('id', id).eq('tenant_id', tenantId)
}

// ── document uploads (Storage + signed metadata row) ─────────────────────────
async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type UploadedDoc = { id: string; filename: string; storagePath: string; contentHash: string }

/** Upload a file to tenant-scoped Storage and register its signed metadata.
 *  Returns null in demo (caller keeps the filename locally). */
export async function uploadDocument(tenantId: string, file: File, kind: string): Promise<UploadedDoc | null> {
  if (!supabaseConfigured || !supabase || !tenantId) return null
  const bytes = await file.arrayBuffer()
  const contentHash = await sha256Hex(bytes)
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const storagePath = `${tenantId}/${contentHash.slice(0, 12)}-${safe}`
  const up = await supabase.storage.from('documents').upload(storagePath, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (up.error && !/exists/i.test(up.error.message)) return null
  const { data, error } = await supabase
    .from('documents')
    .insert({
      tenant_id: tenantId, filename: file.name, storage_path: storagePath, bucket: 'documents',
      content_hash: contentHash, file_size_bytes: file.size, mime_type: file.type || null, kind,
    })
    .select('id')
    .single()
  if (error || !data) return null
  return { id: data.id, filename: file.name, storagePath, contentHash }
}

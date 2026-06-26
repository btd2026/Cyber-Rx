import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import LedgerDrawer from './LedgerDrawer'
import RecordModal from './RecordModal'
import TicketModal from './TicketModal'
import { nextStatus } from '../engine/ticketSync'
import { useTenant } from '../app/TenantProvider'
import { useAuth } from '../auth/AuthProvider'
import { insertDecision, loadDecisions, insertTicket, loadTickets, updateTicketStatus } from '../lib/db'

// ── Types ──────────────────────────────────────────────────────────────────
export type EvidenceSnapshot = {
  situation: string
  option: string
  cost: string
  riskRemoved: string
}

export type LedgerDecision = {
  id: string
  seat: string
  title: string
  owner: string
  optionName: string
  cost: string
  riskRemoved: string
  rationale: string
  evidenceSnapshot: EvidenceSnapshot
  recordedAt: string
  prevHash: string
  rowHash: string
}

export type Ticket = {
  id: string
  decisionId: string
  system: string
  externalId: string
  title: string
  status: string
  dueDate: string
  createdAt: string
}

export type RecordPayload = {
  title: string
  optionName: string
  cost: string
  riskRemoved: string
  evidenceSnapshot: EvidenceSnapshot
}

export type TicketPayload = { decisionId: string; title: string }

type LedgerCtx = {
  decisions: LedgerDecision[]
  tickets: Ticket[]
  ledgerOpen: boolean
  openLedger: () => void
  closeLedger: () => void
  openRecord: (p: RecordPayload) => void
  openTicketModal: (p: TicketPayload) => void
  ticketsFor: (decisionId: string) => Ticket[]
  advanceTicket: (id: string) => void
}

const Ctx = createContext<LedgerCtx | null>(null)
// eslint-disable-next-line react-refresh/only-export-components
export const useLedger = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLedger must be used within LedgerProvider')
  return v
}

// ── Signing: SHA-256 hash chain, mirroring the Phase 1 server-side trigger ──
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const KEY = 'cyberrx-ledger-v1'

function load(): { decisions: LedgerDecision[]; tickets: Ticket[] } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { decisions: [], tickets: [] }
}

export function LedgerProvider({ owner, children }: { owner: string; children: ReactNode }) {
  const { demo, activeTenantId, role } = useTenant()
  const { session } = useAuth()
  const seatRole = role ?? 'CISO'
  const ownerUserId = session?.user.id ?? ''

  const [decisions, setDecisions] = useState<LedgerDecision[]>(() => (demo ? load().decisions : []))
  const [tickets, setTickets] = useState<Ticket[]>(() => (demo ? load().tickets : []))
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [pendingRecord, setPendingRecord] = useState<RecordPayload | null>(null)
  const [pendingTicket, setPendingTicket] = useState<TicketPayload | null>(null)

  // Demo: mirror to localStorage (offline-first). Live: the DB is the source of
  // truth — never cache another tenant's ledger in this browser.
  useEffect(() => {
    if (demo) localStorage.setItem(KEY, JSON.stringify({ decisions, tickets }))
  }, [demo, decisions, tickets])

  // Live: load the tenant's signed ledger + tickets from the DB (RLS-scoped).
  useEffect(() => {
    if (demo || !activeTenantId) return
    let alive = true
    Promise.all([loadDecisions(activeTenantId, owner), loadTickets(activeTenantId)]).then(([ds, ts]) => {
      if (!alive) return
      setDecisions(ds)
      setTickets(ts)
    })
    return () => { alive = false }
  }, [demo, activeTenantId, owner])

  // Append-only: there is intentionally no update or delete here.
  async function recordDecision(p: RecordPayload, rationale: string) {
    // Live: the DB trigger signs + hash-chains the row; trust the returned row.
    if (!demo && activeTenantId && ownerUserId) {
      const row = await insertDecision(activeTenantId, seatRole, ownerUserId, owner, p, rationale)
      if (row) {
        setDecisions((d) => [...d, row])
        setPendingRecord(null)
        setLedgerOpen(true)
        return
      }
      // Insert failed: don't fabricate a "recorded" decision — surface the failure.
      setPendingRecord(null)
      alert('Could not record this decision to the ledger. Please retry.')
      return
    }
    // Demo: compute the signature client-side, mirroring the server trigger.
    const prevHash = decisions.length ? decisions[decisions.length - 1].rowHash : ''
    const recordedAt = new Date().toISOString()
    const id = crypto.randomUUID()
    const canonical =
      prevHash + seatRole + p.title + p.optionName + JSON.stringify(p.evidenceSnapshot) + recordedAt
    const rowHash = await sha256Hex(canonical)
    setDecisions((d) => [
      ...d,
      {
        id, seat: seatRole, title: p.title, owner, optionName: p.optionName, cost: p.cost,
        riskRemoved: p.riskRemoved, rationale, evidenceSnapshot: p.evidenceSnapshot,
        recordedAt, prevHash, rowHash,
      },
    ])
    setPendingRecord(null)
    setLedgerOpen(true)
  }

  async function createTicket(p: TicketPayload, system: string, dueDate: string) {
    const seq = tickets.length + 1
    const prefix = system.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'TKT'
    const externalId = `${prefix}-${1000 + seq}`
    if (!demo && activeTenantId) {
      const row = await insertTicket(activeTenantId, p.decisionId, system, externalId, p.title, 'Open', dueDate)
      if (row) setTickets((t) => [...t, row])
      setPendingTicket(null)
      return
    }
    setTickets((t) => [
      ...t,
      {
        id: crypto.randomUUID(), decisionId: p.decisionId, system,
        externalId, title: p.title, status: 'Open',
        dueDate, createdAt: new Date().toISOString(),
      },
    ])
    setPendingTicket(null)
  }

  function advanceTicket(id: string) {
    setTickets((ts) => {
      const next = ts.map((t) => (t.id === id ? { ...t, status: nextStatus(t.status) } : t))
      if (!demo && activeTenantId) {
        const moved = next.find((t) => t.id === id)
        if (moved) void updateTicketStatus(activeTenantId, id, moved.status)
      }
      return next
    })
  }

  const value: LedgerCtx = {
    decisions, tickets, ledgerOpen,
    openLedger: () => setLedgerOpen(true),
    closeLedger: () => setLedgerOpen(false),
    openRecord: (p) => setPendingRecord(p),
    openTicketModal: (p) => setPendingTicket(p),
    ticketsFor: (decisionId) => tickets.filter((t) => t.decisionId === decisionId),
    advanceTicket,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <LedgerDrawer />
      {pendingRecord && (
        <RecordModal
          payload={pendingRecord}
          onCancel={() => setPendingRecord(null)}
          onConfirm={(rationale) => recordDecision(pendingRecord, rationale)}
        />
      )}
      {pendingTicket && (
        <TicketModal
          payload={pendingTicket}
          onCancel={() => setPendingTicket(null)}
          onConfirm={(system, dueDate) => createTicket(pendingTicket, system, dueDate)}
        />
      )}
    </Ctx.Provider>
  )
}

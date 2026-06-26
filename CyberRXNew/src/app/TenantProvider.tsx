import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabaseConfigured } from '../lib/supabase'
import { loadMemberships, roleToSeat, type AppRole, type Membership } from '../lib/db'
import { SEATS, type SeatId } from '../seats/seats'

// Resolves the signed-in user's tenant + role from `memberships` (RLS-backed) and
// makes it available app-wide. In demo (no backend) it returns stable seed values
// so the cockpit renders on seed data exactly as before.

type TenantContextValue = {
  loading: boolean
  demo: boolean
  activeTenantId: string
  tenantName: string
  role: AppRole | null
  ownSeat: SeatId
  /** Seats this user may switch into ("View as"). All seats in demo. */
  availableSeats: SeatId[]
  memberships: Membership[]
  setActiveTenant: (tenantId: string) => void
}

const ACTIVE_KEY = 'cyberrx-active-tenant'

const TenantContext = createContext<TenantContextValue>({
  loading: false, demo: true, activeTenantId: '', tenantName: '', role: null,
  ownSeat: 'ciso', availableSeats: SEATS.map((s) => s.id), memberships: [], setActiveTenant: () => {},
})

// eslint-disable-next-line react-refresh/only-export-components
export const useTenant = () => useContext(TenantContext)

// Among the roles a user holds in a tenant, the one whose cockpit they "own".
// Prefer a real dashboard seat over Admin (which has no seat of its own).
function primaryRole(roles: AppRole[]): AppRole | null {
  if (!roles.length) return null
  return roles.find((r) => r !== 'Admin') ?? roles[0]
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const demo = !supabaseConfigured
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [activeTenantId, setActiveTenantId] = useState<string>(() => localStorage.getItem(ACTIVE_KEY) ?? '')
  const [loading, setLoading] = useState(!demo)

  useEffect(() => {
    if (demo || !session) {
      setMemberships([])
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    loadMemberships().then((ms) => {
      if (!alive) return
      setMemberships(ms)
      setActiveTenantId((cur) => (cur && ms.some((m) => m.tenantId === cur) ? cur : ms[0]?.tenantId ?? ''))
      setLoading(false)
    })
    return () => { alive = false }
  }, [demo, session])

  const setActiveTenant = (tenantId: string) => {
    setActiveTenantId(tenantId)
    localStorage.setItem(ACTIVE_KEY, tenantId)
  }

  const value = useMemo<TenantContextValue>(() => {
    if (demo) {
      return {
        loading: false, demo: true, activeTenantId: '', tenantName: '', role: null,
        ownSeat: 'ciso', availableSeats: SEATS.map((s) => s.id), memberships: [], setActiveTenant,
      }
    }
    const here = memberships.filter((m) => m.tenantId === activeTenantId)
    const roles = here.map((m) => m.role)
    const role = primaryRole(roles)
    const seats = new Set<SeatId>(roles.map(roleToSeat))
    return {
      loading, demo: false, activeTenantId,
      tenantName: here[0]?.tenantName ?? '',
      role, ownSeat: role ? roleToSeat(role) : 'ciso',
      availableSeats: seats.size ? [...seats] : ['ciso'],
      memberships, setActiveTenant,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, loading, memberships, activeTenantId])

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

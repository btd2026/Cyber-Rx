import { useAuth } from '../auth/AuthProvider'
import { useTenant } from './TenantProvider'
import { seatById, type SeatId } from '../seats/seats'

export type CurrentUser = {
  /** True when no Supabase backend is wired — the app runs on seed data. */
  demo: boolean
  /** The seat this user owns (and may edit). Others are view-only. */
  ownSeat: SeatId
  /** Seats this user may switch into ("View as"). All seats in demo. */
  availableSeats: SeatId[]
  /** The active tenant (empty in demo). Used to scope every read/write. */
  tenantId: string
  name: string
  email: string
}

// In demo (no backend) the signed-in executive is the CISO (Sarah Chen), matching
// the mock. With Supabase wired, seat/role/tenant come from the user's membership
// (resolved in TenantProvider); RBAC is ultimately enforced server-side by RLS.
export function useCurrentUser(): CurrentUser {
  const { session } = useAuth()
  const t = useTenant()
  const email = session?.user.email ?? 'sarah.chen@meridian.health'
  const metaName = (session?.user.user_metadata?.full_name as string | undefined) || ''
  const name = t.demo ? 'Sarah' : metaName || email.split('@')[0] || 'Member'
  return {
    demo: t.demo,
    ownSeat: t.ownSeat,
    availableSeats: t.availableSeats,
    tenantId: t.activeTenantId,
    name,
    email,
  }
}

export { seatById }

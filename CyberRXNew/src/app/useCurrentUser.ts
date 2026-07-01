import { useAuth } from '../auth/AuthProvider'
import { supabaseConfigured } from '../lib/supabase'
import type { SeatId } from '../seats/seats'

export type CurrentUser = {
  /** True when no Supabase backend is wired — the app runs on seed data. */
  demo: boolean
  /** The seat this user owns (and may edit). Others are view-only. */
  ownSeat: SeatId
  name: string
  email: string
}

// Phase 2 seed: the signed-in executive is the CISO (Sarah Chen), matching the
// mock. The real seat/role will come from the user's tenant membership (Phase 1
// schema) once onboarding is wired. RBAC is ultimately enforced server-side by
// Row-Level Security — the view-only UI is a presentational mirror of that.
export function useCurrentUser(): CurrentUser {
  const { session } = useAuth()
  const demo = !supabaseConfigured
  return {
    demo,
    ownSeat: 'ciso',
    name: 'Sarah',
    email: session?.user.email ?? 'sarah.chen@cyberrx.demo',
  }
}

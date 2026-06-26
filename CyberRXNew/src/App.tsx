import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Login from './pages/Login'
import Shell from './app/Shell'
import Onboarding from './onboarding/Onboarding'
import { useAuth } from './auth/AuthProvider'
import { supabaseConfigured } from './lib/supabase'

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="screen-center">Loading…</div>
  if (!session) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { session, loading } = useAuth()

  // Demo mode: with no Supabase backend wired, there is no real data to protect,
  // so the shell is viewable on seed data (clearly flagged). When a backend IS
  // configured, real auth + RLS apply and demo bypass is impossible.
  if (!supabaseConfigured) {
    // Demo flow still shows the full journey — Login → Onboarding → Cockpit —
    // on seed data (no real auth, clearly flagged), so the experience is visible
    // end to end. Login's demo button routes into onboarding (or straight to the
    // cockpit once onboarding is completed).
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/cockpit" element={<Shell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  if (loading) return <div className="screen-center">Loading…</div>

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/app" element={<Protected><Shell /></Protected>} />
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

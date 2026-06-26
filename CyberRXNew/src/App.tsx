import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Login from './pages/Login'
import Shell from './app/Shell'
import Onboarding from './onboarding/Onboarding'
import { useAuth } from './auth/AuthProvider'
import { TenantProvider } from './app/TenantProvider'
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
    return (
      <TenantProvider>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Shell />} />
        </Routes>
      </TenantProvider>
    )
  }

  if (loading) return <div className="screen-center">Loading…</div>

  return (
    <TenantProvider>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/app" replace /> : <Login />} />
        <Route path="/app" element={<Protected><Shell /></Protected>} />
        <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TenantProvider>
  )
}

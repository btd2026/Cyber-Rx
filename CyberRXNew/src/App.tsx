import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { useAuth } from './auth/AuthProvider'

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="screen-center">Loading…</div>
  if (!session) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { session, loading } = useAuth()
  if (loading) return <div className="screen-center">Loading…</div>
  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/app" replace /> : <Login />} />
      <Route
        path="/app"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

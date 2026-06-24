import { useAuth } from '../auth/AuthProvider'

export default function Dashboard() {
  const { session, signOut } = useAuth()
  const email = session?.user.email ?? 'executive'

  return (
    <div className="shell">
      <header className="topbar">
        <div className="lbrand">
          <span className="mk">C</span>
          <span className="nm">
            Cyber<b>Rx</b>
          </span>
        </div>
        <div className="topbar-right">
          <span className="who">{email}</span>
          <button className="btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="placeholder">
        <div className="badge">Phase 1.5 · Live preview</div>
        <h1>You're signed in.</h1>
        <p>
          Authentication, MFA, and tenant-isolated data are live. The executive
          seats — the CISO situation room first — are built next in Phase 2.
        </p>
        <div className="phase-list">
          <div className="phase done">✓ Phase 1 — Foundation (schema, RLS, signed ledger)</div>
          <div className="phase done">✓ Phase 1.5 — Live preview &amp; sign-in</div>
          <div className="phase next">→ Phase 2 — Executive shell + CISO seat</div>
        </div>
      </main>
    </div>
  )
}

import { CISO_TABS } from './seats'

// Phase 2a: the shell + navigation are real; each view is a scaffold. Phase 2b
// fills the exec summary band, the five questions, Framework Posture, My
// Liability, and the drill-to-evidence drawer (all on flagged seed data).
export default function CisoSeat({ tab, canEdit }: { tab: string; canEdit: boolean }) {
  const current = CISO_TABS.find((t) => t.id === tab) ?? CISO_TABS[0]

  return (
    <div className="seat">
      <span className="eyebrow">CISO · Operating system{canEdit ? '' : ' · view only'}</span>
      <div className="panel">
        <h2>{current.label}</h2>
        {tab === 'exec' ? (
          <p>
            This is the CISO situation room. The executive summary band, the five
            questions, Framework Posture, and My Liability — each backed by the
            drill-to-evidence drawer — are built next in sub-step 2b.
          </p>
        ) : (
          <p>
            The <b>{current.label}</b> view is wired into the navigation. Its full
            content (with drill-to-evidence) arrives in sub-step 2b.
          </p>
        )}
        <span className="soon">Builds in Phase 2b</span>

        <div className="phase-list">
          <div className="phase done">✓ 2a — Shell, seat switcher, theme, view-only RBAC</div>
          <div className="phase next">→ 2b — The five questions + drill-to-evidence</div>
          <div className="phase">2c — Decision ledger + ticketing UI</div>
        </div>
      </div>
    </div>
  )
}

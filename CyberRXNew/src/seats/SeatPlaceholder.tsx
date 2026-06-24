import type { Seat } from './seats'

// The other six seats (CEO/CFO/CIO/CLO/CRO/Board) are generalized from the CISO
// reference in Phase 2B, after the CISO seat is approved.
export default function SeatPlaceholder({ seat }: { seat: Seat }) {
  return (
    <div className="seat">
      <span className="eyebrow">{seat.label} · {seat.name}</span>
      <div className="panel">
        <h2>The {seat.label} seat</h2>
        <p>
          CyberRx is built CISO-first as the reference depth. Once the CISO seat
          is approved, the {seat.label} seat is generalized from the same patterns
          — its core questions, evidence answer-grid, and costed decisions.
        </p>
        <span className="soon">Builds in Phase 2B</span>
      </div>
    </div>
  )
}

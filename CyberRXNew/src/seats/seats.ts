export type SeatId = 'ceo' | 'ciso' | 'cfo' | 'cio' | 'clo' | 'cro' | 'board'

export type Seat = { id: SeatId; label: string; name: string }

// Seat roster + seed names, matching the approved mock's executive cast.
export const SEATS: Seat[] = [
  { id: 'ceo', label: 'CEO', name: 'Marcus' },
  { id: 'ciso', label: 'CISO', name: 'Sarah' },
  { id: 'cfo', label: 'CFO', name: 'Diane' },
  { id: 'cio', label: 'CIO', name: 'Raj' },
  { id: 'clo', label: 'CLO', name: 'Patricia' },
  { id: 'cro', label: 'CRO', name: 'Sloan' },
  { id: 'board', label: 'Board', name: 'Chair' },
]

export type Tab = { id: string; label: string; mark: string; home?: boolean }

// The CISO seat's tabs: exec summary, the five questions, posture, liability.
export const CISO_TABS: Tab[] = [
  { id: 'exec', label: 'Exec Summary', mark: '⌂', home: true },
  { id: 'q1', label: 'Threat & Compromise', mark: '1' },
  { id: 'q2', label: 'Operational Safety', mark: '2' },
  { id: 'q3', label: 'Material Exposure', mark: '3' },
  { id: 'q4', label: 'Decisions', mark: '4' },
  { id: 'q5', label: 'Trajectory', mark: '5' },
  { id: 'qF', label: 'Framework Posture', mark: '▦' },
  { id: 'qL', label: 'My Liability', mark: '⚖' },
  { id: 'qCJ', label: 'Crown Jewels', mark: '◆' },
]

export const seatById = (id: SeatId): Seat => SEATS.find((s) => s.id === id) ?? SEATS[1]

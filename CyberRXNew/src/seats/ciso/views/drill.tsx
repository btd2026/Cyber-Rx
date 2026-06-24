import type { ReactNode } from 'react'
import { useEvidence } from '../EvidenceDrawer'

export type Tone = 'ok' | 'warn' | 'crit'

/** A drillable status row (label + status) that opens the evidence drawer. */
export function StatRow({
  ev,
  name,
  sub,
  stat,
  tone,
}: {
  ev?: string
  name: string
  sub?: string
  stat: string
  tone: Tone
}) {
  const { open } = useEvidence()
  return (
    <div
      className={`srow${ev ? ' drill' : ''}`}
      onClick={ev ? () => open(ev) : undefined}
      role={ev ? 'button' : undefined}
    >
      <div className="nm">
        {name}
        {sub && <small>{sub}</small>}
      </div>
      <span className={`stat ${tone}`}>{stat}</span>
    </div>
  )
}

/** A drillable table row that opens the evidence drawer. */
export function DrillTr({ ev, children }: { ev?: string; children: ReactNode }) {
  const { open } = useEvidence()
  return (
    <tr className={ev ? 'drill' : undefined} onClick={ev ? () => open(ev) : undefined}>
      {children}
    </tr>
  )
}

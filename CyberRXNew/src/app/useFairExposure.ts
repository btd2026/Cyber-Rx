import { useEffect, useState } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { useLivePosture } from './useLivePosture'
import { loadAssumptions } from '../lib/db'
import { computeFair, DEFAULT_FAIR_ASSUMPTIONS, type FairResult } from '../engine/fair'

// Combines evidence-computed maturity (pulled) with the tenant's owned assumptions
// into a FAIR exposure. Returns null in demo / before live data, so callers
// self-hide. Insurance + currency come from the tenant; the magnitude/frequency
// assumptions default to the industry baseline (owned, editable) until captured.

export function useFairExposure(): FairResult | null {
  const { tenantId, demo } = useCurrentUser()
  const { live, data } = useLivePosture()
  const [assumptions, setAssumptions] = useState<Record<string, number>>({})

  useEffect(() => {
    if (demo || !tenantId) return
    let alive = true
    loadAssumptions(tenantId).then((a) => { if (alive) setAssumptions(a) })
    return () => { alive = false }
  }, [demo, tenantId])

  if (!live || !data) return null

  const cmmi = (key: string) => data.functions.find((f) => f.key === key)?.cmmi ?? 0
  return computeFair(
    {
      currency: 'USD',
      insuranceCoverage: assumptions.cyber_insurance_coverage ?? 0,
      ...DEFAULT_FAIR_ASSUMPTIONS,
    },
    { protect: cmmi('PR'), identify: cmmi('ID'), detect: cmmi('DE'), recover: cmmi('RC') },
  )
}

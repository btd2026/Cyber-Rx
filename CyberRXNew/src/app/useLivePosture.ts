import { useEffect, useState } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { loadEvidence } from '../lib/db'
import { mapEvidenceToControls, type EvidenceRow } from '../engine/controlMap'
import { computeLivePosture, type LivePosture } from '../engine/posture'
import { CSF } from '../seats/ciso/csf'

// Cross-seat live posture: pulls the tenant's evidence once, maps it to CSF
// controls, and computes per-function + overall CMMI from real, graded data.
// Returns null in demo / before a tenant resolves, so callers self-hide.

export type LivePostureSummary = LivePosture & {
  evidenceCount: number
  /** Age of the freshest evidence row, in hours (null if none). */
  freshestHours: number | null
}

export function useLivePosture(): { loading: boolean; live: boolean; data: LivePostureSummary | null } {
  const { tenantId, demo } = useCurrentUser()
  const [state, setState] = useState<{ loading: boolean; data: LivePostureSummary | null }>({
    loading: !demo && !!tenantId,
    data: null,
  })

  useEffect(() => {
    if (demo || !tenantId) { setState({ loading: false, data: null }); return }
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    loadEvidence(tenantId).then((rows) => {
      if (!alive) return
      const now = Date.now()
      const evMap = mapEvidenceToControls(rows as EvidenceRow[], now)
      const posture = computeLivePosture(CSF, evMap)
      const ages = (rows as { collected_at: string }[]).map((r) => Math.max(0, (now - Date.parse(r.collected_at)) / 3_600_000))
      setState({ loading: false, data: { ...posture, evidenceCount: rows.length, freshestHours: ages.length ? Math.min(...ages) : null } })
    })
    return () => { alive = false }
  }, [demo, tenantId])

  return { loading: state.loading, live: !!state.data && state.data.liveControls > 0, data: state.data }
}

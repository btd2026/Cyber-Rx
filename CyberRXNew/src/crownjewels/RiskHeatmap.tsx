import { useMemo } from 'react'
import type { GraphModel } from './types'

const SEV_ORDER = ['Critical', 'High', 'Medium', 'Low']
const SEV_COLOR: Record<string, string> = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#ca8a04',
  Low: '#16a34a',
}

export default function RiskHeatmap({ graph }: { graph: GraphModel }) {
  const { cells, assetLabels } = useMemo(() => {
    const assets = graph.nodes.filter((n) => n.type === 'asset')
    const risks = graph.nodes.filter((n) => n.type === 'risk')
    const riskEdges = graph.edges.filter((e) => e.type === 'threatens')

    const riskMap = new Map(risks.map((r) => [r.id, r]))

    const assetCells: Record<string, { riskId: string; label: string; severity: string; confidence: number }[]> = {}
    for (const a of assets) assetCells[a.id] = []

    for (const e of riskEdges) {
      const risk = riskMap.get(e.source)
      if (!risk || !assetCells[e.target]) continue
      assetCells[e.target].push({
        riskId: risk.id,
        label: risk.label,
        severity: String(risk.attrs.severity || 'Medium'),
        confidence: e.confidence,
      })
    }

    // Sort assets: crown jewels first, then by number of risks
    const sorted = [...assets].sort((a, b) => {
      const ta = a.attrs.crown_jewel_tier === 'tier1' ? 0 : a.attrs.crown_jewel_tier === 'tier2' ? 1 : 2
      const tb = b.attrs.crown_jewel_tier === 'tier1' ? 0 : b.attrs.crown_jewel_tier === 'tier2' ? 1 : 2
      if (ta !== tb) return ta - tb
      return (assetCells[b.id]?.length || 0) - (assetCells[a.id]?.length || 0)
    })

    return {
      cells: assetCells,
      assetLabels: sorted,
    }
  }, [graph])

  if (assetLabels.length === 0) {
    return <div className="panel" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No risk data available.</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {assetLabels.map((asset) => {
          const risks = cells[asset.id] || []
          const tier = String(asset.attrs.crown_jewel_tier || 'none')
          const isCrown = tier === 'tier1' || tier === 'tier2'

          return (
            <div
              key={asset.id}
              className="panel"
              style={{
                flex: '1 1 240px',
                maxWidth: '320px',
                padding: '12px',
                border: isCrown ? `2px solid ${tier === 'tier1' ? '#dc2626' : '#ea580c'}` : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{asset.label}</span>
                {isCrown && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: tier === 'tier1' ? '#7f1d1d' : '#7c2d12', color: tier === 'tier1' ? '#fca5a5' : '#fdba74', fontWeight: 600 }}>
                    {tier.toUpperCase()}
                  </span>
                )}
              </div>

              {risks.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#64748b' }}>No mapped risks</div>
              ) : (
                risks.sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid #1e293b', fontSize: '12px' }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: SEV_COLOR[r.severity] || '#6b7280',
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1 }}>{r.label}</span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{Math.round(r.confidence * 100)}%</span>
                  </div>
                ))
              )}

              <div style={{ marginTop: '6px', fontSize: '10px', color: '#475569' }}>
                {risks.length} risk{risks.length !== 1 ? 's' : ''} mapped
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', color: '#94a3b8' }}>
        {SEV_ORDER.map((sev) => (
          <span key={sev} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SEV_COLOR[sev], display: 'inline-block' }} />
            {sev}
          </span>
        ))}
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import type { GraphModel } from './types'

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  documented: { bg: '#14532d', fg: '#86efac', label: 'OK' },
  partially: { bg: '#713f12', fg: '#fde047', label: 'Partial' },
  not_documented: { bg: '#7f1d1d', fg: '#fca5a5', label: 'Gap' },
  unknown: { bg: '#1e293b', fg: '#94a3b8', label: '?' },
}

export default function CoverageMatrix({ graph }: { graph: GraphModel }) {
  const { assetNodes, controlNodes, matrix } = useMemo(() => {
    const assets = graph.nodes.filter((n) => n.type === 'asset')
    const controls = graph.nodes.filter((n) => n.type === 'control')

    const controlEdges = graph.edges.filter((e) => e.type === 'applies_to' || e.type === 'mitigates')
    const controlNodeMap = new Map(controls.map((c) => [c.id, c]))

    const mat: Record<string, Record<string, { status: string; confidence: number }>> = {}
    for (const a of assets) mat[a.id] = {}

    for (const e of controlEdges) {
      const ctrl = controlNodeMap.get(e.source)
      if (!ctrl) continue
      const assetId = e.target
      if (!mat[assetId]) continue
      mat[assetId][ctrl.id] = {
        status: String(ctrl.attrs.documentation_status || 'unknown'),
        confidence: e.confidence,
      }
    }

    return { assetNodes: assets, controlNodes: controls, matrix: mat }
  }, [graph])

  if (assetNodes.length === 0 || controlNodes.length === 0) {
    return <div className="panel" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No control application data available.</div>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl" style={{ fontSize: '11px' }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, background: 'var(--bg, #0f172a)', zIndex: 1, minWidth: '120px' }}>Asset</th>
            {controlNodes.map((c) => (
              <th key={c.id} style={{ textAlign: 'center', padding: '4px 8px', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '80px' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assetNodes.map((a) => {
            const tier = String(a.attrs.crown_jewel_tier || 'none')
            return (
              <tr key={a.id}>
                <td style={{ position: 'sticky', left: 0, background: 'var(--bg, #0f172a)', zIndex: 1, fontWeight: tier !== 'none' ? 700 : 400 }}>
                  <div className="pn">{a.label}</div>
                  {tier !== 'none' && <span style={{ fontSize: '9px', color: tier === 'tier1' ? '#fca5a5' : '#fdba74', textTransform: 'uppercase' }}>{tier}</span>}
                </td>
                {controlNodes.map((c) => {
                  const cell = matrix[a.id]?.[c.id]
                  if (!cell) {
                    return <td key={c.id} style={{ textAlign: 'center', background: '#0f172a' }}>-</td>
                  }
                  const s = STATUS_COLORS[cell.status] || STATUS_COLORS.unknown
                  return (
                    <td key={c.id} style={{ textAlign: 'center', background: s.bg, color: s.fg, fontWeight: 600, padding: '4px', cursor: 'default' }} title={`${c.label} on ${a.label}: ${cell.status} (${Math.round(cell.confidence * 100)}%)`}>
                      {s.label}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
        {Object.entries(STATUS_COLORS).map(([key, { bg, fg, label }]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: bg, border: `1px solid ${fg}`, display: 'inline-block' }} />
            {label} ({key})
          </span>
        ))}
      </div>
    </div>
  )
}

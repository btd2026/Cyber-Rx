import type { GraphNode, GraphEdge } from './types'

const TIER_LABELS: Record<string, string> = {
  tier1: 'Tier 1 — Critical Crown Jewel',
  tier2: 'Tier 2 — High-Value Asset',
  tier3: 'Tier 3 — Important Asset',
  none: 'Standard Asset',
}

const SEV_CLASS: Record<string, string> = {
  Critical: 'crit',
  High: 'high',
  Medium: 'med',
  Low: 'low',
}

export default function CrownJewelDrilldown({
  node,
  edges,
  allNodes,
  onClose,
}: {
  node: GraphNode
  edges: GraphEdge[]
  allNodes: GraphNode[]
  onClose: () => void
}) {
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]))

  const incoming = edges.filter((e) => e.target === node.id)
  const outgoing = edges.filter((e) => e.source === node.id)

  const supporters = incoming.filter((e) => e.type === 'supports')
  const threats = incoming.filter((e) => e.type === 'threatens')
  const controls = incoming.filter((e) => e.type === 'applies_to' || e.type === 'mitigates')

  return (
    <div className="panel" style={{ width: '320px', maxHeight: '520px', overflowY: 'auto', padding: '16px', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: '8px', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>
        x
      </button>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{node.label}</div>
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>{node.type}</div>
        {node.type === 'asset' && node.attrs.crown_jewel_tier ? (
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            <span className={`rk ${String(node.attrs.crown_jewel_tier) === 'tier1' ? 'crit' : String(node.attrs.crown_jewel_tier) === 'tier2' ? 'high' : 'med'}`}>
              {TIER_LABELS[String(node.attrs.crown_jewel_tier)] || 'Unknown'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Attributes */}
      <div style={{ fontSize: '12px', marginBottom: '12px' }}>
        {Object.entries(node.attrs).filter(([, v]) => v != null).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #1e293b' }}>
            <span style={{ color: '#94a3b8' }}>{k.replace(/_/g, ' ')}</span>
            <span style={{ fontWeight: 500 }}>{typeof v === 'number' ? Math.round(Number(v) * 100) + '%' : String(v as string)}</span>
          </div>
        ))}
      </div>

      {/* Supporting Processes */}
      {supporters.length > 0 && (
        <Section title="Supporting Processes">
          {supporters.map((e, i) => {
            const src = nodeMap.get(e.source)
            return (
              <EdgeRow key={i} label={src?.label || e.source} confidence={e.confidence} origin={e.origin} />
            )
          })}
        </Section>
      )}

      {/* Threats */}
      {threats.length > 0 && (
        <Section title="Threats">
          {threats.map((e, i) => {
            const src = nodeMap.get(e.source)
            const sev = String(src?.attrs?.severity || '')
            return (
              <div key={i} style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{src?.label || e.source}</span>
                  {sev && <span className={`rk ${SEV_CLASS[sev] || ''}`}>{sev}</span>}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  confidence: {Math.round(e.confidence * 100)}% | origin: {e.origin}
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {/* Controls */}
      {controls.length > 0 && (
        <Section title="Controls Applied">
          {controls.map((e, i) => {
            const src = nodeMap.get(e.source)
            const gap = src?.attrs?.gap
            return (
              <div key={i} style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{src?.label || e.source}</span>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: gap ? '#7f1d1d' : '#14532d', color: gap ? '#fca5a5' : '#86efac' }}>
                    {gap ? 'GAP' : 'OK'}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  {String(src?.attrs?.documentation_status || 'unknown')} | {e.type}
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {/* Outgoing edges (for processes) */}
      {outgoing.length > 0 && node.type === 'process' && (
        <Section title="Supports Assets">
          {outgoing.map((e, i) => {
            const tgt = nodeMap.get(e.target)
            return (
              <EdgeRow key={i} label={tgt?.label || e.target} confidence={e.confidence} origin={e.origin} />
            )
          })}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function EdgeRow({ label, confidence, origin }: { label: string; confidence: number; origin: string }) {
  return (
    <div style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span style={{ fontSize: '10px', color: '#64748b' }}>
        {Math.round(confidence * 100)}% | {origin}
      </span>
    </div>
  )
}

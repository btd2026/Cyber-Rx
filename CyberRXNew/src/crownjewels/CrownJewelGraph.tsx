import { useMemo, useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphModel, GraphNode } from './types'
import CrownJewelDrilldown from './CrownJewelDrilldown'

const TIER_COLORS: Record<string, string> = {
  tier1: '#dc2626',
  tier2: '#ea580c',
  tier3: '#ca8a04',
  none: '#6b7280',
}

const TYPE_COLORS: Record<string, string> = {
  process: '#2563eb',
  asset: '#059669',
  risk: '#dc2626',
  control: '#7c3aed',
}

const EDGE_COLORS: Record<string, string> = {
  supports: '#2563eb',
  threatens: '#dc2626',
  applies_to: '#7c3aed',
  mitigates: '#059669',
}

function nodeColor(n: GraphNode): string {
  if (n.type === 'asset') {
    const tier = String(n.attrs.crown_jewel_tier || 'none')
    return TIER_COLORS[tier] || TIER_COLORS.none
  }
  return TYPE_COLORS[n.type] || '#6b7280'
}

function nodeShape(n: GraphNode): string {
  switch (n.type) {
    case 'process': return '⬡'
    case 'asset': return n.attrs.crown_jewel_tier && n.attrs.crown_jewel_tier !== 'none' ? '◆' : '■'
    case 'risk': return '▲'
    case 'control': return n.attrs.gap ? '○' : '●'
    default: return '●'
  }
}

function layoutNodes(graphNodes: GraphNode[]): Node[] {
  const byType: Record<string, GraphNode[]> = { process: [], asset: [], risk: [], control: [] }
  for (const n of graphNodes) {
    (byType[n.type] || (byType[n.type] = [])).push(n)
  }

  // Layered layout: processes top, assets middle, risks bottom-left, controls bottom-right
  const layers: { type: string; y: number }[] = [
    { type: 'process', y: 0 },
    { type: 'asset', y: 200 },
    { type: 'risk', y: 420 },
    { type: 'control', y: 420 },
  ]

  const nodes: Node[] = []
  for (const layer of layers) {
    const items = byType[layer.type] || []
    const xStart = layer.type === 'risk' ? 0 : layer.type === 'control' ? items.length * 80 + 200 : 0
    const spacing = 180

    items.forEach((n, i) => {
      const color = nodeColor(n)
      const isCrown = n.type === 'asset' && n.attrs.crown_jewel_tier && n.attrs.crown_jewel_tier !== 'none'
      nodes.push({
        id: n.id,
        position: { x: xStart + i * spacing, y: layer.y + (Math.random() * 30 - 15) },
        data: {
          label: `${nodeShape(n)} ${n.label}`,
          graphNode: n,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background: `${color}18`,
          border: `2px solid ${color}`,
          borderRadius: isCrown ? '8px' : '6px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: isCrown ? 700 : 500,
          color: 'var(--text, #e2e8f0)',
          minWidth: '100px',
          textAlign: 'center' as const,
          boxShadow: isCrown ? `0 0 12px ${color}40` : 'none',
        },
      })
    })
  }
  return nodes
}

function layoutEdges(graphEdges: { source: string; target: string; type: string; confidence: number; origin: string }[]): Edge[] {
  return graphEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    type: 'default',
    animated: e.type === 'threatens',
    style: {
      stroke: EDGE_COLORS[e.type] || '#6b7280',
      strokeWidth: e.confidence >= 0.9 ? 2 : 1,
      strokeDasharray: e.confidence < 0.8 ? '5,5' : undefined,
      opacity: Math.max(0.4, e.confidence),
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLORS[e.type] || '#6b7280' },
    label: e.type,
    labelStyle: { fontSize: 9, fill: '#94a3b8' },
    labelBgStyle: { fill: 'var(--bg, #0f172a)', fillOpacity: 0.8 },
  }))
}

export default function CrownJewelGraph({ graph }: { graph: GraphModel }) {
  const [selected, setSelected] = useState<GraphNode | null>(null)

  const initialNodes = useMemo(() => layoutNodes(graph.nodes), [graph])
  const initialEdges = useMemo(() => layoutEdges(graph.edges), [graph])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelected((node.data as { graphNode: GraphNode }).graphNode ?? null)
  }, [])

  const connectedEdges = useMemo(() => {
    if (!selected) return []
    return graph.edges.filter((e) => e.source === selected.id || e.target === selected.id)
  }, [selected, graph.edges])

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', minHeight: '520px' }}>
      <div style={{ flex: 1, border: '1px solid var(--border, #334155)', borderRadius: '8px', overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'var(--bg, #0f172a)' }}
        >
          <Background color="#334155" gap={24} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const gn = (n.data as { graphNode?: GraphNode })?.graphNode
              return gn ? nodeColor(gn) : '#6b7280'
            }}
            style={{ background: '#1e293b' }}
          />
        </ReactFlow>
      </div>

      {selected && (
        <CrownJewelDrilldown
          node={selected}
          edges={connectedEdges}
          allNodes={graph.nodes}
          onClose={() => setSelected(null)}
        />
      )}

      <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', gap: '12px', fontSize: '11px', color: '#94a3b8' }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, display: 'inline-block' }} />
            {type}
          </span>
        ))}
        <span style={{ borderLeft: '1px solid #475569', paddingLeft: '8px' }}>
          Dashed = low confidence | Animated = threatens
        </span>
      </div>
    </div>
  )
}

export interface GraphNode {
  id: string
  type: 'process' | 'asset' | 'risk' | 'control'
  label: string
  attrs: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  type: 'supports' | 'threatens' | 'applies_to' | 'mitigates'
  confidence: number
  origin: string
}

export interface CrownJewel {
  id: string
  name: string
  type: string
  tier: 'tier1' | 'tier2' | 'tier3' | 'none'
  score: number
  breakdown: Record<string, number>
  rationale: string
}

export interface CrownJewelSummary {
  org_id: string
  generated_at: string
  empty?: boolean
  material_exposure_usd: number
  material_exposure_basis: string
  material_exposure_items: { risk: string; asset_id: string | null; exposure_usd: number; severity: string }[]
  counts: {
    assets: number
    processes: number
    risks: number
    crown_jewels: number
    dependency_edges?: number
    control_applications?: number
    control_gaps?: number
  }
  crown_jewels: CrownJewel[]
}

export interface GraphModel {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

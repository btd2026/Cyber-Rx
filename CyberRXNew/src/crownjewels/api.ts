import type { CrownJewelSummary, GraphModel } from './types'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const orgId = localStorage.getItem('cyberrx_org_id') || 'demo'
    const url = `${API_BASE}/api/crown-jewels${path}${path.includes('?') ? '&' : '?'}org_id=${orgId}`
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchSummary(): Promise<CrownJewelSummary | null> {
  return fetchJSON<CrownJewelSummary>('/summary')
}

export async function fetchGraph(): Promise<GraphModel | null> {
  return fetchJSON<GraphModel>('/graph')
}

export interface ReviewItem {
  id: string
  item_type: string
  status: string
  payload: Record<string, unknown>
  reason: string
  created_at: string
}

export async function fetchReviewItems(): Promise<ReviewItem[]> {
  const data = await fetchJSON<{ items: ReviewItem[] }>('/review')
  return data?.items || []
}

export async function resolveReviewItem(id: string, action: 'confirm' | 'override' | 'dismiss', reason?: string): Promise<boolean> {
  try {
    const orgId = localStorage.getItem('cyberrx_org_id') || 'demo'
    const res = await fetch(`${API_BASE}/api/crown-jewels/review/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
      body: JSON.stringify({ action, reason }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function runAnalysis(mode: 'full' | 'delta' = 'full'): Promise<{ run_id: string } | null> {
  try {
    const orgId = localStorage.getItem('cyberrx_org_id') || 'demo'
    const res = await fetch(`${API_BASE}/api/crown-jewels/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
      body: JSON.stringify({ org_id: orgId, mode }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

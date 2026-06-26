// Leaf rule (Phase 5c): every owned assumption (◐) edit is LOGGED. In demo this
// writes to localStorage; in production it writes a new row to the `assumptions`
// version history plus an `audit_log` entry (Phase 1 schema), behind RLS.

export type AssumptionChange = {
  id: string
  key: string
  label: string
  from: number
  to: number
  at: string
}

const KEY = 'cyberrx-assumption-log-v1'

export function logAssumptionChange(c: Omit<AssumptionChange, 'id' | 'at'>): AssumptionChange {
  const entry: AssumptionChange = { ...c, id: crypto.randomUUID(), at: new Date().toISOString() }
  try {
    const log: AssumptionChange[] = JSON.parse(localStorage.getItem(KEY) || '[]')
    log.push(entry)
    localStorage.setItem(KEY, JSON.stringify(log))
  } catch {
    /* ignore */
  }
  return entry
}

export function readAssumptionLog(): AssumptionChange[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

// Parse a mock cost string ("$420K", "$1.80M", "$0") to a number.
export function parseAmount(s: string): number {
  const m = String(s).replace(/[, ]/g, '').match(/\$?([\d.]+)\s*([KMB])?/i)
  if (!m) return 0
  const n = parseFloat(m[1])
  const unit = (m[2] || '').toUpperCase()
  return unit === 'B' ? n * 1e9 : unit === 'M' ? n * 1e6 : unit === 'K' ? n * 1e3 : n
}

// Format a number back to the compact currency style.
export function formatAmount(n: number, symbol = '$'): string {
  if (n >= 1e6) return `${symbol}${(n / 1e6).toFixed(2).replace(/\.00$/, '')}M`
  if (n >= 1e3) return `${symbol}${Math.round(n / 1e3)}K`
  return `${symbol}${Math.round(n)}`
}

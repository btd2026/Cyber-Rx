import { CALL_TREE_ROLES } from './data'

// Onboarding state, shaped to the Phase 1 data model (tenants / connectors /
// assumptions / incident_plan / contacts). In demo it persists to localStorage;
// with Supabase wired, "go live" writes these rows behind RLS.

export type Contact = { role: string; name: string; phone: string }

export type OnboardingState = {
  org: {
    name: string
    industry: string
    ownership: string
    regions: string[]
    regulatedData: string[]
    currency: string
    materiality: string // millions, as entered
    employees: string
  }
  connectors: Record<string, boolean>
  processes: { name: string; value: string }[]
  apps: { name: string }[]
  crownJewels: string[]
  documents: { name: string }[]
  assumptions: { insurance: string; appetite: string }
  incidentPlan: { planDoc: string; contacts: Contact[] }
  completed: boolean
}

export const STORAGE_KEY = 'cyberrx-onboarding-v1'

export function emptyState(): OnboardingState {
  return {
    org: { name: '', industry: 'Healthcare Payer', ownership: 'Public', regions: [], regulatedData: [], currency: 'USD', materiality: '', employees: '' },
    connectors: {},
    processes: [{ name: '', value: '' }],
    apps: [{ name: '' }],
    crownJewels: [],
    documents: [],
    assumptions: { insurance: '', appetite: 'Moderate' },
    incidentPlan: { planDoc: '', contacts: CALL_TREE_ROLES.map((role) => ({ role, name: '', phone: '' })) },
    completed: false,
  }
}

export function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyState(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return emptyState()
}

export function saveState(s: OnboardingState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

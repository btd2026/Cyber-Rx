// Ticket-system sync (Phase 6a). The adapter interface is what a real
// Jira/ServiceNow/Azure DevOps/GitLab integration implements server-side
// (read-only-ish: create + poll status). In demo we simulate the status
// lifecycle locally; closure loops back to the originating decision.

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed'
export const TICKET_FLOW: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed']

export function nextStatus(s: string): TicketStatus {
  const i = TICKET_FLOW.indexOf(s as TicketStatus)
  return TICKET_FLOW[Math.min(TICKET_FLOW.length - 1, i < 0 ? 0 : i + 1)]
}

export function ageStr(createdAtISO: string): string {
  const ms = Date.now() - new Date(createdAtISO).getTime()
  const h = Math.floor(ms / 3.6e6)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h old`
  return `${Math.floor(h / 24)}d old`
}

export type DueState = 'none' | 'ok' | 'soon' | 'overdue'
export function dueState(dueDate: string, status: string): DueState {
  if (status === 'Closed' || status === 'Resolved') return 'ok'
  if (!dueDate) return 'none'
  const days = (new Date(dueDate).getTime() - Date.now()) / 8.64e7
  if (days < 0) return 'overdue'
  if (days <= 2) return 'soon'
  return 'ok'
}

// Production adapter contract — implemented per external system, server-side.
export interface TicketAdapter {
  system: string
  create(input: { title: string; decisionId: string }): Promise<{ externalId: string; url: string }>
  getStatus(externalId: string): Promise<TicketStatus>
}

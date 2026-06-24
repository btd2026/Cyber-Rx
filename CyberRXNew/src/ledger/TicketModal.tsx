import { useState } from 'react'
import type { TicketPayload } from './LedgerProvider'

const SYSTEMS = ['Jira', 'ServiceNow', 'Azure DevOps', 'GitLab']

export default function TicketModal({
  payload,
  onConfirm,
  onCancel,
}: {
  payload: TicketPayload
  onConfirm: (system: string, dueDate: string) => void
  onCancel: () => void
}) {
  const [system, setSystem] = useState('Jira')
  const [dueDate, setDueDate] = useState('')

  return (
    <div className="overlay show" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div className="t">Open a ticket</div>
          <button className="modal-x" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-b">
          <div className="tk-form">
            <div className="tkf-l">Ticketing system</div>
            <div className="tk-sysrow">
              {SYSTEMS.map((s) => (
                <button
                  key={s}
                  className={`tk-syschip${system === s ? ' on' : ''}`}
                  onClick={() => setSystem(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="tkf-l">What this ticket tracks</div>
            <div className="tk-title">{payload.title}</div>

            <div className="tkf-l">Due date</div>
            <input
              className="linput"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <div className="rec-note">
              Connecting to a real {system} project and syncing status/age back lands in Phase 6.
              This creates the linked ticket record now.
            </div>

            <button className="lbtn" style={{ marginTop: 16 }} onClick={() => onConfirm(system, dueDate)}>
              Open ticket in {system}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

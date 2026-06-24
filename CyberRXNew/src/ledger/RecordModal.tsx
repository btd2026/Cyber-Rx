import { useState } from 'react'
import type { RecordPayload } from './LedgerProvider'

export default function RecordModal({
  payload,
  onConfirm,
  onCancel,
}: {
  payload: RecordPayload
  onConfirm: (rationale: string) => void
  onCancel: () => void
}) {
  const [rationale, setRationale] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="overlay show" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div className="t">Record decision</div>
          <button className="modal-x" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-b">
          <div className="rec-title">{payload.title}</div>
          <div className="rec-choice">{payload.optionName}</div>

          <div className="rec-grid">
            <div><span className="rec-k">Cost</span><span className="rec-v">{payload.cost}</span></div>
            <div><span className="rec-k">Risk removed</span><span className="rec-v">{payload.riskRemoved}</span></div>
          </div>

          <div className="rec-ev">
            <div className="rec-ev-l">What's known at the time (snapshotted into the record)</div>
            {payload.evidenceSnapshot.situation}
          </div>

          <div className="tkf-l">Rationale (optional, recommended)</div>
          <textarea
            className="rec-ta"
            rows={3}
            placeholder="Why this option — for the defensible record."
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />

          <div className="rec-note">
            This writes an <b>append-only, signed</b> entry stamped with you, the timestamp, and the
            evidence above. It cannot be edited or deleted — that's the legal defensibility.
          </div>

          <button
            className="lbtn"
            style={{ marginTop: 16 }}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onConfirm(rationale.trim())
            }}
          >
            {busy ? 'Signing…' : 'Choose & record'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useIncident } from './IncidentProvider'
import { IC_CHECK, IC_PLAYBOOK, IC_CONTACTS, type Contact } from './data'
import { loadState } from '../onboarding/onboardingStore'

// Incident Commander mode (CISO) — appears on the CISO seat during a live
// incident. The call tree is sourced from the onboarding incident command plan
// (falling back to defaults), with click-to-call.
function callTree(): Contact[] {
  const captured = loadState().incidentPlan.contacts.filter((c) => c.name.trim() && c.phone.trim())
  if (captured.length === 0) return IC_CONTACTS
  return captured.map((c) => ({
    role: c.role,
    who: c.name,
    ph: c.phone,
    g: /external|counsel|insurer|law|forensic|retainer|fbi/i.test(c.role) ? 'External' : 'Internal',
  }))
}

export default function IncidentCommander({ go }: { go: (tab: string) => void }) {
  const { active, elapsed } = useIncident()
  const [checks, setChecks] = useState<Set<number>>(new Set())
  const [called, setCalled] = useState<Set<number>>(new Set())
  const [playbook, setPlaybook] = useState(false)
  if (!active) return null
  const contacts = callTree()

  return (
    <div className="ic2">
      <div className="ic2-banner">
        <div><div className="ic2-t">⚠ INCIDENT COMMANDER</div><div className="ic2-s">You have command · INC-2026-0623-001 · Ransomware — Claims Processing · SEV-1</div></div>
        <div className="ic2-clock">{elapsed}</div>
      </div>

      <div className="ic2-cols">
        <div className="ic2-col">
          <div className="ic2-h">Your command checklist <span className="ic2-prog">{checks.size}/{IC_CHECK.length}</span></div>
          {IC_CHECK.map((c, i) => (
            <button
              key={i}
              className={`ic2-chk${checks.has(i) ? ' done' : ''}`}
              onClick={() => setChecks((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })}
            >
              <span className="box" />{c}
            </button>
          ))}
        </div>

        <div className="ic2-col">
          <div className="ic2-h">Playbooks to trigger</div>
          <div className="ic2-pb rec">
            <span className="ic2-pbtag">matches this incident</span>
            <div className="ic2-pbh">
              {IC_PLAYBOOK.nm}
              <button className={`ic2-pbtrig${playbook ? ' on' : ''}`} onClick={() => setPlaybook(true)}>
                {playbook ? '✓ Triggered' : 'Trigger playbook'}
              </button>
            </div>
            <ul className="ic2-pbsteps">{IC_PLAYBOOK.steps.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
      </div>

      <div className="ic2-h" style={{ marginTop: 14 }}>
        Call tree — who to call now <span className="ic2-note">from your incident command plan · captured at onboarding</span>
      </div>
      <div className="ic2-calls">
        {contacts.map((c, i) => (
          <div className={`ic2-call${called.has(i) ? ' called' : ''}`} key={i}>
            <div className="cr">
              <div className="role">{c.role} <span className={`grp ${c.g.toLowerCase()}`}>{c.g}</span></div>
              <div className="who">{c.who}</div>
            </div>
            <a className="callbtn" href={`tel:${c.ph.replace(/[^+\d]/g, '')}`} onClick={() => setCalled((s) => new Set(s).add(i))}>
              📞 {called.has(i) ? 'Called ✓' : c.ph}
            </a>
          </div>
        ))}
      </div>

      <div className="ic2-foot">
        <span><b>Regulatory clocks:</b> SEC materiality evaluating · 11-state breach assessment open</span>
        <button className="ic2-log" onClick={() => go('q4')}>Open decisions ▸</button>
      </div>
    </div>
  )
}

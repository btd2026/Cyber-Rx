import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CONNECTORS, TOTAL_SIG, CURRENCIES, symbolFor, INDUSTRIES, OWNERSHIP, REGIONS, DATA_TYPES,
} from './data'
import { loadState, saveState, type OnboardingState } from './onboardingStore'
import { supabaseConfigured } from '../lib/supabase'

const STEPS = [
  { t: 'Organization profile', d: 'Who you are' },
  { t: 'Connect your systems', d: 'The evidence spine' },
  { t: 'Business processes', d: 'What the business runs on' },
  { t: 'Applications', d: 'Your systems' },
  { t: 'Crown jewels', d: 'What matters most' },
  { t: 'Documents', d: 'Evidence in files' },
  { t: 'Executive data needs', d: 'Insurance, appetite, incident plan' },
  { t: 'Review & go live', d: 'Confirm and launch' },
]

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="ob-chips">
      {options.map((o) => (
        <button key={o} type="button" className={`ob-chip${selected.includes(o) ? ' on' : ''}`} onClick={() => onToggle(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [cur, setCur] = useState(0)
  const [s, setS] = useState<OnboardingState>(loadState)

  useEffect(() => {
    saveState(s)
  }, [s])

  const sym = symbolFor(s.org.currency)
  const set = (patch: Partial<OnboardingState>) => setS((p) => ({ ...p, ...patch }))
  const setOrg = (patch: Partial<OnboardingState['org']>) => setS((p) => ({ ...p, org: { ...p.org, ...patch } }))
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const connectedSig = CONNECTORS.filter((c) => s.connectors[c.id]).reduce((a, c) => a + c.sig, 0)
  const credibility = Math.round((connectedSig / TOTAL_SIG) * 100)

  const goLive = () => {
    set({ completed: true })
    saveState({ ...s, completed: true })
    navigate(supabaseConfigured ? '/' : '/cockpit') // into the cockpit (demo uses /cockpit)
  }

  const namedProcesses = s.processes.filter((p) => p.name.trim())
  const namedApps = s.apps.filter((a) => a.name.trim())

  return (
    <div className="wrap ob">
      <div className="ob-head">
        <h1>Let's set up your cyber operating system</h1>
        <span className="seed-flag" title="Saved locally in demo; writes to Supabase (tenants/connectors/assumptions/incident_plan) when wired">
          ● Demo · saved locally
        </span>
      </div>

      <div className="ob-stepper">
        {STEPS.map((st, i) => (
          <button key={i} className={`ob-step${i === cur ? ' active' : ''}${i < cur ? ' done' : ''}`} onClick={() => setCur(i)}>
            <span className="ob-step-n">{i < cur ? '✓' : i + 1}</span>
            <span className="ob-step-t">{st.t}</span>
          </button>
        ))}
      </div>

      <div className="ob-panel">
        {/* 0 — Organization profile */}
        {cur === 0 && (
          <div>
            <h2>Organization profile</h2>
            <p className="ob-why">Your profile sets the rules — which regulations apply, what data you must protect, and which frameworks you're measured against.</p>
            <div className="ob-grid">
              <label className="ob-f"><span>Organization name</span><input className="linput2" value={s.org.name} onChange={(e) => setOrg({ name: e.target.value })} placeholder="Your organization name" /></label>
              <label className="ob-f"><span>Industry</span><select className="linput2" value={s.org.industry} onChange={(e) => setOrg({ industry: e.target.value })}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></label>
              <label className="ob-f"><span>Ownership</span><select className="linput2" value={s.org.ownership} onChange={(e) => setOrg({ ownership: e.target.value })}>{OWNERSHIP.map((o) => <option key={o}>{o}</option>)}</select></label>
              <label className="ob-f"><span>Employees</span><input className="linput2" inputMode="numeric" value={s.org.employees} onChange={(e) => setOrg({ employees: e.target.value.replace(/[^\d]/g, '') })} placeholder="12,000" /></label>
              <label className="ob-f"><span>Primary currency (honored platform-wide)</span><select className="linput2" value={s.org.currency} onChange={(e) => setOrg({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}</select></label>
              <label className="ob-f"><span>Materiality threshold ({sym}M)</span><input className="linput2" inputMode="decimal" value={s.org.materiality} onChange={(e) => setOrg({ materiality: e.target.value.replace(/[^\d.]/g, '') })} placeholder="5" /></label>
            </div>
            <div className="ob-f"><span>Regions of operation</span><Chips options={REGIONS} selected={s.org.regions} onToggle={(v) => setOrg({ regions: toggleIn(s.org.regions, v) })} /></div>
            <div className="ob-f"><span>Regulated data types you hold</span><Chips options={DATA_TYPES} selected={s.org.regulatedData} onToggle={(v) => setOrg({ regulatedData: toggleIn(s.org.regulatedData, v) })} /></div>
          </div>
        )}

        {/* 1 — Connectors */}
        {cur === 1 && (
          <div>
            <h2>Connect your systems</h2>
            <p className="ob-why">This is what makes your numbers credible — every figure traces to a real source, with freshness.</p>
            <div className="ob-cred">
              <div className="ob-cred-bar"><div className="ob-cred-fill" style={{ width: `${credibility}%` }} /></div>
              <div className="ob-cred-lbl">Evidence credibility <b>{credibility}%</b> · {CONNECTORS.filter((c) => s.connectors[c.id]).length} of {CONNECTORS.length} connected</div>
            </div>
            <div className="ob-conn-grid">
              {CONNECTORS.map((c) => {
                const on = !!s.connectors[c.id]
                return (
                  <div key={c.id} className={`ob-conn${on ? ' on' : ''}`}>
                    <div className="ob-conn-h"><span className="ob-conn-ic">{c.ic}</span><span className="ob-conn-cat">{c.cat}</span></div>
                    <div className="ob-conn-v">{c.vendors.join(' · ')}</div>
                    <button type="button" className={`ob-conn-btn${on ? ' on' : ''}`} onClick={() => set({ connectors: { ...s.connectors, [c.id]: !on } })}>{on ? '✓ Connected' : 'Connect'}</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 2 — Business processes */}
        {cur === 2 && (
          <ListStep
            title="Business processes"
            why="So answers speak in business terms — “claims, $220M/day,” not “cluster 3.”"
            rows={s.processes}
            cols={[{ k: 'name', ph: 'Claims Processing' }, { k: 'value', ph: `${sym}220M/day` }]}
            onChange={(rows) => set({ processes: rows as OnboardingState['processes'] })}
            blank={{ name: '', value: '' }}
          />
        )}

        {/* 3 — Applications */}
        {cur === 3 && (
          <ListStep
            title="Applications & systems"
            why="We map each system to the processes it supports."
            rows={s.apps}
            cols={[{ k: 'name', ph: 'Claims DB (Oracle)' }]}
            onChange={(rows) => set({ apps: rows as OnboardingState['apps'] })}
            blank={{ name: '' }}
          />
        )}

        {/* 4 — Crown jewels */}
        {cur === 4 && (
          <div>
            <h2>Auto-mapping & crown jewels</h2>
            <p className="ob-why">The engine infers which app supports which process and deduces your crown jewels (Phase 4). For now, mark the processes & systems whose loss would hurt the business most.</p>
            <div className="ob-cj">
              {[...namedProcesses.map((p) => p.name), ...namedApps.map((a) => a.name)].map((nm) => (
                <button key={nm} type="button" className={`ob-cj-item${s.crownJewels.includes(nm) ? ' on' : ''}`} onClick={() => set({ crownJewels: toggleIn(s.crownJewels, nm) })}>
                  <span className="ob-cj-gem">{s.crownJewels.includes(nm) ? '👑' : '◇'}</span>{nm}
                </button>
              ))}
              {namedProcesses.length + namedApps.length === 0 && <div className="ob-empty">Add processes and applications first.</div>}
            </div>
          </div>
        )}

        {/* 5 — Documents */}
        {cur === 5 && (
          <div>
            <h2>Documents — evidence for non-automated controls</h2>
            <p className="ob-why">Your policies and reports are evidence. The engine extracts, tags, and maps their contents to controls.</p>
            <ListStep
              title=""
              why=""
              rows={s.documents}
              cols={[{ k: 'name', ph: 'IR Plan 2026.pdf' }]}
              onChange={(rows) => set({ documents: rows as OnboardingState['documents'] })}
              blank={{ name: '' }}
              addLabel="+ Add document"
            />
          </div>
        )}

        {/* 6 — Executive data needs */}
        {cur === 6 && (
          <div>
            <h2>Executive data needs</h2>
            <p className="ob-why">Only the few things no system can report — insurance, appetite, and your incident command plan.</p>
            <div className="ob-grid">
              <label className="ob-f"><span>Cyber-insurance coverage ({sym}M)</span><input className="linput2" inputMode="decimal" value={s.assumptions.insurance} onChange={(e) => set({ assumptions: { ...s.assumptions, insurance: e.target.value.replace(/[^\d.]/g, '') } })} placeholder="50" /></label>
              <label className="ob-f"><span>Risk appetite</span><select className="linput2" value={s.assumptions.appetite} onChange={(e) => set({ assumptions: { ...s.assumptions, appetite: e.target.value } })}><option>Low</option><option>Moderate</option><option>High</option></select></label>
            </div>

            <div className="ob-plan">
              <div className="ob-plan-h">Incident command plan & 24/7 call tree <span>no system has this — it powers Incident Commander mode</span></div>
              <label className="ob-f"><span>IR plan / playbooks</span><input className="linput2" value={s.incidentPlan.planDoc} onChange={(e) => set({ incidentPlan: { ...s.incidentPlan, planDoc: e.target.value } })} placeholder="IR-Plan-2026.pdf (or describe)" /></label>
              <div className="ob-ct-h">Key contacts — reachable 24/7 (name + phone)</div>
              {s.incidentPlan.contacts.map((c, i) => (
                <div key={c.role} className="ob-ct-row">
                  <span className="ob-ct-role">{c.role}</span>
                  <input className="linput2" placeholder="Name" value={c.name} onChange={(e) => { const contacts = [...s.incidentPlan.contacts]; contacts[i] = { ...c, name: e.target.value }; set({ incidentPlan: { ...s.incidentPlan, contacts } }) }} />
                  <input className="linput2" placeholder="Phone" inputMode="tel" value={c.phone} onChange={(e) => { const contacts = [...s.incidentPlan.contacts]; contacts[i] = { ...c, phone: e.target.value }; set({ incidentPlan: { ...s.incidentPlan, contacts } }) }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7 — Review & go live */}
        {cur === 7 && (
          <div>
            <h2>Review &amp; go live</h2>
            <p className="ob-why">A final check. Going live generates your seats, framework coverage, crown-jewel map, and first briefing.</p>
            <div className="ob-review">
              <Rev k="Organization" v={`${s.org.name || '—'} · ${s.org.industry} · ${s.org.ownership}`} />
              <Rev k="Currency / materiality" v={`${s.org.currency} · threshold ${sym}${s.org.materiality || '—'}M`} />
              <Rev k="Regions" v={s.org.regions.join(', ') || '—'} />
              <Rev k="Regulated data" v={s.org.regulatedData.join(', ') || '—'} />
              <Rev k="Connectors" v={`${CONNECTORS.filter((c) => s.connectors[c.id]).length}/${CONNECTORS.length} · ${credibility}% credibility`} />
              <Rev k="Processes / apps" v={`${namedProcesses.length} processes · ${namedApps.length} apps`} />
              <Rev k="Crown jewels" v={s.crownJewels.join(', ') || '—'} />
              <Rev k="Documents" v={`${s.documents.filter((d) => d.name.trim()).length} files`} />
              <Rev k="Insurance / appetite" v={`${sym}${s.assumptions.insurance || '—'}M · ${s.assumptions.appetite} appetite`} />
              <Rev k="Call tree" v={`${s.incidentPlan.contacts.filter((c) => c.name.trim()).length}/${s.incidentPlan.contacts.length} contacts named`} />
            </div>
            <button className="lbtn" style={{ maxWidth: 260 }} onClick={goLive}>🚀 Go live</button>
          </div>
        )}
      </div>

      <div className="ob-nav">
        <button className="tbtn" disabled={cur === 0} onClick={() => setCur((c) => Math.max(0, c - 1))}>← Back</button>
        <span className="ob-nav-mid">Step {cur + 1} of {STEPS.length}</span>
        {cur < STEPS.length - 1 ? (
          <button className="tbtn primary" onClick={() => setCur((c) => Math.min(STEPS.length - 1, c + 1))}>Continue →</button>
        ) : (
          <button className="tbtn primary" onClick={goLive}>Go live →</button>
        )}
      </div>
    </div>
  )
}

function Rev({ k, v }: { k: string; v: string }) {
  return <div className="ob-rev"><span className="k">{k}</span><span className="v">{v}</span></div>
}

type Row = Record<string, string>

// Parse an uploaded CSV/TSV into rows keyed by the step's columns. The first
// line is skipped when it looks like a header. Client-side only (no backend
// wired yet) so upload works in demo today.
function parseDelimited(text: string, cols: { k: string }[]): Row[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const delim = lines[0].includes('\t') ? '\t' : ','
  const firstCell = lines[0].split(delim)[0].trim().replace(/^"|"$/g, '').toLowerCase()
  const headerWords = ['name', 'process', 'processes', 'application', 'applications', 'app', 'document', 'documents', 'title', 'system']
  const body = headerWords.includes(firstCell) ? lines.slice(1) : lines
  return body
    .map((line) => {
      const cells = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))
      const row: Row = {}
      cols.forEach((col, i) => { row[col.k] = cells[i] ?? '' })
      return row
    })
    .filter((r) => Object.values(r).some((v) => v))
}

function ListStep({ title, why, rows, cols, onChange, blank, addLabel = '+ Add row' }: {
  title: string; why: string; rows: Row[]; cols: { k: string; ph: string }[]
  onChange: (rows: Row[]) => void; blank: Row; addLabel?: string
}) {
  function ingest(file?: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseDelimited(String(reader.result || ''), cols)
      if (!parsed.length) return
      // Keep any rows the user already typed; append the extracted ones.
      const existing = rows.filter((r) => Object.values(r).some((v) => (v || '').trim()))
      onChange([...existing, ...parsed])
    }
    reader.readAsText(file)
  }
  return (
    <div>
      {title && <h2>{title}</h2>}
      {why && <p className="ob-why">{why}</p>}
      <label className="ob-drop" onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); ingest(e.dataTransfer?.files?.[0]) }}>
        <span className="ob-drop-ic">↓</span>
        <span className="ob-drop-t">Upload a file — CSV or TSV</span>
        <span className="ob-drop-d">Click to browse or drag a file here · one per line ({cols.map((c) => c.k).join(', ')}). We'll extract each row.</span>
        <input type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; ingest(f) }} />
      </label>
      {rows.map((r, i) => (
        <div key={i} className="ob-row">
          {cols.map((col) => (
            <input key={col.k} className="linput2" placeholder={col.ph} value={r[col.k] ?? ''}
              onChange={(e) => { const next = rows.map((x, j) => (j === i ? { ...x, [col.k]: e.target.value } : x)); onChange(next) }} />
          ))}
          <button type="button" className="ob-del" onClick={() => onChange(rows.filter((_, j) => j !== i))} title="Remove">×</button>
        </div>
      ))}
      <button type="button" className="ob-add" onClick={() => onChange([...rows, { ...blank }])}>{addLabel}</button>
    </div>
  )
}

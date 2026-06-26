import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CONNECTORS, TOTAL_SIG, CURRENCIES, symbolFor, INDUSTRIES, OWNERSHIP, REGIONS, DATA_TYPES,
} from './data'
import { loadState, saveState, type OnboardingState } from './onboardingStore'
import { supabaseConfigured } from '../lib/supabase'
import { provisionTenant, uploadDocument } from '../lib/db'
import DemoBanner from '../app/DemoBanner'

// Minimal dependency-free CSV parse: rows of comma-separated cells, quotes honored.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (cell || row.length) { row.push(cell); rows.push(row); row = []; cell = '' }
      if (c === '\r' && text[i + 1] === '\n') i++
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim()))
}

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
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // Pending file bytes can't be JSON-persisted; hold them here until go-live,
  // when the tenant exists and we can upload to Storage. Filenames mirror to state.
  const docFilesRef = useRef<File[]>([])
  const planFileRef = useRef<File | null>(null)

  useEffect(() => {
    saveState(s)
  }, [s])

  const sym = symbolFor(s.org.currency)
  const set = (patch: Partial<OnboardingState>) => setS((p) => ({ ...p, ...patch }))
  const setOrg = (patch: Partial<OnboardingState['org']>) => setS((p) => ({ ...p, org: { ...p.org, ...patch } }))
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const connectedSig = CONNECTORS.filter((c) => s.connectors[c.id]).reduce((a, c) => a + c.sig, 0)
  const credibility = Math.round((connectedSig / TOTAL_SIG) * 100)

  const goLive = async () => {
    setErr('')
    setBusy(true)
    // Live: provision the tenant server-side (privileged), then upload any files.
    const res = await provisionTenant(s) // null in demo
    if (res && !res.ok) {
      setErr(res.error)
      setBusy(false)
      return
    }
    const tenantId = res?.ok ? res.tenantId : ''
    if (tenantId) {
      try {
        for (const f of docFilesRef.current) await uploadDocument(tenantId, f, 'policy')
        if (planFileRef.current) await uploadDocument(tenantId, planFileRef.current, 'ir_plan')
      } catch {
        /* tenant is live; file uploads can be retried from the documents step */
      }
    }
    set({ completed: true })
    saveState({ ...s, completed: true })
    setBusy(false)
    navigate('/') // back to the seats (basename /app)
  }

  const namedProcesses = s.processes.filter((p) => p.name.trim())
  const namedApps = s.apps.filter((a) => a.name.trim())

  const onPickDocs = (files: FileList | null) => {
    if (!files?.length) return
    const added = Array.from(files)
    docFilesRef.current = [...docFilesRef.current, ...added]
    set({ documents: [...s.documents, ...added.map((f) => ({ name: f.name }))] })
  }
  const removeDoc = (i: number) => {
    docFilesRef.current = docFilesRef.current.filter((_, j) => j !== i)
    set({ documents: s.documents.filter((_, j) => j !== i) })
  }

  return (
    <div className="wrap ob">
      <DemoBanner />
      <div className="ob-head">
        <h1>Let's set up your cyber operating system</h1>
        <span className="seed-flag" title={supabaseConfigured ? 'Go live provisions your tenant and writes to Supabase behind RLS' : 'Saved locally in demo; writes to Supabase (tenants/connectors/assumptions/incident_plan) on go-live when a backend is wired'}>
          ● {supabaseConfigured ? 'Live · writes to your tenant' : 'Demo · saved locally'}
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
              <label className="ob-f"><span>Organization name</span><input className="linput2" value={s.org.name} onChange={(e) => setOrg({ name: e.target.value })} placeholder="Meridian Health" /></label>
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
            <p className="ob-why">
              This is what makes your numbers credible — every figure traces to a real source, with freshness.
              <br /><b>Selecting</b> a source here marks which systems you use. You enter <b>live credentials</b> and pull real
              evidence in <b>🔌 Data sources</b> after go-live{!supabaseConfigured && ' (requires a connected backend)'}.
            </p>
            <div className="ob-cred">
              <div className="ob-cred-bar"><div className="ob-cred-fill" style={{ width: `${credibility}%` }} /></div>
              <div className="ob-cred-lbl">Evidence credibility <b>{credibility}%</b> · {CONNECTORS.filter((c) => s.connectors[c.id]).length} of {CONNECTORS.length} selected</div>
            </div>
            <div className="ob-conn-grid">
              {CONNECTORS.map((c) => {
                const on = !!s.connectors[c.id]
                return (
                  <div key={c.id} className={`ob-conn${on ? ' on' : ''}`}>
                    <div className="ob-conn-h"><span className="ob-conn-ic">{c.ic}</span><span className="ob-conn-cat">{c.cat}</span></div>
                    <div className="ob-conn-v">{c.vendors.join(' · ')}</div>
                    <button type="button" className={`ob-conn-btn${on ? ' on' : ''}`} onClick={() => set({ connectors: { ...s.connectors, [c.id]: !on } })}>{on ? '✓ Selected' : 'Select'}</button>
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
            <p className="ob-why">
              Your policies and reports are evidence. The engine extracts, tags, and maps their contents to controls.
              {!supabaseConfigured && <span className="twin-demo"> Demo: files are listed by name only — they upload to Storage once a backend is wired.</span>}
            </p>
            <label className="ob-add" style={{ display: 'inline-flex', cursor: 'pointer' }}>
              + Add documents
              <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg" style={{ display: 'none' }} onChange={(e) => { onPickDocs(e.target.files); e.target.value = '' }} />
            </label>
            <div>
              {s.documents.map((d, i) => (
                <div key={i} className="ob-row">
                  <span style={{ flex: 1 }}>📄 {d.name}</span>
                  <button type="button" className="ob-del" onClick={() => removeDoc(i)} title="Remove">×</button>
                </div>
              ))}
              {s.documents.length === 0 && <div className="ob-empty">No documents added yet.</div>}
            </div>
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
              <label className="ob-add" style={{ display: 'inline-flex', cursor: 'pointer', marginTop: 6 }}>
                {planFileRef.current ? `✓ ${planFileRef.current.name}` : '📎 Attach IR plan file'}
                <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { planFileRef.current = f; set({ incidentPlan: { ...s.incidentPlan, planDoc: f.name } }) } }} />
              </label>
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
            <button className="lbtn" style={{ maxWidth: 260 }} onClick={goLive} disabled={busy}>{busy ? 'Going live…' : '🚀 Go live'}</button>
            {err && <div className="ob-err" role="alert" style={{ color: '#c0392b', marginTop: 8 }}>{err}</div>}
          </div>
        )}
      </div>

      <div className="ob-nav">
        <button className="tbtn" disabled={cur === 0} onClick={() => setCur((c) => Math.max(0, c - 1))}>← Back</button>
        <span className="ob-nav-mid">Step {cur + 1} of {STEPS.length}</span>
        {cur < STEPS.length - 1 ? (
          <button className="tbtn primary" onClick={() => setCur((c) => Math.min(STEPS.length - 1, c + 1))}>Continue →</button>
        ) : (
          <button className="tbtn primary" onClick={goLive} disabled={busy}>{busy ? 'Going live…' : 'Go live →'}</button>
        )}
      </div>
    </div>
  )
}

function Rev({ k, v }: { k: string; v: string }) {
  return <div className="ob-rev"><span className="k">{k}</span><span className="v">{v}</span></div>
}

type Row = Record<string, string>
function ListStep({ title, why, rows, cols, onChange, blank, addLabel = '+ Add row' }: {
  title: string; why: string; rows: Row[]; cols: { k: string; ph: string }[]
  onChange: (rows: Row[]) => void; blank: Row; addLabel?: string
}) {
  // Bulk import: CSV columns map positionally onto this step's columns.
  const importCsv = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const grid = parseCsv(String(reader.result ?? ''))
      // Drop a header row if its first cell matches the first column key/placeholder.
      const head = grid[0]?.[0]?.toLowerCase().trim()
      const body = head && (head === cols[0].k || /name|process|application|system/.test(head)) ? grid.slice(1) : grid
      const imported = body.map((r) => { const o: Row = { ...blank }; cols.forEach((c, ci) => { o[c.k] = (r[ci] ?? '').trim() }); return o }).filter((o) => (o[cols[0].k] ?? '').trim())
      const existing = rows.filter((r) => (r[cols[0].k] ?? '').trim())
      onChange([...existing, ...imported])
    }
    reader.readAsText(file)
  }
  return (
    <div>
      {title && <h2>{title}</h2>}
      {why && <p className="ob-why">{why}</p>}
      {rows.map((r, i) => (
        <div key={i} className="ob-row">
          {cols.map((col) => (
            <input key={col.k} className="linput2" placeholder={col.ph} value={r[col.k] ?? ''}
              onChange={(e) => { const next = rows.map((x, j) => (j === i ? { ...x, [col.k]: e.target.value } : x)); onChange(next) }} />
          ))}
          <button type="button" className="ob-del" onClick={() => onChange(rows.filter((_, j) => j !== i))} title="Remove">×</button>
        </div>
      ))}
      <div className="ob-row" style={{ border: 'none', padding: 0, gap: 8 }}>
        <button type="button" className="ob-add" onClick={() => onChange([...rows, { ...blank }])}>{addLabel}</button>
        <label className="ob-add" style={{ display: 'inline-flex', cursor: 'pointer' }}>
          ⬆ Import CSV
          <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>
    </div>
  )
}

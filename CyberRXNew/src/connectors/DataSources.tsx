import { useEffect, useState } from 'react'
import { useTenant } from '../app/TenantProvider'
import { CONNECTOR_CATALOG, categoryFor, providerFor, type ProviderDef } from './catalog'
import { loadConnectors, setConnectorSecret, runIngest, loadEvidence, type ConnectorRow } from '../lib/db'

// "Configure data source" — pick a vendor for each connected category, enter the
// (write-only) credential, save it via the service-role Edge Function, then run a
// read-only sync and watch real, content-hashed evidence appear. In demo it shows
// the catalog as a preview (no backend to write to).

type FormState = {
  provider: string
  secret: Record<string, string>
  config: Record<string, string>
  busy: boolean
  msg: string
  ok: boolean
  evidence: { kind: string; value: unknown; source: string } | null
}

const FREE_BADGE: Record<ProviderDef['free'], { t: string; c: string }> = {
  free: { t: 'FREE', c: '#1f9d55' },
  trial: { t: 'TRIAL', c: '#b7791f' },
  enterprise: { t: 'ENTERPRISE', c: '#a0aec0' },
}

export default function DataSources({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { demo, activeTenantId } = useTenant()
  const [connectors, setConnectors] = useState<ConnectorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [forms, setForms] = useState<Record<string, FormState>>({})

  useEffect(() => {
    if (!open || demo || !activeTenantId) return
    setLoading(true)
    loadConnectors(activeTenantId).then((rows) => {
      setConnectors(rows)
      const next: Record<string, FormState> = {}
      for (const c of rows) {
        const cat = categoryFor(c.kind)
        const defProvider = c.provider || cat?.providers.find((p) => p.implemented)?.provider || cat?.providers[0]?.provider || ''
        next[c.id] = { provider: defProvider, secret: {}, config: {}, busy: false, msg: '', ok: false, evidence: null }
      }
      setForms(next)
      setLoading(false)
    })
  }, [open, demo, activeTenantId])

  const patch = (id: string, p: Partial<FormState>) => setForms((f) => ({ ...f, [id]: { ...f[id], ...p } }))

  async function save(c: ConnectorRow) {
    const f = forms[c.id]
    const def = providerFor(c.kind, f.provider)
    if (!def?.implemented) return
    const missing = [...def.secretFields, ...def.configFields].filter((fl) => {
      const bag = def.secretFields.includes(fl) ? f.secret : f.config
      return !String(bag[fl.key] ?? '').trim()
    })
    if (missing.length) { patch(c.id, { msg: `Fill: ${missing.map((m) => m.label).join(', ')}`, ok: false }); return }
    patch(c.id, { busy: true, msg: '', ok: false })
    const res = await setConnectorSecret(activeTenantId, c.id, f.provider, f.secret, f.config)
    patch(c.id, { busy: false, msg: res.ok ? 'Saved. Run a sync to pull evidence.' : (res.error ?? 'Save failed'), ok: res.ok })
  }

  async function sync(c: ConnectorRow) {
    patch(c.id, { busy: true, msg: 'Syncing…', ok: false })
    const res = await runIngest(activeTenantId, c.id)
    const r = res.ran?.[0]
    if (!res.ok || !r?.ok) {
      patch(c.id, { busy: false, ok: false, msg: r?.error ?? res.error ?? 'Sync failed' })
      return
    }
    // Show the freshest pulled evidence row (loadEvidence returns newest-first).
    const ev = await loadEvidence(activeTenantId)
    const row = ev[0] as { kind: string; value: unknown; source_system: string } | undefined
    patch(c.id, { busy: false, ok: true, msg: `✓ Pulled ${r.evidence} signal(s).`, evidence: row ? { kind: row.kind, value: row.value, source: row.source_system } : null })
    loadConnectors(activeTenantId).then(setConnectors)
  }

  return (
    <>
      <div className={`ev-back${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`evdrawer twin${open ? ' open' : ''}`} aria-label="Configure data sources">
        <div className="ev-h">
          <div className="ev-elabel">🔌 Configure data sources</div>
          <button className="ev-x" onClick={onClose}>←&nbsp; Back</button>
        </div>

        <div className="ev-b">
          <div className="twin-intro">
            Connect a real source to replace seed figures with pulled, content-hashed evidence.
            Credentials are write-only — stored server-side where only the ingestion function can read them.
          </div>

          {demo && <DemoPreview />}

          {!demo && !activeTenantId && (
            <div className="ob-empty">Go live in onboarding first — that creates your connectors.</div>
          )}
          {!demo && activeTenantId && loading && <div className="twin-busy">Loading your connectors…</div>}
          {!demo && activeTenantId && !loading && connectors.length === 0 && (
            <div className="ob-empty">No connectors yet. Toggle systems in onboarding, then go live.</div>
          )}

          {!demo && connectors.map((c) => {
            const cat = categoryFor(c.kind)
            const f = forms[c.id]
            if (!cat || !f) return null
            const def = providerFor(c.kind, f.provider)
            return (
              <div key={c.id} className="ds-card">
                <div className="ds-head">
                  <b>{cat.label}</b>
                  <span className={`ds-status ds-${c.status}`}>{c.status}{c.last_sync_at ? ` · ${new Date(c.last_sync_at).toLocaleString()}` : ''}</span>
                </div>

                <label className="ob-f">
                  <span>Provider</span>
                  <select className="linput2" value={f.provider} onChange={(e) => patch(c.id, { provider: e.target.value, msg: '', evidence: null })}>
                    {cat.providers.map((p) => <option key={p.provider} value={p.provider}>{p.label}{p.implemented ? '' : ' (coming soon)'}</option>)}
                  </select>
                </label>

                {def && (
                  <div className="ds-meta">
                    <span className="ds-badge" style={{ background: FREE_BADGE[def.free].c }}>{FREE_BADGE[def.free].t}</span>
                    <span>{def.signal}</span>
                    {def.signupUrl && <a href={def.signupUrl} target="_blank" rel="noreferrer">Get credentials →</a>}
                  </div>
                )}

                {def?.implemented ? (
                  <>
                    {def.configFields.map((fl) => (
                      <label key={fl.key} className="ob-f"><span>{fl.label}</span>
                        <input className="linput2" placeholder={fl.placeholder} value={f.config[fl.key] ?? ''}
                          onChange={(e) => patch(c.id, { config: { ...f.config, [fl.key]: e.target.value } })} />
                      </label>
                    ))}
                    {def.secretFields.map((fl) => (
                      <label key={fl.key} className="ob-f"><span>{fl.label}</span>
                        <input className="linput2" type={fl.secret ? 'password' : 'text'} placeholder={fl.placeholder} value={f.secret[fl.key] ?? ''}
                          autoComplete="off" onChange={(e) => patch(c.id, { secret: { ...f.secret, [fl.key]: e.target.value } })} />
                      </label>
                    ))}
                    <div className="ds-actions">
                      <button className="tbtn primary" disabled={f.busy} onClick={() => save(c)}>{f.busy ? '…' : 'Save credentials'}</button>
                      <button className="tbtn" disabled={f.busy} onClick={() => sync(c)} title="Run a read-only pull now">⟳ Sync now</button>
                    </div>
                  </>
                ) : (
                  <div className="ds-soon">Adapter not yet wired. {def?.free === 'enterprise' ? 'This vendor has no free API.' : 'A free adapter is planned.'}</div>
                )}

                {f.msg && <div className={`ds-msg${f.ok ? ' ok' : ' err'}`}>{f.msg}</div>}
                {f.evidence && (
                  <div className="ds-evidence">
                    <div className="ds-ev-k">Pulled evidence · {f.evidence.kind} · {f.evidence.source}</div>
                    <pre>{JSON.stringify(f.evidence.value, null, 2)}</pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}

function DemoPreview() {
  return (
    <div>
      <div className="twin-demo" style={{ display: 'block', marginBottom: 10 }}>
        Demo: connect a Supabase backend and go live to configure real sources. Free, self-serve options below.
      </div>
      {CONNECTOR_CATALOG.map((cat) => (
        <div key={cat.kind} className="ds-card">
          <div className="ds-head"><b>{cat.label}</b></div>
          {cat.providers.map((p) => (
            <div key={p.provider} className="ds-meta">
              <span className="ds-badge" style={{ background: FREE_BADGE[p.free].c }}>{FREE_BADGE[p.free].t}</span>
              <span>{p.label}{p.implemented ? '' : ' · planned'}</span>
              {p.signupUrl && <a href={p.signupUrl} target="_blank" rel="noreferrer">signup →</a>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'

// Phase 2b shows a representative CSF 2.0 tree on seed data so the drill
// function→category→control path is real. The COMPLETE authoritative catalogs
// (CSF/800-53/CIS/ISO/SOC 2, verbatim) and the deterministic CMMI scorer land in
// Phase 4.
type Control = { id: string; title: string; cmmi: number; status: 'ok' | 'warn' | 'crit' }
type Category = { id: string; title: string; controls: Control[] }
type Func = { key: string; name: string; cmmi: number; categories: Category[] }

const CSF: Func[] = [
  {
    key: 'GV', name: 'Govern', cmmi: 3,
    categories: [
      { id: 'GV.OC', title: 'Organizational Context', controls: [
        { id: 'GV.OC-01', title: 'Mission & stakeholder expectations understood', cmmi: 3, status: 'ok' },
      ] },
      { id: 'GV.RM', title: 'Risk Management Strategy', controls: [
        { id: 'GV.RM-01', title: 'Risk objectives agreed by stakeholders', cmmi: 4, status: 'ok' },
      ] },
    ],
  },
  {
    key: 'ID', name: 'Identify', cmmi: 3,
    categories: [
      { id: 'ID.AM', title: 'Asset Management', controls: [
        { id: 'ID.AM-01', title: 'Hardware inventory maintained', cmmi: 4, status: 'ok' },
      ] },
    ],
  },
  {
    key: 'PR', name: 'Protect', cmmi: 2,
    categories: [
      { id: 'PR.AA', title: 'Identity Mgmt, Authentication & Access', controls: [
        { id: 'PR.AA-05', title: 'Privileged access managed (PAM)', cmmi: 2, status: 'crit' },
      ] },
    ],
  },
  {
    key: 'DE', name: 'Detect', cmmi: 4,
    categories: [
      { id: 'DE.CM', title: 'Continuous Monitoring', controls: [
        { id: 'DE.CM-01', title: 'Networks & services monitored', cmmi: 4, status: 'ok' },
      ] },
    ],
  },
  {
    key: 'RS', name: 'Respond', cmmi: 3,
    categories: [
      { id: 'RS.MA', title: 'Incident Management', controls: [
        { id: 'RS.MA-01', title: 'Incident response plan executed', cmmi: 3, status: 'ok' },
      ] },
    ],
  },
  {
    key: 'RC', name: 'Recover', cmmi: 1,
    categories: [
      { id: 'RC.RP', title: 'Recovery Planning', controls: [
        { id: 'RC.RP-01', title: 'Recovery plan tested', cmmi: 1, status: 'crit' },
      ] },
    ],
  },
]

const FRAMEWORKS = [
  { key: 'csf', label: 'NIST CSF 2.0' },
  { key: 'r53', label: 'NIST 800-53' },
  { key: 'cis', label: 'CIS v8' },
  { key: 'iso', label: 'ISO 27001' },
  { key: 'soc2', label: 'SOC 2' },
]

function cmmiTone(n: number) {
  return n >= 3 ? 'ok' : n >= 2 ? 'warn' : 'crit'
}

export default function FrameworkPosture() {
  const [fw, setFw] = useState('csf')
  const [openFn, setOpenFn] = useState<string | null>('PR')

  return (
    <section className="view active" id="qF">
      <div className="vhead">
        <div className="q">
          Framework Posture <span className="ans ok">Evidence-backed</span>
        </div>
        <div className="qsub">Can I prove our posture to an auditor or regulator?</div>
        <div className="lead">
          The complete control catalogs mapped to live evidence — the proof behind every claim, and
          the basis for the assessments you can sell or hand to auditors on demand.
        </div>
      </div>

      <div className="sec-h">
        <h3>Framework posture — the proof</h3>
        <span className="meta">click a function → category → control to see its maturity</span>
      </div>

      <div className="fw-sel">
        {FRAMEWORKS.map((f) => (
          <button
            key={f.key}
            className={`seg${fw === f.key ? ' active' : ''}`}
            onClick={() => setFw(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="fw-actions">
        <button className="fwa primary" disabled title="Phase 4">⬇ Auditor report</button>
        <button className="fwa" disabled title="Phase 4">⬇ Evidence package</button>
        <button className="fwa" disabled title="Phase 4">📊 Benchmark vs peers</button>
        <span className="fwa-note">Exports generate on demand in Phase 4 · narrative over signed, cited evidence</span>
      </div>

      {fw !== 'csf' ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <p>
            The full <b>{FRAMEWORKS.find((f) => f.key === fw)?.label}</b> catalog loads verbatim from
            its authoritative source in Phase 4. CSF 2.0 below is a seed sample of the drill path.
          </p>
        </div>
      ) : (
        <div className="fwtree" style={{ marginTop: 12 }}>
          {CSF.map((fn) => (
            <div className="fwfn" key={fn.key}>
              <button
                className="fwfn-h"
                onClick={() => setOpenFn(openFn === fn.key ? null : fn.key)}
              >
                <span className="fwfn-n">{fn.name}</span>
                <span className={`fwcmmi ${cmmiTone(fn.cmmi)}`}>CMMI {fn.cmmi}</span>
                <span className="fwfn-x">{openFn === fn.key ? '−' : '+'}</span>
              </button>
              {openFn === fn.key &&
                fn.categories.map((cat) => (
                  <div className="fwcat" key={cat.id}>
                    <div className="fwcat-h">
                      <span className="mono">{cat.id}</span> {cat.title}
                    </div>
                    {cat.controls.map((c) => (
                      <div className="fwctrl" key={c.id}>
                        <span className="mono">{c.id}</span>
                        <span className="fwctrl-t">{c.title}</span>
                        <span className={`fwcmmi ${cmmiTone(c.cmmi)}`}>CMMI {c.cmmi}</span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <div className="cmmi-legend">
        <span className="cl-t">CMMI maturity</span>
        <span className="cl"><b>0</b> Non-existent</span>
        <span className="cl"><b>1</b> Initial</span>
        <span className="cl"><b>2</b> Managed</span>
        <span className="cl"><b>3</b> Defined</span>
        <span className="cl"><b>4</b> Quantitatively Managed</span>
        <span className="cl"><b>5</b> Optimizing</span>
      </div>
    </section>
  )
}

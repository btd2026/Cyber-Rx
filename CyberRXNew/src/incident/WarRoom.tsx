import { useIncident } from './IncidentProvider'
import {
  SYS_CALM, SYS_LIVE, CHAIN, BLAST, CONTAIN, RECOVERY, REGCLK, DECS, BRIDGE, READY, ATTCK,
  type Sys, type Cell,
} from './data'

function SysCard({ s }: { s: Sys }) {
  return (
    <div className="wr2-sys">
      <div className="wr2-sysh">
        <div><div className="nm">{s.nm}</div><div className="sub">{s.sub}</div></div>
        <span className={`wr2-dot ${s.st}`} />
      </div>
      <div className={`wr2-m ${s.st}`}>{s.m}</div>
      <div className="wr2-ev">{s.ev.map((e) => <div key={e}>• {e}</div>)}</div>
    </div>
  )
}
function CellRow({ c }: { c: Cell }) {
  return (
    <div className="wr2-cell">
      <div><div className="t">{c.t}</div><div className="d">{c.d}</div></div>
      <span className={`wr2-pill ${c.st}`}>{c.lbl}</span>
    </div>
  )
}
function Sec({ children }: { children: string }) {
  return <div className="wr2-sec">{children}</div>
}

export default function WarRoom({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { active, muted, feed, elapsed, trigger, contain, toggleMute } = useIncident()
  if (!open) return null

  return (
    <div className="wr2-overlay">
      <div className="wr2-head wrap">
        <div className="wr2-title">⚠ War Room <span className={`wr2-mode${active ? ' live' : ''}`}>{active ? '● LIVE INCIDENT' : 'STANDBY'}</span></div>
        <div className="wr2-actions">
          <button className="tbtn" onClick={toggleMute} title="Sound preference">{muted ? '🔇' : '🔊'}</button>
          <button className={`tbtn ${active ? '' : 'primary'}`} onClick={active ? contain : trigger}>
            {active ? '✓ Declare contained' : '▶ Simulate live incident'}
          </button>
          <button className="tbtn" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="wr2-body wrap">
        {active ? (
          <>
            <div className="wr2-banner live">
              <div><div className="h">RANSOMWARE — Claims Processing</div><div className="s">SEV-1 · ACTIVE · INC-2026-0623-001 · commander: Sarah (CISO) · BlackCat/ALPHV</div></div>
              <div className="wr2-stat">
                <div><div className="k">Elapsed</div><div className="v crit">{elapsed}</div></div>
                <div><div className="k">Revenue at risk</div><div className="v crit">$2.3M/hr</div></div>
                <div><div className="k">Recovery ETA</div><div className="v warn">~3.5 days</div></div>
                <div><div className="k">Records exposed</div><div className="v ok">0 confirmed</div></div>
              </div>
            </div>

            <Sec>Live system feeds — what each tool is reporting now</Sec>
            <div className="wr2-grid">{SYS_LIVE.map((s) => <SysCard key={s.nm} s={s} />)}</div>

            <Sec>Attack path · kill chain</Sec>
            <div className="wr2-chain">
              {CHAIN.map((c) => (
                <div className={`wr2-stage ${c.st}`} key={c.nm}>
                  <div className="st">{c.st === 'done' ? 'adversary reached' : c.st === 'active' ? 'in progress' : 'blocked'}</div>
                  <div className="nm">{c.nm}</div>
                  <div className="n2">{c.n}</div>
                </div>
              ))}
            </div>

            <Sec>Automated containment — what the stack already executed</Sec>
            <div className="wr2-cells">{CONTAIN.map((c) => <CellRow key={c.t} c={c} />)}</div>

            <Sec>Blast radius · crown jewels &amp; processes</Sec>
            <div className="wr2-cells">{BLAST.map((c) => <CellRow key={c.t} c={c} />)}</div>

            <Sec>Recovery &amp; resilience — can we restore, and how fast</Sec>
            <div className="wr2-cells">{RECOVERY.map((c) => <CellRow key={c.t} c={c} />)}</div>

            <Sec>Threat intelligence &amp; attribution</Sec>
            <div className="wr2-comms">
              <b>Actor:</b> BlackCat/ALPHV affiliate · confidence <b>High</b> · double-extortion.{' '}
              <b>IOCs:</b> C2 91.211.x.x, 2 domains, encryptor hash — shared to H-ISAC.{' '}
              <b>MITRE ATT&amp;CK:</b> {ATTCK.map((t) => <span key={t} className="wr2-attck">{t}</span>)}
            </div>

            <Sec>Live event feed</Sec>
            <div className="wr2-log">
              {feed.map((f, i) => (
                <div className={`ln ${f[3]}`} key={`${f[0]}-${f[1]}-${i}`}>{f[0]}&nbsp;&nbsp;<b>{f[1]}</b>&nbsp;&nbsp;{f[2]}</div>
              ))}
            </div>

            <Sec>Regulatory exposure clocks — deadlines now running</Sec>
            <div className="wr2-cells">{REGCLK.map((c) => <CellRow key={c.t} c={c} />)}</div>

            <Sec>Decisions required now</Sec>
            <div className="wr2-dec">{DECS.map((d) => <div className="wr2-dcell" key={d.r}><div className="r">{d.r}</div><div className="d">{d.d}</div></div>)}</div>

            <Sec>Incident bridge &amp; external coordination</Sec>
            <div className="wr2-dec">{BRIDGE.map((d) => <div className="wr2-dcell" key={d.r}><div className="r">{d.r}</div><div className="d">{d.d}</div></div>)}</div>

            <Sec>Comms &amp; regulatory status</Sec>
            <div className="wr2-comms"><b>Board:</b> briefed 14:06 · <b>Legal:</b> 11-state assessment open, SEC clock evaluating · <b>Insurer:</b> notification drafted · <b>Customers/media:</b> holding statements pre-drafted, awaiting Legal sign-off.</div>
          </>
        ) : (
          <>
            <div className="wr2-banner calm">
              <div><div className="h">● No active incident</div><div className="s">Continuous monitoring · last threat-hunt 6h ago, clean · all feeds streaming</div></div>
              <div className="wr2-stat">
                <div><div className="k">Active incidents</div><div className="v ok">0</div></div>
                <div><div className="k">Systems online</div><div className="v ok">9 / 9</div></div>
                <div><div className="k">MTTD (90d)</div><div className="v ok">8 min</div></div>
              </div>
            </div>
            <Sec>Live system feeds — what each tool is reporting now</Sec>
            <div className="wr2-grid">{SYS_CALM.map((s) => <SysCard key={s.nm} s={s} />)}</div>
            <Sec>Response readiness — armed and ready</Sec>
            <div className="wr2-cells">{READY.map((c) => <CellRow key={c.t} c={c} />)}</div>
            <div className="wr2-comms" style={{ marginTop: 16 }}>
              On a qualifying detection this room goes <b>live</b>: the alarm sounds, the War Room
              button flashes across every seat, and the C-suite is convened with shared facts and
              role-specific decisions. Use <b>Simulate live incident</b> to preview.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

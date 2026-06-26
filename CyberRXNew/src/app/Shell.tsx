import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEATS, CISO_TABS, seatById, type SeatId } from '../seats/seats'
import { useCurrentUser } from './useCurrentUser'
import { useAuth } from '../auth/AuthProvider'
import { initialTheme, persistTheme, type Theme } from './theme'
import { LedgerProvider, useLedger } from '../ledger/LedgerProvider'
import { EvidenceProvider } from '../seats/ciso/EvidenceDrawer'
import { getSeat } from '../seats/seatData'
import CisoSeat from '../seats/CisoSeat'
import SeatRenderer from '../seats/SeatRenderer'
import AskTwin from '../seats/ciso/AskTwin'

const decode = (s: string) => s.replace(/&amp;/g, '&')

function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="clock">LIVE · {now.toLocaleTimeString([], { hour12: false })}</span>
}

function ShellInner() {
  const user = useCurrentUser()
  const { signOut } = useAuth()
  const { openLedger, decisions } = useLedger()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [viewedSeat, setViewedSeat] = useState<SeatId>(user.ownSeat)
  const [tab, setTab] = useState('exec')
  const [twinOpen, setTwinOpen] = useState(false)

  useEffect(() => {
    persistTheme(theme)
  }, [theme])

  const seat = seatById(viewedSeat)
  const viewingOwn = viewedSeat === user.ownSeat

  return (
    <>
      <div className="topbar">
        <div className="wrap topbar-in">
          <div className="brand">
            <div className="logo">Rx</div>
            <b>CyberRx</b>
            <span className="ctx">{seat.label} · OPERATING SYSTEM</span>
          </div>
          <div className="topbar-right">
            <span className="trust">
              <span className="pulse" />
              <LiveClock />
              <span className="tdiv" />
              <span>🛡 Integrity verified</span>
            </span>
            <span className="authpill">
              <span>🔓</span> {user.name} · <span className="role">{seatById(user.ownSeat).label}</span>
              {!user.demo && (
                <button className="so" title="Sign out" onClick={signOut}>
                  ⏻
                </button>
              )}
            </span>
            <button className="warbtn" disabled title="War Room — Phase 6">
              ⚠ War Room
            </button>
            <button className="tbtn" onClick={() => setTwinOpen(true)} title="Ask your Executive Twin">
              ✦ Ask Twin
            </button>
            <button className="tbtn" onClick={openLedger} title="Decision ledger">
              ⚖ Decisions{decisions.length > 0 ? ` · ${decisions.length}` : ''}
            </button>
            <button className="tbtn" onClick={() => navigate('/onboarding')} title="Organization onboarding">
              ⚙ Onboarding
            </button>
            <button className="tbtn" disabled title="Audit log — Phase 6">
              Audit log
            </button>
            <button
              className="toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle light / dark"
            >
              ◐ {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>
      </div>

      <div className="seatbar">
        <div className="wrap seatbar-in">
          <span className="vl">View as</span>
          {SEATS.map((s) => (
            <button
              key={s.id}
              className={`sb${s.id === viewedSeat ? ' active' : ''}`}
              onClick={() => {
                setViewedSeat(s.id)
                setTab('exec')
              }}
            >
              {s.label}
              {s.id === user.ownSeat && <span className="you">YOU</span>}
            </button>
          ))}
          <span className="seed-flag" title="Figures are illustrative seed data until connectors are wired (Phase 6)">
            ● Seed data
          </span>
        </div>
      </div>

      {viewedSeat === 'ciso' ? (
        <div className="nav">
          <div className="wrap nav-in">
            {CISO_TABS.map((t) => (
              <button
                key={t.id}
                className={`nb${t.home ? ' home' : ''}${t.id === tab ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.home ? (
                  <>{t.mark} {t.label}</>
                ) : (
                  <>
                    <span className="qn">{t.mark}</span>
                    {t.label}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        getSeat(viewedSeat) && (
          <div className="nav">
            <div className="wrap nav-in">
              {getSeat(viewedSeat)!.nav.map((t) => (
                <button
                  key={t.id}
                  className={`nb${t.id === 'exec' ? ' home' : ''}${t.id === tab ? ' active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {decode(t.label)}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      <div className="wrap">
        {!viewingOwn && (
          <div className="vob">
            <span className="eye">👁</span>
            <span>
              You're signed in as <b>{seatById(user.ownSeat).label}</b> — you can <b>view</b> this
              cockpit but not change it. Switch to your own seat to edit.
            </span>
          </div>
        )}

        <EvidenceProvider>
          {viewedSeat === 'ciso' ? (
            <CisoSeat tab={tab} go={setTab} />
          ) : (
            <SeatRenderer
              blocks={getSeat(viewedSeat)?.views[tab] ?? getSeat(viewedSeat)?.views.exec ?? []}
              go={setTab}
            />
          )}
        </EvidenceProvider>
      </div>

      <AskTwin open={twinOpen} onClose={() => setTwinOpen(false)} />
    </>
  )
}

export default function Shell() {
  const user = useCurrentUser()
  return (
    <LedgerProvider owner={`${user.name} · ${seatById(user.ownSeat).label}`}>
      <ShellInner />
    </LedgerProvider>
  )
}

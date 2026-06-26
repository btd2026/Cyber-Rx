import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { FEED_SEED, FEED_POOL, type FeedLine } from './data'

type IncidentCtx = {
  active: boolean
  muted: boolean
  feed: FeedLine[]
  elapsed: string
  trigger: () => void
  contain: () => void
  toggleMute: () => void
}

const Ctx = createContext<IncidentCtx | null>(null)
// eslint-disable-next-line react-refresh/only-export-components
export const useIncident = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useIncident must be used within IncidentProvider')
  return v
}

function fmtElapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [muted, setMuted] = useState(false)
  const [feed, setFeed] = useState<FeedLine[]>([])
  const [, setNow] = useState(0) // force re-render for the elapsed clock
  const startRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(false)
  const activeRef = useRef(false)

  function ensureAudio() {
    if (!audioRef.current) {
      try {
        audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      } catch {
        /* no audio */
      }
    }
    if (audioRef.current?.state === 'suspended') audioRef.current.resume().catch(() => {})
  }
  function beep() {
    const ctx = audioRef.current
    if (!ctx) return
    const t = ctx.currentTime
    ;[[920, 0], [680, 0.2]].forEach(([f, d]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'square'
      o.frequency.value = f
      o.connect(g)
      g.connect(ctx.destination)
      g.gain.setValueAtTime(0.0001, t + d)
      g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.17)
      o.start(t + d)
      o.stop(t + d + 0.2)
    })
  }
  function alarmLoop() {
    if (!activeRef.current || mutedRef.current) return
    beep()
    alarmRef.current = setTimeout(alarmLoop, 2300)
  }

  function trigger() {
    if (activeRef.current) return // already live — don't leak a second interval/alarm
    ensureAudio() // called from a user click → autoplay-safe
    activeRef.current = true
    startRef.current = Date.now()
    setFeed(FEED_SEED.slice())
    setActive(true)
    if (!mutedRef.current) alarmLoop()
    let n = 0
    tickRef.current = setInterval(() => {
      n++
      setNow((x) => x + 1)
      if (n % 3 === 0) {
        const p = FEED_POOL[Math.floor((n / 3) % FEED_POOL.length)]
        const ts = `14:${String((2 + Math.floor(n / 20)) % 60).padStart(2, '0')}:${String((n * 7) % 60).padStart(2, '0')}`
        setFeed((f) => [...f, [ts, p[0], p[1], p[2]] as FeedLine].slice(-16))
      }
    }, 1000)
  }
  function contain() {
    activeRef.current = false
    setActive(false)
    if (tickRef.current) clearInterval(tickRef.current)
    if (alarmRef.current) clearTimeout(alarmRef.current)
  }
  function toggleMute() {
    setMuted((m) => {
      const next = !m
      mutedRef.current = next
      if (next && alarmRef.current) clearTimeout(alarmRef.current)
      else if (!next && activeRef.current) alarmLoop()
      return next
    })
  }

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (alarmRef.current) clearTimeout(alarmRef.current)
    }
  }, [])

  const elapsed = active ? fmtElapsed(Date.now() - startRef.current) : '00:00'

  return (
    <Ctx.Provider value={{ active, muted, feed, elapsed, trigger, contain, toggleMute }}>
      {children}
    </Ctx.Provider>
  )
}

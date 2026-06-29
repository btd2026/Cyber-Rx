import { useEffect, useRef, useState } from 'react'
import { briefingScript } from '../engine/briefing'
import type { SeatId } from './seats'

const VOICE_BLACKLIST = ['albert','bad news','bahh','bells','boing','bubbles','cellos','deranged','good news','jester','organ','superstar','trinoids','whisper','wobble','zarvox','junior','ralph','fred','kathy','princess','eddy','flo','grandma','grandpa','reed','rocko','sandy','shelley','bruce','agnes','vicki','victoria','novelty']

const VOICE_PREF: Record<string, { rate: number; pitch: number; pref: string[] }> = {
  ceo:   { rate: 0.95, pitch: 0.97, pref: ['Alex','Aaron','Tom','Microsoft Guy','Microsoft Andrew','Google UK English Male','Daniel','Oliver'] },
  ciso:  { rate: 0.99, pitch: 1.02, pref: ['Samantha','Ava','Microsoft Aria','Google US English','Allison','Nicky','Susan'] },
  cfo:   { rate: 0.96, pitch: 1.0,  pref: ['Susan','Allison','Microsoft Jenny','Microsoft Michelle','Joelle','Karen','Samantha'] },
  cio:   { rate: 1.0,  pitch: 0.99, pref: ['Rishi','Daniel','Google UK English Male','Microsoft Guy','Alex','Oliver'] },
  clo:   { rate: 0.94, pitch: 1.0,  pref: ['Moira','Tessa','Fiona','Kate','Microsoft Michelle','Serena','Karen'] },
  cro:   { rate: 0.98, pitch: 1.05, pref: ['Serena','Allison','Microsoft Zira','Google US English','Ava','Kate','Samantha'] },
  board: { rate: 0.92, pitch: 0.95, pref: ['Daniel','Microsoft Andrew','Microsoft David','Google UK English Male','Alex','Oliver'] },
}

function isNatural(v: SpeechSynthesisVoice) {
  const n = v.name.toLowerCase()
  return !VOICE_BLACKLIST.some(b => n.includes(b))
}

function pickVoice(seatId: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const en = voices.filter(v => (v.lang || '').toLowerCase().startsWith('en')).filter(isNatural)
  const cfg = VOICE_PREF[seatId] || VOICE_PREF.ciso
  for (const want of cfg.pref) {
    const match = en.find(v => v.name.toLowerCase().includes(want.toLowerCase()))
    if (match) return match
  }
  return en[0] || voices[0] || null
}

export default function VoiceBrief({ open, seatId, seatLabel, name, onClose }: {
  open: boolean
  seatId: SeatId
  seatLabel: string
  name: string
  onClose: () => void
}) {
  const [speaking, setSpeaking] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [voicesReady, setVoicesReady] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const script = briefingScript(seatId, seatLabel)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!supported) return
    const check = () => {
      if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true)
    }
    check()
    window.speechSynthesis.onvoiceschanged = check
    return () => {
      window.speechSynthesis.cancel()
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [supported])

  useEffect(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [open, seatId, supported])

  function play() {
    if (!supported) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(script)
    const voice = pickVoice(seatId)
    if (voice) u.voice = voice
    const cfg = VOICE_PREF[seatId] || VOICE_PREF.ciso
    u.rate = cfg.rate
    u.pitch = cfg.pitch
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking) window.speechSynthesis.resume()
      else clearInterval(keepAlive)
    }, 5000)
    u.onend = () => { clearInterval(keepAlive); setSpeaking(false) }
    u.onerror = () => { clearInterval(keepAlive); setSpeaking(false) }
    utterRef.current = u
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }
  function stop() {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  if (!open) return null
  return (
    <div className="voicebar">
      <div className="wrap voicebar-in">
        <span className="vb-av">{name[0]}</span>
        <div className="vb-meta">
          <span className="vb-nm">{name}</span>
          <span className="vb-st">your {seatLabel} advisor · demo voice (browser) · prod: server-side neural TTS</span>
        </div>
        {speaking && (
          <span className="vb-wave"><span /><span /><span /><span /><span /></span>
        )}
        {!speaking ? (
          <button className="tbtn primary" onClick={play} disabled={!supported || !voicesReady} title={!supported ? 'Speech not supported here' : !voicesReady ? 'Loading voices...' : ''}>
            ▶ Brief me
          </button>
        ) : (
          <button className="tbtn" onClick={stop}>■ Stop</button>
        )}
        <button className="tbtn" onClick={() => setShowScript((s) => !s)}>{showScript ? 'Hide' : 'Script'}</button>
        <button className="vb-x" onClick={onClose} title="Close">×</button>
      </div>
      {showScript && <div className="wrap"><div className="vb-script">{script}</div></div>}
    </div>
  )
}

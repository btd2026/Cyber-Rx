import { useEffect, useRef, useState } from 'react'
import { briefingScript } from '../engine/briefing'
import { SEATS, type SeatId } from './seats'

// Voice briefing bar (Phase 5d). Demo: browser speech synthesis, one voice per
// seat (chosen deterministically), clearly flagged. Production: server-side
// neural TTS, one voice per seat, on the same grounded script.
export default function VoiceBrief({ open, seatId, seatLabel, name, onClose }: {
  open: boolean
  seatId: SeatId
  seatLabel: string
  name: string
  onClose: () => void
}) {
  const [speaking, setSpeaking] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const script = briefingScript(seatId, seatLabel)
  const seatIdx = Math.max(0, SEATS.findIndex((s) => s.id === seatId))
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  // Stop speaking if the bar closes or the seat changes.
  useEffect(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [open, seatId, supported])

  function play() {
    if (!supported) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(script)
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) u.voice = voices[seatIdx % voices.length] // one voice per seat
    u.rate = 1.0
    u.onend = () => setSpeaking(false)
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
          <button className="tbtn primary" onClick={play} disabled={!supported} title={supported ? '' : 'Speech not supported here'}>
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

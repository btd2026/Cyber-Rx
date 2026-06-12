/**
 * agentVoice — shared "Michael" (CISO agent) voice hook
 * -----------------------------------------------------
 * One place for the CISO agent's spoken narration. The voice TEACHES (it speaks
 * the SME `narration`, not the on-screen text). Mute state is shared across the
 * whole CISO experience via localStorage, so muting on one page mutes the agent
 * everywhere. Every page that narrates exposes this mute control.
 */

import { useState, useCallback, useEffect } from 'react';

const MUTE_KEY = 'cx_ciso_voice_muted';

function pickMichael() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const vs = window.speechSynthesis.getVoices() || [];
  const prefer = ['Microsoft Guy Online (Natural)', 'Google US English', 'Daniel', 'Microsoft David', 'Alex'];
  for (const name of prefer) { const v = vs.find((x) => x.name === name); if (v) return v; }
  return vs.find((v) => /en/i.test(v.lang) && /male|guy|daniel|david|alex|mark|ryan/i.test(v.name))
    || vs.find((v) => /en/i.test(v.lang)) || null;
}

export function stopVoice() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

export function useAgentVoice() {
  const [muted, setMutedState] = useState(() => {
    try { return typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { return false; }
  });
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => { stopVoice(); setSpeaking(false); }, []);

  const setMuted = useCallback((v) => {
    setMutedState(v);
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (_) {}
    if (v) stop();
  }, [stop]);

  const speak = useCallback((text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
    if (muted) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    const v = pickMichael(); if (v) u.voice = v;
    u.rate = 1.03; u.pitch = 1.0;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [muted]);

  useEffect(() => () => stopVoice(), []);
  return { muted, setMuted, speaking, speak, stop };
}

/** Small inline control: mute toggle + replay, shown on any narrating page. */
export function VoiceControls({ voice, onReplay, label }) {
  const { muted, setMuted, speaking, stop } = voice;
  const btn = { border: 'none', borderRadius: 16, padding: '5px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {!muted && onReplay && (
        <button onClick={() => (speaking ? stop() : onReplay())} style={{ ...btn, background: speaking ? '#C0392B' : '#0f172a', color: '#fff' }}>
          {speaking ? '■ Stop' : `▶ ${label || 'Hear Michael'}`}
        </button>
      )}
      <button onClick={() => setMuted(!muted)} title={muted ? 'Unmute the agent' : 'Mute the agent'}
        style={{ ...btn, background: muted ? '#fee2e2' : '#eef2f6', color: muted ? '#C0392B' : '#475569', border: '1px solid ' + (muted ? '#fecaca' : '#e2e8f0') }}>
        {muted ? '🔇 Muted' : '🔊 Voice on'}
      </button>
    </div>
  );
}

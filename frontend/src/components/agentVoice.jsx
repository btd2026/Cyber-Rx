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

// Make narration sound human and pronounce cleanly on any TTS engine: expand
// acronyms (spaced letters read as letters; the rest as full words), soften to
// contractions, and tidy punctuation. Longest patterns first so "NIST CSF 2.0"
// wins over "CSF". Word-boundaried + case-sensitive so we don't mangle words.
const SAY = [
  ['NIST CSF 2.0', 'the NIST Cybersecurity Framework, version two point zero'],
  ['NIST CSF', 'the NIST Cybersecurity Framework'],
  ['NIST AI RMF', 'the NIST A I Risk Management Framework'],
  ['NIST SP 800-53', 'NIST Special Publication 800 dash 53'],
  ['NIST 800-53', 'NIST 800 dash 53'],
  ['OWASP LLM Top 10', 'the O-WASP Top Ten for large language models'],
  ['OWASP LLM', 'the O-WASP Top Ten for large language models'],
  ['OWASP', 'O-WASP'],
  ['MITRE ATLAS', 'MITRE Atlas'],
  ['ATT&CK', 'attack'],
  ['EU AI Act', 'the E U A I Act'],
  ['AI-BOM', 'A I bill of materials'],
  ['AI/ML', 'A I and machine learning'],
  ['LLMs', 'large language models'],
  ['LLM', 'large language model'],
  ['ROI', 'return on investment'],
  ['PHI', 'protected health information'],
  ['PII', 'personal information'],
  ['PCI', 'payment card data'],
  ['MFA', 'multi-factor authentication'],
  ['EDR', 'endpoint detection and response'],
  ['SIEM', 'seem'],
  ['DLP', 'data loss prevention'],
  ['PAM', 'privileged access management'],
  ['CSPM', 'cloud security posture management'],
  ['KEV', 'known exploited vulnerability'],
  ['RTO', 'recovery time objective'],
  ['MTTR', 'mean time to respond'],
  ['MTTD', 'mean time to detect'],
  ['KRIs', 'key risk indicators'],
  ['KRI', 'key risk indicator'],
  ['SOC 2', 'sock two'],
  ['DPA', 'data processing agreement'],
  ['BAA', 'business associate agreement'],
  ['RBC', 'risk-based capital'],
  ['SLA', 'service level agreement'],
  ['CISO', 'Chief Information Security Officer'],
  ['CIO', 'Chief Information Officer'],
  ['CFO', 'Chief Financial Officer'],
  ['CRO', 'Chief Risk Officer'],
  ['CLO', 'Chief Legal Officer'],
  ['CIS', 'C I S'],
  ['AI', 'A I'],
];
export function humanize(text) {
  let s = String(text || '');
  for (const [k, v] of SAY) {
    const esc = k.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&');
    s = s.replace(new RegExp('(^|[^A-Za-z0-9])' + esc + '(?![A-Za-z0-9])', 'g'), (m, p1) => p1 + v);
  }
  return s
    .replace(/\bit is\b/g, "it's").replace(/\bwe are\b/g, "we're").replace(/\bthat is\b/g, "that's")
    .replace(/\byou are\b/g, "you're").replace(/\bdo not\b/g, "don't").replace(/\bcannot\b/g, "can't")
    .replace(/\s—\s/g, ', ').replace(/—/g, ', ').replace(/–/g, ' to ')
    .replace(/\s{2,}/g, ' ').trim();
}

function pickMichael() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const vs = window.speechSynthesis.getVoices() || [];
  // Prefer the most natural/neural English voices available in the browser.
  const prefer = ['Google US English', 'Microsoft Aria Online (Natural)', 'Microsoft Guy Online (Natural)', 'Microsoft Jenny Online (Natural)', 'Samantha', 'Daniel'];
  for (const name of prefer) { const v = vs.find((x) => x.name === name); if (v) return v; }
  return vs.find((v) => /en/i.test(v.lang) && /natural|neural|online/i.test(v.name))
    || vs.find((v) => /en-US/i.test(v.lang))
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
    const u = new SpeechSynthesisUtterance(humanize(text));
    const v = pickMichael(); if (v) u.voice = v;
    // Slightly slower + natural pitch reads as more human and clearer.
    u.rate = 0.98; u.pitch = 1.0;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [muted]);

  useEffect(() => () => stopVoice(), []);
  return { muted, setMuted, speaking, speak, stop };
}

/** Small inline control: mute toggle + replay, shown on any narrating page.
 * `compact` renders only a discreet Listen/Stop affordance (no global mute
 * toggle) for use on repeated cards, so the mute control lives once per page. */
export function VoiceControls({ voice, onReplay, label, compact }) {
  const { muted, setMuted, speaking, stop } = voice;
  const btn = { border: 'none', borderRadius: 16, padding: '5px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' };
  if (compact) {
    if (muted || !onReplay) return null;
    return (
      <button onClick={() => (speaking ? stop() : onReplay())} title={speaking ? 'Stop narration' : 'Listen to the analysis'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid ' + (speaking ? '#fca5a5' : '#e2e8f0'), color: speaking ? '#C0392B' : '#64748b', borderRadius: 999, padding: '4px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
        {speaking ? '■ Stop' : '🔊 Listen'}
      </button>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {!muted && onReplay && (
        <button onClick={() => (speaking ? stop() : onReplay())} style={{ ...btn, background: speaking ? '#C0392B' : '#0f172a', color: '#fff' }}>
          {speaking ? '■ Stop' : `▶ ${label || 'Listen'}`}
        </button>
      )}
      <button onClick={() => setMuted(!muted)} title={muted ? 'Unmute the agent' : 'Mute the agent'}
        style={{ ...btn, background: muted ? '#fee2e2' : '#eef2f6', color: muted ? '#C0392B' : '#475569', border: '1px solid ' + (muted ? '#fecaca' : '#e2e8f0') }}>
        {muted ? '🔇 Muted' : '🔊 Voice on'}
      </button>
    </div>
  );
}

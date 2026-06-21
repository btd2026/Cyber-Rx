/**
 * soundFx — subtle, professional UI sound cues via the Web Audio API.
 *
 * No audio assets (synthesized oscillator tones), respects a persisted mute flag,
 * and honors the browser autoplay policy: the AudioContext is resumed on the first
 * user gesture, so cues play only after the user has interacted with the page.
 */

let ctx = null;
let unlocked = false;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) { try { ctx = new AC(); } catch (_) { return null; } }
  return ctx;
}

export function isMuted() {
  try { return localStorage.getItem('cyberrx_sfx_muted') === '1'; } catch (_) { return false; }
}
export function setMuted(m) {
  try { localStorage.setItem('cyberrx_sfx_muted', m ? '1' : '0'); } catch (_) {}
}

function unlock() {
  if (unlocked) return;
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
  unlocked = true;
}
if (typeof window !== 'undefined') {
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, unlock, { passive: true }));
}

// A single soft sine "blip" with a quick attack and gentle exponential decay.
function tone(freq, startT, dur, peak) {
  const c = getCtx(); if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startT);
  gain.gain.setValueAtTime(0.0001, startT);
  gain.gain.exponentialRampToValueAtTime(peak, startT + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
  osc.connect(gain); gain.connect(c.destination);
  osc.start(startT); osc.stop(startT + dur + 0.03);
}

// Bright, pleasant two-note rise — a score increase / positive event.
export function scoreUp() {
  if (isMuted()) return;
  const c = getCtx(); if (!c) return; unlock();
  const t = c.currentTime;
  tone(587.33, t, 0.16, 0.06);        // D5
  tone(880.00, t + 0.10, 0.24, 0.07); // A5
}

// Soft, low descending pair — a decline. Deliberately muted and non-alarming.
export function scoreDown() {
  if (isMuted()) return;
  const c = getCtx(); if (!c) return; unlock();
  const t = c.currentTime;
  tone(440.00, t, 0.16, 0.05);        // A4
  tone(329.63, t + 0.10, 0.26, 0.05); // E4
}

// A tiny tick for interactive affordances.
export function tick() {
  if (isMuted()) return;
  const c = getCtx(); if (!c) return; unlock();
  tone(660, c.currentTime, 0.05, 0.03);
}

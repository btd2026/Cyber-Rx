/**
 * theme — CyberRX executive design language ("editorial intelligence").
 *
 * A deliberately distinctive identity for Fortune-50/100 audiences: a deep navy
 * canvas with a restrained brass accent used ONLY for chrome (brand, active
 * indicators, dividers) — never for status, so green/amber/red keep their meaning.
 * Serif display type (Fraunces) gives executive gravitas; a mono face gives
 * figures a precise, instrument-panel feel. Centralized so the look can be
 * retuned in one place and rolled across every surface.
 */

export const FONTS = {
  display: "'Fraunces', 'Newsreader', Georgia, serif",
  body: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
};

export const COLORS = {
  // Ink (light surfaces)
  ink: '#0c1622', ink2: '#42526b', ink3: '#8595ab', hair: '#e7ecf3', paper: '#f6f8fc', white: '#ffffff',
  // Navy (dark chrome)
  navy0: '#0a1626', navy1: '#0f2236', navy2: '#16304a', navyLine: '#23415f', navyInk: '#9fb3cc',
  // Brass accent — CHROME ONLY (brand, active nav, hairline highlights)
  accent: '#c8a35b', accentSoft: '#e7d2a6', accentDim: 'rgba(200,163,91,0.14)',
  // Status (semantic — unchanged)
  good: '#1f8a4c', warn: '#b07c2e', bad: '#c0392b',
};

// Signature hero canvas: a low brass glow over a navy gradient.
export const HERO_BG =
  'radial-gradient(1100px 380px at 10% -20%, rgba(200,163,91,0.12), transparent 60%), ' +
  'linear-gradient(135deg, #0a1626 0%, #0f2236 58%, #16304a 100%)';

export const ELEV = {
  card: '0 1px 2px rgba(12,22,34,0.05), 0 12px 28px -18px rgba(12,22,34,0.22)',
  pop: '0 24px 64px rgba(8,15,28,0.30)',
};

export const RADIUS = { sm: 8, md: 12, lg: 16, pill: 999 };

export default { FONTS, COLORS, HERO_BG, ELEV, RADIUS };

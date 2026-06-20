/**
 * theme — CyberRX design language ("Modern SaaS").
 *
 * A clean, near-monochrome system in the Linear / Vercel idiom: a light neutral
 * canvas, near-black ink, a single indigo accent used for interactive chrome
 * (brand, active nav, focus, primary actions) — never for status, so green/
 * amber/red keep their meaning. Inter throughout (no serif) for a confident,
 * data-forward feel; a mono face for code-like identifiers. Centralized so the
 * look retunes in one place and rolls across every surface.
 */

export const FONTS = {
  display: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  body: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
};

export const COLORS = {
  // Ink (light surfaces)
  ink: '#0b0c0e', ink2: '#5c6066', ink3: '#8b9098', hair: '#ebecf0', paper: '#fbfbfc', white: '#ffffff',
  text: '#0b0c0e', primary: '#5e6ad2',
  // Subtle panel / hairline-strong
  subtle: '#f6f7f9', hairStrong: '#dfe1e6',
  // Dark slate (used by section-header banners via HERO_BG) — neutral, no brass
  navy0: '#0b0c0e', navy1: '#15171c', navy2: '#1c1f26', navyLine: '#2a2e36', navyInk: '#9aa0a8',
  // Indigo accent — INTERACTIVE CHROME ONLY (brand, active nav, focus, primary)
  accent: '#5e6ad2', accentSoft: '#eef0fb', accentDim: 'rgba(94,106,210,0.12)', accentText: '#4a52b0',
  // Status (semantic)
  good: '#1a7f37', warn: '#9a6700', bad: '#cf222e',
  // Aliases some views reference
  low: '#1a7f37', medium: '#9a6700', high: '#c2410c', critical: '#cf222e', Low: '#1a7f37',
  goodSoft: '#e6f4ea', warnSoft: '#fbf3da', badSoft: '#fdecec',
};

// Section-header banner surface: a clean neutral dark slate (no brass glow).
export const HERO_BG =
  'linear-gradient(135deg, #0b0c0e 0%, #15171c 60%, #1c1f26 100%)';

export const ELEV = {
  card: '0 1px 2px rgba(11,12,14,0.05), 0 10px 28px -16px rgba(11,12,14,0.20)',
  pop: '0 16px 48px -12px rgba(11,12,14,0.30)',
};

export const RADIUS = { sm: 7, md: 10, lg: 14, pill: 999 };

export default { FONTS, COLORS, HERO_BG, ELEV, RADIUS };

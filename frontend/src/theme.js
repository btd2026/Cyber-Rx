/**
 * theme — CyberRX design language ("Intelligence Brief").
 *
 * An editorial, advisory-document system — the antithesis of a generic SaaS app.
 * A warm ivory paper canvas, warm near-black ink, and a single restrained navy
 * accent used only for interactive chrome (brand, active nav, focus, primary) —
 * never for status, so green/amber/red keep their meaning. A serif display face
 * for headlines (boardroom gravitas), a clean sans for body, and a mono face for
 * figures. Centralized so the whole identity retunes in one place.
 */

export const FONTS = {
  // Serif display — reads like a printed advisory brief, not an app. System stack
  // (no web-font dependency) for instant, dependable gravitas.
  display: "'Source Serif 4', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif",
  body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
};

export const COLORS = {
  // Ink (warm, on paper)
  ink: '#211d18', ink2: '#5c554b', ink3: '#8a8276', hair: '#e8e2d6', paper: '#f7f4ee', white: '#fffdf9',
  text: '#211d18', primary: '#243044',
  // Subtle panel / hairline-strong (warm)
  subtle: '#f1ece3', hairStrong: '#d8d1c2',
  // Masthead surface (section-header banners via HERO_BG) — warm charcoal, like newsprint
  navy0: '#1a1712', navy1: '#252019', navy2: '#322c23', navyLine: '#403a2f', navyInk: '#a89f8f',
  // Navy accent — INTERACTIVE CHROME ONLY (brand, active nav, focus, primary). No purple.
  accent: '#243044', accentSoft: '#ecedf2', accentDim: 'rgba(36,48,68,0.12)', accentText: '#2f3e59',
  // Status (semantic) — unchanged so meaning is preserved
  good: '#1a7f37', warn: '#9a6700', bad: '#cf222e',
  // Aliases some views reference
  low: '#1a7f37', medium: '#9a6700', high: '#c2410c', critical: '#cf222e', Low: '#1a7f37',
  goodSoft: '#e6f1e8', warnSoft: '#f6efdd', badSoft: '#fceceb',
};

// Section-header masthead surface: warm charcoal, like a printed brief's header rule.
export const HERO_BG =
  'linear-gradient(135deg, #1a1712 0%, #252019 60%, #322c23 100%)';

export const ELEV = {
  // Softer, paper-like — pages should feel printed, not floating.
  card: '0 1px 2px rgba(33,29,24,0.04), 0 12px 30px -20px rgba(33,29,24,0.18)',
  pop: '0 18px 50px -16px rgba(33,29,24,0.28)',
};

// Crisper, less "bubbly" — editorial, not pill-heavy.
export const RADIUS = { sm: 5, md: 8, lg: 12, pill: 999 };

export default { FONTS, COLORS, HERO_BG, ELEV, RADIUS };

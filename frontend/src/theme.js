/**
 * theme — CyberRX design language, now sourced from the design tokens.
 *
 * The single source of truth for color/type is src/styles/cyberrx-design-tokens.css.
 * This module RESOLVES those CSS variables into concrete color strings at load
 * time, so the 80+ components that consume `COLORS`/`FONTS` via inline styles keep
 * working — including the ones that feed Chart.js / Cytoscape, which draw on a
 * canvas and cannot resolve `var(--…)` themselves.
 *
 * Resolution uses a hidden probe element so `var()` alias chains (e.g.
 * --accent → --brand → #243044) resolve to a real rgb() string. Each token has a
 * hex fallback (identical to the token default) for non-DOM contexts (tests/SSR).
 *
 * NOTE (transitional): values are resolved for the theme active at load. Newly
 * built / rebuilt components should read `var(--token)` directly so they re-theme
 * live on the light⟷dark toggle; legacy COLORS-driven inline styles adopt the
 * load-time theme. The redesign migrates components to tokens phase by phase.
 */

// Resolve `var(<name>)` to a concrete color via a hidden probe (canvas-safe).
function resolveColor(varName, fallback) {
  if (typeof document === 'undefined') return fallback;
  try {
    const el = document.createElement('span');
    el.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
    el.style.color = `var(${varName})`;
    document.documentElement.appendChild(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c || fallback;
  } catch { return fallback; }
}

function resolveValue(prop, varName, fallback) {
  if (typeof document === 'undefined') return fallback;
  try {
    const el = document.createElement('span');
    el.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
    el.style[prop] = `var(${varName})`;
    document.documentElement.appendChild(el);
    const v = getComputedStyle(el)[prop];
    el.remove();
    return v || fallback;
  } catch { return fallback; }
}

/** alpha(color, a) — translucent variant. `a` may be 0..1, a percentage, or a
 *  two-char hex pair ('20'). Returns a color-mix() (works for CSS and canvas in
 *  modern engines); falls back to the solid color string if unsupported. */
export function alpha(color, a) {
  let pct;
  if (typeof a === 'number') pct = a <= 1 ? a * 100 : a;
  else {
    const n = parseInt(a, 16);
    pct = Number.isNaN(n) ? 100 : (n / 255) * 100;
  }
  return `color-mix(in srgb, ${color} ${pct.toFixed(1)}%, transparent)`;
}

export const FONTS = {
  display: resolveValue('fontFamily', '--font-display',
    "'Source Serif 4', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif"),
  body: resolveValue('fontFamily', '--font-body',
    "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"),
  mono: resolveValue('fontFamily', '--font-mono',
    "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace"),
};

export const COLORS = {
  // Ink / text
  ink: resolveColor('--text', '#211d18'),
  ink2: resolveColor('--text-muted', '#5c554b'),
  ink3: resolveColor('--text-subtle', '#8a8276'),
  text: resolveColor('--text', '#211d18'),
  // Surfaces
  hair: resolveColor('--border', '#e8e2d6'),
  paper: resolveColor('--bg', '#f7f4ee'),
  white: resolveColor('--surface', '#fffdf9'),
  subtle: resolveColor('--surface-2', '#f1ece3'),
  hairStrong: resolveColor('--hairline', '#d8d1c2'),
  // Masthead (dark banner in both themes)
  navy0: resolveColor('--masthead-0', '#1a1712'),
  navy1: resolveColor('--masthead-1', '#252019'),
  navy2: resolveColor('--masthead-2', '#322c23'),
  navyLine: resolveColor('--masthead-line', '#403a2f'),
  navyInk: resolveColor('--masthead-ink', '#a89f8f'),
  // Accent — BLUE (interactive/decision chrome). No purple.
  primary: resolveColor('--accent', '#243044'),
  accent: resolveColor('--accent', '#243044'),
  accentSoft: resolveColor('--accent-tint', '#ecedf2'),
  accentDim: alpha(resolveColor('--accent', '#243044'), 0.12),
  accentText: resolveColor('--accent-strong', '#2f3e59'),
  // Status (semantic) — meaning preserved
  good: resolveColor('--pass', '#1a7f37'),
  warn: resolveColor('--warn', '#9a6700'),
  bad: resolveColor('--critical', '#cf222e'),
  // Severity aliases some views reference
  low: resolveColor('--pass', '#1a7f37'),
  medium: resolveColor('--warn', '#9a6700'),
  high: resolveColor('--exposure', '#c2410c'),
  critical: resolveColor('--critical', '#cf222e'),
  Low: resolveColor('--pass', '#1a7f37'),
  goodSoft: resolveColor('--pass-tint', '#e6f1e8'),
  warnSoft: resolveColor('--warn-tint', '#f6efdd'),
  badSoft: resolveColor('--critical-tint', '#fceceb'),
};

// Section-header masthead surface — resolved from --masthead-bg.
export const HERO_BG = resolveValue('backgroundImage', '--masthead-bg',
  'linear-gradient(135deg, #1a1712 0%, #252019 60%, #322c23 100%)');

export const ELEV = {
  card: resolveValue('boxShadow', '--shadow-card',
    '0 1px 2px rgba(33,29,24,0.04), 0 12px 30px -20px rgba(33,29,24,0.18)'),
  pop: resolveValue('boxShadow', '--shadow-pop',
    '0 18px 50px -16px rgba(33,29,24,0.28)'),
};

// Crisper, less "bubbly" — editorial, not pill-heavy. (Lengths, not colors.)
export const RADIUS = { sm: 5, md: 8, lg: 12, pill: 999 };

export default { FONTS, COLORS, HERO_BG, ELEV, RADIUS, alpha };

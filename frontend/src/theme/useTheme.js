/**
 * useTheme — the light "Paper" ⟷ dark "Command" theme runtime.
 *
 * Matches the design-tokens convention: light is the default (:root, no attribute),
 * dark is applied as data-theme="dark" on <html>. Components read tokens; nothing
 * branches on theme. SSR-safe: window/localStorage access is guarded; initial value
 * is read lazily. Honors prefers-color-scheme on first visit.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cyberrx_theme';
export const THEMES = { PAPER: 'paper', DARK: 'dark' };

function safeGet(key) {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
  catch { return null; }
}
function safeSet(key, val) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); }
  catch { /* private mode / SSR — ignore */ }
}

function prefersDark() {
  try {
    return typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch { return false; }
}

/** Resolve the initial theme: stored choice > OS preference > light Paper. */
export function initialTheme() {
  const stored = safeGet(STORAGE_KEY);
  if (stored === THEMES.PAPER || stored === THEMES.DARK) return stored;
  return prefersDark() ? THEMES.DARK : THEMES.PAPER;
}

/** Apply a theme to <html> (dark sets data-theme="dark"; paper clears it = :root). */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === THEMES.DARK) root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

export function useTheme() {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    safeSet(STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === THEMES.DARK ? THEMES.PAPER : THEMES.DARK;
      safeSet(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggle, isDark: theme === THEMES.DARK };
}

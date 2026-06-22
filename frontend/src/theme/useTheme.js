/**
 * useTheme — the light "brief" ⟷ dark "command" theme runtime.
 *
 * Sets data-theme on <html> so the token layer (cyberrx-design-tokens.css) does
 * all the work; nothing else branches on theme. SSR-safe: every window/localStorage
 * access is guarded, and the initial value is read lazily so it never throws during
 * a server render. Honors prefers-color-scheme on first visit.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cyberrx_theme';
export const THEMES = { BRIEF: 'brief', COMMAND: 'command' };

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

/** Resolve the initial theme: stored choice > OS preference > light brief. */
export function initialTheme() {
  const stored = safeGet(STORAGE_KEY);
  if (stored === THEMES.BRIEF || stored === THEMES.COMMAND) return stored;
  return prefersDark() ? THEMES.COMMAND : THEMES.BRIEF;
}

/** Apply a theme to <html> (command sets data-theme; brief clears it = :root). */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === THEMES.COMMAND) root.setAttribute('data-theme', 'command');
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
      const next = prev === THEMES.COMMAND ? THEMES.BRIEF : THEMES.COMMAND;
      safeSet(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggle, isCommand: theme === THEMES.COMMAND };
}

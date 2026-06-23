/**
 * useTheme — light "warm" ⟷ dark "command" toggle for the situation-room UI.
 * Light is default (:root); dark applies data-theme="dark" on <html>. SSR-safe:
 * window/localStorage guarded; honors prefers-color-scheme on first visit.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY = 'cyberrx_sr_theme';
export const THEMES = { WARM: 'warm', DARK: 'dark' };

const get = (k) => { try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null; } catch { return null; } };
const set = (k, v) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); } catch { /* ignore */ } };
const prefersDark = () => { try { return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } };

export function initialTheme() {
  const s = get(KEY);
  if (s === THEMES.WARM || s === THEMES.DARK) return s;
  return prefersDark() ? THEMES.DARK : THEMES.WARM;
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === THEMES.DARK) root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

export function useTheme() {
  const [theme, setThemeState] = useState(initialTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);
  const toggle = useCallback(() => {
    setThemeState((prev) => { const next = prev === THEMES.DARK ? THEMES.WARM : THEMES.DARK; set(KEY, next); return next; });
  }, []);
  return { theme, toggle, isDark: theme === THEMES.DARK };
}

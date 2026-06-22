/**
 * ThemeToggle — light "Paper" ⟷ dark "Command" switch, styled as the mock's
 * "◐ Theme" control. Token-native and accessible (aria-pressed reflects dark).
 * State/persistence live in useTheme (data-theme="dark" on <html>).
 */

import { useTheme, THEMES } from '../theme/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle, isDark } = useTheme();
  return (
    <>
      <style>{`
        .crx-themetoggle { display:inline-flex; align-items:center; gap:7px; cursor:pointer;
          font-family:var(--font-body); font-size:13px; font-weight:600; color:var(--text-muted);
          background:var(--surface); border:1px solid var(--border); border-radius:999px;
          padding:6px 13px; transition:color .15s ease, border-color .15s ease; }
        .crx-themetoggle:hover { color:var(--text); border-color:var(--border-strong); }
        .crx-themetoggle:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
        .crx-themetoggle__icon { font-size:14px; line-height:1; }
      `}</style>
      <button
        type="button"
        className={`crx-themetoggle ${className}`}
        onClick={toggle}
        aria-pressed={isDark}
        aria-label={`Theme: ${theme === THEMES.DARK ? 'dark Command' : 'light Paper'}. Switch to ${isDark ? 'light' : 'dark'}.`}
      >
        <span className="crx-themetoggle__icon" aria-hidden="true">◐</span>
        <span>Theme</span>
      </button>
    </>
  );
}

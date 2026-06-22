/**
 * ThemeToggle — switches the light "brief" ⟷ dark "command" theme.
 *
 * Token-native and accessible: a single button with aria-pressed reflecting the
 * dark state. All visuals come from design tokens, so it themes itself. State and
 * persistence live in useTheme (data-theme on <html>); this is just the control.
 */

import { useTheme, THEMES } from '../theme/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle, isCommand } = useTheme();
  const next = isCommand ? 'brief' : 'command';
  return (
    <>
      <style>{`
        .crx-themetoggle { display:inline-flex; align-items:center; gap:8px; cursor:pointer;
          font-family:var(--font-body); font-size:11px; font-weight:600; color:var(--text-muted);
          background:var(--surface); border:1px solid var(--border); border-radius:999px;
          padding:5px 11px 5px 9px; transition:color .15s ease, border-color .15s ease, background-color .15s ease; }
        .crx-themetoggle:hover { color:var(--text); border-color:var(--accent); }
        .crx-themetoggle:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
        .crx-themetoggle__icon { font-size:13px; line-height:1; }
        .crx-themetoggle__label { letter-spacing:.02em; }
        @media (max-width: 600px){ .crx-themetoggle__label { display:none; } }
      `}</style>
      <button
        type="button"
        className={`crx-themetoggle ${className}`}
        onClick={toggle}
        aria-pressed={isCommand}
        title={`Switch to the ${next === 'command' ? 'dark situation-room' : 'light brief'} theme`}
        aria-label={`Theme: ${theme === THEMES.COMMAND ? 'dark situation room' : 'light brief'}. Switch to ${next === 'command' ? 'dark' : 'light'}.`}
      >
        <span className="crx-themetoggle__icon" aria-hidden="true">{isCommand ? '☾' : '☀'}</span>
        <span className="crx-themetoggle__label">{isCommand ? 'Command' : 'Brief'}</span>
      </button>
    </>
  );
}

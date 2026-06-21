/**
 * DashNav — shared executive dashboard tab bar.
 *
 * Mirrors the in-App dashboard nav so the standalone page dashboards
 * (CIO, CLO, Audit) get the same persona tabs. Navigation is delegated to the
 * `go(pageId)` function the app passes down.
 */
import React from 'react';
import { COLORS, FONTS } from '../theme';

const C = { border: COLORS.hair, acc: COLORS.accent, text: COLORS.ink, muted: COLORS.ink2 };

const TABS = [
  { id: 'dashboard', label: 'CISO',             mod: 'Security' },
  { id: 'cio',       label: 'CIO',              mod: 'Technology' },
  { id: 'cro',       label: 'CRO / Audit',      mod: 'Compliance' },
  { id: 'cfo',       label: 'CFO',              mod: 'Financial' },
  { id: 'clo',       label: 'CLO',              mod: 'Legal' },
  { id: 'boarddash', label: 'Board',            mod: 'Executive' },
];

export default function DashNav({ current, go }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
      {TABS.map((tab) => {
        const active = current === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => go && go(tab.id)}
            style={{
              background: 'transparent', border: 'none',
              borderBottom: `3px solid ${active ? C.acc : 'transparent'}`,
              padding: '9px 18px', cursor: 'pointer', marginBottom: -1,
            }}
          >
            <div style={{ fontFamily: FONTS.display, color: active ? C.acc : C.text, fontSize: 12, fontWeight: active ? 700 : 500 }}>{tab.label}</div>
            <div style={{ color: C.muted, fontSize: 9 }}>{tab.mod}</div>
          </button>
        );
      })}
    </div>
  );
}

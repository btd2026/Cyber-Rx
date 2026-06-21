import React from 'react';
import { COLORS, FONTS } from '../theme';

/**
 * NarrativeSection — the building block of the "Intelligence Brief" reading flow.
 *
 * A single-column section that reads top-to-bottom like a chapter: an optional
 * numbered step + kicker, a serif section title, a one-line narrative lede (the
 * connective voice that carries the reader from the previous section into this
 * one), then the supporting content. Stacking these creates a guided, peel-the-
 * onion flow instead of a scattered grid the eye has to decode.
 */
export default function NarrativeSection({ step, kicker, title, lede, children }) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div>
        {(step != null || kicker) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            {step != null && (
              <span className="crx-figure" style={{ fontSize: 11, fontWeight: 700, color: COLORS.accentText, fontFamily: FONTS.mono }}>
                {String(step).padStart(2, '0')}
              </span>
            )}
            {kicker && (
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: COLORS.ink3 }}>{kicker}</span>
            )}
          </div>
        )}
        <h3 style={{ margin: 0, fontFamily: FONTS.display, fontSize: 20, fontWeight: 600, color: COLORS.ink, letterSpacing: '-0.003em', lineHeight: 1.2 }}>{title}</h3>
        {lede && <p style={{ margin: '7px 0 0', fontSize: 13.5, lineHeight: 1.65, color: COLORS.ink2, maxWidth: 680 }}>{lede}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * BusinessScenarios — the "what it means for the business" act of the CISO brief.
 *
 * The page would be just another dashboard if it stopped at scores. This is the
 * connective tissue: it takes the live issues (attack pathways, decisions awaiting
 * the CISO, hidden/accepted risk, the highest-contribution control gaps) and
 * projects each one forward into a plain-English consequence for THIS org's
 * actual business processes — what breaks, for whom, and what changes the
 * outcome. Every card is derived from the dashboard payload (system-pulled data),
 * not authored copy, so the projections move with the evidence.
 */

import { COLORS, FONTS, ELEV } from '../theme';

const SEV_COLOR = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };
const SEV_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

// Normalize the richest available sources into one scenario shape, then rank and
// keep the most consequential few. Each builder guards every field it touches so
// a sparse payload simply yields fewer scenarios rather than throwing.
function buildScenarios(d) {
  const out = [];

  (d.attackPathways || []).forEach((p, i) => {
    if (!p) return;
    out.push({
      key: `path-${i}`, severity: 'Critical', process: p.process,
      headline: `An attacker reaching ${p.target || p.process || 'a critical system'}`,
      exposure: p.narrative || `Weakest link today is ${p.weakestControl || 'an unhardened control'}${p.initialAccess ? `, reachable via ${p.initialAccess}` : ''}.`,
      projection: p.businessImpact || `If exploited, ${p.process || 'this process'} is disrupted before detection is likely.`,
      reduces: (p.breakingControls && p.breakingControls[0]) || p.mitigation,
    });
  });

  (d.hiddenRisks || []).forEach((h, i) => {
    if (!h) return;
    const accepted = h.formalAcceptance === true;
    out.push({
      key: `hidden-${i}`, severity: accepted ? 'Medium' : 'High', process: h.process,
      headline: h.risk,
      exposure: `${h.whyHidden ? `Easy to miss: ${h.whyHidden}. ` : ''}${accepted ? 'Formally accepted.' : 'No formal acceptance on record.'}`,
      projection: h.impact || `Carries unowned downside for ${h.process || h.domain || 'the business'} until it surfaces in an incident.`,
      reduces: h.escalation,
    });
  });

  (d.attentionItems || []).forEach((a, i) => {
    if (!a) return;
    out.push({
      key: `attn-${i}`, severity: a.severity || 'High', process: a.process,
      headline: a.title,
      exposure: a.businessImpact || a.why || 'Awaiting an executive decision.',
      projection: a.businessImpact && a.decision ? `Until decided: ${a.decision}` : (a.businessImpact || 'Risk persists until a call is made.'),
      reduces: a.decision || (a.escalationPath ? `Escalate: ${a.escalationPath}` : null),
    });
  });

  (d.controlRisk || []).slice(0, 4).forEach((c, i) => {
    if (!c || (c.riskContribution || 0) < 60) return;
    out.push({
      key: `ctrl-${i}`, severity: c.riskContribution >= 80 ? 'Critical' : 'High', process: c.processAffected,
      headline: `${c.name} is the largest single contributor to your risk`,
      exposure: `${c.threatRelevance || `Risk contribution ${c.riskContribution}/100`}${c.blastRadius ? `. Blast radius: ${c.blastRadius}.` : '.'}`,
      projection: `Left as-is, ${c.processAffected || 'the business processes it protects'} inherit${c.processAffected ? 's' : ''} the full likelihood × impact this control is meant to hold down.`,
      reduces: c.action,
    });
  });

  // De-dupe by headline, rank by severity, keep the top few so the act reads as a
  // focused set of consequences, not a list.
  const seen = new Set();
  return out
    .filter((s) => s.headline && !seen.has(s.headline) && seen.add(s.headline))
    .sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9))
    .slice(0, 3);
}

export default function BusinessScenarios({ d, onOpenQueue }) {
  const scenarios = buildScenarios(d || {});
  if (!scenarios.length) {
    return (
      <div style={{ border: `1px solid ${COLORS.hair}`, borderRadius: 12, background: COLORS.white, padding: 18, fontSize: 12.5, color: COLORS.ink2 }}>
        No material business-impact scenarios surfaced from current data — exposures are within appetite and owned.
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {scenarios.map((s, idx) => {
        const color = SEV_COLOR[s.severity] || COLORS.ink3;
        return (
          <article key={s.key} style={{ background: COLORS.white, border: `1px solid ${COLORS.hair}`, borderLeft: `4px solid ${color}`, borderRadius: 12, boxShadow: ELEV.card, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="crx-figure" style={{ fontFamily: FONTS.mono, fontSize: 11, fontWeight: 700, color: COLORS.ink3 }}>{String(idx + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: COLORS.ink3 }}>Scenario{s.process ? ` · ${s.process}` : ''}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.severity}</span>
            </div>

            <h4 style={{ margin: '8px 0 0', fontFamily: FONTS.display, fontSize: 16.5, fontWeight: 600, color: COLORS.ink, letterSpacing: '-0.003em', lineHeight: 1.3 }}>{s.headline}</h4>

            <div style={{ display: 'grid', gap: 9, marginTop: 11 }}>
              <Line label="The exposure" body={s.exposure} />
              <Line label="If we don't act" body={s.projection} accent={color} />
            </div>

            {s.reduces && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 11, borderTop: `1px solid ${COLORS.hair}`, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 11.5, color: COLORS.ink2, lineHeight: 1.5, flex: 1, minWidth: 220 }}>
                  <span style={{ color: COLORS.good, fontWeight: 700 }}>What changes this: </span>{s.reduces}
                </div>
                {onOpenQueue && (
                  <button onClick={onOpenQueue} style={{ flexShrink: 0, background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 13px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Take a decision →</button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Line({ label, body, accent }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: accent || COLORS.ink3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

/**
 * AdvisorIntro — Briana, the CISO's security chief of staff, opens the brief.
 *
 * This is the voice that turns the page from "a dashboard" into "a briefing": she
 * introduces herself, frames what the CISO is accountable for, names the three
 * things that matter at any moment, and hands off into the three-act story the
 * rest of the tab tells (i. where you stand · ii. what it means for the business
 * · iii. what to decide). Rendered as a dark editorial masthead — deliberately
 * unlike the ivory cards below — so it reads as an advisor speaking, not a widget.
 */

import { useEffect } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import { COLORS, FONTS, HERO_BG } from '../theme';

const GOLD = '#c8a86b';

export default function AdvisorIntro({ d, role = 'CISO', orgName }) {
  const voice = useAgentVoice();
  const org = orgName || 'your organization';
  const p = (d && d.overallPosture) || {};
  const breaches = (d && d.thresholds && d.thresholds.breaches) || 0;
  const decisions = (d && (d.attentionItems || []).length) || 0;
  const crit = (d && (d.attentionItems || []).filter((a) => a.severity === 'Critical').length) || 0;

  // The three things a CISO must know at any moment — the spine of the brief.
  const guide = [
    { n: 'i', label: 'Where you stand', detail: 'today\'s posture and what moved since we last spoke' },
    { n: 'ii', label: 'What it means for the business', detail: 'how each exposure plays out for your actual operations' },
    { n: 'iii', label: 'What to decide', detail: 'the moves that are yours to make — ranked, with owners' },
  ];

  // Spoken briefing — Briana talking the CISO through the page, not reading it.
  const spoken = [
    `Hi — I'm Briana, your security chief of staff.`,
    `As ${role}, you're accountable for protecting ${org} from cyber risk without getting in the way of the business — so at any moment there are really only three things you need to hold in your head: where we stand, what that means for the business, and what needs a decision from you.`,
    `I keep those three in view so this never becomes another dashboard you have to decode.`,
    p.current != null ? `Today we're at ${p.current} out of 100, ${p.delta >= 0 ? `up ${p.delta}` : `down ${Math.abs(p.delta || 0)}`} since the last brief.` : '',
    breaches ? `${breaches} area${breaches === 1 ? ' is' : 's are'} running past the risk appetite you set,` : 'We\'re inside your risk appetite,',
    decisions ? ` and ${decisions} decision${decisions === 1 ? ' is' : 's are'} waiting on you${crit ? `, ${crit} of them critical` : ''}.` : ' and nothing is waiting on a decision right now.',
    `Let me walk you through it.`,
  ].filter(Boolean).join(' ');

  // Briana introduces herself once per session when the brief opens (respects mute).
  useEffect(() => {
    if (!d) return;
    const flag = '_cx_briana_intro_done';
    if (typeof window !== 'undefined' && window[flag]) return;
    if (typeof window !== 'undefined') window[flag] = true;
    const t = setTimeout(() => voice.speak(spoken), 400);
    return () => clearTimeout(t);
  }, [d]); // eslint-disable-line

  return (
    <div style={{ background: HERO_BG, borderRadius: 14, padding: '22px 24px', color: COLORS.navyInk, border: `1px solid ${COLORS.navyLine}`, position: 'relative', overflow: 'hidden' }}>
      {/* hairline gold rule along the top — printed-brief masthead cue */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${GOLD} 0%, rgba(200,168,107,0.15) 60%, transparent 100%)` }} />

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Monogram avatar — an engraved initial, not a stock headshot */}
        <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: '50%', border: `1.5px solid ${GOLD}`, display: 'grid', placeItems: 'center', background: 'rgba(200,168,107,0.08)' }}>
          <span style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, color: GOLD, lineHeight: 1 }}>B</span>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>Your security chief of staff</div>
              <h2 style={{ margin: '3px 0 0', fontFamily: FONTS.display, fontSize: 22, fontWeight: 600, color: COLORS.white, letterSpacing: '-0.01em' }}>Briana</h2>
            </div>
            <div style={{ flexShrink: 0 }}>
              <VoiceControls voice={voice} onReplay={() => voice.speak(spoken)} label="Listen to the brief" />
            </div>
          </div>

          <p style={{ margin: '12px 0 0', fontSize: 13.5, lineHeight: 1.7, color: '#d8d1c2', maxWidth: 760 }}>
            As {role}, you carry one job above the rest: protect {org} from cyber risk without slowing the business down.
            That makes three questions worth answering at any moment — and they're all I'll ever put in front of you here.
            No dashboards to decode; just the read, what it means, and the call that's yours to make.
          </p>

          {/* The three-act guide — anchors the story below */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginTop: 16 }}>
            {guide.map((g) => (
              <div key={g.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderTop: `1px solid ${COLORS.navyLine}`, paddingTop: 10 }}>
                <span style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 600, fontStyle: 'italic', color: GOLD, lineHeight: 1.2, minWidth: 18 }}>{g.n}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.white, lineHeight: 1.3 }}>{g.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.navyInk, lineHeight: 1.5, marginTop: 2 }}>{g.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CMMIBadge Component
 *
 * Displays CMMI maturity level badge with color coding and size variants.
 * Part of the CMMI 5-level scoring system for healthcare cybersecurity maturity.
 *
 * @param {number} props.score - Maturity score (0-100)
 * @param {string} props.size - Badge size: 'sm' | 'md' (default) | 'lg'
 */

import React from 'react';

// CMMI 5-level scoring configuration
const CMMI_LEVELS = [
  {
    min: 0,
    max: 19,
    level: 1,
    name: "Initial",
    short: "L1",
    desc: "Ad hoc, unpredictable. Controls are undefined or inconsistently applied.",
    color: "#EF4545",
    bg: "#EF454514"
  },
  {
    min: 20,
    max: 39,
    level: 2,
    name: "Managed",
    short: "L2",
    desc: "Reactive. Some controls documented and applied at a project level.",
    color: "#F59E0B",
    bg: "#F59E0B14"
  },
  {
    min: 40,
    max: 59,
    level: 3,
    name: "Defined",
    short: "L3",
    desc: "Proactive. Controls standardized and documented at the organization level.",
    color: "#F5A623",
    bg: "#F5A62314"
  },
  {
    min: 60,
    max: 79,
    level: 4,
    name: "Quantitatively Managed",
    short: "L4",
    desc: "Measured. Controls monitored with quantitative metrics and managed proactively.",
    color: "#3B9EFF",
    bg: "#3B9EFF14"
  },
  {
    min: 80,
    max: 100,
    level: 5,
    name: "Optimizing",
    short: "L5",
    desc: "Continuous improvement. Controls optimized through innovation and proactive adjustment.",
    color: "#0FBB80",
    bg: "#0FBB8014"
  },
];

// Helper function to get CMMI level from score
function getCMMILevel(score) {
  if (score === null || score === undefined) {
    return CMMI_LEVELS[0];
  }
  const n = Math.round(score);
  for (let i = 0; i < CMMI_LEVELS.length; i++) {
    if (n >= CMMI_LEVELS[i].min && n <= CMMI_LEVELS[i].max) {
      return CMMI_LEVELS[i];
    }
  }
  return n >= 80 ? CMMI_LEVELS[4] : CMMI_LEVELS[0];
}

const CMMIBadge = ({ score, size = 'md' }) => {
  const level = getCMMILevel(score);
  const fontSize = size === 'sm' ? 9 : size === 'lg' ? 13 : 11;
  const padding = size === 'sm' ? '1px 6px' : size === 'lg' ? '4px 12px' : '2px 8px';

  return (
    <span
      style={{
        color: level.color,
        fontSize: fontSize,
        fontWeight: 800,
        background: level.bg,
        borderRadius: 5,
        padding: padding,
        display: 'inline-flex',
        gap: 4,
        alignItems: 'center',
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }}
    >
      {level.short} — {level.name}
    </span>
  );
};

export default CMMIBadge;
export { CMMI_LEVELS, getCMMILevel };

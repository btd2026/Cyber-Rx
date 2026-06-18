/**
 * legalRationale — shared litigation-discoverability guidance for any place that
 * records a risk acceptance (DecisionQueue "Accept & monitor", CioFrictionMap
 * "Ship on time", CloTriggerMap "Monitor — no action").
 *
 * Logged acceptances are discoverable in litigation, so the prompt steers toward
 * DEFENSIBLE reasoning. This behavior is flagged for Legal review before launch
 * (see LEGAL_REVIEW.md).
 */

import React from 'react';

export const DISCOVERABILITY_NOTICE =
  'Heads up: this rationale is logged to the decision ledger and is discoverable in litigation. Document defensible reasoning.';

export const DEFENSIBLE_PLACEHOLDER =
  'Defensible rationale (logged & discoverable): business justification · compensating controls in place · accountable owner · review date…';

// A small hint block to render above/below a rationale textarea.
export function DefensibleRationaleHint({ compact }) {
  return (
    <div style={{ fontSize: 10.5, color: '#7a5b1e', background: '#fbf3df', border: '1px solid #f0dcae', borderRadius: 7, padding: compact ? '6px 9px' : '8px 11px', lineHeight: 1.5 }}>
      <strong>⚖️ Discoverable in litigation.</strong> A documented, well-reasoned acceptance supports a good-faith oversight defense; a thin one becomes adverse evidence. Include: <strong>business basis</strong>, <strong>compensating controls</strong>, <strong>accountable owner</strong>, and a <strong>review date</strong>.
    </div>
  );
}

'use strict';

/**
 * IncidentService — the single executive incident as a server-side spine.
 *
 * For client demos this is the payoff: one incident, one source of truth, that
 * every executive seat re-frames. A scripted timeline lets you walk a live
 * room through the phases (detected → compensating control → verified holding →
 * materiality review) and watch all seven seats update together — deterministic,
 * no live data required.
 *
 * This is also the seam for a real feed later: swap `advance()` for an ingestion
 * endpoint that appends real SIEM/SOAR events to the same model, and everything
 * downstream (per-seat projection, evidence) is unchanged.
 *
 * Demo state is in-memory per org (single-instance; resets on restart) — exactly
 * what a demo wants. A real deployment would persist the incident.
 */

const PHASES = [
  {
    phase: 'detected',
    headline: 'An access control protecting customer card payments failed at 14:02; impact is being scoped and the path is not yet contained.',
    contained: false, verified: false,
    event: { t: '14:02 UTC', text: 'Access-control DENY rule expired on the payment-tokenization path', signal: 'control_id=PCI-AC-07 · event=DENY_RULE_EXPIRED · src=Splunk' },
  },
  {
    phase: 'compensating',
    headline: 'A compensating control (WAF rule + network ACL) has been applied to the affected payment path; verification is pending.',
    contained: true, verified: false,
    event: { t: '14:05 UTC', text: 'Compensating control applied (WAF rule + network ACL)', signal: 'compensating=WAF+ACL · status=ACTIVE' },
  },
  {
    phase: 'verified',
    headline: 'An access control protecting customer card payments failed at 14:02; a compensating control is applied and verified holding; exposure is a single internet-facing path.',
    contained: true, verified: true,
    event: { t: '14:09 UTC', text: 'Containment verified by synthetic probe', signal: 'synthetic_probe=BLOCKED · reverify_interval=5m · exposed_paths=1 reachable=false' },
  },
  {
    phase: 'materiality',
    headline: 'The payment-path control failure is contained and verified holding; materiality is under review and disclosure clocks are tracked. No customer impact confirmed.',
    contained: true, verified: true,
    event: { t: '14:40 UTC', text: 'Materiality review opened; evidence preserved; board/exec briefed', signal: 'attestation=CISO+GC · hold=LH-2026-014 · mttr_min=7' },
  },
];

const FINAL = PHASES.length - 1;
const _state = new Map(); // orgId -> phase index

function _idx(orgId) { return _state.has(orgId) ? _state.get(orgId) : FINAL; }

function get(orgId) {
  const i = _idx(orgId);
  const p = PHASES[i];
  return {
    id: 'INC-2026-0142',
    phase: p.phase, step: i, totalSteps: PHASES.length, atFinal: i === FINAL,
    headline: p.headline,
    control: 'Payment-tokenization access control (PCI scope)',
    compensating: 'WAF rule + network ACL isolating the affected path',
    failedAt: '14:02 UTC',
    contained: p.contained, verified: p.verified,
    containedAt: i >= 1 ? '14:05 UTC' : null,
    verifiedAt: i >= 2 ? '14:09 UTC' : null,
    blastRadius: 'single internet-facing payment path',
    affected: { unit: 'Payments', exec: 'VP Commerce' },
    materialityStatus: p.phase === 'materiality' ? 'under review' : (p.verified ? 'pending' : 'not started'),
    timeline: PHASES.slice(0, i + 1).map((s) => s.event),
    generatedAt: new Date().toISOString(),
  };
}

function advance(orgId) { _state.set(orgId, Math.min(_idx(orgId) + 1, FINAL)); return get(orgId); }
function reset(orgId) { _state.set(orgId, 0); return get(orgId); }          // back to "detected" — start the walk-through
function clear(orgId) { _state.delete(orgId); return get(orgId); }          // back to the default (final) state

module.exports = { get, advance, reset, clear };

/* =============================================================================
   Federation. Every entity is its own subject; only corporate aggregates.
   An entity is credited only for LOCAL and INHERITED_VERIFIED. A CLAIM_FALSE
   contributes nothing and raises a finding against the corporate provider —
   that is the whole point of verifying it.

   Aggregation is by COUNT, never by mean. There is no arithmetic mean of
   entity results anywhere in this module (a test greps for one).
   ========================================================================== */
import { Origin, creditsOrigin } from './types.js';
import { CAT } from './fixtures/connectors.js';
import { ENTS, REACH, CORPTOOL } from './fixtures/federation.js';

const CODE_TO_ORIGIN: Record<string, Origin> = {
  L: 'local',
  V: 'inherited_verified',
  C: 'claim_false',
  '-': 'no_source',
};
export function originOf(code: string): Origin {
  return CODE_TO_ORIGIN[code] ?? 'no_source';
}

export interface Finding {
  entity_id: string;
  entity_name: string;
  capability: string;
  corporate_tool: string;
  detail: string;
}

/* CSF subcategories a connected capability makes machine-answerable, credited
   only for LOCAL and INHERITED_VERIFIED. */
export function entityCredits(ent: (typeof ENTS)[number]): number {
  return CAT.reduce(
    (a, c) => a + (creditsOrigin(originOf(ent.o[c.k])) ? (c.adds as number) : 0),
    0,
  );
}

export function entityOriginCount(ent: (typeof ENTS)[number], origin: Origin): number {
  return CAT.filter((c) => originOf(ent.o[c.k]) === origin).length;
}

/* Findings raised by an entity's false inheritance claims. */
export function entityFindings(ent: (typeof ENTS)[number]): Finding[] {
  return CAT.filter((c) => originOf(ent.o[c.k]) === 'claim_false').map((c) => ({
    entity_id: ent.id,
    entity_name: ent.n,
    capability: c.n,
    corporate_tool: CORPTOOL[c.k] ?? 'corporate tool',
    detail: `${CORPTOOL[c.k] ?? 'The corporate tool'} asserts coverage of ${ent.n}, but its assets do not appear in that tool's population.`,
  }));
}

/* Per-entity summary, ranked most-exposed first (fewest credited capabilities). */
export interface EntitySummary {
  id: string;
  name: string;
  type: string;
  region: string;
  workers: number;
  credited: number;
  local: number;
  inherited_verified: number;
  claim_false: number;
  no_source: number;
  findings: Finding[];
}

export function entitySummaries(): EntitySummary[] {
  return ENTS.map((e) => ({
    id: e.id,
    name: e.n,
    type: e.t,
    region: e.reg,
    workers: e.w,
    credited: entityCredits(e),
    local: entityOriginCount(e, 'local'),
    inherited_verified: entityOriginCount(e, 'inherited_verified'),
    claim_false: entityOriginCount(e, 'claim_false'),
    no_source: entityOriginCount(e, 'no_source'),
    findings: entityFindings(e),
  })).sort((a, b) => a.credited - b.credited);
}

/* Corporate tool reach — a MEASURED count of entities whose assets appear in
   the tool, of 147. Never a configuration. */
export interface Reach {
  capability: string;
  key: string;
  tool: string;
  entities_present: number;
  total: number;
}
export const TOTAL_ENTITIES = 147;
export function corporateReach(): Reach[] {
  return CAT.map((c) => ({
    capability: c.n,
    key: c.k,
    tool: CORPTOOL[c.k] ?? '—',
    entities_present: REACH[c.k] ?? 0,
    total: TOTAL_ENTITIES,
  }));
}

/* Group aggregation — COUNTS per state, with the unmeasured carried to the top
   with a denominator. No mean of entity scores. */
export interface GroupAggregate {
  capability: string;
  key: string;
  local: number;
  inherited_verified: number;
  claim_false: number;
  no_source: number;
  measured: number; // local + inherited_verified
  unmeasured: number; // claim_false + no_source
  denominator: number;
}
export function groupAggregate(): GroupAggregate[] {
  return CAT.map((c) => {
    let local = 0,
      inh = 0,
      cf = 0,
      ns = 0;
    for (const e of ENTS) {
      const o = originOf(e.o[c.k]);
      if (o === 'local') local++;
      else if (o === 'inherited_verified') inh++;
      else if (o === 'claim_false') cf++;
      else ns++;
    }
    return {
      capability: c.n,
      key: c.k,
      local,
      inherited_verified: inh,
      claim_false: cf,
      no_source: ns,
      measured: local + inh,
      unmeasured: cf + ns,
      denominator: ENTS.length,
    };
  });
}

export function allFindings(): Finding[] {
  return ENTS.flatMap((e) => entityFindings(e));
}

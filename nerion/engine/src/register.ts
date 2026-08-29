/* =============================================================================
   The control register — the estate measured once, at a point in bitemporal
   time. Ported from the mock's SUBSTATE / measure / stateAt, then projected
   through the typed operating factory so every row obeys the design≠operating
   rule by construction.
   ========================================================================== */
import {
  ControlAssessment,
  DesignEffectiveness,
  EvidenceClass,
} from './types.js';
import { SUBS, PIN, FNMETA, expandClass } from './fixtures/csf.js';
import { WINDOW, dayStr } from './window.js';
import { makeOperating } from './operating.js';
import { INSTR, ASOF, SIGNERS, CONTRADICTED } from './fixtures/instrumentation.js';

/* deterministic RNG, ported verbatim (LCG, 32-bit) so demo figures are stable
   and reproduce the mock's numbers under the same call order. */
function rng(s: number): () => number {
  let x = s >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/* When each machine-carried subcategory first became readable, and what class
   carried it before. Derived exactly as the mock derives them. */
const INSTR_DATE: Record<string, string> = {};
INSTR.forEach((id, i) => {
  const q = ASOF.find((a) => a[2] > i);
  INSTR_DATE[id] = (q ? q[0] : ASOF[ASOF.length - 1][0]) as string;
});
const PRECLASS: Record<string, 'd' | 'a' | 'i'> = {};
INSTR.forEach((id, i) => {
  PRECLASS[id] = (['d', 'a', 'i'] as const)[i % 3];
});

/* Internal raw state — mirrors the mock's per-subcategory record. */
export interface RawState {
  cls: EvidenceClass;
  designRaw:
    | 'adequate'
    | 'deficient'
    | 'asserted'
    | 'none'
    | 'insufficient';
  op: number | null;
  ans?: 'yes' | 'due' | 'contradicted' | null;
  who?: string;
  last?: string | null;
  conf?: number | null;
  cov: number | null;
  pending?: string | null;
  contradicted?: boolean;
}

/* Build the full register at "today" (the latest ASOF stop). */
function buildToday(): Record<string, RawState> {
  const r = rng(4471);
  const m: Record<string, RawState> = {};
  const pool: string[] = [];
  SIGNERS.forEach(([who, n]) => {
    for (let i = 0; i < (n as number); i++) pool.push(who as string);
  });
  let ai = 0,
    ii = 0;
  for (const f of Object.keys(SUBS)) {
    for (const s of SUBS[f]) {
      const id = s[0];
      const clk = s[2];
      if (clk === 'a') {
        const k = ai++;
        const contradicted = CONTRADICTED.includes(id);
        const state = contradicted ? 'contradicted' : k < 23 ? 'yes' : 'due';
        m[id] = {
          cls: 'attestation',
          designRaw: state === 'due' ? 'none' : 'asserted',
          op: null,
          ans: state as 'yes' | 'due' | 'contradicted',
          who: pool[k] || 'Chief Information Security Officer',
          last:
            state === 'due'
              ? null
              : ['2026-07-14', '2026-07-28', '2026-08-04', '2026-08-11'][k % 4],
          cov: null,
          contradicted,
        };
        continue;
      }
      if (clk === 'i') {
        const k = ii++;
        m[id] = {
          cls: 'interview',
          designRaw: k < 13 ? 'asserted' : 'none',
          op: null,
          ans: k < 13 ? 'yes' : 'due',
          who: ['SOC lead', 'BCM lead', 'Procurement', 'CISO', 'Group CRO', 'AppSec lead', 'Facilities'][
            k % 7
          ],
          last: k < 13 ? ['2026-08-06', '2026-08-07', '2026-08-12'][k % 3] : null,
          cov: null,
        };
        continue;
      }
      if (clk === 'd') {
        const e = Math.round((0.3 + r() * 0.45) * 100) / 100;
        m[id] = {
          cls: 'document',
          designRaw: e >= 0.5 ? 'adequate' : 'deficient',
          op: null,
          conf: e,
          cov: Math.round(40 + r() * 95),
          last: '2026-08-19',
          ans: null,
        };
        continue;
      }
      // telemetry and config export — both questions answerable
      const pinned = id in PIN;
      const ent = pinned ? PIN[id][1] : Math.round(74 + r() * 70);
      const opv = pinned
        ? PIN[id][0]
        : Math.round((clk === 't' ? 0.52 + r() * 0.42 : 0.44 + r() * 0.4) * 100) / 100;
      m[id] = {
        cls: clk === 't' ? 'telemetry' : 'config_export',
        designRaw: opv === null ? 'insufficient' : opv >= 0.35 ? 'adequate' : 'deficient',
        op: opv,
        cov: ent,
        last: clk === 't' ? '2026-08-23' : '2026-08-22',
        ans: null,
      };
    }
  }
  return m;
}

const TODAY = buildToday();

/* The register as it stood on ASOF stop `asOfIdx`. Before a control was
   instrumented, a person carried it: the design question had an answer and the
   operating question did not. */
export function rawStateAt(id: string, clsKey: string, asOfIdx: number): RawState {
  const idx = Math.max(0, Math.min(ASOF.length - 1, asOfIdx));
  const base = TODAY[id];
  const cut = ASOF[idx][0] as string;
  if (!(id in INSTR_DATE) || INSTR_DATE[id] <= cut) return base;
  const pre = PRECLASS[id];
  return {
    cls: expandClass(pre),
    designRaw: pre === 'd' ? 'adequate' : 'asserted',
    op: null,
    ans: pre === 'd' ? null : 'yes',
    who: pre === 'a' ? 'Chief Information Security Officer' : 'Interview',
    conf: pre === 'd' ? 0.4 : null,
    cov: pre === 'd' ? 60 : null,
    last: cut,
    pending: INSTR_DATE[id],
  };
}

function mapDesign(raw: RawState): DesignEffectiveness {
  switch (raw.designRaw) {
    case 'adequate':
      return 'adequate';
    case 'deficient':
      return 'deficient';
    case 'asserted':
      return 'asserted';
    case 'none':
      // an attestation/interview that is due — asked, not yet answered
      return raw.ans === 'due' ? 'outstanding' : 'not_assessed';
    case 'insufficient':
      return 'not_assessed';
  }
}

/* Project a raw state into the typed, public ControlAssessment. Operating is
   produced by the factory, so a design-only class can never carry a ratio. */
export function toAssessment(
  id: string,
  name: string,
  raw: RawState,
  asOfIdx: number,
): ControlAssessment {
  return {
    subcategory: id,
    name,
    evidence_class: raw.cls,
    design: mapDesign(raw),
    operating: makeOperating(raw.cls, raw.op, raw.cov),
    coverage_entities: raw.cov ?? null,
    last_seen: raw.last ?? null,
    as_of: ASOF[asOfIdx][0] as string,
    recorded_through: dayStr(WINDOW - 1),
    pending_instrumentation: raw.pending ?? null,
    provenance_ref: `/controls/${id}/provenance`,
  };
}

/* The whole register, projected, at a given ASOF stop (default = today). */
export function register(asOfIdx: number = ASOF.length - 1): ControlAssessment[] {
  const out: ControlAssessment[] = [];
  for (const f of Object.keys(SUBS)) {
    for (const s of SUBS[f]) {
      const raw = rawStateAt(s[0], s[2], asOfIdx);
      out.push(toAssessment(s[0], s[1], raw, asOfIdx));
    }
  }
  return out;
}

/* Raw access for the Evidence queue / provenance layers. */
export function rawRegister(asOfIdx: number = ASOF.length - 1): Record<string, RawState> {
  const out: Record<string, RawState> = {};
  for (const f of Object.keys(SUBS)) for (const s of SUBS[f]) out[s[0]] = rawStateAt(s[0], s[2], asOfIdx);
  return out;
}

/* ---- census (all derived, never typed) ---------------------------------- */

export function classCensus(asOfIdx: number = ASOF.length - 1): Record<EvidenceClass, number> {
  const c: Record<EvidenceClass, number> = {
    telemetry: 0,
    config_export: 0,
    document: 0,
    attestation: 0,
    interview: 0,
  };
  for (const f of Object.keys(SUBS)) for (const s of SUBS[f]) c[rawStateAt(s[0], s[2], asOfIdx).cls]++;
  return c;
}

export function machineCarried(asOfIdx: number = ASOF.length - 1): number {
  const c = classCensus(asOfIdx);
  return c.telemetry + c.config_export;
}

export function functionCensus(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k] of FNMETA) out[k] = SUBS[k].length;
  return out;
}

export function operableCount(asOfIdx: number = ASOF.length - 1): number {
  return register(asOfIdx).filter((c) => c.operating.measurable).length;
}

export { ASOF, INSTR_DATE };

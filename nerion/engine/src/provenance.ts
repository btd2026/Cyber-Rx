/* =============================================================================
   Provenance. Clicking any evidence chip opens this. The claim is that any
   figure Nerion prints can be re-performed by the customer against their own
   systems, so the payload carries the source, the exact predicate, the response
   fingerprint, and the intervals the answer was computed from. A number nobody
   can re-derive is an opinion.
   ========================================================================== */
import { EvidenceClass } from './types.js';
import { rawStateAt, RawState } from './register.js';
import { SUBS } from './fixtures/csf.js';
import { WINDOW, gapsFor, devFor, dayStr } from './window.js';
import { OPTEST, OPDEFAULT, SRCMAP, DOCMAP, ATTMAP, ITVMAP } from './fixtures/provenance.js';

function subMeta(id: string): { name: string; clsKey: string } | null {
  for (const f of Object.keys(SUBS)) {
    const row = SUBS[f].find((s) => s[0] === id);
    if (row) return { name: row[1], clsKey: row[2] };
  }
  return null;
}

export interface TelemetryProvenance {
  kind: 'telemetry' | 'config_export';
  source_system: string;
  connection_route: string;
  permission_used: string;
  resolution: 'event' | 'daily snapshot';
  recorded_through: string;
  response_fingerprint: string;
  volume: string;
  predicate: string;
  applicable_entity_days: number;
  operated_entity_days: number;
  interval_series: { start_day: number; length_days: number; from: string; to: string }[];
  operating_condition: string;
  pass_condition: string;
  population: string;
  source_of_truth: string;
}
export interface DocumentProvenance {
  kind: 'document';
  document: string;
  version: string;
  upload_provenance: string;
  extracted_assertion: string;
  predicate: string;
  result: string;
}
export interface AttestationProvenance {
  kind: 'attestation';
  signatory: string;
  date: string;
  instrument: string;
  question: string;
  answer: string;
  telemetry_contradiction: string | null;
}
export interface InterviewProvenance {
  kind: 'interview';
  respondent: string;
  date: string;
  duration: string;
  question: string;
  answer: string;
  why_no_machine_source: string;
}
export type Provenance =
  | TelemetryProvenance
  | DocumentProvenance
  | AttestationProvenance
  | InterviewProvenance;

function intervalProvenance(id: string, raw: RawState): TelemetryProvenance {
  const clsKey = raw.cls === 'telemetry' ? 't' : 'c';
  const src = (SRCMAP as any)[clsKey]?.[id] as string[] | undefined;
  const test = (OPTEST as Record<string, string[]>)[id] || OPDEFAULT;
  const ent = raw.cov ?? 0;
  const op = raw.op;
  const applicable = ent * WINDOW;
  const operated = op === null ? 0 : Math.round(applicable * op);
  const gaps = gapsFor(op, devFor(op)).map((g) => ({
    start_day: g.start_day,
    length_days: g.length_days,
    from: dayStr(g.start_day),
    to: dayStr(g.start_day + g.length_days - 1),
  }));
  return {
    kind: raw.cls as 'telemetry' | 'config_export',
    source_system: src?.[0] ?? 'connected source',
    connection_route: src?.[1] ?? `${clsKey === 't' ? 'event feed' : 'config export'}`,
    permission_used: src?.[2] ?? 'read-only scope',
    resolution: raw.cls === 'telemetry' ? 'event' : 'daily snapshot',
    recorded_through: src?.[6] ?? dayStr(WINDOW - 1),
    response_fingerprint: src?.[4] ?? 'sha256:pending',
    volume: src?.[5] ?? `${ent} entities in scope`,
    predicate: src?.[3] ?? '—',
    applicable_entity_days: applicable,
    operated_entity_days: operated,
    interval_series: gaps,
    operating_condition: test[0],
    pass_condition: test[1],
    population: test[2],
    source_of_truth: test[3],
  };
}

export function provenance(id: string, asOfIdx?: number): Provenance | null {
  const meta = subMeta(id);
  if (!meta) return null;
  const raw = rawStateAt(id, meta.clsKey, asOfIdx ?? 100 /* clamped by caller */);
  const cls: EvidenceClass = raw.cls;
  if (cls === 'telemetry' || cls === 'config_export') return intervalProvenance(id, raw);
  if (cls === 'document') {
    const d = (DOCMAP as Record<string, string[]>)[id];
    return {
      kind: 'document',
      document: d?.[0] ?? 'Reviewed policy document',
      version: d?.[1] ?? '',
      upload_provenance: d?.[2] ?? 'Uploaded to the policy corpus',
      extracted_assertion: d?.[3] ?? 'The documented assertion tested for this control.',
      predicate: d?.[4] ?? '—',
      result: d?.[5] ?? `confidence ${(raw.conf ?? 0).toFixed(2)}`,
    };
  }
  if (cls === 'attestation') {
    const a = (ATTMAP as Record<string, string[]>)[id];
    return {
      kind: 'attestation',
      signatory: a?.[0] ?? raw.who ?? 'Accountable executive',
      date: a?.[1] ?? raw.last ?? '',
      instrument: a?.[2] ?? 'Quarterly control attestation',
      question: a?.[3] ?? 'The attested question.',
      answer: a?.[4] ?? (raw.ans === 'yes' ? 'Yes.' : 'Due.'),
      telemetry_contradiction: raw.contradicted ? a?.[5] ?? 'Telemetry disagrees; carried as a finding.' : null,
    };
  }
  const it = (ITVMAP as Record<string, string[]>)[id];
  return {
    kind: 'interview',
    respondent: it?.[0] ?? raw.who ?? 'Respondent',
    date: it?.[1] ?? raw.last ?? '',
    duration: it?.[2] ?? '30 min',
    question: it?.[3] ?? 'The question as asked.',
    answer: it?.[4] ?? 'Recorded answer, held with the transcript.',
    why_no_machine_source:
      it?.[5] ?? 'No system holds this. Nerion records who said it and when, and does not convert it into a score.',
  };
}

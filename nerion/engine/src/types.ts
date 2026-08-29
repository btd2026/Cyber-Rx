/* =============================================================================
   Nerion v2 — domain types.
   The single most important idea in the product lives here as a type, not a
   comment: DESIGN effectiveness and OPERATING effectiveness are two different
   answers, and operating is derivable ONLY from interval evidence. The union
   below makes "an operating number from a document" unconstructable.
   ========================================================================== */

/* The class of evidence that carries an answer. It is the root fact — it
   decides what may be claimed about a control. */
export type EvidenceClass =
  | 'telemetry'      // read continuously from a running system      → interval
  | 'config_export'  // exported configuration state, re-fetchable    → interval
  | 'document'       // an assertion extracted from a policy, tested  → design only
  | 'attestation'    // a named accountable person signed for it      → design only
  | 'interview';     // someone said so in a conversation             → design only

/* The only two classes from which operating effectiveness can be derived. */
export const INTERVAL_CLASSES = ['telemetry', 'config_export'] as const;
export type IntervalClass = (typeof INTERVAL_CLASSES)[number];
export function isIntervalClass(c: EvidenceClass): c is IntervalClass {
  return c === 'telemetry' || c === 'config_export';
}

/* DESIGN — is the control correctly specified and configured? Answerable from a
   config export, a tested policy assertion, or a signed attestation. */
export type DesignEffectiveness =
  | 'adequate'
  | 'deficient'
  | 'asserted'      // a signature is design evidence
  | 'not_assessed'
  | 'outstanding';  // due — asked, not yet answered

/* A deviation interval: a run of days on which the control's predicate failed,
   for some population of entities. Days are indices into the WINDOW. */
export interface Deviation {
  start_day: number;
  length_days: number;
  entities?: number;
}

/* OPERATING — did it operate on every applicable entity-day, and when did it
   stop? A sum type. Either it is measured, with the full interval
   reconciliation, or it is not measurable with a machine-readable reason.
   There is no third representation and no nullable number: the API returns
   `measurable:false` with a reason, never null and never 0. */
export type OperatingEffectiveness =
  | {
      measurable: true;
      ratio: number;                 // operated_entity_days / applicable_entity_days
      applicable_entity_days: number;
      operated_entity_days: number;
      window_days: number;           // always WINDOW (92)
      deviations: Deviation[];
      resolution: 'event' | 'daily_snapshot';
    }
  | {
      // no machine source can exist for this control — a design-only class.
      // Surfaced in the UI as NOT OBSERVABLE.
      measurable: false;
      reason: 'attested' | 'interview' | 'document';
    }
  | {
      // an interval class, but measured on too few entities to report.
      // Surfaced in the UI as BELOW THRESHOLD — show the coverage.
      measurable: false;
      reason: 'below_threshold';
      coverage_entities: number;
    };

/* The two "not measured" marks the UI must keep distinct from zero. */
export type UnmeasuredMark =
  | 'not_observable'    // no machine source can exist for this control
  | 'below_threshold';  // measured, but on too few entities — show the coverage

/* A single control's assessment, at a point in bitemporal time. `subcategory`
   is the CSF 2.0 identifier — the canonical spine every framework projects
   from. */
export interface ControlAssessment {
  subcategory: string;
  name: string;
  evidence_class: EvidenceClass;
  design: DesignEffectiveness;
  operating: OperatingEffectiveness;
  coverage_entities?: number | null;   // N entities the answer was computed over
  last_seen?: string | null;
  as_of: string;
  recorded_through?: string;
  pending_instrumentation?: string | null; // date it becomes machine-carried, if later
  provenance_ref: string;              // GET /controls/{id}/provenance
}

/* ---- Federation ---------------------------------------------------------- */

/* Per entity, per capability. An entity is credited only for LOCAL and
   INHERITED_VERIFIED. CLAIM_FALSE contributes zero and raises a finding
   against the corporate provider — that is the whole point of verifying it. */
export type Origin =
  | 'local'
  | 'inherited_verified'
  | 'claim_false'
  | 'no_source';

export function creditsOrigin(o: Origin): boolean {
  return o === 'local' || o === 'inherited_verified';
}

/* ---- Connections --------------------------------------------------------- */

export type ConnectionState =
  | 'selected'
  | 'configured'
  | 'verifying'
  | 'verified'
  | 'not_established';

export type NotEstablishedReason =
  | 'entitlement_missing'  // authenticated fine, but the SKU is absent → NOT a control failure
  | 'scope_insufficient'
  | 'connector_broken'
  | 'auth_failed';

export interface CredentialField {
  key: string;
  label: string;
  example: string;
  secret: boolean;   // secret fields are write-only and never returned
}

/* Selecting a vendor is not connecting to it. The route determines the
   evidence class, and therefore what the assessment may claim. */
export interface ConnectionRoute {
  id: string;
  vendor: string;
  capability: string;
  display_name: string;
  evidence_class: IntervalClass;   // telemetry or config_export — never a design-only class
  delivery: 'streaming' | 'polled';
  recommended: boolean;
  yields: string;
  scopes: string[];
  setup_steps: string[];
  credential_fields: CredentialField[];
  verification_call: string;
  caveat?: string;
  feature_flag?: string;           // gates UNKNOWN scope strings; default off
}

/* Verification returns WHAT CAME BACK, not a boolean. `verified` is reachable
   only through a successful payload. */
export interface VerificationPayload {
  ok: boolean;
  record_counts: Record<string, number>;
  summary: string;                 // human line, e.g. "31,204 users · 2,140 policies"
  retention_window_days?: number;
  first_event_at?: string;
  last_event_at?: string;
  response_fingerprint: string;
  controls_now_measurable: string[];
}

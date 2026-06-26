// CyberRx — connector ingestion: the adapter contract (Phase 8).
//
// Every data source implements ONE interface: given non-secret config + a secret
// credential, pull READ-ONLY signals and return them in a normalized shape. The
// orchestrator hashes + writes them to the `evidence` table (the spine), and the
// deterministic scorer (src/engine/scorer.ts) turns evidence into CMMI maturity.
//
// Adapters NEVER write to the DB and NEVER see other tenants — they are pure
// "vendor API → RawSignal[]" functions. Isolation, persistence, and signing are
// the orchestrator's job.

/** A normalized signal, pre-evidence. `value` is the citable payload; the
 *  orchestrator computes content_hash = sha256(canonical(value)). */
export type RawSignal = {
  /** Human-readable origin, stored verbatim on the evidence row. */
  sourceSystem: string
  /** Stable metric key the scorer/UI keys on, e.g. 'identity_mfa_coverage'. */
  kind: string
  /** The evidence payload (numbers, counts, ratios) — the ONLY facts downstream may use. */
  value: Record<string, unknown>
  /** When the source measured this (ISO 8601). */
  collectedAt: string
  /** Age budget in seconds — drives the freshness component of confidence. */
  freshnessSeconds?: number
}

/** What an adapter is handed at pull time. `secret` comes from connector_secrets
 *  (service-role only); `config` is the non-secret connectors.config. */
export type AdapterContext = {
  config: Record<string, unknown>
  secret: Record<string, string>
  /** Optional incremental cursor — only pull data newer than this ISO time. */
  since?: string
  /** Bounded fetch helper (timeouts/retries handled by the orchestrator). */
  fetch: typeof fetch
}

export type AdapterResult = {
  signals: RawSignal[]
  /** Health snapshot stored on the connector row (shown in the UI). */
  health?: Record<string, unknown>
}

export type ConnectorAdapter = {
  /** Vendor key, e.g. 'okta'. Selected via connectors.provider. */
  provider: string
  /** Which connector category this serves, e.g. 'idp' | 'grc' | 'mdm'. */
  kind: string
  displayName: string
  /** Required secret fields, for validation + the config UI. */
  secretFields: { key: string; label: string; placeholder?: string }[]
  /** Required non-secret config fields (e.g. instance host). */
  configFields?: { key: string; label: string; placeholder?: string }[]
  /** Pull read-only signals. Throw on auth/transport errors — the orchestrator
   *  records the connector as `error` and moves on. */
  pull: (ctx: AdapterContext) => Promise<AdapterResult>
}

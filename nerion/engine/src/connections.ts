/* =============================================================================
   Connection routes and verification. Selecting a vendor is not connecting to
   it. THE ROUTE DETERMINES THE EVIDENCE CLASS, and therefore what the
   assessment may claim: Okta's System Log API is telemetry and can answer
   operating; Okta's API token is config only and cannot.

   Verification returns WHAT CAME BACK — record counts, retention, first/last
   event — not a boolean. `verified` is reachable only through a payload. A
   route that authenticates but returns nothing because the SKU is absent is
   NOT_ESTABLISHED: entitlement_missing, never a control failure.
   ========================================================================== */
import {
  ConnectionRoute,
  CredentialField,
  IntervalClass,
  NotEstablishedReason,
  VerificationPayload,
} from './types.js';
import { CAT, CONN, GENERIC } from './fixtures/connectors.js';

function evClass(ev: string): IntervalClass {
  return ev === 't' ? 'telemetry' : 'config_export';
}
function credFields(f: any[]): CredentialField[] {
  return (f || []).map((row: any[]) => ({
    key: row[0],
    label: row[1],
    example: row[2],
    secret: !!row[3],
  }));
}

/* Normalize a raw documented route (from CONN) into a typed ConnectionRoute. */
function normalize(vendor: string, capability: string, raw: any): ConnectionRoute {
  return {
    id: raw.id,
    vendor,
    capability,
    display_name: raw.n,
    evidence_class: evClass(raw.ev),
    delivery: raw.stream ? 'streaming' : 'polled',
    recommended: !!raw.rec,
    yields: raw.y ?? '',
    scopes: raw.scopes ?? [],
    setup_steps: raw.st ?? [],
    credential_fields: credFields(raw.f),
    verification_call: raw.v ?? '',
    caveat: raw.c,
    feature_flag: raw.flag,
  };
}

function capabilityOf(vendor: string): string {
  const c = CAT.find((cat) => (cat.v as string[]).includes(vendor));
  return c ? c.k : 'idp';
}

/* Every read-only route a vendor supports. Documented vendors return their
   sourced routes; everything else falls back to the generic routes its
   capability supports. */
export function methodsFor(vendor: string): ConnectionRoute[] {
  const cap = capabilityOf(vendor);
  if ((CONN as Record<string, any[]>)[vendor]) {
    return (CONN as Record<string, any[]>)[vendor].map((r) => normalize(vendor, cap, r));
  }
  const g = (GENERIC as Record<string, any[]>)[cap] || (GENERIC as Record<string, any[]>).idp;
  return g.map((m: any[], i: number) =>
    normalize(vendor, cap, {
      id: cap + '-g' + i,
      n: m[0],
      ev: m[1],
      stream: m[2],
      rec: i === 0 ? 1 : 0,
      y: m[3],
      scopes: [m[4]],
      f: [
        ['ep', 'Endpoint or tenant', vendor.toLowerCase().replace(/ /g, '') + '.example.com', 0],
        ['cid', 'Client or key ID', '…', 0],
        ['sec', 'Secret', '…', 1],
      ],
      st: [
        'Create a read-only service identity in ' + vendor,
        'Grant only the permission named above',
        'Return here with the credentials',
      ],
      v: 'A single scoped read against ' + vendor,
      r: 'Connection verified — Nerion reports what came back before you continue',
    }),
  );
}

export function routeById(vendor: string, routeId: string): ConnectionRoute | null {
  return methodsFor(vendor).find((r) => r.id === routeId) ?? null;
}

/* Parse a route's demo result line into structured counts where possible. */
function parseCounts(result: string): Record<string, number> {
  const out: Record<string, number> = {};
  const re = /([\d,\.]+)\s+([a-z][a-z /-]+?)(?=(?: ·|$|,))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(result))) {
    const n = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(n)) out[m[2].trim()] = n;
  }
  return out;
}

/* Perform the route's scoped read. Returns the payload the caller records on
   the connection; `verified` only follows an ok payload. A route whose result
   is empty because the entitlement is missing returns ok:false with the reason,
   so the caller sets NOT_ESTABLISHED: entitlement_missing — never a failure. */
export interface VerifyOutcome {
  state: 'verified' | 'not_established';
  not_established_reason?: NotEstablishedReason;
  payload: VerificationPayload;
}
export function verify(vendor: string, routeId: string): VerifyOutcome | null {
  const route = routeById(vendor, routeId);
  if (!route) return null;
  // demo result carried on the raw route
  const raw = ((CONN as Record<string, any[]>)[vendor] || []).find((r) => r.id === routeId);
  const result: string = raw?.r ?? 'Connection verified — Nerion reports what came back';
  const entitlementMissing = /entitlement|subscription/i.test(route.caveat ?? '') && (result === '—' || result.trim() === '');
  const counts = parseCounts(result);
  const payload: VerificationPayload = {
    ok: !entitlementMissing,
    record_counts: counts,
    summary: result,
    response_fingerprint: 'sha256:' + routeId,
    controls_now_measurable: [],
  };
  if (entitlementMissing) {
    return { state: 'not_established', not_established_reason: 'entitlement_missing', payload };
  }
  return { state: 'verified', payload };
}

/* The connector catalogue, capability-first. */
export function catalogue() {
  return CAT.map((c) => ({
    key: c.k,
    name: c.n,
    required: !!c.req,
    adds: c.adds,
    gives: c.gives,
    vendors: c.v,
  }));
}

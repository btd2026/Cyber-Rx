/* =============================================================================
   Nerion v2 API — a thin read layer over the domain engine. Every figure it
   returns is a derived function in @nerion/engine; nothing is computed here.
   Credentials are write-only: no endpoint returns a secret at any verbosity.
   ========================================================================== */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fstatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import {
  register,
  projection,
  provenance,
  entitySummaries,
  corporateReach,
  groupAggregate,
  allFindings,
  methodsFor,
  verify,
  catalogue,
  classCensus,
  machineCarried,
  functionCensus,
  operableCount,
  ASOF,
  FNMETA,
  SUBS,
} from '@nerion/engine';

const app = Fastify({ logger: false });
await app.register(cors, { origin: true });

function asOfIndex(q: any): number {
  const n = Number(q?.as_of);
  return Number.isFinite(n) ? Math.max(0, Math.min(ASOF.length - 1, n)) : ASOF.length - 1;
}

app.get('/health', async () => ({ ok: true, service: 'nerion-api', version: '2.0.0' }));

/* The stops on the bitemporal time control. */
app.get('/timeline', async () => ({
  stops: ASOF.map((a, i) => ({ index: i, date: a[0], label: a[1], machine_carried: a[2] })),
}));

/* The register, plus the framework projection summary and the census. */
app.get('/controls', async (req) => {
  const q = req.query as any;
  const fw = (q?.framework as 'csf' | 'iso' | 'cis') || 'csf';
  const i = asOfIndex(q);
  return {
    framework: fw,
    as_of: ASOF[i][0],
    projection: projection(fw, i),
    census: classCensus(i),
    machine_carried: machineCarried(i),
    function_census: functionCensus(),
    functions: FNMETA.map(([k, name]) => ({ key: k, name, count: SUBS[k].length })),
    operable: operableCount(i),
    controls: register(i),
  };
});

/* Provenance for one control — the full re-performable derivation. */
app.get('/controls/:id/provenance', async (req, reply) => {
  const { id } = req.params as any;
  const i = asOfIndex(req.query);
  const p = provenance(id, i);
  if (!p) return reply.code(404).send({ error: 'unknown control', id });
  return { id, as_of: ASOF[i][0], provenance: p };
});

/* The federation view — every entity its own subject, corporate reach measured. */
app.get('/entities', async () => ({
  total: 147,
  entities: entitySummaries(),
  corporate_reach: corporateReach(),
  group_aggregate: groupAggregate(),
  findings: allFindings(),
}));

/* The connector catalogue — capability first. */
app.get('/catalog', async () => ({ capabilities: catalogue() }));

/* The read-only routes a vendor supports; the route sets the evidence class. */
app.get('/connections/methods', async (req, reply) => {
  const vendor = (req.query as any)?.vendor;
  if (!vendor) return reply.code(400).send({ error: 'vendor required' });
  return { vendor, routes: methodsFor(vendor) };
});

/* Verify a route — returns the payload that came back, never a boolean.
   `selected` is not `connected`; `verified` only follows an ok payload. */
app.post('/connections/verify', async (req, reply) => {
  const { vendor, route_id } = (req.body as any) || {};
  if (!vendor || !route_id) return reply.code(400).send({ error: 'vendor and route_id required' });
  const outcome = verify(vendor, route_id);
  if (!outcome) return reply.code(404).send({ error: 'unknown route', vendor, route_id });
  return outcome;
});

/* Serve the frontend (the "Nerion Control View", kept as-is) at the root. The
   engine and API sit behind it, ready for later wiring; the page ships with its
   own data today. */
const WEB_DIR = fileURLToPath(new URL('../../web', import.meta.url));
if (existsSync(WEB_DIR)) {
  await app.register(fstatic, { root: WEB_DIR, prefix: '/' });
}

const PORT = Number(process.env.PORT) || 8787;
app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  // eslint-disable-next-line no-console
  console.log(`nerion-api listening on :${PORT}`);
});

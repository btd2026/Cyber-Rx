'use strict';

/**
 * IngestionService — ONE generic, schema-agnostic ingestion pipeline for all
 * source types (files now; connectors via the same row interface).
 *
 *   preview(sourceKind, input, meta) -> { format, headers, sampleRows, mapping }
 *   normalizeRows(sourceKind, rows, mapping) -> { records, exceptions }   (pure)
 *   ingest(orgId, sourceKind, parsed, mapping, {sourceId}) -> { ingested, exceptions }
 *
 * Framing enforced: CMDB → applications; process hierarchy comes from a
 * process-inventory source (or the reference model). CMDB business-capability
 * tags are kept only to pre-seed crosswalk suggestions — never to create
 * processes. Rows that can't be mapped go to the ingestion_exception queue;
 * nothing is silently dropped. Deterministic ids make re-runs idempotent.
 */

const db = require('../utils/db');
const { parse } = require('./parsers');
const { proposeMapping } = require('./fieldMapper');
const { SCHEMAS } = require('./canonicalSchemas');

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
const CRIT = ['Critical', 'High', 'Medium', 'Low'];

function criticalityEnum(rec) {
  const c = String(rec.criticality || '').trim();
  const hit = CRIT.find((x) => x.toLowerCase() === c.toLowerCase());
  if (hit) return hit;
  const t = parseInt(rec.tier, 10);
  if (t === 1) return 'Critical'; if (t === 2) return 'High'; if (t === 3) return 'Medium';
  if (/crit/i.test(c)) return 'Critical'; if (/high/i.test(c)) return 'High'; if (/low/i.test(c)) return 'Low';
  return 'Medium';
}
// Existing business_processes.tier is the Primary/Strategic axis (CHECK-constrained).
function tierEnum(rec) { const c = criticalityEnum(rec); return (c === 'Critical' || c === 'High') ? 'Primary' : 'Strategic'; }
// Criticality tier 1|2|3 for the criticality_profile.
function critTierNum(rec) { const t = parseInt(rec.tier, 10); if ([1, 2, 3].includes(t)) return t; const c = criticalityEnum(rec); return c === 'Critical' ? 1 : c === 'High' ? 2 : 3; }

function valueFor(row, mapping, key) {
  const m = mapping && mapping[key];
  if (!m || m.column == null) return '';
  const v = row[m.column];
  return v == null ? '' : String(v).trim();
}

// Pure: turn parsed rows into canonical records, routing bad rows to exceptions.
function normalizeRows(sourceKind, rows, mapping) {
  const schema = SCHEMAS[sourceKind];
  if (!schema) throw new Error(`unknown source kind: ${sourceKind}`);
  const reqKeys = schema.fields.filter((f) => f.required).map((f) => f.key);
  const records = [], exceptions = [];

  (rows || []).forEach((row, rowIndex) => {
    const rec = {};
    schema.fields.forEach((f) => { const v = valueFor(row, mapping, f.key); if (v) rec[f.key] = v; });

    // process_inventory: derive Function/Process/Sub from one combined column.
    if (sourceKind === 'process_inventory' && !rec.process && rec.fps_combined) {
      const parts = rec.fps_combined.split(/\s*(?:->|—|–|\/|\||-)\s*/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) { rec.function = rec.function || parts[0]; rec.process = parts[1]; if (parts[2]) rec.subprocess = rec.subprocess || parts[2]; }
      else if (parts.length === 1) rec.process = parts[0];
    }

    if (Object.keys(rec).length === 0) { exceptions.push({ rowIndex, raw: row, reason: 'empty row' }); return; }
    const missing = reqKeys.filter((k) => !rec[k]);
    if (missing.length) { exceptions.push({ rowIndex, raw: row, reason: `missing required field(s): ${missing.join(', ')}` }); return; }
    records.push(rec);
  });

  return { records, exceptions };
}

function preview(sourceKind, input, meta = {}) {
  const parsed = parse(input, meta);
  const proposal = proposeMapping(sourceKind, parsed.headers);
  return { format: parsed.format, headers: parsed.headers, sampleRows: parsed.rows.slice(0, 5), ...proposal, rowCount: parsed.rows.length };
}

async function persistMapping(orgId, sourceId, mapping) {
  await db.query(
    `INSERT INTO ingestion_mapping (id, organization_id, source_id, mapping, confirmed, updated_at)
     VALUES ($1,$2,$3,$4,true,NOW())
     ON CONFLICT (source_id) DO UPDATE SET mapping=EXCLUDED.mapping, confirmed=true, updated_at=NOW()`,
    [`imap_${sourceId}`, orgId, sourceId, JSON.stringify(mapping || {})]);
}

async function recordExceptions(orgId, sourceId, exceptions) {
  for (const ex of exceptions) {
    await db.query(
      `INSERT INTO ingestion_exception (id, organization_id, source_id, raw_row, reason, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [`iex_${sourceId}_${ex.rowIndex}_${Math.random().toString(36).slice(2, 7)}`, orgId, sourceId, JSON.stringify(ex.raw || {}), ex.reason]);
  }
}

async function ingestApplications(orgId, records) {
  let n = 0;
  for (const r of records) {
    const id = `app_${orgId}_${slug(r.external_ref || r.name)}`;
    await db.query(
      `INSERT INTO applications (id, organization_id, name, owner, external_ref, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, owner=EXCLUDED.owner, external_ref=EXCLUDED.external_ref, updated_at=NOW()`,
      [id, orgId, r.name, r.owner || null, r.external_ref || null]);
    n++;
  }
  return n;
}

async function ingestProcesses(orgId, records) {
  let n = 0;
  const fnCache = {};
  for (const r of records) {
    let fnId = null;
    if (r.function) {
      fnId = fnCache[r.function];
      if (!fnId) {
        fnId = `bf_${orgId}_${slug(r.function)}`;
        await db.query(`INSERT INTO business_functions (id, organization_id, name, created_at, updated_at)
          VALUES ($1,$2,$3,NOW(),NOW()) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, updated_at=NOW()`, [fnId, orgId, r.function]);
        fnCache[r.function] = fnId;
      }
    }
    const procId = `bp_${orgId}_${slug((r.function ? r.function + '-' : '') + r.process)}`;
    const cpId = `cp_${procId}`;
    await db.query(`INSERT INTO criticality_profile (id, organization_id, tier, rto, derivation, created_at)
      VALUES ($1,$2,$3,$4,'explicit',NOW()) ON CONFLICT (id) DO UPDATE SET tier=EXCLUDED.tier, rto=EXCLUDED.rto`,
      [cpId, orgId, critTierNum(r), r.rto || null]);
    await db.query(
      `INSERT INTO business_processes
         (id, name, tier, criticality, owner, organization_id, description, business_function_id, rto, criticality_profile_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, tier=EXCLUDED.tier, criticality=EXCLUDED.criticality, owner=EXCLUDED.owner,
         business_function_id=EXCLUDED.business_function_id, rto=EXCLUDED.rto, criticality_profile_id=EXCLUDED.criticality_profile_id, updated_at=NOW()`,
      [procId, r.process, tierEnum(r), criticalityEnum(r), r.owner || 'Unassigned', orgId, r.subprocess || null, fnId, r.rto || null, cpId]);
    n++;
  }
  return n;
}

async function ingest(orgId, sourceKind, parsed, mapping, opts = {}) {
  const { records, exceptions } = normalizeRows(sourceKind, parsed.rows, mapping);
  let ingested = 0;
  if (sourceKind === 'cmdb') ingested = await ingestApplications(orgId, records);
  else if (sourceKind === 'process_inventory') ingested = await ingestProcesses(orgId, records);
  else throw new Error(`unsupported source kind: ${sourceKind}`);

  if (opts.sourceId) {
    await persistMapping(orgId, opts.sourceId, mapping);
    await recordExceptions(orgId, opts.sourceId, exceptions);
  }
  return { ingested, exceptions: exceptions.length, target: SCHEMAS[sourceKind].target };
}

module.exports = { preview, normalizeRows, ingest, criticalityEnum, tierEnum, critTierNum };

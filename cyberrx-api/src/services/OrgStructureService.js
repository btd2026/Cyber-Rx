'use strict';

/**
 * OrgStructureService — persists a customer's organizational hierarchy (regions and the
 * legal entities / branches under each) captured at onboarding, and serves it back so the
 * cockpit can scope Enterprise → Region → Entity from real data instead of demo regions.
 *
 * Backend parity for the regional-representation transformation: onboarding sends
 * `org_structure`; this stores it on orgs.setup_json.org_structure (the existing JSONB
 * column — no new table/migration) and normalizes it to the same slugged-id shape the
 * cockpit's loadOrgStructure() expects, so region ids line up across onboarding → API →
 * cockpit (and per-region telemetry keys match).
 *
 *   slug(s)                     -> a stable id slug ('EMEA' -> 'emea')
 *   normalizeStructure(input)   -> [{id,label,countries,regime,entities:[{id,label}]}]
 *   flattenScopes(structure)    -> Enterprise + regions + entities as a flat scope list
 *                                  with parent refs (what a per-entity data query joins on)
 *   save(orgId, input)          -> normalize + persist, returns the normalized structure
 *   get(orgId)                  -> the stored structure (or [])
 */
const db = require('../utils/db');

function slug(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
}

/** Validate + normalize the onboarding payload into the canonical hierarchy shape. */
function normalizeStructure(input) {
  const arr = Array.isArray(input) ? input : [];
  return arr.map((r) => {
    const label = String((r && r.label) || '').trim();
    if (!label) return null;
    const id = slug(label);
    const entities = (Array.isArray(r && r.entities) ? r.entities : []).map((e) => {
      const el = String((e && e.label) || '').trim();
      if (!el) return null;
      return { id: `${id}_${slug(el)}`, label: el };
    }).filter(Boolean);
    return {
      id,
      label,
      countries: String((r && r.countries) || '').trim(),
      regime: String((r && r.regime) || '').trim(),
      entities,
    };
  }).filter(Boolean);
}

/** Enterprise (roll-up) + every region + every entity, as a flat list with parent refs —
 *  the scope dimension a per-entity crown-jewel / telemetry query would join against. */
function flattenScopes(structure) {
  const out = [{ id: 'enterprise', label: 'Enterprise', kind: 'rollup', parent: null }];
  (Array.isArray(structure) ? structure : []).forEach((r) => {
    out.push({ id: r.id, label: r.label, kind: 'region', parent: 'enterprise', countries: r.countries || '', regime: r.regime || '' });
    (Array.isArray(r.entities) ? r.entities : []).forEach((e) => {
      out.push({ id: e.id, label: e.label, kind: 'entity', parent: r.id });
    });
  });
  return out;
}

async function save(orgId, input) {
  if (!orgId) throw new Error('orgId is required');
  const structure = normalizeStructure(input);
  // jsonb_set with create_missing=true — merge into setup_json without a read-modify-write race.
  await db.query(
    `UPDATE orgs SET setup_json = jsonb_set(COALESCE(setup_json, '{}'::jsonb), '{org_structure}', $2::jsonb, true) WHERE id = $1`,
    [orgId, JSON.stringify(structure)],
  );
  return structure;
}

async function get(orgId) {
  if (!orgId) throw new Error('orgId is required');
  const r = await db.query('SELECT setup_json FROM orgs WHERE id = $1', [orgId]);
  const row = r && r.rows && r.rows[0];
  const s = row && row.setup_json && row.setup_json.org_structure;
  return Array.isArray(s) ? s : [];
}

module.exports = { slug, normalizeStructure, flattenScopes, save, get };

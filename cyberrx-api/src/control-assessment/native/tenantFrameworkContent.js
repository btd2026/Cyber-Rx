'use strict';

/**
 * tenantFrameworkContent — storage for OFFICIAL framework text (ISO/IEC 27001, CIS
 * Controls, AICPA TSC) that a CUSTOMER has licensed and uploaded.
 *
 * Hard rules (enforced here + by tests):
 *   - Stored ONLY inside the uploading tenant (org_id scopes every read/write).
 *   - Marked as customer-provided licensed content, never Nerion product content.
 *   - NEVER used to train models, seed product data, generate public templates, or
 *     shown to other tenants. There is deliberately no cross-tenant or "all tenants"
 *     read path in this module.
 *   - Export is allowed only back to the SAME tenant that uploaded it, and only on
 *     an explicit tenant-only export request.
 *
 * Nerion's own product ships ZERO official text — see native/copyrightSafety.js.
 */

let db; try { db = require('../../utils/db'); } catch (_) { db = null; }

const MARK = 'customer-provided licensed content';

let _ready = null;
async function ensureTable() {
  if (!db) return false;
  if (_ready) return _ready;
  _ready = db.query(`CREATE TABLE IF NOT EXISTS tenant_framework_content (
    id BIGSERIAL PRIMARY KEY,
    org_id TEXT NOT NULL,
    framework_key TEXT NOT NULL,
    control_id TEXT,
    content TEXT NOT NULL,
    content_marking TEXT NOT NULL DEFAULT '${MARK}',
    tenant_only BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW())`).catch(() => {});
  await db.query('CREATE INDEX IF NOT EXISTS idx_tenant_fw_content ON tenant_framework_content (org_id, framework_key, control_id)').catch(() => {});
  return _ready;
}

// Store a customer's licensed official text — always tenant-scoped + marked.
async function upload(orgId, { framework_key, control_id, content, uploaded_by }) {
  if (!orgId) throw new Error('org_id is required — customer content is tenant-scoped.');
  if (!db) return { ok: false, note: 'no database', marking: MARK, tenant_only: true };
  await ensureTable();
  try {
    const r = await db.query(
      `INSERT INTO tenant_framework_content (org_id, framework_key, control_id, content, content_marking, tenant_only, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6) RETURNING id`,
      [orgId, framework_key, control_id || null, String(content || ''), MARK, uploaded_by || null]);
    return { ok: true, id: r.rows && r.rows[0] && r.rows[0].id, marking: MARK, tenant_only: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Read a tenant's own licensed content. org_id is MANDATORY and always filters —
// there is no path to read another tenant's content.
async function forTenant(orgId, framework_key, control_id) {
  if (!orgId) throw new Error('org_id is required — customer content is tenant-scoped.');
  if (!db) return [];
  await ensureTable();
  try {
    const params = [orgId, framework_key];
    let q = 'SELECT id, framework_key, control_id, content, content_marking, tenant_only, uploaded_at FROM tenant_framework_content WHERE org_id=$1 AND framework_key=$2';
    if (control_id) { q += ' AND control_id=$3'; params.push(control_id); }
    return ((await db.query(q, params)).rows || []).map((r) => Object.assign(r, { content_marking: MARK, tenant_only: true }));
  } catch (_) { return []; }
}

// Tenant-only export: returns the SAME tenant's content, explicitly requested.
async function exportForTenant(orgId, framework_key, explicit) {
  if (explicit !== true) throw new Error('Tenant-only export must be explicitly requested (explicit=true).');
  const rows = await forTenant(orgId, framework_key);
  return { org_id: orgId, framework_key, tenant_only: true, marking: MARK, controls: rows };
}

module.exports = { ensureTable, upload, forTenant, exportForTenant, MARK };

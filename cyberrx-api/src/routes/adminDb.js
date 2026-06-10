'use strict';

/**
 * Admin Database API
 * ------------------
 * Generic view/edit access to the application's Postgres tables for the
 * hidden /admin-database page. Admin-only (JWT role 'admin' or X-Admin-Key
 * matching ADMIN_API_KEY).
 *
 *   GET    /api/admin/db/tables               - tables + row counts
 *   GET    /api/admin/db/:table               - rows (?limit&offset&org_id)
 *   PUT    /api/admin/db/:table/row           - update { pk: {...}, updates: {...} }
 *   DELETE /api/admin/db/:table/row           - delete { pk: {...} }
 *   POST   /api/admin/db/:table/row           - insert { values: {...} }
 *
 * Safety: table/column identifiers are validated against information_schema
 * (never interpolated from raw input), all values are parameterized.
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const { optionalJWT, requireAdmin } = require('../middleware/auth');

router.use(optionalJWT, requireAdmin);

const IDENT = /^[a-z_][a-z0-9_]*$/;

async function tableExists(table) {
  if (!IDENT.test(table)) return false;
  const r = await db.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [table]);
  return r.length > 0;
}

async function tableColumns(table) {
  return db.query(
    `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position`, [table]);
}

async function primaryKey(table) {
  const r = await db.query(
    `SELECT a.attname AS col
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary`, [table]);
  return r.map((x) => x.col);
}

// List all public tables with row counts.
router.get('/tables', async (req, res) => {
  try {
    const tables = await db.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'
        ORDER BY table_name`);
    const out = [];
    for (const t of tables) {
      const name = t.table_name;
      if (!IDENT.test(name)) continue;
      let count = 0;
      try {
        const c = await db.query(`SELECT COUNT(*) n FROM ${name}`);
        count = Number(c[0].n);
      } catch (_) {}
      out.push({ table: name, rows: count });
    }
    res.json({ tables: out });
  } catch (err) {
    logger.error('Admin DB tables error', { error: err.message });
    res.status(500).json({ error: 'Failed to list tables', message: err.message });
  }
});

// Rows for one table.
router.get('/:table', async (req, res) => {
  const table = String(req.params.table).toLowerCase();
  try {
    if (!(await tableExists(table))) return res.status(404).json({ error: 'Unknown table' });
    const cols = await tableColumns(table);
    const pk = await primaryKey(table);
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const colNames = cols.map((c) => c.column_name);
    const orgCol = colNames.includes('org_id') ? 'org_id' : colNames.includes('organization_id') ? 'organization_id' : null;
    const orgFilter = req.query.org_id && orgCol ? ` WHERE ${orgCol} = $3` : '';
    const params = orgFilter ? [limit, offset, req.query.org_id] : [limit, offset];

    const rows = await db.query(
      `SELECT * FROM ${table}${orgFilter} ORDER BY 1 LIMIT $1 OFFSET $2`, params);
    const totalR = await db.query(
      `SELECT COUNT(*) n FROM ${table}${orgFilter ? ` WHERE ${orgCol} = $1` : ''}`,
      orgFilter ? [req.query.org_id] : []);
    res.json({ table, columns: cols, primaryKey: pk, total: Number(totalR[0].n), limit, offset, rows });
  } catch (err) {
    logger.error('Admin DB rows error', { table, error: err.message });
    res.status(500).json({ error: 'Failed to load rows', message: err.message });
  }
});

// Validate identifiers in a record against the table's real columns.
function pickValidColumns(record, colNames) {
  const out = {};
  Object.entries(record || {}).forEach(([k, v]) => {
    if (colNames.includes(k)) out[k] = v;
  });
  return out;
}

// Update a row by primary key.
router.put('/:table/row', async (req, res) => {
  const table = String(req.params.table).toLowerCase();
  try {
    if (!(await tableExists(table))) return res.status(404).json({ error: 'Unknown table' });
    const colNames = (await tableColumns(table)).map((c) => c.column_name);
    const pkCols = await primaryKey(table);
    const pk = pickValidColumns(req.body && req.body.pk, colNames);
    const updates = pickValidColumns(req.body && req.body.updates, colNames);
    if (!pkCols.length || pkCols.some((c) => pk[c] === undefined)) {
      return res.status(400).json({ error: 'pk must include all primary-key columns', primaryKey: pkCols });
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'updates is empty' });

    const setCols = Object.keys(updates);
    const set = setCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const where = pkCols.map((c, i) => `${c} = $${setCols.length + i + 1}`).join(' AND ');
    const params = [...setCols.map((c) => updates[c]), ...pkCols.map((c) => pk[c])];
    const result = await db.pool.query(
      `UPDATE ${table} SET ${set} WHERE ${where} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ error: 'Row not found' });
    res.json({ updated: result.rows[0] });
  } catch (err) {
    logger.error('Admin DB update error', { table, error: err.message });
    res.status(500).json({ error: 'Failed to update row', message: err.message });
  }
});

// Insert a row.
router.post('/:table/row', async (req, res) => {
  const table = String(req.params.table).toLowerCase();
  try {
    if (!(await tableExists(table))) return res.status(404).json({ error: 'Unknown table' });
    const colNames = (await tableColumns(table)).map((c) => c.column_name);
    const values = pickValidColumns(req.body && req.body.values, colNames);
    if (!Object.keys(values).length) return res.status(400).json({ error: 'values is empty' });
    const cols = Object.keys(values);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.pool.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      cols.map((c) => values[c]));
    res.status(201).json({ inserted: result.rows[0] });
  } catch (err) {
    logger.error('Admin DB insert error', { table, error: err.message });
    res.status(500).json({ error: 'Failed to insert row', message: err.message });
  }
});

// Delete a row by primary key.
router.delete('/:table/row', async (req, res) => {
  const table = String(req.params.table).toLowerCase();
  try {
    if (!(await tableExists(table))) return res.status(404).json({ error: 'Unknown table' });
    const colNames = (await tableColumns(table)).map((c) => c.column_name);
    const pkCols = await primaryKey(table);
    const pk = pickValidColumns(req.body && req.body.pk, colNames);
    if (!pkCols.length || pkCols.some((c) => pk[c] === undefined)) {
      return res.status(400).json({ error: 'pk must include all primary-key columns', primaryKey: pkCols });
    }
    const where = pkCols.map((c, i) => `${c} = $${i + 1}`).join(' AND ');
    const result = await db.pool.query(
      `DELETE FROM ${table} WHERE ${where} RETURNING *`, pkCols.map((c) => pk[c]));
    if (!result.rows.length) return res.status(404).json({ error: 'Row not found' });
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    logger.error('Admin DB delete error', { table, error: err.message });
    res.status(500).json({ error: 'Failed to delete row', message: err.message });
  }
});

module.exports = router;

'use strict';

/**
 * DocumentSpendService — a running ledger of LLM document-review spend, so the
 * cumulative cost is visible without summing log lines by hand.
 *
 * Each analyzed document (LLM path only) writes one row; GET /api/documents/spend
 * returns today / last-30-days / all-time totals, a per-model breakdown, a
 * 14-day daily rollup, and the most recent reviews. Everything is best-effort:
 * if there is no database, recording is a no-op and the summary reports zeros —
 * the document-review endpoint never fails because spend tracking is unavailable.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

let _ensured = false;
async function ensureTable() {
  if (_ensured) return true;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS document_review_spend (
        id                BIGSERIAL PRIMARY KEY,
        org_id            TEXT,
        model             TEXT,
        engine            TEXT,
        doc_type          TEXT,
        label             TEXT,
        input_tokens      INTEGER DEFAULT 0,
        output_tokens     INTEGER DEFAULT 0,
        cache_read_tokens INTEGER DEFAULT 0,
        cost_usd          NUMERIC DEFAULT 0,
        created_at        TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS document_review_spend_created ON document_review_spend(created_at DESC);
    `);
    _ensured = true;
    return true;
  } catch (e) { logger.warn('document_review_spend table unavailable', { error: e.message }); return false; }
}

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** Record one LLM review's spend. Best-effort — swallows DB errors. */
async function record(entry = {}) {
  if (!(await ensureTable())) return;
  const u = entry.usage || {};
  try {
    await db.query(
      `INSERT INTO document_review_spend
         (org_id, model, engine, doc_type, label, input_tokens, output_tokens, cache_read_tokens, cost_usd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [entry.orgId || null, entry.model || null, entry.engine || 'llm',
        entry.docType || null, (entry.label || '').slice(0, 200),
        n(u.input_tokens), n(u.output_tokens), n(u.cache_read_tokens), n(entry.costUsd)],
    );
  } catch (e) { logger.warn('document spend record failed', { error: e.message }); }
}

async function agg(where, params) {
  const rows = await db.query(
    `SELECT COUNT(*)::int AS count,
            COALESCE(SUM(cost_usd),0)::float AS cost_usd,
            COALESCE(SUM(input_tokens),0)::int AS input_tokens,
            COALESCE(SUM(output_tokens),0)::int AS output_tokens
       FROM document_review_spend ${where}`, params);
  const r = rows[0] || {};
  return { count: n(r.count), cost_usd: Math.round(n(r.cost_usd) * 1e4) / 1e4, input_tokens: n(r.input_tokens), output_tokens: n(r.output_tokens) };
}

/** Cumulative spend summary. Returns zeros (available:false) when no DB. */
async function summary(opts = {}) {
  const empty = { count: 0, cost_usd: 0, input_tokens: 0, output_tokens: 0 };
  if (!(await ensureTable())) {
    return { available: false, today: empty, last30: empty, allTime: empty, byModel: [], daily: [], recent: [] };
  }
  const org = opts.orgId || null;
  const scope = org ? 'AND org_id=$1' : '';
  const p = org ? [org] : [];
  try {
    const [today, last30, allTime, byModelRows, dailyRows, recentRows] = await Promise.all([
      agg(`WHERE created_at >= date_trunc('day', NOW()) ${scope}`, p),
      agg(`WHERE created_at >= NOW() - INTERVAL '30 days' ${scope}`, p),
      agg(`WHERE 1=1 ${scope}`, p),
      db.query(`SELECT model, COUNT(*)::int AS count, COALESCE(SUM(cost_usd),0)::float AS cost_usd
                  FROM document_review_spend WHERE 1=1 ${scope}
                 GROUP BY model ORDER BY cost_usd DESC`, p),
      db.query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                       COUNT(*)::int AS count, COALESCE(SUM(cost_usd),0)::float AS cost_usd
                  FROM document_review_spend
                 WHERE created_at >= NOW() - INTERVAL '14 days' ${scope}
                 GROUP BY 1 ORDER BY 1 DESC`, p),
      db.query(`SELECT model, doc_type, label, cost_usd::float AS cost_usd,
                       input_tokens, output_tokens, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS at
                  FROM document_review_spend WHERE 1=1 ${scope}
                 ORDER BY created_at DESC LIMIT 20`, p),
    ]);
    return {
      available: true, today, last30, allTime,
      byModel: byModelRows.map((r) => ({ model: r.model, count: n(r.count), cost_usd: Math.round(n(r.cost_usd) * 1e4) / 1e4 })),
      daily: dailyRows.map((r) => ({ day: r.day, count: n(r.count), cost_usd: Math.round(n(r.cost_usd) * 1e4) / 1e4 })),
      recent: recentRows.map((r) => ({ model: r.model, doc_type: r.doc_type, label: r.label, cost_usd: n(r.cost_usd), input_tokens: n(r.input_tokens), output_tokens: n(r.output_tokens), at: r.at })),
    };
  } catch (e) {
    logger.warn('document spend summary failed', { error: e.message });
    return { available: false, today: empty, last30: empty, allTime: empty, byModel: [], daily: [], recent: [] };
  }
}

module.exports = { record, summary };

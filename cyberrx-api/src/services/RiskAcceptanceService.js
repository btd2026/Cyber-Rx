'use strict';

/**
 * RiskAcceptanceService — the documented decision to accept a risk as-is.
 *
 * The CISO's alternative to opening a remediation ticket: record a formal risk
 * acceptance (justification, who accepted it, the review/expiry date). One per
 * (org, source_ref); re-accepting updates it. Enriched reads add the age in days
 * and an `expired` flag once the review date passes.
 */

const crypto = require('crypto');
const db = require('../utils/db');

const DAY = 86400000;
const uid = () => `ra_${crypto.randomBytes(6).toString('hex')}`;

function enrich(r) {
  if (!r) return null;
  const created = new Date(r.created_at).getTime();
  const ageDays = Math.max(0, Math.floor((Date.now() - created) / DAY));
  const expired = !!(r.review_date && Date.now() > new Date(r.review_date).getTime());
  return {
    id: r.id,
    sourceRef: r.source_ref,
    title: r.title,
    justification: r.justification,
    riskLevel: r.risk_level,
    acceptedBy: r.accepted_by,
    reviewDate: r.review_date,
    status: expired && r.status === 'active' ? 'expired' : r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ageDays,
    expired,
  };
}

async function accept(orgId, body = {}) {
  const { sourceRef, title, justification, riskLevel, acceptedBy, reviewDate } = body;
  if (!sourceRef) throw new Error('sourceRef is required');
  if (!justification) throw new Error('justification is required');
  await db.query(
    `INSERT INTO risk_acceptances
       (id, organization_id, source_ref, title, justification, risk_level, accepted_by, review_date, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',NOW(),NOW())
     ON CONFLICT (organization_id, source_ref) DO UPDATE SET
       title=EXCLUDED.title, justification=EXCLUDED.justification, risk_level=EXCLUDED.risk_level,
       accepted_by=EXCLUDED.accepted_by, review_date=EXCLUDED.review_date, status='active', updated_at=NOW()`,
    [uid(), orgId, sourceRef, title || null, justification, riskLevel || null, acceptedBy || null, reviewDate || null]);
  return getByRef(orgId, sourceRef);
}

async function getByRef(orgId, sourceRef) {
  const rows = await db.query(
    `SELECT * FROM risk_acceptances WHERE organization_id=$1 AND source_ref=$2`, [orgId, sourceRef]);
  return enrich(rows[0]);
}

async function revoke(orgId, sourceRef) {
  await db.query(
    `UPDATE risk_acceptances SET status='revoked', updated_at=NOW() WHERE organization_id=$1 AND source_ref=$2`,
    [orgId, sourceRef]);
  return getByRef(orgId, sourceRef);
}

async function list(orgId) {
  const rows = await db.query(
    `SELECT * FROM risk_acceptances WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 200`, [orgId]);
  return rows.map(enrich);
}

module.exports = { accept, getByRef, revoke, list };

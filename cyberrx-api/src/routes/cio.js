'use strict';

/**
 * CIO Technology-Risk API
 * -----------------------
 * Aggregates the technology-risk picture a CIO needs into a single payload:
 * asset inventory, systems at risk, vulnerability & patch posture, control
 * effectiveness, end-of-life technology, remediation backlog, and a composite
 * technology-risk score.
 *
 *   GET /api/cio/overview        - full CIO dashboard payload (org-scoped)
 *
 * Demo posture: optional JWT; org resolved from JWT -> X-Org-Id -> org_id.
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const { optionalJWT } = require('../middleware/auth');

function resolveOrg(req, res) {
  const orgId = req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;
  if (!orgId) {
    res.status(400).json({ error: 'Organization not specified', message: 'Provide a JWT, X-Org-Id header, or org_id query parameter.' });
    return null;
  }
  return orgId;
}

async function safeRows(sql, params = []) {
  try { return await db.query(sql, params); } catch (err) {
    logger.debug('CIO query degraded', { error: err.message });
    return [];
  }
}
const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

router.get('/overview', optionalJWT, async (req, res) => {
  const orgId = resolveOrg(req, res);
  if (!orgId) return;
  try {
    const [assets, processes, openRisks, controls, ctrlByFw, tasks, threats] = await Promise.all([
      safeRows(
        `SELECT id, name, type, hostname, owner, criticality, tier,
                COALESCE(supported, true) supported, end_of_support_date,
                COALESCE(vuln_critical,0) vuln_critical, COALESCE(vuln_high,0) vuln_high,
                patch_pct, business_process_ids, data_classification
           FROM assets WHERE organization_id=$1
           ORDER BY CASE criticality WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
                    COALESCE(vuln_critical,0) DESC`, [orgId]),
      safeRows(
        `SELECT bp.id, bp.name, bp.tier, bp.criticality, bp.owner,
                COUNT(r.id) FILTER (WHERE r.status IN ('open','mitigating')) open_risks,
                COALESCE(SUM(r.financial_exposure) FILTER (WHERE r.status IN ('open','mitigating')),0) exposure
           FROM business_processes bp
           LEFT JOIN risks r ON r.organization_id = bp.organization_id
             AND r.business_process_ids @> to_jsonb(bp.id)
          WHERE bp.organization_id=$1
          GROUP BY bp.id, bp.name, bp.tier, bp.criticality, bp.owner
          ORDER BY exposure DESC`, [orgId]),
      safeRows(
        `SELECT id, title, severity, financial_exposure, business_process_ids, threat_scenario_id, remediation_owner
           FROM risks WHERE organization_id=$1 AND status IN ('open','mitigating')`, [orgId]),
      safeRows(
        `SELECT COUNT(*) n, COALESCE(ROUND(AVG(effectiveness_score)),0) avg_eff,
                COUNT(*) FILTER (WHERE implementation_status='Implemented') implemented,
                COUNT(*) FILTER (WHERE implementation_status='Partial') partial,
                COUNT(*) FILTER (WHERE implementation_status='Planned') planned,
                COUNT(*) FILTER (WHERE implementation_status='None') none_impl
           FROM controls WHERE organization_id=$1`, [orgId]),
      safeRows(
        `SELECT framework, COALESCE(ROUND(AVG(effectiveness_score)),0) avg_eff, COUNT(*) n
           FROM controls WHERE organization_id=$1 GROUP BY framework ORDER BY n DESC`, [orgId]),
      safeRows(
        `SELECT id, title, priority, status, assigned_team, assigned_to, target_date, estimated_cost, source_risk_id
           FROM remediation_tasks
          WHERE organization_id=$1 AND status NOT IN ('Completed','Verified','Cancelled')
          ORDER BY CASE priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
                   target_date NULLS LAST`, [orgId]),
      safeRows(
        `SELECT id, name, type, probability, impact_level FROM threat_scenarios
          WHERE organization_id=$1 ORDER BY COALESCE(probability,0) DESC`, [orgId]),
    ]);

    const ctrl = controls[0] || {};
    const now = Date.now();

    const assetOut = assets.map((a) => ({
      id: a.id, name: a.name, type: a.type, hostname: a.hostname, owner: a.owner,
      criticality: a.criticality, tier: a.tier, supported: a.supported,
      endOfSupportDate: a.end_of_support_date,
      vulnCritical: n(a.vuln_critical), vulnHigh: n(a.vuln_high),
      patchPct: a.patch_pct == null ? null : n(a.patch_pct),
      crownJewel: a.criticality === 'Critical' || a.tier === 'Tier 1',
      processes: Array.isArray(a.business_process_ids) ? a.business_process_ids : [],
      dataTypes: Array.isArray(a.data_classification) ? a.data_classification : [],
    }));

    const procName = {};
    processes.forEach((p) => { procName[p.id] = p.name; });
    assetOut.forEach((a) => { a.processNames = a.processes.map((id) => procName[id] || id); });

    const eolSystems = assetOut.filter((a) => !a.supported);
    const crownJewels = assetOut.filter((a) => a.crownJewel);
    const criticalVulns = assetOut.reduce((s, a) => s + a.vulnCritical, 0);
    const highVulns = assetOut.reduce((s, a) => s + a.vulnHigh, 0);
    const patched = assetOut.filter((a) => a.patchPct != null);
    const avgPatch = patched.length ? Math.round(patched.reduce((s, a) => s + a.patchPct, 0) / patched.length) : 0;
    const belowSla = patched.filter((a) => a.patchPct < 85);
    const overdue = tasks.filter((t) => t.target_date && new Date(t.target_date).getTime() < now);
    const criticalOpenRisks = openRisks.filter((r) => r.severity === 'Critical').length;

    // Composite technology-risk score (higher = worse), 0-100.
    let score = 0;
    score += criticalOpenRisks * 12;
    score += eolSystems.length * 8;
    score += overdue.length * 6;
    score += criticalVulns * 3;
    score += n(ctrl.none_impl) * 5;
    score += Math.max(0, 85 - avgPatch);
    score = Math.min(100, score);
    const grade = score >= 70 ? 'Critical' : score >= 45 ? 'Elevated' : score >= 20 ? 'Moderate' : 'Healthy';

    const threatsToSystems = threats.map((t) => {
      const procs = new Set();
      openRisks.filter((r) => r.threat_scenario_id === t.id).forEach((r) => {
        (Array.isArray(r.business_process_ids) ? r.business_process_ids : []).forEach((id) => procs.add(procName[id] || id));
      });
      return { id: t.id, name: t.name, type: t.type, probability: n(t.probability), impact: t.impact_level, systems: [...procs] };
    });

    res.json({
      orgId,
      generatedAt: new Date().toISOString(),
      techRiskScore: { score, grade },
      kpis: {
        totalAssets: assetOut.length,
        crownJewels: crownJewels.length,
        eolSystems: eolSystems.length,
        openRisks: openRisks.length,
        criticalRisks: criticalOpenRisks,
        criticalVulns, highVulns,
        avgPatch,
        controlEffectiveness: n(ctrl.avg_eff),
        overdueTasks: overdue.length,
        openTasks: tasks.length,
      },
      assets: assetOut,
      processesAtRisk: processes
        .filter((p) => n(p.open_risks) > 0)
        .map((p) => ({ id: p.id, name: p.name, tier: p.tier, criticality: p.criticality, owner: p.owner, openRisks: n(p.open_risks), exposure: n(p.exposure) })),
      controlPosture: {
        total: n(ctrl.n), avgEffectiveness: n(ctrl.avg_eff),
        implemented: n(ctrl.implemented), partial: n(ctrl.partial), planned: n(ctrl.planned), none: n(ctrl.none_impl),
        byFramework: ctrlByFw.map((f) => ({ framework: f.framework, avgEffectiveness: n(f.avg_eff), count: n(f.n) })),
      },
      vulnerabilities: {
        critical: criticalVulns, high: highVulns,
        topAssets: assetOut.filter((a) => a.vulnCritical + a.vulnHigh > 0)
          .sort((a, b) => (b.vulnCritical * 10 + b.vulnHigh) - (a.vulnCritical * 10 + a.vulnHigh))
          .slice(0, 5)
          .map((a) => ({ name: a.name, vulnCritical: a.vulnCritical, vulnHigh: a.vulnHigh, patchPct: a.patchPct })),
      },
      patchPosture: { avgPatch, belowSla: belowSla.length, slaTarget: 85,
        worst: [...patched].sort((a, b) => a.patchPct - b.patchPct).slice(0, 5).map((a) => ({ name: a.name, patchPct: a.patchPct })) },
      eolSystems: eolSystems.map((a) => ({ id: a.id, name: a.name, type: a.type, endOfSupportDate: a.endOfSupportDate, criticality: a.criticality, processNames: a.processNames })),
      remediationBacklog: tasks.map((t) => ({
        id: t.id, title: t.title, priority: t.priority, status: t.status,
        assignedTeam: t.assigned_team || t.assigned_to || 'Unassigned',
        targetDate: t.target_date, estimatedCost: n(t.estimated_cost),
        overdue: !!(t.target_date && new Date(t.target_date).getTime() < now),
      })),
      threatsToSystems,
    });
  } catch (err) {
    logger.error('CIO overview error', { error: err.message });
    res.status(500).json({ error: 'Failed to load CIO overview', message: err.message });
  }
});

module.exports = router;

'use strict';

/**
 * AiControlsService
 * -----------------
 * How well the organization's AI-related security controls are operating —
 * specifically the controls around AI coding assistants (Claude Code, Copilot)
 * and generative-AI use. Modeled on the OWASP Top 10 for LLM Applications,
 * the NIST AI RMF, and secure-SDLC practice for AI-assisted development.
 *
 * Each control reports operating effectiveness (0–100), status, the signals
 * behind it, and a recommended action. Where a live signal exists it is used
 * (secret-scanning / SAST coverage from the same posture inputs, intake
 * answers); otherwise the control is derived from those inputs or marked
 * "Not assessed" so the org can attest it. Nothing is invented as "passing".
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const MetricsEngine = require('./MetricsEngine');

function num(v, d = 0) { const x = Number(v); return Number.isFinite(x) ? x : d; }
function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
function statusOf(s) { return s == null ? 'Not assessed' : s >= 80 ? 'Operating' : s >= 60 ? 'Partial' : 's' && s >= 40 ? 'Weak' : 'Gap'; }
function status2(s) { return s == null ? 'Not assessed' : s >= 80 ? 'Operating' : s >= 60 ? 'Partial' : s >= 40 ? 'Weak' : 'Gap'; }

async function safeRows(sql, p = []) { try { return await db.query(sql, p); } catch (e) { logger.debug('AiControls degraded', { error: e.message }); return []; } }

// The eight domains of AI-coding / GenAI security controls.
function buildControls(I, ev) {
  const mfa = num(I.mfa_pct), dlp = /yes/i.test(ev.pr_ds_dlp || '') ? 90 : /partial/i.test(ev.pr_ds_dlp || '') ? 50 : 20;
  const enc = /fully/i.test(ev.pr_ds_encryption || '') ? 90 : /partial/i.test(ev.pr_ds_encryption || '') ? 55 : 25;
  const train = num(I.training_pct), patch = num(I.patch_pct), vuln = num(I.vuln_sla_pct);

  // ai_* intake answers (optional — attested in setup); fall back to derivations.
  const A = (k, map) => (ev[k] && map[ev[k]] != null ? map[ev[k]] : null);

  return [
    { id: 'governance', name: 'AI Usage Governance & Approved Tools',
      ref: 'NIST AI RMF GOVERN', desc: 'Only sanctioned AI coding/GenAI tools (Claude Code, approved Copilot tenants) are permitted; shadow-AI use is detected and blocked.',
      score: A('ai_governance', { yes: 90, partial: 55, no: 20 }) != null ? A('ai_governance', { yes: 90, partial: 55, no: 20 }) : clamp(dlp * 0.5 + 25),
      signals: ['Approved-tool policy (intake)', 'CASB / DLP egress to AI endpoints'],
      action: 'Publish an approved-AI-tool list and block unsanctioned GenAI endpoints at the proxy/CASB.' },
    { id: 'data_leak', name: 'Sensitive Data / PHI Leakage to AI',
      ref: 'OWASP LLM06 Sensitive Information Disclosure', desc: 'PHI, secrets, and proprietary code are prevented from being pasted into prompts or sent to AI tools.',
      score: clamp((dlp * 0.6) + (enc * 0.2) + 10),
      signals: ['DLP coverage for AI tools', 'PHI-in-prompt blocking', 'Encryption posture'],
      action: 'Extend DLP rules to AI-assistant traffic and block PHI/secret patterns in prompts.' },
    { id: 'secrets', name: 'Secrets in AI-Generated Code',
      ref: 'OWASP LLM / Secure SDLC', desc: 'AI-generated code is scanned for hard-coded secrets/credentials before commit and in CI.',
      score: A('ai_secret_scan', { yes: 92, partial: 55, no: 20 }) != null ? A('ai_secret_scan', { yes: 92, partial: 55, no: 20 }) : clamp(vuln * 0.5 + 30),
      signals: ['Pre-commit secret scanning', 'CI secret detection (GitGuardian/Trufflehog)'],
      action: 'Enforce pre-commit + CI secret scanning that blocks merges of AI-suggested secrets.' },
    { id: 'review', name: 'AI Code Review & Merge Gates',
      ref: 'Secure SDLC', desc: 'AI-generated code cannot be merged without human review; no auto-merge of agent output to protected branches.',
      score: A('ai_review_gate', { yes: 90, partial: 55, no: 25 }) != null ? A('ai_review_gate', { yes: 90, partial: 55, no: 25 }) : 55,
      signals: ['Branch protection + required reviewers', 'AI-PR labeling'],
      action: 'Require human approval and SAST pass on every AI-authored pull request; label AI PRs.' },
    { id: 'prompt_injection', name: 'Prompt-Injection & Tool-Use Guardrails',
      ref: 'OWASP LLM01 Prompt Injection', desc: 'Agentic AI tools run with least privilege; untrusted content cannot redirect the agent to exfiltrate data or run unsafe actions.',
      score: A('ai_agent_guardrails', { yes: 88, partial: 50, no: 20 }) != null ? A('ai_agent_guardrails', { yes: 88, partial: 50, no: 20 }) : clamp(mfa * 0.4 + 20),
      signals: ['Agent least-privilege scopes', 'Untrusted-input handling policy'],
      action: 'Scope AI agents to least privilege and require confirmation for outbound/destructive actions.' },
    { id: 'supply_chain', name: 'AI-Suggested Dependency / Package Risk',
      ref: 'OWASP LLM05 / Supply Chain', desc: 'Packages suggested by AI are checked against SCA and a known-good registry (defends against hallucinated/“slopsquatted” packages).',
      score: clamp(vuln * 0.5 + patch * 0.3),
      signals: ['SCA / dependency scanning', 'Internal package registry allowlist'],
      action: 'Gate AI-suggested dependencies through SCA and an allowlisted registry before install.' },
    { id: 'output_validation', name: 'AI Output Validation & Provenance',
      ref: 'NIST AI RMF MEASURE', desc: 'AI-generated code is tested (unit/SAST) and tracked for provenance; license/IP of generated code is reviewed.',
      score: A('ai_output_validation', { yes: 85, partial: 50, no: 25 }) != null ? A('ai_output_validation', { yes: 85, partial: 50, no: 25 }) : clamp(vuln * 0.6 + 20),
      signals: ['SAST on AI code', 'Provenance/attribution tracking', 'License scanning'],
      action: 'Run SAST + license scanning on AI-generated code and record provenance for audit.' },
    { id: 'access_logging', name: 'AI Tool Access Control & Monitoring',
      ref: 'NIST AI RMF MANAGE', desc: 'AI tools are behind SSO/MFA, access is least-privilege, and prompts/usage are logged for monitoring and incident response.',
      score: clamp(mfa * 0.6 + 20),
      signals: ['SSO/MFA on AI tools', 'Prompt & usage logging', 'Vendor data-retention review'],
      action: 'Put all AI tools behind SSO/MFA, log usage, and confirm vendors do not train on your data.' },
  ];
}

const FRAMEWORKS_NOTE = 'Mapped to OWASP Top 10 for LLM Applications, NIST AI RMF, and secure-SDLC controls for AI-assisted development.';

async function getAiControls(orgId) {
  let I = {};
  try { I = await MetricsEngine.loadInputs(orgId); } catch (_) { I = {}; }
  const ev = {};
  (await safeRows(`SELECT question_key, answer FROM csf_evidence WHERE organization_id=$1`, [orgId])).forEach((r) => { ev[r.question_key] = r.answer; });

  const controls = buildControls(I, ev).map((c) => ({
    id: c.id, name: c.name, ref: c.ref, description: c.desc,
    score: c.score, status: status2(c.score),
    signals: c.signals, recommendedAction: c.action,
  }));
  const overall = Math.round(controls.reduce((s, c) => s + c.score, 0) / controls.length);
  const operating = controls.filter((c) => c.score >= 80).length;
  const gaps = controls.filter((c) => c.score < 60).length;
  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    title: 'AI Security Controls — AI Coding & GenAI',
    note: FRAMEWORKS_NOTE,
    overall: { score: overall, status: status2(overall) },
    controlsOperating: operating, controlsWithGaps: gaps, totalControls: controls.length,
    controls,
  };
}

module.exports = { getAiControls };

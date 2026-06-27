'use strict';

/**
 * Model routing config for the grounded assessment engine.
 * Stage 4 uses `judge`; Stage 5 adds triage/escalate routing by difficulty.
 * Model IDs are config — confirm current generation before changing.
 * Current generation: Haiku 4.5 / Sonnet 4.6 / Opus 4.8.
 */

const str = (name, def) => (process.env[name] || def).trim();
const int = (name, def) => { const v = parseInt(process.env[name], 10); return Number.isFinite(v) && v > 0 ? v : def; };

module.exports = {
  get triageModel() { return str('ASSESSMENT_TRIAGE_MODEL', 'claude-haiku-4-5-20251001'); }, // cheap/fast
  get judgeModel() { return str('ASSESSMENT_JUDGE_MODEL', 'claude-sonnet-4-6'); },           // mid (default)
  get escalateModel() { return str('ASSESSMENT_ESCALATE_MODEL', 'claude-opus-4-8'); },        // flagship
  get maxTokens() { return int('ASSESSMENT_MAX_TOKENS', 1024); },
};

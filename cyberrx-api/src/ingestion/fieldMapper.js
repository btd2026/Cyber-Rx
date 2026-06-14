'use strict';

/**
 * fieldMapper — schema-agnostic mapping of incoming columns to the canonical
 * schema, each with a confidence score. High-confidence mappings auto-apply;
 * low-confidence/ambiguous ones are flagged for the user to confirm/correct.
 *
 * Deterministic heuristics (normalization + synonym + token-overlap + fuzzy)
 * are primary and fully testable offline. An optional LLM assist can refine
 * low-confidence cases later; it is never required.
 */

const { SCHEMAS } = require('./canonicalSchemas');

const AUTO_THRESHOLD = 0.8;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (s) => norm(s).split(' ').filter(Boolean);

// Normalized Levenshtein similarity in [0,1].
function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

function tokenOverlap(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; A.forEach((t) => { if (B.has(t)) inter++; });
  return inter / Math.max(A.size, B.size);
}

// Best score of one header against a canonical field (key + its synonyms).
function scoreHeader(header, field) {
  const candidates = [field.key, ...(field.synonyms || [])];
  let best = 0;
  for (const c of candidates) {
    if (norm(header) === norm(c)) return 1;                 // exact (normalized)
    best = Math.max(best, 0.6 * tokenOverlap(header, c) + 0.4 * sim(header, c));
    if (tokens(c).every((t) => norm(header).includes(t))) best = Math.max(best, 0.85);
  }
  return Math.round(best * 100) / 100;
}

/**
 * proposeMapping(sourceKind, headers) ->
 *   { mapping: { canonicalKey: { column, confidence } }, lowConfidence: [keys],
 *     unmapped: [headers], missingRequired: [keys] }
 * Each header is used at most once (greedy by best score).
 */
function proposeMapping(sourceKind, headers) {
  const schema = SCHEMAS[sourceKind];
  if (!schema) throw new Error(`unknown source kind: ${sourceKind}`);
  const used = new Set();
  const mapping = {};
  const lowConfidence = [];

  // Score every (field, header) pair, then assign greedily highest-first.
  const pairs = [];
  for (const field of schema.fields) for (const h of headers) pairs.push({ key: field.key, column: h, score: scoreHeader(h, field) });
  pairs.sort((a, b) => b.score - a.score);

  for (const p of pairs) {
    if (mapping[p.key] || used.has(p.column) || p.score <= 0.35) continue;
    mapping[p.key] = { column: p.column, confidence: p.score };
    used.add(p.column);
    if (p.score < AUTO_THRESHOLD) lowConfidence.push(p.key);
  }

  const unmapped = headers.filter((h) => !used.has(h));
  const missingRequired = schema.fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.key);
  return { mapping, lowConfidence, unmapped, missingRequired, autoThreshold: AUTO_THRESHOLD };
}

module.exports = { proposeMapping, scoreHeader, AUTO_THRESHOLD };

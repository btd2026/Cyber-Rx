'use strict';

/**
 * Eval scorer (§ Stage 9). Reports per-class precision/recall/F1, a confusion
 * matrix, and the binary "addressed" view — with a HEAVY penalty on false
 * "addressed" verdicts (predicting Fully/Partially when the gold is Not
 * addressed / Not applicable). A false "compliant" is the dangerous error, so
 * the headline risk-adjusted score weights it far above other mistakes.
 */

const CLASSES = ['Fully addressed', 'Partially addressed', 'Not addressed', 'Not applicable'];
const isAddressed = (s) => s === 'Fully addressed' || s === 'Partially addressed';

function score(rows, { falseAddressedPenalty = 5 } = {}) {
  const n = rows.length || 1;
  // Confusion matrix gold -> pred.
  const confusion = {};
  CLASSES.forEach((g) => { confusion[g] = {}; CLASSES.forEach((p) => { confusion[g][p] = 0; }); });
  let correct = 0;
  for (const r of rows) {
    if (confusion[r.gold] && confusion[r.gold][r.pred] != null) confusion[r.gold][r.pred] += 1;
    if (r.gold === r.pred) correct += 1;
  }

  // Per-class precision/recall/F1.
  const perClass = {};
  for (const c of CLASSES) {
    let tp = 0; let fp = 0; let fn = 0;
    for (const r of rows) {
      if (r.pred === c && r.gold === c) tp += 1;
      else if (r.pred === c && r.gold !== c) fp += 1;
      else if (r.pred !== c && r.gold === c) fn += 1;
    }
    const precision = tp + fp ? tp / (tp + fp) : null;
    const recall = tp + fn ? tp / (tp + fn) : null;
    const f1 = precision && recall ? (2 * precision * recall) / (precision + recall) : (precision === 0 || recall === 0 ? 0 : null);
    perClass[c] = { tp, fp, fn, precision: round(precision), recall: round(recall), f1: round(f1) };
  }

  // Binary "addressed" view.
  let tp = 0; let fp = 0; let fn = 0; let tn = 0;
  const falseAddressed = [];
  for (const r of rows) {
    const g = isAddressed(r.gold); const p = isAddressed(r.pred);
    if (g && p) tp += 1; else if (!g && p) { fp += 1; falseAddressed.push(r); }
    else if (g && !p) fn += 1; else tn += 1;
  }
  const addressed = {
    precision: round(tp + fp ? tp / (tp + fp) : null),
    recall: round(tp + fn ? tp / (tp + fn) : null),
    tp, fp, fn, tn,
  };

  // Risk-adjusted: each false-addressed costs `penalty` ordinary errors.
  const ordinaryErrors = (n - correct) - fp;
  const riskAdjusted = (correct - (falseAddressedPenalty - 1) * fp) / n;

  return {
    n, accuracy: round(correct / n),
    risk_adjusted_score: round(riskAdjusted),
    false_addressed: fp,
    false_addressed_rate: round(fp / n),
    false_addressed_cases: falseAddressed.map((r) => r.id).filter(Boolean),
    addressed_precision: addressed.precision,
    addressed_recall: addressed.recall,
    addressed,
    per_class: perClass,
    confusion,
    penalty: falseAddressedPenalty,
    ordinary_errors: ordinaryErrors,
  };
}

function round(x) { return x == null ? null : Math.round(x * 1000) / 1000; }

function formatReport(s) {
  const lines = [];
  lines.push(`Eval: ${s.n} cases | accuracy ${s.accuracy} | risk-adjusted ${s.risk_adjusted_score} (false-addressed penalty x${s.penalty})`);
  lines.push(`FALSE "ADDRESSED": ${s.false_addressed} (rate ${s.false_addressed_rate})  <- the dangerous error`);
  lines.push(`Addressed-class: precision ${s.addressed_precision}  recall ${s.addressed_recall}`);
  lines.push('Per-class F1: ' + CLASSES.map((c) => `${c.split(' ')[0]}=${s.per_class[c].f1}`).join('  '));
  return lines.join('\n');
}

module.exports = { score, formatReport, CLASSES, isAddressed };

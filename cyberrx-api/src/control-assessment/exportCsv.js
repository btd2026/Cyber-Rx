'use strict';

/**
 * exportCsv — emits corrected-framework-native-control-assessment.csv straight
 * from the assessment registries (the authoritative definitions, not a live
 * run). One row per (control × relevant signal). This is the corrected mapping:
 * each row states what the signal proves and does NOT prove for THAT control,
 * and whether an automated Effective conclusion is even possible.
 */

const { REGISTRIES } = require('./registries');
const { ASSESSMENT_TYPE, EVIDENCE_LAYER, EVIDENCE_STRENGTH } = require('./evidenceModel');

const COLUMNS = [
  'framework', 'control_id', 'control_name', 'control_objective', 'signal_name', 'connector',
  'assessment_type', 'evidence_layer', 'evidence_strength', 'required_api_fields', 'denominator_source',
  'pass_conditions', 'fail_conditions', 'missing_evidence', 'what_api_proves', 'what_api_does_not_prove',
  'live_tenant_validated', 'automated_assessment_possible',
];

const q = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

// The highest evidence layer this signal alone can reach for this control.
function signalLayerFor(def, signal) {
  // A signal listed as required implies it materially contributes; an optional
  // signal is at best a relevance indicator on its own.
  const isRequired = (def.required_signals || []).includes(signal);
  if (isRequired) return { layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, strength: EVIDENCE_STRENGTH.DIRECT };
  return { layer: EVIDENCE_LAYER.RELEVANCE, strength: EVIDENCE_STRENGTH.INDICATOR };
}

function rows() {
  const out = [];
  for (const key of Object.keys(REGISTRIES)) {
    const reg = REGISTRIES[key];
    for (const id of Object.keys(reg.REGISTRY)) {
      const d = reg.REGISTRY[id];
      const signals = (d.required_signals || []).concat(d.optional_signals || []);
      const connectors = (d.supported_connectors || []).join(' | ');
      const automatable = d.assessment_type === ASSESSMENT_TYPE.AUTOMATED || d.assessment_type === ASSESSMENT_TYPE.SEMI_AUTOMATED;
      const missing = (d.cannot_conclude_without || []).join('; ');
      if (!signals.length) {
        const sl = { layer: EVIDENCE_LAYER.NONE, strength: EVIDENCE_STRENGTH.NOT_EVIDENCE };
        out.push([d.framework, d.control_id, d.control_name, d.control_objective, '(none — evidence fields only)', connectors,
          d.assessment_type, sl.layer, sl.strength, (d.required_api_fields || []).join('; '), d.required_denominator_source || '',
          d.pass_conditions || '', d.fail_conditions || '', missing, d.proves || '', d.control_limitations || '',
          d.live_tenant_validated ? 'yes' : 'no', automatable ? 'yes' : 'no']);
        continue;
      }
      for (const sig of signals) {
        const sl = signalLayerFor(d, sig);
        const doesNotProve = (d.optional_signals || []).includes(sig)
          ? (sig + ' is a relevance indicator only; ' + (d.control_limitations || 'it does not prove operating effectiveness for this control.'))
          : (d.control_limitations || '');
        out.push([d.framework, d.control_id, d.control_name, d.control_objective, sig, connectors,
          d.assessment_type, sl.layer, sl.strength, (d.required_api_fields || []).join('; '), d.required_denominator_source || '',
          d.pass_conditions || '', d.fail_conditions || '', missing, 'Contributes toward: ' + (d.pass_conditions || d.control_objective),
          doesNotProve, d.live_tenant_validated ? 'yes' : 'no', automatable ? 'yes' : 'no']);
      }
    }
  }
  return out;
}

function toCsv() {
  const lines = [COLUMNS.join(',')];
  rows().forEach((r) => lines.push(r.map(q).join(',')));
  return lines.join('\n') + '\n';
}

module.exports = { COLUMNS, rows, toCsv };

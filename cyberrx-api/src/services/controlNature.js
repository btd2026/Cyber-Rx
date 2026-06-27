'use strict';

/**
 * control_nature derivation (§1 / §4).
 *
 * NIST does not label controls "automated" vs "manual" — control_nature is OUR
 * classification, used so every finding can be tagged automated-capable vs
 * non-automated/procedural (the operating-effectiveness evidence for a
 * procedural control is an attestation/record, not a system signal).
 *
 * It is derived from two grounded signals, and is per-control overridable:
 *   1. 800-53 family character (well-known NIST family semantics), and
 *   2. whether 800-53A publishes a TEST method for the control (a control that
 *      can be evidenced by examining a running system is automated-capable;
 *      one evidenced only by examine/interview is procedural).
 *
 * This is a classification rule, not framework content recalled from memory.
 */

const NATURES = Object.freeze({
  AUTOMATED: 'automated_capable',
  PROCEDURAL: 'non_automated_procedural',
  HYBRID: 'hybrid',
});

// Families whose controls are satisfied primarily by process/program, not tech.
const PROCEDURAL_FAMILIES = new Set([
  'AT', // Awareness and Training
  'PL', // Planning
  'PM', // Program Management
  'PS', // Personnel Security
  'PT', // PII Processing and Transparency
  'SR', // Supply Chain Risk Management
]);

// Families whose controls are predominantly technical / tool-evidenced.
const TECHNICAL_FAMILIES = new Set([
  'AC', // Access Control
  'AU', // Audit and Accountability
  'IA', // Identification and Authentication
  'SC', // System and Communications Protection
  'SI', // System and Information Integrity
  'CM', // Configuration Management
  'MA', // Maintenance
]);
// Everything else (CA, CP, IR, MP, PE, RA, AU-adjacent, etc.) is treated as hybrid by default.

/**
 * @param {string} controlId  native id e.g. 'AC-2' or 'AC-2(3)'
 * @param {string} family     two-letter family e.g. 'AC'
 * @param {{hasTestMethod?:boolean}} signals
 * @returns {'automated_capable'|'non_automated_procedural'|'hybrid'}
 */
function deriveNature(controlId, family, signals = {}) {
  const fam = String(family || '').toUpperCase();
  const hasTest = !!signals.hasTestMethod;
  // "-1" controls are the family's policy & procedures control — always procedural.
  if (/-1(\(\d+\))?$/.test(String(controlId))) return NATURES.PROCEDURAL;
  if (PROCEDURAL_FAMILIES.has(fam)) return hasTest ? NATURES.HYBRID : NATURES.PROCEDURAL;
  if (TECHNICAL_FAMILIES.has(fam)) return hasTest ? NATURES.AUTOMATED : NATURES.HYBRID;
  return hasTest ? NATURES.HYBRID : NATURES.PROCEDURAL;
}

// CSF 2.0 library encodes evidence character directly (auto|partial|manual).
function csfNature(testFlag) {
  if (testFlag === 'auto') return NATURES.AUTOMATED;
  if (testFlag === 'partial') return NATURES.HYBRID;
  return NATURES.PROCEDURAL; // 'manual' or unknown
}

module.exports = { NATURES, PROCEDURAL_FAMILIES, TECHNICAL_FAMILIES, deriveNature, csfNature };

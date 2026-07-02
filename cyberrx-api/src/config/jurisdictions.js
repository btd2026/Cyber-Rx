'use strict';

/**
 * Jurisdiction ruleset — maps operating regions + data classes to the cyber
 * notification/disclosure obligations that apply, each with its clock and
 * penalty ceiling. Maintained reference data (spec: Data & Formulas, §9); the
 * engine derives the org's applicable duties from onboarding regions + the data
 * classes on its assets. No hardcoded per-org values.
 *
 * matchers: lowercase substrings tested against the org's declared regions.
 * appliesTo: data-class keywords that trigger the regime ('*' = always).
 */

module.exports = [
  { code: 'US-SEC', jurisdiction: 'United States', flag: '🇺🇸',
    matchers: ['us', 'united states', 'usa', 'north america', 'americas', 'global'],
    obligation: 'SEC Form 8-K (Item 1.05) — material cyber incident', appliesTo: ['*'],
    clock: '4 business days', clockHours: 96, penalty: 'Disclosure + enforcement' },
  { code: 'US-STATE', jurisdiction: 'United States (state laws)', flag: '🇺🇸',
    matchers: ['us', 'united states', 'usa', 'north america', 'americas', 'global'],
    obligation: 'State breach-notification laws (54 jurisdictions)', appliesTo: ['pii', 'phi', 'personal', 'financial', 'pci'],
    clock: 'varies (often 30–60 days)', clockHours: 720, penalty: 'Per-record fines + AG action' },
  { code: 'EU-GDPR', jurisdiction: 'European Union', flag: '🇪🇺',
    matchers: ['eu', 'europe', 'european union', 'emea', 'global', 'germany', 'france', 'ireland', 'netherlands', 'spain', 'italy'],
    obligation: 'GDPR Art. 33 — personal-data breach notice', appliesTo: ['pii', 'personal', 'phi'],
    clock: '72 hours', clockHours: 72, penalty: 'Up to 4% of global revenue' },
  { code: 'EU-NIS2', jurisdiction: 'European Union', flag: '🇪🇺',
    matchers: ['eu', 'europe', 'european union', 'emea', 'global'],
    obligation: 'NIS2 — significant incident (essential/important entities)', appliesTo: ['*'],
    clock: '24h early warning · 72h notice', clockHours: 24, penalty: 'Up to 2% of global revenue' },
  { code: 'EU-DORA', jurisdiction: 'European Union (financial)', flag: '🇪🇺',
    matchers: ['eu', 'europe', 'european union', 'emea', 'global'], industry: ['financial', 'bank', 'insurance', 'payments', 'fintech'],
    obligation: 'DORA — major ICT-related incident report', appliesTo: ['*'],
    clock: '4h–24h initial', clockHours: 4, penalty: 'Supervisory penalties' },
  { code: 'UK-GDPR', jurisdiction: 'United Kingdom', flag: '🇬🇧',
    matchers: ['uk', 'united kingdom', 'britain', 'england', 'emea', 'global'],
    obligation: 'UK GDPR / ICO notification', appliesTo: ['pii', 'personal', 'phi'],
    clock: '72 hours', clockHours: 72, penalty: 'Up to £17.5M or 4%' },
  { code: 'SG-PDPA', jurisdiction: 'Singapore', flag: '🇸🇬',
    matchers: ['singapore', 'apac', 'asia', 'asia pacific', 'global'],
    obligation: 'PDPA data-breach notification', appliesTo: ['pii', 'personal', 'phi'],
    clock: '72 hours (assessment 30 days)', clockHours: 72, penalty: 'Up to S$1M or 10% turnover' },
  { code: 'SG-MAS', jurisdiction: 'Singapore (financial)', flag: '🇸🇬',
    matchers: ['singapore', 'apac', 'asia', 'asia pacific', 'global'], industry: ['financial', 'bank', 'insurance', 'payments', 'fintech'],
    obligation: 'MAS TRM — incident notification', appliesTo: ['*'],
    clock: '1 hour', clockHours: 1, penalty: 'Supervisory action' },
  { code: 'AU-PRIV', jurisdiction: 'Australia', flag: '🇦🇺',
    matchers: ['australia', 'apac', 'asia pacific', 'anz', 'global'],
    obligation: 'Privacy Act — Notifiable Data Breaches', appliesTo: ['pii', 'personal', 'phi'],
    clock: '72 hours (assess ≤30 days)', clockHours: 72, penalty: 'Up to A$50M' },
  { code: 'CA-PIPEDA', jurisdiction: 'Canada', flag: '🇨🇦',
    matchers: ['canada', 'north america', 'americas', 'global'],
    obligation: 'PIPEDA — breach of security safeguards', appliesTo: ['pii', 'personal', 'phi'],
    clock: 'as soon as feasible', clockHours: 168, penalty: 'Fines + reputational' },
];

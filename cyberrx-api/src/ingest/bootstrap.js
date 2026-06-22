'use strict';

/**
 * ingest/bootstrap.js
 * -------------------
 * Idempotent, guarded boot-time hydration of the four-lens engine:
 *   - seedEngine() always (cheap): CSF 2.0 lens, checks, mappings.
 *   - load80053 + loadCsf80053 only if the 800-53 catalog is not yet present.
 *   - loadAttack only if ATT&CK techniques are not yet present.
 *
 * Heavy content (OSCAL/STIX) is parsed at most once per database. Failures are
 * logged and swallowed so they never block API startup. Run automatically from
 * index.js when ENGINE_BOOTSTRAP !== 'false', or manually:
 *     node src/ingest/bootstrap.js
 */

const realDb = require('../utils/db');
const logger = require('../utils/logger');

async function count(sql, params = []) {
  try { const r = await realDb.query(sql, params); return Number(r[0] ? (r[0].n || r[0].count || 0) : 0); }
  catch (_) { return 0; }
}

async function bootstrap() {
  const steps = {};
  try {
    const { seedEngine } = require('./seedEngine');
    steps.engine = await seedEngine();
  } catch (e) { logger.warn('bootstrap: seedEngine failed', { error: e.message }); }

  try {
    const has80053 = await count(`SELECT COUNT(*)::int n FROM framework_requirements WHERE framework_id='nist_800_53_r5'`);
    if (has80053 < 100) {
      steps.nist80053 = await require('./load80053').load();
      steps.csf80053 = await require('./loadCsf80053').load();
    } else { steps.nist80053 = 'present'; }
  } catch (e) { logger.warn('bootstrap: 800-53 ingest failed', { error: e.message }); }

  try {
    const hasAttack = await count(`SELECT COUNT(*)::int n FROM attack_techniques`);
    if (hasAttack < 100) steps.attack = await require('./loadAttack').load();
    else steps.attack = 'present';
  } catch (e) { logger.warn('bootstrap: ATT&CK ingest failed', { error: e.message }); }

  try {
    const hasCis = await count(`SELECT COUNT(*)::int n FROM framework_requirements WHERE framework_id='cis_v8_1'`);
    if (hasCis < 100) steps.cis = await require('./loadCis').load();
    else steps.cis = 'present';
  } catch (e) { logger.warn('bootstrap: CIS ingest failed', { error: e.message }); }

  try {
    // ISO/IEC 27001:2022 + SOC 2 (AICPA TSC): paraphrased structure, verbatim
    // gated by VERBATIM_ISO / VERBATIM_SOC2. Re-seed if either is incomplete.
    const hasIso = await count(`SELECT COUNT(*)::int n FROM framework_requirements WHERE framework_id='iso_27001'`);
    const hasSoc = await count(`SELECT COUNT(*)::int n FROM framework_requirements WHERE framework_id='soc_2'`);
    if (hasIso < 90 || hasSoc < 40) steps.isoSoc2 = await require('./loadIsoSoc2').load();
    else steps.isoSoc2 = 'present';
  } catch (e) { logger.warn('bootstrap: ISO/SOC2 ingest failed', { error: e.message }); }

  try {
    // HIPAA Security Rule + HITRUST CSF: paraphrased structure (public-domain CFR
    // citations for HIPAA; factual category names for HITRUST). Re-seed if either
    // is incomplete. Completes the seven onboarding frameworks.
    const hasHipaa = await count(`SELECT COUNT(*)::int n FROM framework_requirements WHERE framework_id='hipaa_security'`);
    const hasHitrust = await count(`SELECT COUNT(*)::int n FROM framework_requirements WHERE framework_id='hitrust_csf'`);
    if (hasHipaa < 50 || hasHitrust < 14) steps.hipaaHitrust = await require('./loadHipaaHitrust').load();
    else steps.hipaaHitrust = 'present';
  } catch (e) { logger.warn('bootstrap: HIPAA/HITRUST ingest failed', { error: e.message }); }

  try {
    // Unified control library + cross-framework crosswalk. Cheap and curated, so
    // re-seed each boot to pick up mapping edits (it replaces its own crosswalk).
    steps.controlLibrary = await require('./seedControlLibrary').seed();
  } catch (e) { logger.warn('bootstrap: control library seed failed', { error: e.message }); }

  try {
    // OFFICIAL CSF<->800-53 references, when the CPRT export is supplied.
    const hasOfficial = await count(`SELECT COUNT(*)::int n FROM requirement_crosswalks WHERE provenance='NIST CPRT'`);
    if (!hasOfficial) steps.csfRefs = await require('./loadCsfRefs').load();
    else steps.csfRefs = 'present';
  } catch (e) { logger.warn('bootstrap: CSF refs ingest failed', { error: e.message }); }

  try {
    // Derived CIS/CSF -> ATT&CK crosswalks (provisional; cheap to recompute).
    const hasDerived = await count(`SELECT COUNT(*)::int n FROM requirement_crosswalks WHERE to_framework='attack_enterprise' AND provenance='derived'`);
    if (!hasDerived) steps.attackXwalks = await require('./deriveAttackXwalks').derive();
    else steps.attackXwalks = 'present';
  } catch (e) { logger.warn('bootstrap: attack xwalk derivation failed', { error: e.message }); }

  try {
    // CISO dashboard entities (schema-backed demo; service falls back to module).
    const hasCiso = await count(`SELECT COUNT(*)::int n FROM ciso_entities`);
    if (hasCiso < 10) steps.cisoDashboard = await require('./seedCisoDashboard').seed();
    else steps.cisoDashboard = 'present';
  } catch (e) { logger.warn('bootstrap: CISO dashboard seed failed', { error: e.message }); }

  try {
    // Organization Intake document catalog (document_type + document_control_map).
    // Idempotent upsert; cheap to re-run so curated catalog edits take effect on boot.
    steps.intakeCatalog = await require('./seedIntakeCatalog').seed();
  } catch (e) { logger.warn('bootstrap: intake catalog seed failed', { error: e.message }); }

  try {
    // Canonical payer capability library + packs; backfills assessment_type.
    // Shared reference content (no org_id); idempotent.
    steps.referenceModel = await require('./seedReferenceModel').seed();
  } catch (e) { logger.warn('bootstrap: reference model seed failed', { error: e.message }); }

  try {
    // Control Assessment Engine: private connector/tool catalog (cae_*).
    // Creates the schema and seeds from src/data/cae CSVs; idempotent.
    steps.caeConnectors = await require('../cae/seedConnectors').seed();
  } catch (e) { logger.warn('bootstrap: cae connector seed failed', { error: e.message }); }

  try {
    // CAE control database (105 rows) + control→tool map (alias resolution).
    steps.caeControls = await require('../cae/seedControls').seed();
  } catch (e) { logger.warn('bootstrap: cae control seed failed', { error: e.message }); }

  try {
    // CAE scoring model + evidence schema config.
    steps.caeScoring = await require('../cae/seedScoringModel').seed();
  } catch (e) { logger.warn('bootstrap: cae scoring seed failed', { error: e.message }); }

  return steps;
}

module.exports = { bootstrap };

if (require.main === module) {
  realDb.init().then(bootstrap).then((s) => { console.log('bootstrap:', JSON.stringify(s)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}

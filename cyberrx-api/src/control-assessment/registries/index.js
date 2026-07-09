'use strict';

/**
 * Framework-native assessment registries. Each is independent. There is NO
 * shared control logic and NO crosswalk between them. The keys below are the
 * only frameworks the engine will ever score, each from its own registry.
 */
const REGISTRIES = {
  nist_csf_2_0: require('./nist_csf_2_0'),
  nist_800_53_rev5: require('./nist_800_53_rev5'),
  cis_v8_1: require('./cis_v8_1'),
  hipaa_164: require('./hipaa_164'),
  soc2_2017_tsc: require('./soc2_2017_tsc'),
  iso_27001_2022: require('./iso_27001_2022'),
};

const FRAMEWORK_KEYS = Object.keys(REGISTRIES);

module.exports = { REGISTRIES, FRAMEWORK_KEYS };

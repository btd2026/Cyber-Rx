/* Nerion v2 domain engine — public surface. Every figure a consumer shows is
   a derived function here; nothing is typed into a view. */
export * from './types.js';
export { WINDOW, DAY0, lostDays, devFor, gapsFor, dayStr } from './window.js';
export { makeOperating, operatingLostDays } from './operating.js';
export {
  register,
  rawRegister,
  rawStateAt,
  toAssessment,
  classCensus,
  machineCarried,
  functionCensus,
  operableCount,
  ASOF,
  INSTR_DATE,
} from './register.js';
export type { RawState } from './register.js';
export { csfProjection, isoProjection, cisProjection, projection } from './projections.js';
export type { FrameworkProjection } from './projections.js';
export {
  originOf,
  entityCredits,
  entityOriginCount,
  entityFindings,
  entitySummaries,
  corporateReach,
  groupAggregate,
  allFindings,
  TOTAL_ENTITIES,
} from './federation.js';
export type { EntitySummary, Finding, Reach, GroupAggregate } from './federation.js';
export { provenance } from './provenance.js';
export type { Provenance } from './provenance.js';
export { methodsFor, routeById, verify, catalogue } from './connections.js';
export type { VerifyOutcome } from './connections.js';

export { SUBS, FNMETA, PIN } from './fixtures/csf.js';
export { ISOC, ISOTHEME } from './fixtures/iso.js';
export { CISC } from './fixtures/cis.js';
export { CTRL, SCEN, QA } from './fixtures/controls.js';
export { ENTS, REACH, CORPTOOL, ROUTES, ORIGIN_META, FACTS } from './fixtures/federation.js';
export { CAT, CONN } from './fixtures/connectors.js';
export { SIGNERS, CONTRADICTED, INSTR } from './fixtures/instrumentation.js';
export { OPTEST } from './fixtures/provenance.js';

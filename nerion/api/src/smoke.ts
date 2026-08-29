/* Boot-free smoke: proves @nerion/engine resolves and the derived figures are
   the ones the mock shows. */
import { classCensus, machineCarried, provenance, entitySummaries, verify, projection } from '@nerion/engine';

const c = classCensus();
console.log('CSF census', c, 'machine', machineCarried());
console.log('ISO units', projection('iso').units, 'CIS IG1', projection('cis').ig1);
const p = provenance('PR.AA-03');
console.log('PR.AA-03 provenance kind', p?.kind, (p as any)?.source_system);
console.log('most-exposed entity', entitySummaries()[0].id, entitySummaries()[0].name);
const v = verify('CrowdStrike Falcon', 'cs-vuln');
console.log('cs-vuln verify', v?.state, v?.not_established_reason);
console.log('SMOKE OK');

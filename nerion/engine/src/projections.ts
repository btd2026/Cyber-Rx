/* =============================================================================
   One estate, three projections. The estate is measured once; each framework
   is a different set of identifiers and groupings over the SAME evidence. The
   machine-carried share differs per framework only because the frameworks ask
   about different things — never because the evidence changed. Switching
   framework re-labels; it never re-collects.
   ========================================================================== */
import { EvidenceClass } from './types.js';
import { expandClass } from './fixtures/csf.js';
import { ISOC, ISOTHEME } from './fixtures/iso.js';
import { CISC } from './fixtures/cis.js';
import { classCensus, machineCarried } from './register.js';

export interface FrameworkProjection {
  framework: 'csf' | 'iso' | 'cis';
  label: string;
  units: number; // subcategories / controls / safeguards
  machine_carried: number; // telemetry + config_export
  census: Partial<Record<EvidenceClass, number>>;
  groups: { id: string; name: string; units: number; machine_carried: number }[];
  ig1?: number;
}

function censusOf(list: [string, string, string][]): Record<EvidenceClass, number> {
  const c: Record<EvidenceClass, number> = {
    telemetry: 0,
    config_export: 0,
    document: 0,
    attestation: 0,
    interview: 0,
  };
  for (const row of list) c[expandClass(row[2])]++;
  return c;
}
function machineOf(list: [string, string, string][]): number {
  return list.filter((r) => r[2] === 't' || r[2] === 'c').length;
}

export function csfProjection(asOfIdx?: number): FrameworkProjection {
  const census = classCensus(asOfIdx);
  const units = Object.values(census).reduce((a, b) => a + b, 0);
  return {
    framework: 'csf',
    label: 'NIST CSF 2.0',
    units,
    machine_carried: machineCarried(asOfIdx),
    census,
    groups: [], // function grouping lives in register/view layer
  };
}

export function isoProjection(): FrameworkProjection {
  let units = 0,
    machine = 0;
  const census: Record<EvidenceClass, number> = {
    telemetry: 0,
    config_export: 0,
    document: 0,
    attestation: 0,
    interview: 0,
  };
  const groups = ISOTHEME.map(([id, name]) => {
    const list = ISOC[id] as [string, string, string][];
    const c = censusOf(list);
    (Object.keys(c) as EvidenceClass[]).forEach((k) => (census[k] += c[k]));
    units += list.length;
    const mc = machineOf(list);
    machine += mc;
    return { id, name, units: list.length, machine_carried: mc };
  });
  return { framework: 'iso', label: 'ISO/IEC 27001:2022', units, machine_carried: machine, census, groups };
}

export function cisProjection(): FrameworkProjection {
  let safeguards = 0,
    machine = 0,
    ig1 = 0;
  const groups = CISC.map((row) => {
    const [id, title, sg, mc, ig1n] = row;
    safeguards += sg as number;
    machine += mc as number;
    ig1 += ig1n as number;
    return { id: String(id), name: title as string, units: sg as number, machine_carried: mc as number };
  });
  return {
    framework: 'cis',
    label: 'CIS Controls v8.1',
    units: safeguards,
    machine_carried: machine,
    census: {},
    groups,
    ig1,
  };
}

export function projection(fw: 'csf' | 'iso' | 'cis', asOfIdx?: number): FrameworkProjection {
  return fw === 'iso' ? isoProjection() : fw === 'cis' ? cisProjection() : csfProjection(asOfIdx);
}

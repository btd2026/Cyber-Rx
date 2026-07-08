// Verifies the HPE demo CSVs parse against the REAL onboarding parser logic
// (parseDelim / findCol / get + importRows), so every upload pulls real data
// with no illustrative fallback. Extracts the parser functions verbatim from
// onboarding.html and runs the documented column matchers against each file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = __dirname;
const html = fs.readFileSync(path.join(dir, '..', '..', 'public', 'onboarding.html'), 'utf8');

function grab(sig) {
  const m = html.match(sig);
  if (!m) throw new Error('could not extract ' + sig);
  return m[0];
}
// Pull the three parser primitives verbatim from onboarding.html.
const parseDelimSrc = grab(/function parseDelim\(text\)\{[\s\S]*?\n {2}\}/);
const findColSrc = grab(/function findCol\(h,names\)\{[^\n]*\}/);
const getSrc = grab(/function get\(c,i\)\{[^\n]*\}/);
// eslint-disable-next-line no-new-func
const F = new Function(parseDelimSrc + '\n' + findColSrc + '\n' + getSrc + '\nreturn {parseDelim,findCol,get};');
const { parseDelim, findCol, get } = F();

const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
let fail = 0;
const check = (label, n, min, sample) => {
  const ok = n >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'OK ' : 'XX '} ${label}: ${n} rows${sample ? '  e.g. ' + sample : ''}`);
};

// ---- Processes ----
(() => {
  const p = parseDelim(read('01_processes.csv')), h = p.headers;
  const nc = findCol(h, ['process_name', 'name', 'title', 'process']), rvc = findCol(h, ['revenue', 'rev', 'value']),
    rtc = findCol(h, ['rto', 'recovery']), dc = findCol(h, ['data', 'domain', 'sensitivity', 'category']),
    cc = findCol(h, ['criticality', 'crit', 'tier', 'priority']), fnc = findCol(h, ['function', 'business_function', 'capability', 'area']);
  const rows = p.rows.map((c) => ({ name: get(c, nc) || c[0], revenue: get(c, rvc), rto: get(c, rtc), data: get(c, dc), crit: get(c, cc), func: get(c, fnc) })).filter((x) => x.name);
  const withFn = rows.filter((r) => r.func).length, withRev = rows.filter((r) => r.revenue).length;
  check('01 processes', rows.length, 8, `${rows[0].name} · ${rows[0].revenue} · RTO ${rows[0].rto}h · fn=${rows[0].func}`);
  check('   · with revenue', withRev, 8); check('   · with function', withFn, 8);
})();

// ---- Systems ----
(() => {
  const p = parseDelim(read('02_systems.csv')), h = p.headers;
  const nc = findCol(h, ['application_name', 'app_name', 'name', 'title', 'application']), hc = findCol(h, ['ci_class', 'hosting', 'host', 'class', 'type']),
    dc = findCol(h, ['data', 'sensitivity', 'classification']), vc = findCol(h, ['vendor', 'provider', 'supplier', 'cloud']),
    vyc = findCol(h, ['value_per_year', 'annual_value', 'annual_volume', 'yearly_value']);
  const rows = p.rows.map((c) => ({ name: get(c, nc) || c[0], host: get(c, hc), data: get(c, dc), vendor: get(c, vc), valueYear: get(c, vyc) })).filter((x) => x.name);
  check('02 systems', rows.length, 10, `${rows[0].name} · ${rows[0].host} · ${rows[0].vendor} · ${rows[0].valueYear}/yr`);
  check('   · with value_per_year', rows.filter((r) => r.valueYear).length, 7);
})();

// ---- Risk register ----
(() => {
  const p = parseDelim(read('03_risk_register.csv')), h = p.headers;
  const tc = findCol(h, ['title', 'risk', 'name', 'description']), sc = findCol(h, ['severity', 'sev', 'priority', 'rating']),
    ac = findCol(h, ['asset', 'system', 'application', 'app', 'ci']), ec = findCol(h, ['exposure', 'financial', 'impact', 'loss', 'ale', 'amount']);
  const rows = p.rows.map((c) => ({ title: get(c, tc) || c[0], severity: get(c, sc), asset: get(c, ac), exposure: get(c, ec) })).filter((x) => x.title);
  check('03 risks', rows.length, 12, `${rows[0].title} · ${rows[0].asset} · ${rows[0].exposure}`);
  check('   · with exposure', rows.filter((r) => r.exposure).length, 12);
})();

// ---- Register-style files (importRows semantics: match by names, money strips to number) ----
function importRows(parsed, colSpec) {
  const headers = parsed.headers, rows = parsed.rows || [];
  return rows.map((row) => {
    const v = {}; let any = false;
    colSpec.forEach((c, i) => {
      const idx = headers ? findCol(headers, c.names) : i;
      let val = (idx >= 0 && idx < row.length) ? row[idx] : '';
      if (c.money) val = String(val).replace(/[^0-9.]/g, '');
      if (val != null && String(val).trim() !== '') { v[c.cls] = String(val).trim(); any = true; }
    });
    return any ? v : null;
  }).filter(Boolean);
}
const reg = (label, file, colSpec, min) => {
  const rows = importRows(parseDelim(read(file)), colSpec);
  check(label, rows.length, min, JSON.stringify(rows[0]));
};
reg('04 capabilities', '04_capabilities.csv', [{ cls: 'name', names: ['capability', 'name', 'process', 'function', 'business_capability'] }, { cls: 'exposure', names: ['exposure', 'exposure_usd', 'cyber_exposure', 'amount', 'loss'], money: true }, { cls: 'grc_status', names: ['grc_status', 'grc', 'status', 'coverage', 'control_coverage'] }, { cls: 'control_gaps', names: ['control_gaps', 'gaps', 'open_gaps', 'open_control_gaps'] }, { cls: 'open_risk', names: ['open_risk', 'open_risks', 'risks', 'risk_count'] }], 8);
reg('05 sbom', '05_sbom.csv', [{ cls: 'sbom-name', names: ['component', 'name', 'package'] }, { cls: 'sbom-ver', names: ['version', 'ver'] }, { cls: 'sbom-vulns', names: ['critical_vulns', 'vulns', 'criticals'] }], 12);
reg('06 risk appetite', '06_risk_appetite.csv', [{ cls: 'rap-cat', names: ['category', 'risk_category', 'name'] }, { cls: 'rap-app', names: ['appetite', 'appetite_usd', 'threshold_usd'], money: true }, { cls: 'rap-thr', names: ['threshold', 'level', 'tolerance'] }], 5);
reg('07 regulatory', '07_regulatory_register.csv', [{ cls: 'reg-name', names: ['regulation', 'reg', 'name'] }, { cls: 'reg-obl', names: ['obligation', 'requirement', 'duty'] }, { cls: 'reg-stat', names: ['status', 'state', 'compliance'] }, { cls: 'reg-exp', names: ['exposure', 'fine', 'penalty', 'exposure_usd'], money: true }], 8);
reg('08 materiality', '08_materiality_criteria.csv', [{ cls: 'mat-met', names: ['metric', 'criterion', 'name'] }, { cls: 'mat-thr', names: ['threshold', 'threshold_usd', 'amount'], money: true }, { cls: 'mat-bas', names: ['basis', 'reference', 'rule'] }], 5);
reg('09 benchmark', '09_benchmark_data.csv', [{ cls: 'ben-met', names: ['metric', 'name'] }, { cls: 'ben-our', names: ['our_value', 'our', 'current', 'value'] }, { cls: 'ben-bmk', names: ['benchmark', 'peer', 'industry'] }], 7);
reg('10 initiatives', '10_initiatives.csv', [{ cls: 'name', names: ['initiative', 'name', 'project', 'move'] }, { cls: 'owner', names: ['owner', 'lead'] }, { cls: 'cost', names: ['cost', 'budget'], money: true }, { cls: 'roi', names: ['roi', 'return'] }, { cls: 'status', names: ['status', 'state'] }, { cls: 'engagement', names: ['engagement', 'stage'] }], 7);
reg('11 vendors', '11_vendors.csv', [{ cls: 'name', names: ['name', 'vendor', 'supplier'] }, { cls: 'tier', names: ['tier', 'level'] }, { cls: 'domain', names: ['domain', 'url', 'website'] }, { cls: 'crit', names: ['criticality', 'crit'] }], 12);
reg('13 strategic', '13_strategic_initiatives.csv', [{ cls: 'name', names: ['initiative', 'name', 'project', 'move'] }, { cls: 'type', names: ['type', 'category', 'kind'] }, { cls: 'value', names: ['value', 'value_usd', 'stake'], money: true }, { cls: 'horizon', names: ['horizon', 'timeline', 'when'] }], 4);

// ---- AI inventory (loadAiInv classification) ----
(() => {
  const p = parseDelim(read('12_ai_inventory.csv')), h = p.headers, rows = p.rows;
  const col = (names) => { for (let i = 0; i < h.length; i++) { const hl = String(h[i] || '').toLowerCase(); for (const n of names) if (hl.indexOf(n) >= 0) return i; } return -1; };
  const tc = col(['type', 'category', 'class', 'kind']), fc = col(['customer_facing', 'customerfacing', 'decisioning', 'facing']);
  const tally = { ai_system: 0, genai_app: 0, machine_identity: 0, crypto_asset: 0 }; let cust = false;
  rows.forEach((row) => {
    const raw = (tc >= 0 ? String(row[tc] || '') : '').toLowerCase();
    const key = /genai|gen-ai|llm app|chatbot|copilot|assistant/.test(raw) ? 'genai_app' : /machine|service account|non.?human|nhi|token|secret|api key|workload/.test(raw) ? 'machine_identity' : /crypto|cert|key|tls|cbom|algorithm/.test(raw) ? 'crypto_asset' : /ai|ml|model/.test(raw) ? 'ai_system' : 'ai_system';
    tally[key]++;
    if (fc >= 0 && /yes|true|1|customer|external|decision|automat/.test(String(row[fc] || '').toLowerCase())) cust = true;
  });
  check('12 ai inventory', rows.length, 20, `ai_system=${tally.ai_system} genai=${tally.genai_app} machine_id=${tally.machine_identity} crypto=${tally.crypto_asset} customerFacing=${cust}`);
  if (!(tally.ai_system > 0 && tally.genai_app > 0 && tally.machine_identity > 0 && tally.crypto_asset > 0 && cust)) { fail++; console.log('XX  ai inventory must classify all four types + a customer-facing system'); }
})();

console.log(fail ? `\n${fail} FAILED` : '\nALL HPE DATA FILES PARSE — every upload will pull real data.');
process.exit(fail ? 1 : 0);

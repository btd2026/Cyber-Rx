'use strict';

/**
 * ControlScorecardBuilder — the Excel companion to the auditor pack.
 * ------------------------------------------------------------------
 * Renders the SAME assessment the Frameworks tab / auditor pack use into a
 * working spreadsheet an assessor or control owner can filter, sort and track:
 *   Sheet 1  Control scorecard  — every control, its maturity, classification,
 *            evidence source and target (the full control-by-control register).
 *   Sheet 2  POA&M              — Plan of Action & Milestones: one row per open
 *            weakness (deficiency/observation) with risk rating, remediation,
 *            owner, resources, milestone/phase and status — the RMF tracker.
 *   Sheet 3  Gap analysis       — current vs target per domain.
 *   Sheet 4  Cover / scope      — client, framework+version, period, notices.
 * Nothing numeric is typed here that isn't in the payload; the workbook is a
 * rendering of the same assessment, so it reconciles to the deck and the tab.
 */

const NAVY = 'FF10406A', GREEN = 'FF1E8E5A', AMBER = 'FFB7791F', RED = 'FFC0392B';
const HEADFILL = 'FF10406A', ZEBRA = 'FFF4F7FC', WHITE = 'FFFFFFFF', INK = 'FF1E2A3A', MUTE = 'FF6B7A8D';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const S = (v, d) => (v == null || v === '' ? (d || '') : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const clsFor = (score, target) => {
  const s = num(score); const t = num(target) || 3.5;
  if (s == null) return 'Unevidenced';
  if (s >= t) return 'Meets target';
  if (s >= 2.5) return 'Observation';
  return 'Deficiency';
};
const clsColor = (c) => {
  const k = String(c || '').toLowerCase();
  if (k.includes('meets')) return GREEN;
  if (k.includes('observation')) return AMBER;
  if (k.includes('deficiency') || k.includes('unevidenced')) return RED;
  return MUTE;
};
const sevColor = (c) => {
  const k = String(c || '').toLowerCase();
  if (k.includes('high')) return RED;
  if (k.includes('medium')) return AMBER;
  return GREEN;
};

function headerRow(ws, headers, widths) {
  ws.columns = headers.map((h, i) => ({ header: h, width: (widths && widths[i]) || 18 }));
  const hr = ws.getRow(1);
  hr.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADFILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD9E1EC' } } };
  });
  hr.height = 22;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
}
function zebra(row, i) {
  row.eachCell((cell) => {
    if (i % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    cell.font = Object.assign({ name: 'Calibri', size: 10, color: { argb: INK } }, cell.font || {});
    cell.alignment = Object.assign({ vertical: 'top', wrapText: true }, cell.alignment || {});
  });
}

async function buildXlsxBuffer(payload) {
  payload = payload || {};
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nerion · DTNKShield';
  wb.company = S(payload.client, 'Client');

  const std = S(payload.standard, 'Framework') + (payload.version ? ' ' + payload.version : '');
  const client = S(payload.client, 'Client');
  const period = S(payload.period, new Date().toISOString().slice(0, 10));
  const target = num(payload.target) || 3.5;
  const register = arr(payload.register);
  const findings = arr(payload.findings);
  const gap = arr(payload.gap);
  const groupNoun = S(payload.groupNoun, 'Domain');
  const roadmapPhased = arr(payload.roadmapPhased).length ? arr(payload.roadmapPhased) : arr(payload.roadmap);

  // ---- Sheet 1 · Control scorecard -----------------------------------------
  {
    const ws = wb.addWorksheet('Control scorecard', { properties: { tabColor: { argb: NAVY } } });
    headerRow(ws, ['Ref', 'Control', groupNoun === 'Family' ? 'Family / source' : 'Derived from', 'Maturity', 'Target', 'Gap', 'Classification', 'Source of score'],
      [16, 46, 22, 10, 9, 8, 16, 26]);
    register.forEach((r, i) => {
      const sc = num(r.score);
      const cls = S(r.classification, clsFor(sc, r.target != null ? r.target : target));
      const g = sc == null ? '' : (sc >= (num(r.target) || target) ? 0 : -(((num(r.target) || target) - sc)));
      const row = ws.addRow([S(r.ref), S(r.name), S(r.derivedFrom, '—'), sc, num(r.target) != null ? num(r.target) : target, g === '' ? '' : Number(g.toFixed(1)), cls, S(r.source, r.derivedFrom || '—')]);
      zebra(row, i);
      row.getCell(4).numFmt = '0.0'; row.getCell(5).numFmt = '0.0'; row.getCell(6).numFmt = '0.0';
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: clsColor(cls) } };
    });
  }

  // ---- Sheet 2 · POA&M (Plan of Action & Milestones) -----------------------
  {
    const ws = wb.addWorksheet('POA&M', { properties: { tabColor: { argb: RED } } });
    headerRow(ws, ['POA&M ID', 'Weakness / finding', 'Control ref', 'Risk severity', 'Recommended remediation', 'Owner', 'Resources / effort', 'Target uplift', 'Milestone (phase)', 'Status'],
      [11, 40, 12, 12, 44, 16, 16, 12, 16, 12]);
    const phaseFor = (i) => (i < 4 ? '0–3 months' : i < 8 ? '3–6 months' : '6–12 months');
    // Open weaknesses = findings below target (deficiencies first, then observations).
    const weaknesses = findings.slice().sort((a, b) => {
      const da = /deficiency/i.test(a.classification || '') ? 0 : 1;
      const db = /deficiency/i.test(b.classification || '') ? 0 : 1;
      return da - db || (num(a.score) || 0) - (num(b.score) || 0);
    });
    weaknesses.forEach((f, i) => {
      const sev = /deficiency/i.test(f.classification || '') ? 'High' : /observation/i.test(f.classification || '') ? 'Medium' : 'Low';
      const rm = roadmapPhased.find((r) => r && r.action && String(r.action).includes(S(f.ref)));
      const phase = rm ? S(rm.phase, phaseFor(i)) : phaseFor(i);
      const row = ws.addRow([
        'POAM-' + String(i + 1).padStart(3, '0'),
        S(f.name),
        S(f.ref),
        sev,
        S(f.recommendation, 'Uplift toward target maturity.'),
        S(f.owner, 'Control owner'),
        S(f.effort, '1 cycle'),
        S(f.targetUplift, ''),
        phase,
        'Open',
      ]);
      zebra(row, i);
      row.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: sevColor(sev) } };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'top' };
      row.getCell(10).font = { name: 'Calibri', size: 10, bold: true, color: { argb: AMBER } };
    });
    if (!weaknesses.length) ws.addRow(['—', 'No open weaknesses — all controls meet target.', '', '', '', '', '', '', '', 'Closed']);
  }

  // ---- Sheet 3 · Gap analysis ----------------------------------------------
  if (gap.length) {
    const ws = wb.addWorksheet('Gap analysis', { properties: { tabColor: { argb: AMBER } } });
    headerRow(ws, [groupNoun, 'Current', 'Target', 'Gap', 'Priority'], [40, 12, 12, 12, 14]);
    gap.forEach((gp, i) => {
      const row = ws.addRow([S(gp.domain), num(gp.current), num(gp.target), S(gp.gap), S(gp.priority)]);
      zebra(row, i);
      row.getCell(2).numFmt = '0.0'; row.getCell(3).numFmt = '0.0';
      row.getCell(5).font = { name: 'Calibri', size: 10, bold: true, color: { argb: sevColor(gp.priority) } };
    });
  }

  // ---- Sheet 4 · Cover / scope ---------------------------------------------
  {
    const ws = wb.addWorksheet('Cover', { properties: { tabColor: { argb: 'FF0A2233' } } });
    ws.columns = [{ width: 26 }, { width: 80 }];
    const rows = [
      ['NERION — control scorecard & POA&M', ''],
      ['Client', client],
      ['Framework', std],
      ['Assessment period', period],
      ['Overall maturity', (num(payload.overall) != null ? num(payload.overall).toFixed(1) : '—') + ' / 5  (target ' + target.toFixed(1) + ')'],
      ['Controls assessed', String(register.length)],
      ['Open weaknesses (POA&M)', String(findings.length)],
      ['Classification', 'CONFIDENTIAL — prepared for the named client'],
      ['Assurance basis', 'Continuous management self-assessment — not an independent audit opinion.'],
      ['Notices', S((arr(payload.licensing)[0]) || 'NIST CSF 2.0 / 800-53 and the HIPAA Security Rule are public-domain. CIS Controls, ISO/IEC 27001 and SOC 2 are assessed natively by Nerion-authored evidence tests referenced by control ID only — no official CIS Safeguard, ISO clause or AICPA Trust Services Criteria text is stored, reproduced, paraphrased or crosswalked from CSF. Any licensed official text you upload stays tenant-only.')],
    ];
    rows.forEach((r, i) => {
      const row = ws.addRow(r);
      if (i === 0) { row.getCell(1).font = { bold: true, size: 15, color: { argb: NAVY }, name: 'Arial' }; row.height = 24; }
      else {
        row.getCell(1).font = { bold: true, color: { argb: NAVY }, name: 'Arial', size: 10 };
        row.getCell(2).font = { color: { argb: INK }, name: 'Calibri', size: 10 };
        row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      }
    });
  }

  return wb.xlsx.writeBuffer();
}

module.exports = { buildXlsxBuffer };

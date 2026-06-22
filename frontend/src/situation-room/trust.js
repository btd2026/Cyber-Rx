/**
 * Trust layer — live clock, audit log, and one-click board-pack export.
 * Client-side and self-contained (no backend dependency); the audit log persists
 * in localStorage. All access is guarded/offline-safe.
 */
import { useEffect, useState } from 'react';

const AUDIT_KEY = 'cyberrx_audit_log';

export function getActor() {
  try {
    return (typeof localStorage !== 'undefined' && (localStorage.getItem('userEmail') || localStorage.getItem('email'))) || 'You';
  } catch { return 'You'; }
}

export function getAudit() {
  try { const r = localStorage.getItem(AUDIT_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

export function logAudit(action, detail) {
  try {
    const entry = { ts: new Date().toISOString(), actor: getActor(), action, detail: detail || '' };
    const log = getAudit(); log.unshift(entry);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 200)));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cyberrx-audit'));
    return entry;
  } catch { return null; }
}

/** A ticking wall clock (default every 30s) for the live "as-of" indicator. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Build a plain-text board pack from the active seat's data (CISO tabs is an
 *  array; the other seats use a keyed object — both handled). */
export function buildBoardPack({ seat, summary, tabs, provenance, asOf }) {
  const L = [];
  L.push(`CYBERRX BOARD PACK — ${seat} seat`);
  L.push(`Generated ${new Date().toLocaleString()}${asOf ? ` · data as of ${asOf}` : ''}`);
  L.push('');
  L.push('VERDICT');
  L.push(summary.verdict);
  if (summary.pill) L.push(`[${summary.pill}]`);
  L.push('');
  L.push('AT A GLANCE');
  (summary.tiles || []).forEach((t) => L.push(`- ${t.label}: ${t.value}${t.delta ? ` ${t.delta}` : ''}`));
  L.push('');
  L.push('THE QUESTIONS, ANSWERED');
  (summary.briefing || []).forEach((b) => L.push(`- ${b.q} — ${b.a} [${b.pill}]`));

  const decisions = [];
  const fromSections = (t) => (t.sections || []).forEach((s) => {
    if (s.kind === 'decisions') s.items.forEach((d) => decisions.push(`- [${d.sev}] ${d.title} (${d.owner})`));
  });
  if (Array.isArray(tabs)) tabs.forEach((t) => { (t.decisions || []).forEach((d) => decisions.push(`- [${d.sev}] ${d.title} (${d.owner})`)); fromSections(t); });
  else Object.values(tabs || {}).forEach(fromSections);
  if (decisions.length) { L.push(''); L.push('DECISIONS'); decisions.forEach((d) => L.push(d)); }

  if (provenance) {
    L.push(''); L.push('PROVENANCE');
    L.push(`- Coverage ${provenance.coverage != null ? `${Math.round(provenance.coverage)}%` : '—'} · ${provenance.signals != null ? `${provenance.signals} signals` : '—'} · confidence ${provenance.confidence != null ? `${provenance.confidence}%` : '—'} · as of ${asOf || '—'}`);
  }
  L.push('');
  L.push('— Auto-generated board pack. Review before distribution.');
  return L.join('\n');
}

export function downloadBoardPack(args) {
  const text = buildBoardPack(args);
  try {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `board-pack-${String(args.seat).toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  } catch { /* download unavailable */ }
  logAudit('Board pack generated', `${args.seat} seat`);
}

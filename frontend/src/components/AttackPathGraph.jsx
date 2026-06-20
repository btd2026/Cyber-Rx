/**
 * AttackPathGraph — numbered, typed-icon attack pathways.
 * ------------------------------------------------------------------
 * Renders true attack paths as an ordered kill chain (step 1 → 2 → 3 …) from an
 * internet-exposed entry point through the environment to a crown-jewel target,
 * with a distinct icon per node type (attacker, public IP, server/VM, identity,
 * app, database, network, process), severity-colored rings, directional arrows,
 * and "Internet exposed" / "Sensitive data" badges. Derived from /api/attack-path
 * (layers + edges + node flags). Findings on the path are clickable.
 */
import React, { useMemo } from 'react';
import { COLORS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
// Semantic severity colors for the kill-chain — meaning preserved, not chrome.
const RED = COLORS.bad, ORANGE = '#c2410c', AMBER = COLORS.warn, GREEN = COLORS.good;
const sevColor = (c) => (c === 'Critical' ? RED : c === 'High' ? ORANGE : c === 'Medium' ? AMBER : GREEN);

// Distinct icon per node kind.
const ICON = {
  attacker: '🥷', user: '👤', internet: '🌐', publicip: '📍', server: '🖥️', database: '🗄️',
  identity: '🔑', app: '🧩', network: '🔌', firewall: '🧱', process: '💎', threat: '⚠️', finding: '⛔',
};
const KIND_LABEL = {
  attacker: 'Threat actor', publicip: 'Public IP', server: 'Server / VM', database: 'Data store',
  identity: 'Identity', app: 'Application', network: 'Network', firewall: 'Firewall', process: 'Crown-jewel process', threat: 'Threat',
};

function kindOf(node) {
  if (!node) return 'server';
  if (node.layer === 'process') return 'process';
  if (node.layer === 'network') return 'network';
  if (node.layer === 'threat') return 'threat';
  const t = String(node.assetType || node.label || '').toLowerCase();
  if (node.layer === 'app') {
    if (node.sensitiveData && /db|database|warehouse|sql|storage|repository/.test(t)) return 'database';
    return node.internetExposed ? 'publicip' : 'app';
  }
  if (/identity|iam|okta|entra|ad\b|directory|sailpoint|pam|cyberark/.test(t)) return 'identity';
  if (/firewall|panorama|fortigate|palo|waf|ngfw/.test(t)) return 'firewall';
  if (/db|database|warehouse|sql|storage|backup/.test(t)) return 'database';
  if (node.internetExposed || /public|ip|gateway|remote|vpn|edge/.test(t)) return 'publicip';
  return 'server';
}

function tacticFor(i, total, kind, node) {
  if (i === 0) return 'Reconnaissance';
  if (i === 1) return 'Initial Access';
  if (kind === 'identity') return 'Credential Access';
  if (kind === 'firewall' || kind === 'network') return 'Lateral Movement';
  if (kind === 'app') return 'Execution';
  if (i === total - 1) return (node && node.sensitiveData) ? 'Collection / Exfiltration' : 'Impact';
  return 'Lateral Movement';
}

export default function AttackPathGraph(props) {
  const { graph, onFinding } = props;

  const paths = useMemo(() => {
    if (!graph || !graph.layers) return [];
    const layer = (id) => (graph.layers.find((l) => l.id === id) || { nodes: [] }).nodes;
    const all = [...layer('process'), ...layer('app'), ...layer('device'), ...layer('network'), ...layer('threat')];
    const byId = {}; all.forEach((n) => { byId[n.id] = n; });
    const adj = {};
    (graph.edges || []).forEach((e) => {
      (adj[e.from] = adj[e.from] || new Set()).add(e.to);
      (adj[e.to] = adj[e.to] || new Set()).add(e.from);
    });
    const critRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const entries = all.filter((n) => n.internetExposed)
      .sort((a, b) => (critRank[a.criticality] || 9) - (critRank[b.criticality] || 9));
    const targets = layer('process')
      .sort((a, b) => (critRank[a.criticality] || 9) - (critRank[b.criticality] || 9));
    if (!entries.length || !targets.length) return [];

    const bfs = (startId, goalIds) => {
      const goal = new Set(goalIds);
      const seen = new Set([startId]); const q = [[startId]];
      while (q.length) {
        const p = q.shift(); const last = p[p.length - 1];
        if (goal.has(last) && p.length > 1) return p;
        for (const nx of (adj[last] || [])) if (!seen.has(nx)) { seen.add(nx); q.push([...p, nx]); }
      }
      return null;
    };

    const out = []; const usedTargets = new Set();
    for (const entry of entries.slice(0, 4)) {
      const goalIds = targets.filter((t) => !usedTargets.has(t.id)).map((t) => t.id);
      const idPath = bfs(entry.id, goalIds.length ? goalIds : targets.map((t) => t.id));
      if (!idPath) continue;
      usedTargets.add(idPath[idPath.length - 1]);
      const nodes = idPath.map((id) => byId[id]).filter(Boolean);
      const steps = [{ n: 1, kind: 'attacker', label: 'External threat actor', tactic: 'Reconnaissance', node: null }];
      nodes.forEach((node, i) => {
        const kind = kindOf(node);
        steps.push({
          n: steps.length + 1, kind, node,
          label: node.label || node.id,
          tactic: tacticFor(i + 1, nodes.length + 1, kind, node),
          internetExposed: node.internetExposed, sensitiveData: node.sensitiveData,
          criticality: node.criticality,
          findings: (node.findingRefs || node.findings || []),
        });
      });
      out.push(steps);
      if (out.length >= 3) break;
    }
    return out;
  }, [graph]);

  const findingByRef = {};
  ((graph && graph.findings) || []).forEach((f) => { findingByRef[f.ref] = f; });

  if (!paths.length) {
    return <div style={{ fontSize: 12.5, color: INK3, padding: '18px 0' }}>No internet-exposed entry point reaches a crown-jewel process yet — complete asset mapping and the attack paths will populate.</div>;
  }

  return (
    <div>
      <Legend />
      {paths.map((steps, pi) => {
        const target = steps[steps.length - 1];
        const sev = target && target.criticality ? target.criticality : 'High';
        return (
          <div key={pi} style={{ border: `1px solid ${HAIR}`, borderRadius: 12, padding: '14px 16px', marginBottom: 14, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: sevColor(sev), borderRadius: 5, padding: '3px 9px' }}>ATTACK PATH {pi + 1}</span>
              <span style={{ fontSize: 12.5, color: INK2 }}>External actor → <strong style={{ color: INK }}>{target.label}</strong> · {steps.length} steps</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, flexWrap: 'wrap', rowGap: 18 }}>
              {steps.map((s, i) => (
                <React.Fragment key={i}>
                  <Step s={s} onFinding={onFinding} findingByRef={findingByRef} />
                  {i < steps.length - 1 && <Arrow />}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Step({ s, onFinding, findingByRef }) {
  const ring = s.kind === 'attacker' ? '#0b0c0e' : sevColor(s.criticality || 'Medium');
  const findings = (s.findings || []).map((r) => (typeof r === 'string' ? findingByRef[r] : r)).filter(Boolean);
  return (
    <div style={{ width: 104, textAlign: 'center', position: 'relative' }}>
      <div style={{ fontSize: 9, color: INK3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', minHeight: 22 }}>{s.tactic}</div>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: PANEL, border: `3px solid ${ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, margin: '0 auto' }}>{ICON[s.kind] || '•'}</div>
        <div style={{ position: 'absolute', top: -6, left: 'calc(50% - 30px)', width: 18, height: 18, borderRadius: '50%', background: ring, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</div>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: INK, marginTop: 5, lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.label}</div>
      <div style={{ fontSize: 8.5, color: INK3 }}>{KIND_LABEL[s.kind] || ''}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', marginTop: 3 }}>
        {s.internetExposed && <span style={{ fontSize: 7.5, fontWeight: 700, color: '#fff', background: ORANGE, borderRadius: 3, padding: '1px 5px' }}>Internet exposed</span>}
        {s.sensitiveData && <span style={{ fontSize: 7.5, fontWeight: 700, color: '#fff', background: RED, borderRadius: 3, padding: '1px 5px' }}>Sensitive data</span>}
        {findings.slice(0, 1).map((f) => (
          <button key={f.ref} onClick={() => onFinding && onFinding(f)} title={f.title}
            style={{ fontSize: 7.5, fontWeight: 700, color: '#fff', background: sevColor(f.severity), border: 'none', borderRadius: 3, padding: '1px 5px', cursor: 'pointer' }}>⛔ {f.ref}</button>
        ))}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ flex: '0 0 34px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, marginTop: 22 }}>
      <div style={{ width: '100%', height: 2, background: ORANGE, position: 'relative' }}>
        <span style={{ position: 'absolute', right: -3, top: -7, color: ORANGE, fontSize: 12 }}>▶</span>
      </div>
    </div>
  );
}

function Legend() {
  const items = [['attacker', 'Threat actor'], ['publicip', 'Internet-facing'], ['identity', 'Identity'], ['server', 'Server / VM'], ['app', 'App'], ['database', 'Data store'], ['network', 'Network'], ['process', 'Crown jewel']];
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, padding: '8px 12px', background: PANEL, borderRadius: 8, border: `1px solid ${HAIR}` }}>
      {items.map(([k, l]) => (
        <span key={k} style={{ fontSize: 10.5, color: INK2, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>{ICON[k]}</span>{l}</span>
      ))}
    </div>
  );
}

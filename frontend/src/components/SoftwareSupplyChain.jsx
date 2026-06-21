/**
 * SoftwareSupplyChain — software supply-chain / CI-CD security posture, modeled
 * on AiGovernance. Phase 1 is an SBOM-style inventory of build pipelines and the
 * controls that protect what ships to production (provenance, signing, branch
 * protection, dependency risk, secret hygiene), assessed independently against
 * NIST SSDF (800-218), SLSA, the OWASP Top 10 CI/CD Security Risks, and the
 * relevant MITRE ATT&CK supply-chain techniques.
 *
 * Lensed per leader: the CISO sees risk + controls + decisions; the CIO sees the
 * same pipelines as the velocity-vs-risk story they operationally own. Data is
 * modeled from intake today; each control upgrades to live as CI/SCM/registry
 * connectors are added (GitHub/GitLab, Jenkins, Tenable/Snyk, Sigstore).
 */

import React, { useState } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };
const sevTone = (s) => SEV[s] || INK3;
const STBAND = { Strong: '#1a7f37', Partial: '#9a6700', Weak: '#c2410c', Gap: '#cf222e' };
const bandC = (s) => (s == null ? INK3 : s >= 80 ? '#1a7f37' : s >= 60 ? '#9a6700' : '#cf222e');

const Pill = ({ text, color }) => (
  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{text}</span>
);
const YN = ({ ok, warnLabel, okLabel }) => (
  ok ? <span style={{ color: '#1a7f37', fontWeight: 600 }}>{okLabel || 'Yes'}</span>
     : <Pill text={warnLabel || 'No'} color="#cf222e" />
);

// ── Modeled inventory (intake-derived; connector-upgradable) ─────────────────
const PIPELINES = [
  { id: 'p1', name: 'member-portal', ci: 'GitHub Actions', slsa: 1, signed: false, branchProtection: 'partial', sbom: false, sca: true, secretsScan: true, pinnedActions: false, risk: 'Critical', owner: 'Platform Eng',
    flags: ['Unsigned artifacts to prod', 'Third-party Actions unpinned (12)', 'No build provenance'] },
  { id: 'p2', name: 'claims-api', ci: 'GitHub Actions', slsa: 2, signed: true, branchProtection: 'enforced', sbom: true, sca: true, secretsScan: true, pinnedActions: true, risk: 'Low', owner: 'Claims Eng',
    flags: [] },
  { id: 'p3', name: 'data-exchange', ci: 'Jenkins', slsa: 0, signed: false, branchProtection: 'none', sbom: false, sca: false, secretsScan: false, pinnedActions: false, risk: 'Critical', owner: 'Integrations',
    flags: ['No branch protection', 'No SCA / SBOM', 'Long-lived CI credentials', 'Self-hosted runner shared across repos'] },
  { id: 'p4', name: 'mobile-app', ci: 'GitLab CI', slsa: 1, signed: true, branchProtection: 'enforced', sbom: true, sca: true, secretsScan: false, pinnedActions: true, risk: 'Medium', owner: 'Mobile',
    flags: ['No pipeline secret scanning'] },
  { id: 'p5', name: 'internal-tools', ci: 'GitHub Actions', slsa: 1, signed: false, branchProtection: 'partial', sbom: false, sca: true, secretsScan: true, pinnedActions: false, risk: 'High', owner: 'IT',
    flags: ['Unsigned artifacts', 'Actions unpinned'] },
];

const counts = (() => {
  const n = PIPELINES.length;
  return {
    total: n,
    unsigned: PIPELINES.filter((p) => !p.signed).length,
    noBranchProt: PIPELINES.filter((p) => p.branchProtection === 'none').length,
    sbomCoverage: Math.round((PIPELINES.filter((p) => p.sbom).length / n) * 100),
    unpinned: PIPELINES.filter((p) => !p.pinnedActions).length,
    critical: PIPELINES.filter((p) => p.risk === 'Critical').length,
  };
})();
// Posture: weighted blend of the controls that most reduce supply-chain blast radius.
const postureScore = (() => {
  const n = PIPELINES.length;
  const pct = (f) => PIPELINES.filter(f).length / n;
  const slsaAvg = PIPELINES.reduce((a, p) => a + p.slsa, 0) / n / 3; // normalize L0–L3
  const raw = 0.22 * pct((p) => p.signed) + 0.18 * pct((p) => p.branchProtection === 'enforced') +
    0.16 * pct((p) => p.sbom) + 0.14 * pct((p) => p.sca) + 0.12 * pct((p) => p.pinnedActions) +
    0.10 * pct((p) => p.secretsScan) + 0.08 * slsaAvg;
  return Math.round(raw * 100);
})();

const SLSA_NEXT = {
  0: 'Reach L1: generate build provenance for every release.',
  1: 'Reach L2: sign provenance and run builds on a hosted, tamper-resistant service.',
  2: 'Reach L3: hardened, non-falsifiable provenance with isolated, ephemeral build environments.',
  3: 'At L3 — maintain and verify provenance at deploy time.',
};

// ── Framework control sets (assessed independently) ──────────────────────────
const FRAMEWORKS = {
  ssdf: {
    name: 'NIST SSDF (SP 800-218)',
    controls: [
      { id: 'PO.3', fn: 'Prepare', name: 'Secure the toolchain', status: 'Weak', finding: 'CI runners and configs are not hardened; one self-hosted runner is shared across repos.', recommendation: 'Isolate runners per trust zone; baseline-harden CI configuration.', why: 'A shared runner lets a compromise in one repo reach others — lateral movement inside the build plane.', target: 'Dedicated ephemeral runners; CIS-hardened CI config.', decision: 'Approve runner isolation sprint for data-exchange and internal-tools.' },
      { id: 'PS.1', fn: 'Protect', name: 'Protect code from unauthorized change', status: 'Partial', finding: 'Branch protection enforced on 2 of 5 repos; signed commits not required.', recommendation: 'Require PR review + signed commits on all production repos.', why: 'Without enforced review, a single account can push straight to a shipping branch.', target: '100% of prod repos with required review + signed commits.', decision: 'Mandate branch protection org-wide via policy-as-code.' },
      { id: 'PS.2', fn: 'Protect', name: 'Provide build provenance', status: 'Gap', finding: 'No build provenance/attestations on 3 of 5 pipelines.', recommendation: 'Emit SLSA provenance (e.g. GitHub attestations / Sigstore) per build.', why: 'Without provenance you cannot prove what source produced a given artifact — the SolarWinds failure mode.', target: 'Provenance on every release artifact (SLSA L1+).', decision: 'Adopt build attestations as a release gate.' },
      { id: 'PS.3', fn: 'Protect', name: 'Sign & protect releases', status: 'Weak', finding: '3 of 5 pipelines ship unsigned artifacts.', recommendation: 'Sign all artifacts (cosign) and verify signatures at deploy.', why: 'Unsigned artifacts can be swapped between build and deploy with no detection.', target: '100% signed + verified at admission.', decision: 'Make signature verification a hard deploy gate.' },
      { id: 'PW.4', fn: 'Produce', name: 'Reuse only well-secured components', status: 'Partial', finding: 'SCA on 4 of 5 pipelines; dependency pinning inconsistent.', recommendation: 'Enforce SCA + lockfiles; quarantine high-risk transitive deps.', why: 'Dependency-chain abuse is the most common supply-chain entry point.', target: 'SCA on 100%; no critical known-vuln deps in prod.', decision: 'Set a dependency-risk SLA with Engineering.' },
      { id: 'PW.7', fn: 'Produce', name: 'Review/analyze code (SAST)', status: 'Partial', finding: 'SAST present but not blocking on 2 pipelines.', recommendation: 'Make SAST blocking for high-severity findings on prod repos.', why: 'Non-blocking scanners surface issues but do not prevent shipping them.', target: 'Blocking SAST gate on all prod repos.', decision: 'Approve blocking-gate rollout with a triage SLA.' },
      { id: 'RV.1', fn: 'Respond', name: 'Identify & confirm vulnerabilities (SBOM)', status: 'Gap', finding: 'SBOMs generated for 2 of 5; no continuous component monitoring.', recommendation: 'Generate SBOMs for every build and monitor for new CVEs.', why: 'Without an SBOM you cannot answer "are we affected?" when the next Log4Shell lands.', target: 'SBOM coverage 100% + continuous monitoring.', decision: 'Stand up SBOM generation + a component-risk feed.' },
    ],
  },
  cicd_top10: {
    name: 'OWASP Top 10 CI/CD Security Risks',
    controls: [
      { id: 'CICD-SEC-1', name: 'Insufficient flow control', status: 'Partial', finding: 'Some repos allow direct-to-main and auto-merge.', recommendation: 'Require reviews; disable auto-merge on prod branches.', why: 'Weak flow control lets unreviewed code reach production.', target: 'Enforced review on all prod branches.' },
      { id: 'CICD-SEC-2', name: 'Inadequate IAM', status: 'Weak', finding: 'Broad CI tokens; few scoped, short-lived credentials.', recommendation: 'Move to OIDC federation; scope and time-box tokens.', why: 'Over-privileged CI identity is a high-value target.', target: 'OIDC, least-privilege, no static cloud keys.' },
      { id: 'CICD-SEC-3', name: 'Dependency chain abuse', status: 'Partial', finding: 'No protection against dependency confusion on internal scopes.', recommendation: 'Pin sources, claim internal namespaces, verify integrity.', why: 'Dependency confusion has breached major orgs via public registries.', target: 'Namespace claims + integrity verification.' },
      { id: 'CICD-SEC-4', name: 'Poisoned pipeline execution', status: 'Gap', finding: 'PR-triggered workflows run with write scope on some repos.', recommendation: 'Run untrusted PRs with read-only, isolated context.', why: 'PPE lets an attacker run code in your pipeline via a pull request.', target: 'No write-scoped PR triggers from forks.' },
      { id: 'CICD-SEC-6', name: 'Insufficient credential hygiene', status: 'Weak', finding: 'Long-lived secrets in 1 pipeline; partial secret scanning.', recommendation: 'Rotate to short-lived secrets; enable scanning everywhere.', why: 'Leaked CI secrets are a direct path to production.', target: 'Secret scanning 100%; no long-lived secrets.' },
      { id: 'CICD-SEC-8', name: 'Ungoverned 3rd-party services', status: 'Weak', finding: 'Third-party GitHub Actions unpinned on 3 pipelines.', recommendation: 'Pin Actions to full commit SHA; allow-list providers.', why: 'A compromised tag of a popular Action runs in your build (tj-actions class).', target: 'All third-party Actions SHA-pinned.' },
      { id: 'CICD-SEC-9', name: 'Improper artifact integrity', status: 'Gap', finding: 'No signature verification at deploy admission.', recommendation: 'Verify signatures + provenance before admission.', why: 'Without verification, integrity controls upstream provide no guarantee.', target: 'Admission verifies signature + provenance.' },
      { id: 'CICD-SEC-10', name: 'Insufficient logging & visibility', status: 'Partial', finding: 'Build logs not centralized for all pipelines.', recommendation: 'Ship CI/CD audit logs to the SIEM.', why: 'You cannot detect or investigate pipeline compromise you cannot see.', target: 'All pipelines logging to SIEM.' },
    ],
  },
  attack: {
    name: 'MITRE ATT&CK — supply chain',
    controls: [
      { id: 'T1195.001', name: 'Compromise dependencies & dev tools', status: 'Weak', finding: 'Unpinned Actions + inconsistent SCA expose the dev toolchain.', recommendation: 'Pin tooling; verify integrity of dev dependencies.', why: 'Adversaries trojanize widely-used dev tools/deps to reach many victims.', target: 'Integrity-verified, pinned toolchain.' },
      { id: 'T1195.002', name: 'Compromise software supply chain', status: 'Gap', finding: 'No provenance/signing on key pipelines.', recommendation: 'Provenance + signing + verified admission.', why: 'Tampering between build and deploy is undetectable without signing.', target: 'Signed, attested, verified releases.' },
      { id: 'T1199', name: 'Trusted relationship', status: 'Partial', finding: 'Broad third-party CI integrations with standing access.', recommendation: 'Scope integrations; review and expire access.', why: 'Trusted integrations are abused for indirect access (the build plane is trusted).', target: 'Least-privilege, reviewed integrations.' },
      { id: 'T1078', name: 'Valid accounts (CI credentials)', status: 'Weak', finding: 'Long-lived CI credentials present.', recommendation: 'OIDC + short-lived, scoped credentials.', why: 'Stolen CI credentials grant production-grade access.', target: 'No static long-lived CI credentials.' },
    ],
  },
};

export default function SoftwareSupplyChain(props) {
  const voice = useAgentVoice();
  const [view, setView] = useState('inventory'); // inventory | slsa | ssdf | cicd_top10 | attack
  const sc = bandC(postureScore);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: INK2, maxWidth: 660, lineHeight: 1.5 }}>
          Your <strong>software supply-chain</strong> posture — every build pipeline, what protects it (provenance, signing, branch protection, dependency &amp; secret hygiene), and how it scores against SSDF, SLSA, the OWASP CI/CD Top 10 and ATT&amp;CK.
        </div>
      </div>

      {/* framework sub-tabs — each assessed independently */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['inventory', 'Pipelines (SBOM)'], ['slsa', 'SLSA Build Levels'], ['ssdf', 'NIST SSDF'], ['cicd_top10', 'OWASP CI/CD Top 10'], ['attack', 'ATT&CK Supply Chain']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{ border: `1px solid ${view === k ? COLORS.accent : HAIR}`, background: view === k ? COLORS.accent : '#fff', color: view === k ? '#fff' : INK2, padding: '6px 13px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', borderRadius: 999 }}>{l}</button>
          ))}
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(narration(view))} label="Listen" />
      </div>

      {view === 'inventory' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: 12 }}>
            <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${sc}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
              <div style={{ fontSize: 10.5, color: INK2 }}>Supply-chain posture</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: sc, fontFamily: FONTS.mono }}>{postureScore}<span style={{ fontSize: 12, color: INK3, fontWeight: 600 }}> / 100</span></div>
            </div>
            <Kpi label="Pipelines" value={counts.total} />
            <Kpi label="Unsigned artifacts" value={counts.unsigned} tone={counts.unsigned ? 'bad' : 'good'} />
            <Kpi label="No branch protection" value={counts.noBranchProt} tone={counts.noBranchProt ? 'bad' : 'good'} />
            <Kpi label="SBOM coverage" value={`${counts.sbomCoverage}%`} tone={counts.sbomCoverage >= 80 ? 'good' : 'warn'} />
            <Kpi label="Unpinned 3rd-party Actions" value={counts.unpinned} tone={counts.unpinned ? 'warn' : 'good'} />
            <Kpi label="Critical-risk pipelines" value={counts.critical} tone={counts.critical ? 'bad' : 'good'} />
          </div>

          <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead><tr style={{ background: PANEL, color: INK3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {['Pipeline', 'CI', 'SLSA', 'Signed', 'Branch prot.', 'SBOM', 'SCA', 'Risk'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '9px 12px', borderBottom: `1px solid ${HAIR}` }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {PIPELINES.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 ? '#fff' : '#fcfdfe', borderTop: i ? `1px solid ${HAIR}` : 'none' }}>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: 700, color: INK }}>{p.name}</div>
                        {p.flags.length > 0 && <div style={{ fontSize: 10, color: sevTone(p.risk), marginTop: 2 }}>{p.flags.join(' · ')}</div>}
                        <div style={{ fontSize: 9.5, color: INK3, marginTop: 1 }}>Owner: {p.owner}</div>
                      </td>
                      <td style={{ padding: '9px 12px', color: INK2 }}>{p.ci}</td>
                      <td style={{ padding: '9px 12px' }}><span style={{ fontWeight: 700, color: bandC(p.slsa / 3 * 100) }}>L{p.slsa}</span></td>
                      <td style={{ padding: '9px 12px' }}><YN ok={p.signed} warnLabel="Unsigned" /></td>
                      <td style={{ padding: '9px 12px' }}>{p.branchProtection === 'enforced' ? <span style={{ color: '#1a7f37', fontWeight: 600 }}>Enforced</span> : p.branchProtection === 'partial' ? <Pill text="Partial" color="#9a6700" /> : <Pill text="None" color="#cf222e" />}</td>
                      <td style={{ padding: '9px 12px' }}><YN ok={p.sbom} /></td>
                      <td style={{ padding: '9px 12px' }}><YN ok={p.sca} /></td>
                      <td style={{ padding: '9px 12px' }}><Pill text={p.risk} color={sevTone(p.risk)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 10 }}>Modeled from intake. Connect GitHub/GitLab, your CI, and an SCA/registry to upgrade each control from modeled to live.</div>
        </>
      )}

      {view === 'slsa' && (
        <div>
          <div style={{ fontSize: 11.5, color: INK2, marginBottom: 12, lineHeight: 1.5 }}>SLSA grades how tamper-resistant each build is, L0 (none) to L3 (hardened, non-falsifiable provenance). Raising the lowest pipelines first cuts the most blast radius.</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {PIPELINES.slice().sort((a, b) => a.slsa - b.slsa).map((p) => (
              <div key={p.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${bandC(p.slsa / 3 * 100)}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{p.name} <span style={{ fontSize: 10.5, color: INK3, fontWeight: 500 }}>· {p.ci}</span></span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: bandC(p.slsa / 3 * 100) }}>SLSA L{p.slsa}</span>
                </div>
                <div style={{ fontSize: 11, color: '#1a7f37', fontWeight: 600, marginTop: 5 }}>→ {SLSA_NEXT[p.slsa]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {['ssdf', 'cicd_top10', 'attack'].includes(view) && <FrameworkView fw={FRAMEWORKS[view]} />}
    </div>
  );
}

function FrameworkView({ fw }) {
  const order = { Gap: 0, Weak: 1, Partial: 2, Strong: 3 };
  const ctrls = fw.controls.slice().sort((a, b) => order[a.status] - order[b.status]);
  const cnt = { strong: 0, partial: 0, weak: 0, gap: 0 };
  fw.controls.forEach((c) => { cnt[c.status.toLowerCase()]++; });
  const score = Math.round((fw.controls.reduce((a, c) => a + (order[c.status] / 3), 0) / fw.controls.length) * 100);
  const sc = bandC(score);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${sc}`, borderRadius: 9, padding: '11px 15px', background: '#fff' }}>
          <div style={{ fontSize: 10.5, color: INK2 }}>{fw.name} posture</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: sc, fontFamily: FONTS.mono }}>{score}<span style={{ fontSize: 12, color: INK3, fontWeight: 600 }}> / 100</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Strong', 'Partial', 'Weak', 'Gap'].map((k) => (
            <span key={k} style={{ fontSize: 10.5, color: INK2 }}><strong style={{ color: STBAND[k] }}>{cnt[k.toLowerCase()]}</strong> {k}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {ctrls.map((c) => <ControlRow key={c.id} c={c} />)}
      </div>
      <div style={{ fontSize: 10.5, color: INK3, marginTop: 10 }}>Scored from your pipeline signals. Expand any control for the rationale and the decision to take. Connect CI/SCM to move these from modeled to live.</div>
    </div>
  );
}

function ControlRow({ c }) {
  const [open, setOpen] = useState(false);
  const detailed = c.why || c.target || c.decision;
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${STBAND[c.status]}`, borderRadius: 8, background: '#fff' }}>
      <button onClick={() => detailed && setOpen(!open)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 13px', cursor: detailed ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{c.fn ? `${c.fn} · ` : ''}{c.id} — {c.name}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill text={c.status} color={STBAND[c.status]} />
            {detailed && <span style={{ fontSize: 10, color: INK3 }}>{open ? '▲' : '▼'}</span>}
          </span>
        </div>
        <div style={{ fontSize: 11, color: INK2, marginTop: 4 }}>{c.finding}</div>
        {!open && c.status !== 'Strong' && <div style={{ fontSize: 11, color: '#1a7f37', fontWeight: 600, marginTop: 3 }}>→ {c.recommendation}</div>}
      </button>
      {open && detailed && (
        <div style={{ borderTop: `1px solid ${HAIR}`, background: PANEL, padding: '11px 13px', display: 'grid', gap: 9 }}>
          {c.why && <Detail label="Why this verdict" tone={INK2}>{c.why}</Detail>}
          {c.target && <Detail label="Target" tone={INK2}>{c.target}</Detail>}
          {c.recommendation && c.status !== 'Strong' && <Detail label="Action" tone="#1a7f37">{c.recommendation}</Detail>}
          {c.decision && <Detail label="Decision to take" tone="#7c3aed">{c.decision}</Detail>}
        </div>
      )}
    </div>
  );
}

function Detail({ label, tone, children }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: tone, lineHeight: 1.5, fontWeight: tone === '#7c3aed' ? 600 : 400 }}>{children}</div>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const c = tone === 'bad' ? '#cf222e' : tone === 'warn' ? '#9a6700' : tone === 'good' ? '#1a7f37' : INK;
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? c : '#d7d9de'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
      <div style={{ fontSize: 10.5, color: INK2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone ? c : INK, marginTop: 2, fontFamily: FONTS.mono }}>{value}</div>
    </div>
  );
}

// Calm, business-toned narration that explains the active view.
function narration(view) {
  if (view === 'inventory') {
    return `This is your software supply chain — every build pipeline that ships code to production, and what protects it. You're at ${postureScore} out of 100. The exposure that matters most: ${counts.unsigned} pipeline${counts.unsigned === 1 ? '' : 's'} shipping unsigned artifacts and ${counts.unpinned} using unpinned third-party build steps. That's the SolarWinds and tj-actions failure mode — someone tampering with what ships without anyone noticing. I'd start by signing artifacts and pinning third-party Actions on the critical pipelines.`;
  }
  if (view === 'slsa') {
    return `SLSA grades how tamper-resistant each build is, from level zero to three. Your weakest pipelines have no build provenance at all, which means you can't prove what source produced a given release. Raising those to level one or two first removes the most risk for the least effort.`;
  }
  const fw = FRAMEWORKS[view];
  return `This grades your build pipelines against ${fw.name}. Focus on the gaps first — provenance, signing and dependency integrity are the controls that stop a supply-chain compromise from reaching production.`;
}

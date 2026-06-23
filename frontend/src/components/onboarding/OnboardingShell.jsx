/**
 * OnboardingShell — the persistent frame for the redesigned 7-phase onboarding
 * journey. Renders the phase rail (with started/completed state), a completeness
 * ring, and the active phase's content as children. Resumable: it loads the
 * org's onboarding_session and lets the user jump between phases.
 *
 * Step 1 (Foundations): the shell + rail + ring + session wiring. Individual
 * phase screens land in later build steps; until then each renders a placeholder.
 * See docs/plans/onboarding-redesign-blueprint.md (§7, §9 step 1).
 */

import { useCallback, useEffect, useState } from 'react';
import { COLORS, FONTS, ELEV, RADIUS } from '../../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair;
const ACCENT = COLORS.accent, PANEL = COLORS.white, PAPER = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };

// Phase order + labels mirror OnboardingService.PHASES (server is source of truth).
const PHASE_META = [
  { key: 'business_context', label: 'Business Context', blurb: 'Profile, financials, frameworks, ownership' },
  { key: 'apps_tech',        label: 'Apps & Technology', blurb: 'Inventory, data catalog, tech stack' },
  { key: 'connectors',       label: 'Security Connectors', blurb: 'Connect live evidence sources' },
  { key: 'governance',       label: 'Governance & Docs', blurb: 'Policies, plans, AI extraction' },
  { key: 'third_party',      label: 'Third-Party Risk', blurb: 'Vendors and assurance' },
  { key: 'scoring',          label: 'Scoring Engine', blurb: 'Compile posture across frameworks' },
  { key: 'completeness',     label: 'Completeness', blurb: 'Readiness dashboard & go-live' },
];

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl || props.api_url ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

/** Completeness ring: a compact SVG donut showing overall %. */
function CompletenessRing({ value = 0, size = 96 }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const dash = (pct / 100) * c;
  const tone = pct >= 80 ? TONE.good : pct >= 50 ? TONE.warn : TONE.bad;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Completeness ${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={HAIR} strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={8}
        strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        style={{ fontFamily: FONTS.sans, fontWeight: 700, fontSize: 20, fill: INK }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function OnboardingShell(props) {
  const { token, orgId, api } = ctx(props);
  const [session, setSession] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  const [active, setActive] = useState(null); // phase key the user is viewing
  const [err, setErr] = useState('');

  const headers = useCallback(() => {
    const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [orgId, token]);

  const load = useCallback(() => {
    if (!orgId) return;
    fetch(`${api}/api/onboarding/session?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.session) { setSession(d.session); setActive((a) => a || d.session.phase); } })
      .catch((e) => setErr(e.message));
    fetch(`${api}/api/onboarding/completeness?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.completeness) setCompleteness(d.completeness); })
      .catch(() => {});
  }, [api, orgId, headers]);

  useEffect(() => { load(); }, [load]);

  const goTo = useCallback((phaseKey) => {
    setActive(phaseKey);
    fetch(`${api}/api/onboarding/session/advance`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, to_phase: phaseKey }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.session) setSession(d.session); })
      .catch(() => {});
  }, [api, orgId, headers]);

  const phaseStatus = (key) => {
    const st = (session && session.phase_state && session.phase_state[key]) || {};
    if (st.completed_at) return 'done';
    if (st.started_at) return 'active';
    return 'todo';
  };

  const overall = completeness ? completeness.overall : (session ? session.completeness : 0);
  const activeMeta = PHASE_META.find((p) => p.key === active);

  return (
    <div style={{ fontFamily: FONTS.sans, color: INK, background: PAPER, minHeight: '100%', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <CompletenessRing value={overall} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Onboarding</div>
          <div style={{ color: INK2, fontSize: 14 }}>
            {session && session.status === 'live'
              ? 'Live — picture is active. Keep improving completeness.'
              : 'Build your security picture across seven phases.'}
          </div>
        </div>
      </div>

      {(!orgId || err) ? (
        <div style={{ color: TONE.bad, marginBottom: 12 }}>{!orgId ? 'No organization selected.' : err}</div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Phase rail */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PHASE_META.map((p, i) => {
            const status = phaseStatus(p.key);
            const isActive = active === p.key;
            const dot = status === 'done' ? TONE.good : status === 'active' ? ACCENT : INK3;
            return (
              <button
                key={p.key}
                onClick={() => goTo(p.key)}
                style={{
                  textAlign: 'left', cursor: 'pointer', border: `1px solid ${isActive ? ACCENT : HAIR}`,
                  background: isActive ? COLORS.accentSoft : PANEL, borderRadius: RADIUS.md,
                  padding: '10px 12px', boxShadow: isActive ? ELEV.card : 'none', display: 'flex', gap: 10,
                }}
              >
                <span style={{
                  flex: '0 0 auto', width: 22, height: 22, borderRadius: RADIUS.pill, background: dot,
                  color: COLORS.white, fontSize: 12, fontWeight: 700, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {status === 'done' ? '✓' : i + 1}
                </span>
                <span>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{p.label}</span>
                  <span style={{ display: 'block', color: INK3, fontSize: 12 }}>{p.blurb}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Active phase content */}
        <section style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: RADIUS.lg, padding: 20, boxShadow: ELEV.card }}>
          {activeMeta ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{activeMeta.label}</div>
              <div style={{ color: INK2, fontSize: 14, marginBottom: 16 }}>{activeMeta.blurb}</div>
              {props.renderPhase
                ? props.renderPhase(activeMeta.key, { session, completeness, reload: load })
                : (
                  <div style={{ color: INK3, fontSize: 14, padding: '24px 0' }}>
                    This phase's screen ships in a later build step. The journey,
                    rail, and completeness tracking are live now.
                  </div>
                )}
            </>
          ) : <div style={{ color: INK3 }}>Loading…</div>}
        </section>
      </div>
    </div>
  );
}

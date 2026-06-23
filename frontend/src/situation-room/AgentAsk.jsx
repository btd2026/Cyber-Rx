/**
 * AgentAsk — the per-seat "Digital Twin" panel.
 *
 * The moment an executive opens their seat, their dedicated agent SPEAKS: it
 * introduces itself, states the one cyber question that seat owns, lays out how
 * it will help (first / second / finally), and invites a question. Everything is
 * grounded in the real backend:
 *
 *   GET  /api/agents/questions/:role  → { role, question, deliverable, questions[] }
 *   POST /api/agents/ask/:role {question} → { matched, summary, highlights[],
 *                                             actions[], details[], aiEnabled, ... }
 *
 * Role is the EXACT seat case (CFO / CRO / CLO / CIO / CISO / Board). CEO has no
 * agent role yet, so its twin shows a graceful "being provisioned" state.
 * Same fetch context (token + X-Org-Id) as the rest of the module. Offline-safe.
 */
import { useEffect, useRef, useState } from 'react';
import { apiCtx } from './useCisoData';

// Seats with a backend agent role (ExecutiveAgentService.ROLES keys).
const AGENT_ROLES = new Set(['CFO', 'CRO', 'CLO', 'CIO', 'CISO', 'Board']);

// Each twin's name + how to address the seat. Names are presentation only — the
// responsibility/plan/answers all come from live endpoint data.
const TWIN = {
  CISO: { name: 'Sentinel', label: 'CISO' },
  CFO: { name: 'Aria', label: 'CFO' },
  CRO: { name: 'Vega', label: 'CRO' },
  CLO: { name: 'Justice', label: 'General Counsel' },
  CIO: { name: 'Atlas', label: 'CIO' },
  Board: { name: 'Athena', label: 'Board' },
  CEO: { name: 'Orion', label: 'CEO' },
};

// Normalize an action (string | { action/title, owner, priority }) to one line.
function actionLine(a) {
  if (!a) return null;
  if (typeof a === 'string') return a;
  const text = a.action || a.title || a.recommendation || a.task || '';
  const owner = a.owner ? ` · owner: ${a.owner}` : '';
  const pri = a.priority ? ` · ${a.priority}` : '';
  return text ? `${text}${owner}${pri}` : null;
}

export default function AgentAsk({ seat, apiProps = {} }) {
  const twin = TWIN[seat] || { name: 'Twin', label: seat };
  const hasAgent = AGENT_ROLES.has(seat);
  const { token, orgId, api } = apiCtx(apiProps);

  const [meta, setMeta] = useState(null);     // { question, deliverable, questions[] }
  // Greet IMMEDIATELY on mount (the component is keyed by seat, so this re-runs
  // per seat). Provisioning seats get a graceful note; agent seats get the intro,
  // enriched the moment live data lands.
  const [thread, setThread] = useState(() => [hasAgent
    ? { who: 'twin', text: greeting(twin, null) }
    : {
      who: 'twin',
      text: `I'm ${twin.name}, your ${twin.label} Digital Twin. My agent is being provisioned — `
        + 'for now, open the CFO, CRO, CLO, CIO, CISO, or Board seat and your twin there will brief you live.',
    }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiTag, setAiTag] = useState(null);   // 'ai' | 'deterministic'
  const liveRef = useRef(null);

  // (1) On seat entry, load the seat's owned question + suggested questions and
  // enrich the greeting once it lands (setState lives in the async callback).
  useEffect(() => {
    if (!hasAgent) return undefined;
    let alive = true;
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    const q = `org_id=${encodeURIComponent(orgId)}`;
    fetch(`${api}/api/agents/questions/${seat}?${q}`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j) return;
        setMeta(j);
        setThread([{ who: 'twin', text: greeting(twin, j) }]);
      })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seat]);

  // Keep the latest message in view for screen readers + scroll.
  useEffect(() => { if (liveRef.current) liveRef.current.scrollTop = liveRef.current.scrollHeight; }, [thread, busy]);

  function ask(question) {
    const text = String(question || '').trim();
    if (!text || busy || !hasAgent) return;
    setThread((t) => [...t, { who: 'you', text }]);
    setDraft('');
    setBusy(true);
    const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId };
    if (token) h.Authorization = `Bearer ${token}`;
    const q = `org_id=${encodeURIComponent(orgId)}`;
    fetch(`${api}/api/agents/ask/${seat}?${q}`, { method: 'POST', headers: h, body: JSON.stringify({ question: text }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((ans) => {
        if (!ans) {
          setThread((t) => [...t, { who: 'twin', text: "I couldn't reach your data just now — try that question again in a moment." }]);
          return;
        }
        if (typeof ans.aiEnabled === 'boolean') setAiTag(ans.aiEnabled ? 'ai' : 'deterministic');
        setThread((t) => [...t, {
          who: 'twin',
          text: ans.summary || 'No answer was returned.',
          highlights: Array.isArray(ans.highlights) ? ans.highlights.filter(Boolean) : [],
          actions: Array.isArray(ans.actions) ? ans.actions.map(actionLine).filter(Boolean) : [],
          // For out-of-scope answers the backend returns the questions it CAN take.
          suggestions: ans.matched === false && Array.isArray(ans.details)
            ? ans.details.filter((d) => typeof d === 'string') : [],
        }]);
      })
      .catch(() => setThread((t) => [...t, { who: 'twin', text: 'Something went wrong reaching your agent. Please try again.' }]))
      .finally(() => setBusy(false));
  }

  const chips = (meta && Array.isArray(meta.questions) ? meta.questions : []).slice(0, 6);

  return (
    <section className="sr-twin" aria-label={`${twin.label} Digital Twin`}>
      <AskStyles />
      <header className="sr-twin__head">
        <span className="sr-twin__avatar" aria-hidden="true">{twin.name.slice(0, 1)}</span>
        <div className="sr-twin__id">
          <strong className="sr-twin__name">{twin.name}</strong>
          <span className="sr-twin__role">{twin.label} Digital Twin</span>
        </div>
        {aiTag && <span className={`sr-pill sr-pill--${aiTag === 'ai' ? 'pass' : 'brand'}`}>{aiTag === 'ai' ? 'AI · live' : 'Live data'}</span>}
      </header>

      <div className="sr-twin__thread" ref={liveRef} aria-live="polite" aria-atomic="false">
        {thread.map((m, i) => (
          <div key={i} className={`sr-msg sr-msg--${m.who}`}>
            {m.who === 'twin' && <span className="sr-msg__who">{twin.name}</span>}
            <p className="sr-msg__text">{m.text}</p>
            {m.highlights && m.highlights.length > 0 && (
              <ul className="sr-msg__list">{m.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
            )}
            {m.actions && m.actions.length > 0 && (
              <div className="sr-msg__actions">
                <span className="sr-msg__label">Recommended actions</span>
                <ul className="sr-msg__list">{m.actions.map((a, j) => <li key={j}>{a}</li>)}</ul>
              </div>
            )}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="sr-twin__chips sr-twin__chips--inline">
                {m.suggestions.slice(0, 6).map((s, j) => (
                  <button key={j} type="button" className="sr-chip" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="sr-msg sr-msg--twin"><span className="sr-msg__who">{twin.name}</span><p className="sr-msg__text sr-msg__typing"><span /><span /><span /></p></div>}
      </div>

      {hasAgent && (
        <>
          {chips.length > 0 && (
            <div className="sr-twin__chips" role="group" aria-label="Suggested questions">
              {chips.map((c, i) => (
                <button key={i} type="button" className="sr-chip" onClick={() => ask(c)} disabled={busy}>{c}</button>
              ))}
            </div>
          )}
          <form className="sr-twin__ask" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
            <label htmlFor="sr-twin-input" className="sr-vh">Ask your {twin.label} twin a question</label>
            <input id="sr-twin-input" className="sr-twin__input" type="text" autoComplete="off"
              placeholder={`Ask ${twin.name} a question…`} value={draft}
              onChange={(e) => setDraft(e.target.value)} disabled={busy} />
            <button type="submit" className="sr-btn sr-twin__send" disabled={busy || !draft.trim()}>Ask ▸</button>
          </form>
        </>
      )}
    </section>
  );
}

// Compose the spoken welcome. Authored framing + LIVE owned-question, deliverable,
// and the seat's first three real suggested questions as the "first/second/finally"
// plan. Falls back to a clean intro until the data lands.
function greeting(twin, meta) {
  const lead = `Welcome — I'm ${twin.name}, your ${twin.label} Digital Twin.`;
  if (!meta) return `${lead} Give me a moment to read your live data, then pick a question below and I'll walk you through it.`;
  const owns = meta.question ? ` The question you own is: “${meta.question}.”` : '';
  const deliver = meta.deliverable ? ` I turn it into your ${meta.deliverable.toLowerCase()}.` : '';
  const qs = Array.isArray(meta.questions) ? meta.questions : [];
  let plan = '';
  if (qs.length >= 3) plan = ` I'll get you there in three moves: first, ${low(qs[0])} second, ${low(qs[1])} and finally, ${low(qs[2])}`;
  else if (qs.length) plan = ` I'll start with: ${low(qs[0])}`;
  return `${lead}${owns}${deliver}${plan} Pick a question below and I'll walk you through it — every answer grounded in your live data.`;
}

// lowercase the first letter and strip a trailing question mark for inline listing.
const low = (q) => {
  const s = String(q || '').trim().replace(/\?+$/, ';');
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
};

function AskStyles() {
  return (
    <style>{`
      .sr-twin { margin-top:var(--rx-5); border:1px solid var(--rx-border); border-radius:var(--rx-radius-lg);
        background:var(--rx-glass); box-shadow:var(--rx-shadow-1); overflow:hidden; }
      .sr-twin__head { display:flex; align-items:center; gap:12px; padding:14px 18px; border-bottom:1px solid var(--rx-border);
        background:linear-gradient(180deg, var(--rx-brand-tint), transparent); }
      .sr-twin__avatar { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; flex:0 0 auto;
        background:var(--rx-brand); color:#fff; font-family:var(--rx-font-display); font-weight:700; font-size:16px; }
      .sr-twin__id { display:flex; flex-direction:column; line-height:1.25; margin-right:auto; }
      .sr-twin__name { font-family:var(--rx-font-display); font-size:15px; color:var(--rx-text); }
      .sr-twin__role { font-family:var(--rx-font-mono); font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--rx-muted); }
      .sr-twin__thread { max-height:340px; overflow-y:auto; padding:16px 18px; display:flex; flex-direction:column; gap:14px; }
      .sr-msg { max-width:92%; }
      .sr-msg--twin { align-self:flex-start; }
      .sr-msg--you { align-self:flex-end; text-align:right; }
      .sr-msg__who { font-family:var(--rx-font-mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--rx-brand); }
      .sr-msg__text { margin:2px 0 0; font-family:var(--rx-font-body); font-size:14px; line-height:1.55; color:var(--rx-text);
        background:var(--rx-surface); border:1px solid var(--rx-border); border-radius:var(--rx-radius); padding:10px 13px; }
      .sr-msg--you .sr-msg__text { background:var(--rx-brand); color:#fff; border-color:transparent; display:inline-block; }
      .sr-msg__list { margin:8px 0 0; padding-left:18px; display:flex; flex-direction:column; gap:5px; }
      .sr-msg__list li { font-family:var(--rx-font-body); font-size:13px; line-height:1.5; color:var(--rx-text); }
      .sr-msg__actions { margin-top:10px; }
      .sr-msg__label { font-family:var(--rx-font-mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--rx-muted); }
      .sr-msg__typing { display:inline-flex; gap:5px; align-items:center; }
      .sr-msg__typing span { width:6px; height:6px; border-radius:50%; background:var(--rx-muted); opacity:.5; animation:srBlink 1.2s infinite; }
      .sr-msg__typing span:nth-child(2){ animation-delay:.2s } .sr-msg__typing span:nth-child(3){ animation-delay:.4s }
      @keyframes srBlink { 0%,60%,100%{ opacity:.3; transform:translateY(0) } 30%{ opacity:1; transform:translateY(-3px) } }
      .sr-twin__chips { display:flex; flex-wrap:wrap; gap:8px; padding:0 18px 14px; }
      .sr-twin__chips--inline { padding:10px 0 0; }
      .sr-chip { font-family:var(--rx-font-body); font-size:13px; color:var(--rx-brand); background:var(--rx-brand-tint);
        border:1px solid transparent; border-radius:999px; padding:7px 13px; cursor:pointer; text-align:left; }
      .sr-chip:hover { border-color:var(--rx-brand); } .sr-chip:disabled { opacity:.5; cursor:default; }
      .sr-chip:focus-visible { outline:2px solid var(--rx-focus); outline-offset:2px; }
      .sr-twin__ask { display:flex; gap:8px; padding:0 18px 18px; }
      .sr-twin__input { flex:1; font-family:var(--rx-font-body); font-size:14px; color:var(--rx-text); background:var(--rx-surface);
        border:1px solid var(--rx-border-strong); border-radius:var(--rx-radius-sm); padding:11px 14px; }
      .sr-twin__input:focus-visible { outline:2px solid var(--rx-focus); outline-offset:1px; border-color:var(--rx-brand); }
      .sr-twin__send { white-space:nowrap; } .sr-twin__send:disabled { opacity:.5; cursor:default; }
      .sr-vh { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
    `}</style>
  );
}

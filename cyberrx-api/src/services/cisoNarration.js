'use strict';

/**
 * cisoNarration — SME (subject-matter-expert) explanations for the CISO agent
 * ---------------------------------------------------------------------------
 * Generates plain-English, educational explanations so a non-technical CISO
 * understands not just WHAT the number is, but what it MEANS, why it matters in
 * business terms, and what to do. Two flavors:
 *   - `explanation`: a short SME paragraph shown on screen (adds context beyond
 *     the headline answer).
 *   - `narration`: a spoken script for the agent voice. It does NOT read the
 *     screen — it teaches the underlying concept and the business stakes.
 *
 * Used for the 5 executive answers, the drill-down entities (control, threshold,
 * attack path, process, domain, hidden risk), and each dashboard tab.
 */

const pct = (n) => `${n}%`;

// ---------------- executive answers (by question number) -------------------
// The spoken narration is a ~30-second VERDICT: it states plainly whether the
// current situation is good or bad and the two or three reasons why — it never
// reads the on-screen text. The `explanation` is the short supporting paragraph
// shown on screen.
function answerNarration(n, m, posture) {
  const worstDomain = [...m.domainMatrix].sort((a, b) => a.current - b.current)[0];
  const topCtrl = m.controlRisk[0];
  const worstPath = m.attackPathways[0];
  const breaches = m.thresholds.rows.filter((r) => r.status === 'Breach');
  const readiness = m.readiness || { overall: 0, rating: 'Weak' };
  switch (n) {
    case 1: return {
      explanation: `Your posture score is a single 0–100 health number, weighted across eight security domains and built from live data in your tools — not a self-assessment. ${posture.current} sits in the "${band(posture.current)}" band: core protections work but meaningful gaps remain. The ${posture.delta >= 0 ? 'rise' : 'drop'} of ${Math.abs(posture.delta)} point(s) is driven mostly by ${worstDomain.name}, your weakest area.`,
      narration: `Here is my read: this is a ${posture.current >= 75 ? 'green light' : posture.current >= 55 ? 'yellow light, not green' : 'red flag'}. A ${posture.current} out of 100 means your core protections are working, but for a health plan holding member data it is ${posture.current >= 75 ? 'about where it should be' : 'short of where you need to be'}. What matters more than the number is the direction — we are ${posture.delta >= 0 ? 'trending up' : 'slipping'}, and the anchor dragging you down is ${worstDomain.name}. The concern is simple: if ${worstDomain.name} keeps sliding, the whole score follows it. That is where I would put attention and the next dollar first.`,
    };
    case 2: return {
      explanation: `These control areas top the risk ranking because they combine high likelihood of attack with severe impact and a wide blast radius. ${topCtrl.name} leads: it governs the keys to your most sensitive systems, and attackers specifically hunt for it. The "act now" items are sequenced so the highest risk-reduction-per-effort comes first.`,
      narration: `This one concerns me, and here is why. Your risk is not spread evenly — it is concentrated, and ${topCtrl.name} is the single biggest exposure. That is bad because it controls privileged access, the master keys attackers hunt for first, and ransomware crews target it directly. The situation is manageable, but only if you act in order: the top action removes the most risk for the least effort. Left alone, this is the gap most likely to turn into a real breach. If you do one thing this week, do the first action.`,
    };
    case 3: return {
      explanation: `Attackers rarely break in through one big hole — they chain small weaknesses together. Today the most likely chain runs through ${worstPath.process}, starting with ${worstPath.initialAccess.toLowerCase()} and pivoting on ${worstPath.weakestControl}. Readiness measures whether, if that happened, you could detect, contain, and recover quickly.`,
      narration: `Honestly, this is the area I would lose sleep over. You are exposed because an attacker does not need one big hole — they chain small ones, and right now that chain runs straight to ${worstPath.process} through ${worstPath.weakestControl}. What makes it worse is readiness: at ${readiness.overall} out of 100, even if we detect them, our ability to contain and recover quickly is shaky — restore testing and tabletop exercises are the weak spots. The good news is that one fix breaks the chain. Closing that weakest link is the highest-leverage move you can make right now.`,
    };
    case 4: return {
      explanation: `A threshold is a line your own policy and risk appetite say you should not cross — like patching internet-facing critical flaws within seven days. ${breaches.length} of these lines are currently crossed. Just as important, several real risks are being carried without anyone formally signing off on accepting them, which is a governance gap as much as a technical one.`,
      narration: `This is a clear red flag, and the board needs to hear it plainly. ${breaches.length} of your own policy lines are crossed — each one an open window you already agreed to keep shut. But the part that worries me more is governance: there are risks the organization is carrying that nobody formally decided to accept. Accepting risk should be a deliberate, written decision by the right person. When it happens silently, the board is exposed to something it never approved — and that is exactly the kind of thing that surfaces after an incident. I would get these documented or fixed.`,
    };
    case 5: return {
      explanation: `This answers the board's hardest question: is the money working? We track each major initiative's risk score before and after, so reductions are measured, not assumed. We also benchmark against peers and watch which threats are accelerating faster than our defenses — so you can fund what moves the needle.`,
      narration: `This is mostly good news, with two cautions. The spend is genuinely working — risk is down by a measured amount, not just on paper, and the biggest wins are in identity and endpoint. So the program is buying real risk reduction, which is the answer your board and CFO want. The cautions: you trail your peers in a couple of domains, which raises both breach odds and regulator scrutiny, and a few threats — shadow AI tools and identity-based ransomware — are moving faster than our defenses. I would steer the next dollar squarely at closing those two gaps.`,
    };
    default: return { explanation: '', narration: '' };
  }
}

// ---------------- drill-down entities --------------------------------------
function entityNarration(kind, e) {
  if (kind === 'control') return {
    explanation: `${plainControl(e.name)} Its risk contribution of ${e.riskContribution}/100 reflects ${String(e.likelihood).toLowerCase()} likelihood and ${String(e.impact).toLowerCase()} impact, and the blast radius — ${e.blastRadius} — is how far an attacker could spread once this control fails. The evidence is pulled live from your tools, so this is the current state, not an estimate.`,
    narration: `Let me explain ${e.name} without the jargon. ${plainControl(e.name)} The reason it ranks where it does: it is ${String(e.likelihood).toLowerCase()} that an attacker tries this, and the damage would be ${String(e.impact).toLowerCase()}, spreading across ${e.blastRadius}. Here is how we know — ${e.evidence}. In business terms, the process most exposed is ${e.processAffected}. The fix is straightforward: ${e.action}.`,
  };
  if (kind === 'threshold') {
    const breach = (e.status || '') === 'Breach';
    return {
      explanation: `This metric (${e.name}) measures ${plainThreshold(e.name)} Your policy line is ${e.threshold}; you are currently at ${e.current}${e.unit === '%' ? '%' : ' ' + e.unit}, which is ${breach ? 'over the line' : 'within appetite'}. ${breach ? 'Every period over the line widens the window an attacker can exploit.' : 'Keep monitoring to stay inside the line.'}`,
      narration: `${e.name}. In plain terms, this tracks ${plainThreshold(e.name)} Your own risk appetite — referenced in ${e.policyRef} — says stay at ${e.threshold}. Right now you are at ${e.current}${e.unit === '%' ? ' percent' : ' ' + e.unit}. ${breach ? `That is a breach, and it is ${String(e.breachSeverity).toLowerCase()} severity. The practical effect is a wider opening for an attacker until it is closed. My recommendation: ${e.action}.` : 'That is within appetite, so the message to the board is simple: this one is healthy.'}`,
    };
  }
  if (kind === 'pathway') return {
    explanation: `This is the most likely way an attacker reaches ${e.process}. They begin with ${e.initialAccess.toLowerCase()}, exploit ${e.weakestControl} to gain ground, and aim for ${e.target}. If it works: ${e.businessImpact}. Fixing the weakest link breaks the whole chain.`,
    narration: `Let me trace this attack the way it would actually happen against ${e.process}. It starts with ${e.initialAccess.toLowerCase()} — usually a person being tricked. From there the attacker leans on the weakest link, ${e.weakestControl}, to move toward ${e.target}. If the chain completes, the business impact is real: ${e.businessImpact}. The encouraging part is that a chain only needs one broken link to fail — so fixing ${e.breakingControls[0]} stops the whole thing. Mitigation: ${e.mitigation}.`,
  };
  if (kind === 'process') return {
    explanation: `${e.name} is one of your crown-jewel business processes. Its protection level of ${e.protectionLevel}/100 rolls up identity, vulnerability, detection, data, recovery, and third-party risk for the systems that run it (${e.supportingSystems.join(', ')}). The weakest of those dimensions is where an attacker would aim.`,
    narration: `${e.name} is a process the business cannot run without. I score how well it is protected by looking at six things at once — who can access it, how exposed its systems are, whether we would detect an intrusion, how its data is protected, how fast we could recover it, and the risk from third parties connected to it. It runs on ${e.supportingSystems.join(', ')}. Overall protection is ${e.protectionLevel} out of 100. Focus on its weakest dimension first, because that is exactly where an attacker will.`,
  };
  if (kind === 'domain') return {
    explanation: `${e.name} is one of the security domains that make up your overall posture. It scores ${e.current}/100 and is ${e.trend}. The metric pulling it down is ${e.topDeteriorating.metric}; the one helping is ${e.topImproving.metric}. Improving the deteriorating metric is the fastest way to lift this domain.`,
    narration: `${e.name} is one of the building blocks of your posture score. Today it is at ${e.current} out of 100 and ${e.trend}. What is helping is ${e.topImproving.metric}; what is hurting is ${e.topDeteriorating.metric}. The practical move is to put attention on the metric that is sliding — ${e.topDeteriorating.metric} — because that is the lever that lifts this domain and, in turn, your overall score.`,
  };
  if (kind === 'hidden') return {
    explanation: `This is a risk the organization is carrying without a formal decision to accept it. It hides because ${e.whyHidden.toLowerCase()}. The evidence: ${e.evidence}. The danger is governance as much as technical — the board is exposed to something it never approved.`,
    narration: `This one matters for a reason that is easy to miss. ${e.risk}. It stays hidden because ${e.whyHidden.toLowerCase()}. Here is how we know: ${e.evidence}. The real problem is not just technical — it is that nobody formally decided to accept this risk. Good governance means risk is accepted on purpose, in writing, by the right person. My recommendation: ${e.escalation}.`,
  };
  if (kind === 'investment') {
    const reduction = (e.baselineRisk || 0) - (e.currentRisk || 0);
    return {
      explanation: `${e.name} is a ${e.spend} investment in ${e.riskArea}. It has cut measured risk from ${e.baselineRisk} to ${e.currentRisk} (a ${reduction}-point drop), with roughly ${e.futureReduction} more points available once ${e.blockers ? e.blockers.toLowerCase() : 'the remaining rollout'} is resolved.`,
      narration: `Here is the honest read on ${e.name}. The money is working — risk in ${e.riskArea} dropped from ${e.baselineRisk} to ${e.currentRisk}, and that is a measured number, not a guess. What is holding back the rest of the return is ${e.blockers ? e.blockers.toLowerCase() : 'the remaining rollout'}. So this is a good-news item with an unlock attached. My recommendation: ${e.decision}.`,
    };
  }
  if (kind === 'emerging') {
    const gap = e.velocity === 'High' && e.ourAdaptation !== 'High';
    return {
      explanation: `${e.risk} is moving at ${String(e.velocity).toLowerCase()} velocity while our adaptation is ${String(e.ourAdaptation).toLowerCase()}. ${e.note}. When a threat outpaces our defenses, exposure grows on its own — even if nothing else changes.`,
      narration: `Let me flag why ${e.risk} concerns me. It is accelerating ${e.velocity === 'High' ? 'fast' : 'steadily'}, and our ability to keep up is ${String(e.ourAdaptation).toLowerCase()}. ${e.note}. ${gap ? 'That gap is the problem — it widens by itself, because the threat does not wait for our roadmap. This is one to get ahead of now rather than react to later.' : 'We are roughly keeping pace, but it is worth watching so the gap does not open up.'}`,
    };
  }
  return { explanation: '', narration: '' };
}

// ---------------- dashboard tabs -------------------------------------------
function tabNarration(tab, m, posture, board, readiness) {
  switch (tab) {
    case 'qa': return `These are the five questions I believe a CISO must be able to answer at any moment to run the program. Pick any one and I will give you a decision-ready answer with the evidence behind it. Start with posture if you want the big picture, or jump to "greatest risk" if you only have a minute.`;
    case 'domains': return `This is the health of each security domain that makes up your posture. The weighted ones — identity and detection at twenty percent each — move your overall score the most. Watch the arrows: a domain that is sliding is where risk is quietly building. Right now ${[...m.domainMatrix].filter((d) => d.trend === 'deteriorating').map((d) => d.name).slice(0, 2).join(' and ') || 'no domain'} need attention.`;
    case 'controls': return `This ranks your control areas by how much enterprise risk each one contributes — likelihood, impact, and blast radius combined. The top of this list is where an attacker gets the most leverage, so it is where your remediation effort buys the most safety. ${m.controlRisk[0].name} is your number-one risk concentration today.`;
    case 'thresholds': return `These are the lines your own policy and risk appetite say you should not cross. ${board.breaches} of ${board.total} are currently breached. Think of each breach as a window left open — not a disaster on its own, but an opening an attacker can climb through. The red ones are where I would close the window first.`;
    case 'actions': return `This is your prioritized action queue, ranked by severity, urgency, business impact, threat activity, and how confident we are the fix will work. It answers "what do I do Monday morning." The top items are the ones that remove the most risk fastest — and the ones flagged for escalation need a decision from you.`;
    case 'processes': return `This view connects security to the business. Each row is a process the organization cannot run without, scored on identity, vulnerability, detection, data, recovery, and third-party risk. When a business owner asks why cyber is their problem, this is the page that shows them — in their language.`;
    case 'paths': return `This shows how an attacker would actually compromise a critical process — as a chain of small steps, not one big break-in. The value for you is the weakest link in each chain, because breaking one link stops the whole attack. I have called out the single control to fix first for each path.`;
    case 'readiness': return `This answers how prepared you are for a major cyber event, and whether your security spend is buying down measurable risk. Readiness is ${readiness.overall} out of 100 — the weak spots are restore testing and exercising the plan. On investment, I show risk before and after each initiative so you can see what is actually working.`;
    case 'hidden': return `These are risks the organization is carrying without a formal decision to accept them. They are dangerous precisely because they are invisible on most dashboards. My job here is to surface them so you can either fix them or make a deliberate, documented decision to accept them — which is what good governance requires.`;
    default: return '';
  }
}

// ---------------- plain-language helpers -----------------------------------
function band(s) { return s >= 80 ? 'strong' : s >= 60 ? 'moderate' : s >= 40 ? 'weak' : 'critical'; }
function plainControl(name) {
  const n = name.toLowerCase();
  if (n.includes('privileged')) return 'Privileged access management is about who holds the master keys — the admin accounts that can change anything. If those keys are not locked in a vault, a single compromised account can encrypt or steal everything.';
  if (n.includes('vulnerability') || n.includes('patch')) return 'This is about fixing known software flaws before attackers use them — especially the internet-facing ones that anyone can reach.';
  if (n.includes('mfa')) return 'Multi-factor authentication means a stolen password alone is not enough to get in. Phishing is the number-one way attackers start, and MFA is the single best defense against it.';
  if (n.includes('third-party') || n.includes('vendor')) return 'This is the risk that comes through your vendors. A breach at a supplier with access to your systems can become your breach — and your notification obligation.';
  if (n.includes('logging') || n.includes('monitoring') || n.includes('detection')) return 'This is your ability to see an attacker inside your network. Without logs and detections on critical systems, an intruder can operate undetected for weeks.';
  if (n.includes('backup') || n.includes('restore')) return 'This is your ability to recover after ransomware. Backups that have never been test-restored are a promise, not a guarantee.';
  if (n.includes('cloud')) return 'This is about safe configuration of your cloud — a single public storage bucket can expose member data with no break-in required.';
  if (n.includes('data loss') || n.includes('dlp')) return 'This stops sensitive data from leaving — by email, to the cloud, or into AI tools.';
  if (n.includes('email')) return 'Email is the front door for most attacks; this control filters phishing and impersonation before it reaches a person.';
  if (n.includes('network seg')) return 'Segmentation limits how far an attacker can move once inside — like fire doors that stop a fire from spreading.';
  if (n.includes('awareness') || n.includes('training')) return 'This is your human firewall — how well staff recognize and report attacks.';
  return `${name} is a control that directly affects how exposed your critical systems are.`;
}
function plainThreshold(name) {
  const n = name.toLowerCase();
  if (n.includes('vulnerability aging')) return 'how long known critical flaws sit unpatched. The longer they age, the more time an attacker has to use them.';
  if (n.includes('mfa')) return 'what share of users are protected by multi-factor authentication. Gaps here are the easiest way in.';
  if (n.includes('edr')) return 'what share of your devices have modern endpoint protection that can detect and stop attacks.';
  if (n.includes('mttd')) return 'how long it takes you to detect an intruder. Faster detection means less damage.';
  if (n.includes('mttr')) return 'how long it takes to respond once you detect. Speed here limits the blast.';
  if (n.includes('restore')) return 'whether your backups actually restore. Untested backups fail exactly when you need them.';
  if (n.includes('logging')) return 'what share of critical systems are feeding logs, so you can see an attack.';
  if (n.includes('privileged')) return 'whether admin access is reviewed on schedule, so no one keeps keys they should not have.';
  if (n.includes('orphan')) return 'accounts left active after someone leaves — unguarded doors an attacker can use.';
  if (n.includes('vendor')) return 'how many of your critical vendors have open high-risk security findings.';
  if (n.includes('cloud')) return 'how many serious cloud misconfigurations are open right now.';
  if (n.includes('dlp')) return 'how many serious data-loss events are occurring per month.';
  return 'a key security indicator your policy sets a limit on.';
}

module.exports = { answerNarration, entityNarration, tabNarration };

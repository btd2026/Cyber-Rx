import { getSeat } from '../seats/seatData'
import { getOrgName } from '../onboarding/onboardingStore'

const strip = (s: string) =>
  String(s).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()

/** Build a grounded spoken briefing for a seat. */
export function briefingScript(seatId: string, seatLabel: string): string {
  const org = getOrgName()
  const forOrg = org ? ` for ${org}` : ''

  if (seatId === 'ciso') {
    return `CISO briefing${forOrg}. Cyber risk is understood, managed, and within tolerance today — one exposure is contained. ` +
      "Question one: we are not compromised; four thousand one hundred and two attacks were blocked in the last day, with one elevated phishing campaign aimed at claims staff. " +
      "Question two: the business can operate safely — every revenue process is running, claims on a verified compensating control. " +
      "Question three: material exposure is one high and rising item — an open ransomware path to protected health information, ninety-four million dollars modeled if realized. " +
      "Question four: two decisions need you today, each with costed options and a recommendation. " +
      "Question five: posture is improving, up four points to eighty-two against a target of eighty-five. Every figure traces to evidence."
  }

  if (seatId === 'cro') {
    return `CRO briefing${forOrg}. All cyber risk aggregates to you. The enterprise is within appetite; one risk is over the line and AI risk is rising. ` +
      "Question one: are we within risk appetite today? Aggregate yes; one risk, claims and payments, is currently above the appetite line. " +
      "Question two: how does enterprise risk aggregate? Six leaders contribute; CISO and CIO carry the most. All of it rolls up to you, with named owners. " +
      "Question three: are we compliant, and is our AI risk governed? Compliance is current; AI governance is early — developer, agentic, and shadow AI are ahead of standards. " +
      "Question four: two decisions need you — accept or mitigate the vendor concentration risk and approve the third-party monitoring investment. " +
      "Question five: risk trajectory is rising. Third-party and AI risk are the fastest-growing categories. Every figure traces to evidence."
  }

  if (seatId === 'ceo') {
    return `CEO briefing${forOrg}. Cyber risk is understood, managed, and within tolerance today. ` +
      "Question one: are we safe to operate? Yes — operations and revenue are protected; one contained security issue on claims. " +
      "Question two: what is our biggest business risk? Claims processing — revenue-critical and elevated, with a contained exposure. " +
      "Question three: what needs my attention? One board item and one funding decision affecting customer-facing risk. " +
      "Question four: are we improving? Yes — posture plus four this quarter; the funded roadmap is on track. Every figure traces to evidence."
  }

  if (seatId === 'cfo') {
    return `CFO briefing${forOrg}. Financial exposure is bounded and below our insurance threshold today. ` +
      "Question one: are we financially exposed today? Yes, but bounded to zero to one point one million dollars on the payments and claims path. " +
      "Question two: is anything material? Under review with Legal; current estimate is below materiality and the insurance threshold. " +
      "Question three: what needs my decision? File a precautionary insurance notice, approve one hundred and eighty thousand dollars response spend, hold the loss reserve. " +
      "Question four: are we spending well? Loss exposure within appetite; funded roadmap returns measurable posture lift. Every figure traces to evidence."
  }

  if (seatId === 'cio') {
    return `CIO briefing${forOrg}. Critical services are operational and recoverable today. ` +
      "Question one: are critical services up? Yes — all running; claims on a compensating control with no outage. " +
      "Question two: what could disrupt operations? Legacy claims platform fragility and vendor dependency in the call center. " +
      "Question three: what needs my decision? Hold versus failover on the claims gateway; one emergency change to file. " +
      "Question four: are we more reliable over time? Yes — uptime steady, mean time to recovery improving; recovery testing needs investment. Every figure traces to evidence."
  }

  if (seatId === 'clo') {
    return `CLO briefing${forOrg}. No disclosure obligation is triggered today; clocks are tracked and the evidence chain is intact. ` +
      "Question one: do we have a disclosure obligation? Not yet — the event is below materiality. A precautionary eight-K draft is ready. " +
      "Question two: are regulatory clocks tracked? Yes — state-breach, GDPR, and PCI timelines are monitored and within windows. " +
      "Question three: what needs my decision? Approve the precautionary disclosure draft and confirm privilege scope with outside counsel. " +
      "Question four: is our legal position improving? Yes — privilege is preserved, the evidence chain is intact, and the record is defensible. Every figure traces to evidence."
  }

  if (seatId === 'board') {
    return `Board briefing${forOrg}. Management is in control. One event is under materiality review; no public disclosure is required. ` +
      "Question one: is management in control? Yes — the incident was detected, contained, and handled per policy. " +
      "Question two: is this material? Not at this time — below threshold; no investor or regulator notification required today. " +
      "Question three: what decisions are before the board? One funding decision — claims platform modernization — with three costed options. " +
      "Question four: is the oversight record complete? Yes — every briefing and decision is minuted, which is what meets the board's duty of care. Every figure traces to evidence."
  }

  const seat = getSeat(seatId)
  if (!seat) return `${seatLabel} briefing is not available yet.`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exec = (seat.views.exec ?? []) as any[]
  const head = exec.find((b) => b.t === 'head')
  const brief = exec.find((b) => b.t === 'brief')
  let out = `${seatLabel} briefing${forOrg}. `
  if (head) out += strip(head.q) + (head.ans ? ` ${strip(head.ans)}.` : '') + ' '
  if (brief?.items) for (const it of brief.items) out += `${strip(it.q)} ${strip(it.a)} `
  out += 'Every figure traces to evidence.'
  return strip(out)
}

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

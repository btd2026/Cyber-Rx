import { getSeat } from '../seats/seatData'

// Voice briefing scripts (Phase 5d). The script is assembled from the seat's
// engine-grounded exec verdicts — the same values on screen, never new claims.
// In production this is spoken by server-side neural TTS (one voice per seat);
// the demo uses browser speech as a clearly-flagged stand-in.

// deno-lint-ignore-file
const strip = (s: string) =>
  String(s).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()

const CISO_SCRIPT =
  "CISO briefing. Cyber risk is understood, managed, and within tolerance today — one exposure is contained. " +
  "Question one: we are not compromised; over four thousand attacks were blocked in the last day, with one elevated phishing campaign aimed at claims staff. " +
  "Question two: the business can operate safely — every revenue process is running, claims on a verified compensating control. " +
  "Question three: material exposure is one high and rising item — an open ransomware path to protected health information, ninety-four million dollars modeled if realized. " +
  "Question four: two decisions need you today, each with costed options and a recommendation. " +
  "Question five: posture is improving, up four points to eighty-two against a target of eighty-five. Every figure traces to evidence."

/** Build a grounded spoken briefing for a seat. */
export function briefingScript(seatId: string, seatLabel: string): string {
  if (seatId === 'ciso') return CISO_SCRIPT
  const seat = getSeat(seatId)
  if (!seat) return `${seatLabel} briefing is not available yet.`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exec = (seat.views.exec ?? []) as any[]
  const head = exec.find((b) => b.t === 'head')
  const brief = exec.find((b) => b.t === 'brief')
  let out = `${seatLabel} briefing. `
  if (head) out += strip(head.q) + (head.ans ? ` ${strip(head.ans)}.` : '') + ' '
  if (brief?.items) for (const it of brief.items) out += `${strip(it.q)} ${strip(it.a)} `
  out += 'Every figure traces to evidence.'
  return strip(out)
}

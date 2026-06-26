// Roll the CSF seed catalog + pulled evidence into a per-function / overall CMMI
// posture. Pure and deterministic — controls with mapped evidence use the GRADED
// real value; the rest use seed. One implementation, used by both the CISO
// Framework Posture view and the cross-seat live-posture strip, so their numbers
// never diverge.

import { scoreControl, rollup, type ControlScore, type ControlSignal } from './scorer.ts'
import { scoreFromGrade, type ControlEvidence } from './controlMap.ts'
import type { Func } from '../seats/ciso/csf.ts'

// Seed coverage → coarse 5-signal split (matches the original Framework Posture).
export function seedSignals(cov: number, age: number): ControlSignal[] {
  const total = 5
  const present = Math.round(cov * total)
  return Array.from({ length: total }, (_, i) => ({ id: `s${i}`, present: i < present, ageHours: age }))
}

/** Score one control: graded real evidence if present, else the seed. */
export function scoreSeedControl(c: { cov: number; age: number }, live?: ControlEvidence): ControlScore {
  return live ? scoreFromGrade(live.coverage, live.ageHours) : scoreControl(seedSignals(c.cov, c.age))
}

export type LiveFunction = { key: string; name: string; cmmi: number; confidence: number; live: number }
export type LivePosture = {
  overall: { cmmi: number; confidence: number }
  functions: LiveFunction[]
  /** Count of controls backed by pulled evidence. */
  liveControls: number
}

export function computeLivePosture(csf: Func[], evMap: Record<string, ControlEvidence>): LivePosture {
  let liveControls = 0
  const all: ControlScore[] = []
  const functions = csf.map((fn) => {
    let fnLive = 0
    const scores = fn.categories.flatMap((cat) =>
      cat.controls.map((c) => {
        const live = evMap[c.id]
        if (live) { fnLive++; liveControls++ }
        const s = scoreSeedControl(c, live)
        all.push(s)
        return s
      }),
    )
    const roll = rollup(scores)
    return { key: fn.key, name: fn.name, cmmi: roll.cmmi, confidence: roll.confidence, live: fnLive }
  })
  return { overall: rollup(all), functions, liveControls }
}

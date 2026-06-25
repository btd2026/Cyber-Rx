import data from './data/seatData.json'

// The six non-CISO seats, defined as data in the approved mock. Each view is an
// array of typed "blocks" (head, band, table, dec2, …) the renderer understands.
export type NavTab = { id: string; label: string }
// Blocks are heterogeneous mock data; the renderer narrows by `t`.
export type SeatBlock = Record<string, unknown> & { t: string }
export type SeatDef = {
  label: string
  nav: NavTab[]
  views: Record<string, SeatBlock[]>
}

export const SEAT_DATA = data as unknown as Record<string, SeatDef>

export const getSeat = (id: string): SeatDef | undefined => SEAT_DATA[id]

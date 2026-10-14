import { scaleLinear, scalePoint } from "d3-scale"

type Row = Record<string, unknown>

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0

/**
 * Per-series [y0, y1] bands for every row. Every series sits on the zero
 * baseline (y0 = 0), so a negative value yields `[0, v]` with `v < 0` and draws
 * below the baseline. `max`/`min` bound the value range so the y-scale can span
 * a diverging (below-zero) domain.
 */
export function computeBands(
  data: Row[],
  keys: string[]
): { bands: Record<string, [number, number][]>; max: number; min: number } {
  const bands: Record<string, [number, number][]> = {}
  let max = 0
  let min = 0
  for (const key of keys) {
    bands[key] = data.map((row) => {
      const v = num(row[key])
      if (v > max) max = v
      if (v < min) min = v
      return [0, v]
    })
  }
  const flat = max === 0 && min === 0
  return { bands, max: flat ? 1 : max, min }
}

export function buildXScale(length: number, plotWidth: number) {
  return scalePoint<number>()
    .domain(Array.from({ length }, (_, i) => i))
    .range([0, plotWidth])
}

export function buildYScale(min: number, max: number, plotHeight: number, top?: number) {
  const lo = Math.min(0, min)
  const hi = Math.max(0, max)
  if (top !== undefined && top > hi) {
    return scaleLinear().domain([lo, top]).range([plotHeight, 0])
  }
  return scaleLinear()
    .domain([lo, hi === lo ? lo + 1 : hi])
    .nice()
    .range([plotHeight, 0])
}

export function nearestIndex(px: number, length: number, plotWidth: number) {
  if (length <= 1 || plotWidth <= 0) return 0
  const t = Math.max(0, Math.min(1, px / plotWidth))
  return Math.round(t * (length - 1))
}

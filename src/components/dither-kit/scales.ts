import { scaleLinear, scalePoint } from "d3-scale"

export const field = (row: object | undefined, key: string): unknown =>
  row === undefined ? undefined : Reflect.get(row, key)

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0

export function computeBands(
  data: object[],
  keys: string[]
): { bands: Record<string, [y0: number, y1: number][]>; max: number; min: number } {
  const bands: Record<string, [y0: number, y1: number][]> = {}
  let max = 0
  let min = 0
  for (const key of keys) {
    bands[key] = data.map((row) => {
      const v = num(field(row, key))
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

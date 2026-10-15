import type { AreaVariant } from "./chart-context"
import { rgb, type Seed } from "./palette"

// 4×4 ordered (Bayer) matrix, normalized to 0–1 thresholds — the exact matrix
// the legacy chart dithers with.
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

export const CELL_CSS_PX = 2
export const MAX_COLS = 520
export const MAX_ROWS = 200
export const BORDER_ALPHA = 0.72
export const OFF_TIER = 0.4

export type PaintOpts = {
  variant: AreaVariant
  hoverLift: number
  frontLayerThinning: number
}

export function paintColumn(
  octx: CanvasRenderingContext2D,
  x: number,
  top: number,
  floor: number,
  seed: Seed,
  { variant, hoverLift, frontLayerThinning }: PaintOpts
) {
  const t = Math.round(top)
  const f = Math.round(floor)
  const depth = f - t
  if (depth <= 0) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA)
    octx.fillRect(x, t, 1, 1)
    return
  }
  const bias = (variant === "dotted" ? 0.12 : 0) - frontLayerThinning
  for (let y = t; y < f; y++) {
    const density = (y - t) / depth
    if (variant === "hatched" && ((x + y) & 3) >= 2) continue
    const lit = density > BAYER[y & 3][x & 3] - 0.1 * hoverLift - bias
    if (variant === "dotted" && !lit) continue
    const k = (0.3 + density * 0.7) * (1 + 0.22 * hoverLift)
    const alpha = clamp01(lit ? k : k * OFF_TIER)
    octx.fillStyle = rgb(seed.fill, 1, alpha)
    octx.fillRect(x, y, 1, 1)
  }
  octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA)
  octx.fillRect(x, t, 1, 1)
  if (depth > 1) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * 0.5)
    octx.fillRect(x, t + 1, 1, 1)
  }
}

export function resample(src: number[], cols: number): number[] {
  const out = new Array<number>(cols)
  const last = Math.max(src.length - 1, 1)
  for (let c = 0; c < cols; c++) {
    const t = (c / Math.max(cols - 1, 1)) * last
    const i = Math.floor(t)
    const f = t - i
    const a = src[i] ?? 0
    const b = src[Math.min(i + 1, src.length - 1)] ?? a
    out[c] = a + (b - a) * f
  }
  return out
}

export function backingSize(width: number, height: number) {
  return {
    cols: Math.min(MAX_COLS, Math.max(8, Math.round(width / CELL_CSS_PX))),
    rows: Math.min(MAX_ROWS, Math.max(8, Math.round(height / CELL_CSS_PX))),
  }
}

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

export function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  )
}

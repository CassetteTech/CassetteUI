export type Rgb = [number, number, number]

export type DitherColor = "grey" | "brand"

export type Seed = { fill: Rgb }

const PALETTE: Record<DitherColor, Seed> = {
  brand: { fill: [226, 38, 69] },
  grey: { fill: [92, 92, 100] },
}

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`

export const seedOfColor = (color: DitherColor): Seed => PALETTE[color]

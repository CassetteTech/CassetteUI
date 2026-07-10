import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Bayer-style dither tile: 48×24, 6px cells, density rising from 1/8 at the
 * top row to 7/8 at the bottom so the strip reads as band color dissolving
 * into whatever sits behind it — the same ordered-dither transition the
 * pixel hero image uses between its color fields. NOTE: the edge extends
 * 24px above the band, so content above needs at least that much clearance
 * or the sparse pixels read as a drop shadow on it.
 */
const TILE_CELLS: Array<[number, number]> = [
  [30, 0],
  [6, 6], [24, 6], [36, 6],
  [0, 12], [12, 12], [18, 12], [30, 12], [42, 12],
  [0, 18], [6, 18], [12, 18], [18, 18], [30, 18], [36, 18], [42, 18],
];

const TILE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='24'>${TILE_CELLS.map(
  ([x, y]) => `<rect x='${x}' y='${y}' width='6' height='6'/>`
).join("")}</svg>`;

const TILE_URL = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`;

/**
 * Mask for a whole band whose background is NOT a flat color (e.g. the CTA
 * bands with the halftone image bookend). A flat DitherEdge strip can't
 * reproduce such a background, so instead the band itself is masked: its
 * top 24px dissolve with the dither tile and the rest stays solid. Pair
 * with `-mt-6` on the band so the dissolving zone overlaps the previous
 * section exactly where a DitherEdge would sit, and add 24px of extra top
 * padding to the band's content.
 */
export const DITHER_BAND_MASK_TOP: CSSProperties = {
  WebkitMaskImage: `${TILE_URL}, linear-gradient(#000, #000)`,
  maskImage: `${TILE_URL}, linear-gradient(#000, #000)`,
  WebkitMaskRepeat: "repeat-x, no-repeat",
  maskRepeat: "repeat-x, no-repeat",
  WebkitMaskPosition: "0 0, 0 24px",
  maskPosition: "0 0, 0 24px",
  WebkitMaskSize: "48px 24px, 100% calc(100% - 24px)",
  maskSize: "48px 24px, 100% calc(100% - 24px)",
};

interface DitherEdgeProps {
  /** CSS color of the band this edge belongs to, e.g. `hsl(var(--section-navy))`. */
  color: string;
  /** Which edge of the band the pixels dissolve from. */
  side?: "top" | "bottom";
  className?: string;
}

/**
 * Pixel-dissolve seam for colored section bands. Rendered just outside the
 * band (parent must be `relative`) so the band's color dithers over the
 * neighboring section's background.
 */
export function DitherEdge({ color, side = "top", className }: DitherEdgeProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 h-6",
        side === "top" ? "bottom-full" : "top-full -scale-y-100",
        className
      )}
      style={{
        backgroundColor: color,
        WebkitMaskImage: TILE_URL,
        maskImage: TILE_URL,
        WebkitMaskRepeat: "repeat",
        maskRepeat: "repeat",
      }}
    />
  );
}

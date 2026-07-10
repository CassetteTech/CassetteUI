import { cn } from "@/lib/utils";

const GRID = 15;
const CELL = 8;
const CENTER = (GRID - 1) / 2;
const RADIUS = 6.9;

// Deterministic at module scope so SSR and CSR agree: solid core, ordered
// dither at the rim — a square-pixel echo of the sun in the hero image.
const CELLS: Array<[number, number]> = [];
for (let y = 0; y < GRID; y++) {
  for (let x = 0; x < GRID; x++) {
    const d = Math.hypot(x - CENTER, y - CENTER);
    if (d < RADIUS - 1.4) {
      CELLS.push([x, y]);
    } else if (d < RADIUS + 0.4 && (x * 5 + y * 3) % 4 < 2) {
      CELLS.push([x, y]);
    }
  }
}

/**
 * Decorative dithered pixel sun. Colored via `text-*` on the parent
 * (`fill-current`); size it with width classes.
 */
export function PixelSun({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${GRID * CELL} ${GRID * CELL}`}
      className={cn("fill-current", className)}
    >
      {CELLS.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x * CELL}
          y={y * CELL}
          width={CELL - 1}
          height={CELL - 1}
        />
      ))}
    </svg>
  );
}

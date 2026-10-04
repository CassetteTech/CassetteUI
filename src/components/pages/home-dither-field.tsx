'use client';

import { useEffect, useRef, type RefObject } from 'react';

// Dither cell in CSS px, snapped to whole device pixels so every cell matches.
const CELL = 3;
// Share of lit cells at the heart of the sun, unless the canvas CSS sets
// `--dither-peak`. Kept under 3/8, where the 8×8 Bayer pattern starts to
// show diagonal cross-hatch marks.
const PEAK = 0.37;
// How much of the sun's radius sits above the canvas top (behind the navbar).
const SUN_RISE = 0.05;
// Clear space between the last row of grain and the tagline.
const TAGLINE_GAP = 24;
// Clear space between the cut-outs and the wordmark row, and from the sides.
const CUTOUT_GAP = 24;
// The sun breathes: its centre wanders (share of radius), and the field is
// repainted this often while it and the haze drift.
const BREATH = 0.02;
const BREATH_MS = 250;
// Haze: seeded value noise in two octaves (lattice spacing in cells) that
// slides slowly and mottles the halo so it reads as light, not a gradient.
const HAZE_SCALE = 16;
const HAZE_DETAIL = 6;
const HAZE_DRIFT = 0.01;
// Grain kept where the haze is thinnest, as a share of the local sun level.
const HAZE_FLOOR = 0.5;
const LATTICE = 128;
// The grain settles in from the top in dither order while the wordmark washes in.
const ENTRANCE_MS = 700;
// Depth of the entrance wash front, as a share of the canvas.
const WASH = 0.6;
// Cut-outs need this many CSS px to read on the cell grid; thinner skies go without.
const CUTOUT_MIN = 44;
const CUTOUT_MAX = 150;

// 8×8 ordered (Bayer) matrix as 0–1 thresholds: bit-reversed interleave of x^y and y.
export const BAYER8 = Array.from({ length: 8 }, (_, y) =>
  Array.from({ length: 8 }, (_, x) => {
    let rank = 0;
    for (let bit = 0; bit < 3; bit++) {
      rank = (rank << 2) | ((((x ^ y) >> bit) & 1) << 1) | ((y >> bit) & 1);
    }
    return (rank + 0.5) / 64;
  }));

/** Brand silhouettes drawn in a unit box around the origin. Each is erased
    from the grain (`destination-out`), so strokes and fills become holes.
    Line weights are set so every feature spans 3–5 cells. */
type Silhouette = (context: CanvasRenderingContext2D) => void;

const rings: Silhouette = (context) => {
  context.lineWidth = 0.085;
  for (const radius of [0.46, 0.29, 0.12]) {
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }
};

const triangles: Silhouette = (context) => {
  context.lineWidth = 0.09;
  context.lineJoin = 'round';
  for (const [dx, dy] of [[-0.24, -0.1], [0.24, 0.1]]) {
    context.beginPath();
    context.moveTo(dx - 0.275, dy - 0.22);
    context.lineTo(dx + 0.275, dy - 0.22);
    context.lineTo(dx, dy + 0.22);
    context.closePath();
    context.stroke();
  }
};

// Seeded layout in the sky above the wordmark, so every load looks composed:
// x and y are shares of that room, size a share of its height. Each cut-out
// drifts on its own slow loop (travel in CSS px, degrees, and seconds),
// sinking into the thin halo and rising back into the dense one. Travel
// shrinks to fit a low sky, so the composition holds on short viewports.
const CUTOUTS = [
  { draw: rings, x: 0.1, y: 0.5, size: 0.6, rotate: 0, driftX: 48, driftY: 34, spin: 14, periodX: 23, periodY: 31, phase: 0.8 },
  { draw: triangles, x: 0.36, y: 0.32, size: 0.66, rotate: -10, driftX: 62, driftY: 40, spin: 20, periodX: 27, periodY: 19, phase: 2.6 },
  { draw: rings, x: 0.62, y: 0.55, size: 0.54, rotate: 0, driftX: 56, driftY: 36, spin: 12, periodX: 21, periodY: 29, phase: 4.1 },
  { draw: triangles, x: 0.9, y: 0.3, size: 0.62, rotate: 12, driftX: 50, driftY: 38, spin: 18, periodX: 25, periodY: 17, phase: 1.9 },
];

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

// Seeded lattice (mulberry32), so every load prints the same haze.
const lattice = (() => {
  let seed = 0x2f6e2b1;
  return Float32Array.from({ length: LATTICE * LATTICE }, () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let hash = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash;
    return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
  });
})();

// Value noise at a point in lattice units, wrapping at the lattice edge.
export const noiseAt = (x: number, y: number) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(0, 1, x - x0);
  const fy = smoothstep(0, 1, y - y0);
  const i0 = x0 & (LATTICE - 1);
  const i1 = (x0 + 1) & (LATTICE - 1);
  const j0 = (y0 & (LATTICE - 1)) * LATTICE;
  const j1 = ((y0 + 1) & (LATTICE - 1)) * LATTICE;
  const top = lattice[j0 + i0] + (lattice[j0 + i1] - lattice[j0 + i0]) * fx;
  const bottom = lattice[j1 + i0] + (lattice[j1 + i1] - lattice[j1 + i0]) * fx;
  return top + (bottom - top) * fy;
};

// Haze at a cell: a coarse octave sliding one way and a fine octave the other.
const hazeAt = (column: number, row: number, seconds: number) =>
  HAZE_FLOOR + (1 - HAZE_FLOOR) * smoothstep(0.25, 0.75, (
    noiseAt(column / HAZE_SCALE + seconds * HAZE_DRIFT, row / HAZE_SCALE)
    + 0.35 * noiseAt(column / HAZE_DETAIL - seconds * HAZE_DRIFT * 1.6, row / HAZE_DETAIL + 37)
  ) / 1.35);

/** Ordered-dither sun rising behind the navbar, printed onto the home page
    glow. Its halo is centred on the wordmark and dissolves radially, mottled
    by a slow haze, until it ends above the tagline, so the wordmark sits in
    the thin lower halo and the copy on clean paper. The brand silhouettes
    are never drawn: each is cut out of the printed grain at device-pixel
    precision and drifts through the sky above the wordmark, so the glow
    shows through the holes. The canvas `color` and opacity come from its
    CSS, so the theme owns the ink. */
export function HomeDitherField({ wordmarkRef, taglineRef, searchRef, algorithm = 'bayer', cutouts = true, className }: {
  /** The wordmark row: the sun centres on it and cut-outs stay above it. */
  wordmarkRef: RefObject<HTMLElement | null>;
  /** The tagline: the grain ends above it. */
  taglineRef: RefObject<HTMLElement | null>;
  /** The search column: cut-outs stay left of it while it shares the sky. */
  searchRef: RefObject<HTMLElement | null>;
  /** `bayer` is the ordered 8×8 screen; `atkinson` diffuses the error, so
      the halo reads as grain with no repeating pattern. */
  algorithm?: 'bayer' | 'atkinson';
  /** Draw the drifting brand silhouettes. */
  cutouts?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const dither = document.createElement('canvas');
    const ditherContext = dither.getContext('2d');
    if (!canvas || !context || !ditherContext) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mountedAt = performance.now();
    let ratio = 1;
    let cell = CELL;
    let columns = 0;
    let rows = 0;
    // Sun geometry in cells, and the room for cut-outs in device px.
    let sunX = 0;
    let sunY = 0;
    let sunRadius = 0;
    let skyLeft = 0;
    let skyRight = 0;
    let skyBottom = 0;
    let ink = '';
    let paintedAt = -Infinity;
    let settled = false;
    let visible = true;
    let rendered = CUTOUTS.map(() => ({ x: NaN, y: NaN, rotate: NaN }));

    // Size the canvas from its top (under the navbar) to just above the
    // tagline, centre the sun on the wordmark, and keep the room for
    // cut-outs above the wordmark and clear of the search column.
    const measure = () => {
      ratio = window.devicePixelRatio;
      cell = Math.max(1, Math.round(CELL * ratio));
      const top = canvas.getBoundingClientRect().top + window.scrollY;
      const wordmark = wordmarkRef.current?.getBoundingClientRect();
      const tagline = taglineRef.current?.getBoundingClientRect();
      const bottom = tagline ? tagline.top + window.scrollY - TAGLINE_GAP : top + window.innerHeight * 0.5;
      columns = Math.ceil((window.innerWidth * ratio) / cell);
      rows = Math.max(0, Math.ceil(((bottom - top) * ratio) / cell));
      dither.width = columns;
      dither.height = rows;
      canvas.width = columns * cell;
      canvas.height = rows * cell;
      canvas.style.width = `${(columns * cell) / ratio}px`;
      canvas.style.height = `${(rows * cell) / ratio}px`;
      sunRadius = rows / (1 - SUN_RISE);
      sunY = -SUN_RISE * sunRadius;
      sunX = ((wordmark ? (wordmark.left + wordmark.right) / 2 : window.innerWidth / 2) * ratio) / cell;
      const search = searchRef.current?.getBoundingClientRect();
      skyLeft = CUTOUT_GAP * ratio;
      skyRight = search && search.top + window.scrollY < bottom ? (search.left - CUTOUT_GAP) * ratio : canvas.width - CUTOUT_GAP * ratio;
      skyBottom = wordmark ? (wordmark.top + window.scrollY - top - CUTOUT_GAP) * ratio : canvas.height * 0.4;
      ink = '';
    };

    // Threshold the sun against the Bayer matrix: a smooth radial bump,
    // mottled by the haze, thresholded per cell. `progress` sweeps the
    // entrance wash front from the top so rows fill in dither order.
    const paintDither = (color: string, peak: number, progress: number, seconds: number) => {
      const centreX = sunX + BREATH * sunRadius * Math.sin((Math.PI * 2 * seconds) / 53);
      const centreY = sunY + BREATH * sunRadius * Math.sin((Math.PI * 2 * seconds) / 67 + 2);
      const image = ditherContext.createImageData(columns, rows);
      const pixels = image.data;
      // Atkinson carries three quarters of each cell's rounding error into
      // six neighbours, so the halo fades as grain instead of a screen.
      const error = algorithm === 'atkinson' ? new Float32Array(columns * rows) : null;
      for (let row = 0; row < rows; row++) {
        const thresholds = BAYER8[row & 7];
        const wash = clamp01((progress * (1 + WASH) - row / rows) / WASH);
        const dy = (row + 0.5 - centreY) / sunRadius;
        for (let column = 0; column < columns; column++) {
          const dx = (column + 0.5 - centreX) / sunRadius;
          const bump = Math.max(0, 1 - dx * dx - dy * dy);
          const level = peak * wash * bump * bump * hazeAt(column, row, seconds);
          const index = row * columns + column;
          if (error) {
            const value = level + error[index];
            const on = value > 0.5;
            if (on) pixels[index * 4 + 3] = 255;
            const spill = (value - (on ? 1 : 0)) / 8;
            if (column + 1 < columns) error[index + 1] += spill;
            if (column + 2 < columns) error[index + 2] += spill;
            if (row + 1 < rows) {
              if (column > 0) error[index + columns - 1] += spill;
              error[index + columns] += spill;
              if (column + 1 < columns) error[index + columns + 1] += spill;
            }
            if (row + 2 < rows) error[index + 2 * columns] += spill;
          } else if (level > thresholds[column & 7]) {
            pixels[index * 4 + 3] = 255;
          }
        }
      }
      ditherContext.putImageData(image, 0, 0);
      ditherContext.globalCompositeOperation = 'source-in';
      ditherContext.fillStyle = color;
      ditherContext.fillRect(0, 0, columns, rows);
      ditherContext.globalCompositeOperation = 'source-over';
    };

    const draw = (now: number) => {
      if (!rows) return;
      const still = reducedMotion.matches;
      const seconds = still ? 0 : (now - mountedAt) / 1000;
      const progress = still ? 1 : easeOutCubic(Math.min(1, (now - mountedAt) / ENTRANCE_MS));
      const placed = (cutouts ? CUTOUTS : []).map((cutout) => {
        const size = Math.min(cutout.size * skyBottom, CUTOUT_MAX * ratio);
        const roomX = skyRight - skyLeft - size;
        const roomY = skyBottom - size;
        if (size < CUTOUT_MIN * ratio || roomX < 0 || roomY < 0) return null;
        const travelX = Math.min(cutout.driftX * ratio, roomX * 0.2);
        const travelY = Math.min(cutout.driftY * ratio, roomY * 0.4);
        const turn = Math.PI * 2 * seconds;
        return {
          size,
          draw: cutout.draw,
          x: skyLeft + size / 2 + travelX + cutout.x * (roomX - travelX * 2) + travelX * Math.sin(turn / cutout.periodX + cutout.phase),
          y: size / 2 + travelY + cutout.y * (roomY - travelY * 2) + travelY * Math.sin(turn / cutout.periodY + cutout.phase * 1.7),
          rotate: cutout.rotate + cutout.spin * Math.sin(turn / (cutout.periodX + cutout.periodY) + cutout.phase * 0.6),
        };
      });

      // Skip the frame unless the ink changed, the entrance is still settling,
      // the breathing field is due, or a cut-out moved by half a device pixel.
      const style = getComputedStyle(canvas);
      const peak = parseFloat(style.getPropertyValue('--dither-peak')) || PEAK;
      // Diffused grain crawls when its input drifts, so it breathes slower.
      const breathMs = algorithm === 'atkinson' ? BREATH_MS * 4 : BREATH_MS;
      const repaint = `${style.color} ${peak}` !== ink || !settled || (!still && now - paintedAt >= breathMs);
      const moved = placed.some((cutout, index) => {
        if (!cutout) return false;
        const last = rendered[index];
        const swept = (Math.abs(cutout.rotate - last.rotate) * Math.PI / 180) * (cutout.size / 2);
        return !(Math.abs(cutout.x - last.x) + Math.abs(cutout.y - last.y) + swept < 0.5);
      });
      if (!repaint && !moved) return;

      if (repaint) {
        ink = `${style.color} ${peak}`;
        paintDither(style.color, peak, progress, seconds);
        paintedAt = now;
        settled = progress >= 1;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(dither, 0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'destination-out';
      for (const cutout of placed) {
        if (!cutout) continue;
        context.save();
        context.translate(cutout.x, cutout.y);
        context.rotate((cutout.rotate * Math.PI) / 180);
        context.scale(cutout.size, cutout.size);
        cutout.draw(context);
        context.restore();
      }
      context.globalCompositeOperation = 'source-over';
      rendered = placed.map((cutout, index) => cutout ?? rendered[index]);
    };

    let frame = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (visible) draw(now);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    intersectionObserver.observe(canvas);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [wordmarkRef, taglineRef, searchRef, algorithm, cutouts]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}

import type { CSSProperties, ReactNode } from 'react';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { cn } from '@/lib/utils';

/**
 * The /promote identity band: a dithered spectrum with a spotlight sweeping
 * across it, and a cassette running behind the copy. Everything here is CSS
 * transforms over static masks — no canvas, no JS, no layout work per frame —
 * so it composites on the GPU and costs nothing on mobile. Motion lives in
 * `globals.css` (`promote-eq` / `promote-sweep` / `promote-reel`) behind a
 * `prefers-reduced-motion: no-preference` guard; the resting transforms are
 * plain CSS, so reduced motion still renders a composed still of the scene.
 *
 * `hero` is the landing centerpiece; `band` is the slim signed-in variant, so
 * both states of the page read as one surface.
 */

/** Standard 4×4 ordered-dither (Bayer) threshold matrix. */
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const CELL = 8;
const RAMP_COLUMNS = 4;

/**
 * Ordered-dither ramp mask: a `RAMP_COLUMNS`-wide tile that is solid at the
 * bottom and thins out toward the top, with each cell kept or dropped by the
 * Bayer threshold for its row's density. This is real dithering rather than a
 * faded gradient — the dissolve is carried entirely by *how many* pixels
 * survive at each level, never by their opacity — which is what makes the
 * spectrum read as a halftone field in the same voice as `DitherEdge`.
 *
 * Anchored to the bottom of its container and repeated horizontally only, so
 * the ramp's cells stay at their intrinsic size and never stretch.
 */
function ditherRampMask(rows: number): string {
  const cells: string[] = [];
  for (let row = 0; row < rows; row++) {
    // Density rises toward the bottom of the tile.
    const threshold = ((row + 1) / rows) * 16;
    for (let column = 0; column < RAMP_COLUMNS; column++) {
      if (BAYER_4X4[row % 4][column % 4] < threshold) {
        // 6px square in an 8px cell: hard pixel gutters even at full density.
        cells.push(`<rect x='${column * CELL}' y='${row * CELL}' width='6' height='6'/>`);
      }
    }
  }

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${RAMP_COLUMNS * CELL}' height='${rows * CELL}'>${cells.join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * 224px of dissolve for the full hero, 64px for the slim band. Each tile's
 * height must equal its container's height exactly (`h-56` / `h-16`), or the
 * sparse top of the ramp gets clipped and the dissolve ends on a hard edge.
 */
const HERO_DITHER = ditherRampMask(28);
const BAND_DITHER = ditherRampMask(8);

const DITHER_MASK_STYLE: CSSProperties = {
  maskRepeat: 'repeat-x',
  WebkitMaskRepeat: 'repeat-x',
  maskPosition: '0 100%',
  WebkitMaskPosition: '0 100%',
};

/** Soft-edged beam window, so the lit slice fades in and out at its edges. */
const SPOTLIGHT_FALLOFF =
  'linear-gradient(to right, transparent, rgba(0,0,0,0.65) 28%, #000 50%, rgba(0,0,0,0.65) 72%, transparent)';

const round = (value: number) => Math.round(value * 100) / 100;

const BAR_COUNT = 22;

/**
 * Deterministic at module scope so SSR and client agree, and rounded to two
 * decimals so the generated style strings stay byte-identical across engines.
 * A wide envelope times a detuned detail wave gives a spectrum silhouette that
 * never reads as an obvious repeating pattern.
 */
const BARS = Array.from({ length: BAR_COUNT }, (_, index) => {
  const position = index / (BAR_COUNT - 1);
  const envelope = 0.45 + 0.55 * Math.sin(Math.PI * (0.1 + 0.8 * position));
  const detail = 0.5 + 0.5 * Math.sin(index * 1.9 + Math.cos(index * 0.7));
  const high = round(Math.min(1, 0.34 + 0.66 * envelope * (0.5 + 0.5 * detail)));
  const low = round(high * (0.08 + 0.22 * detail));

  return {
    style: {
      '--eq-low': low,
      '--eq-high': high,
      '--eq-rest': round((low + high) / 2),
      '--eq-duration': `${round(1.9 + 1.7 * detail)}s`,
      // Negative delays start every bar mid-cycle, so the spectrum is already
      // in motion on first paint instead of rising from a flat line together.
      '--eq-delay': `-${round(0.24 * index + 1.6 * detail)}s`,
    } as CSSProperties,
  };
});

function SpectrumBars({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full w-full items-end gap-[4px] sm:gap-[8px]', className)}>
      {BARS.map((bar, index) => (
        <span
          key={index}
          className="promote-eq-bar h-full flex-1 origin-bottom bg-current"
          style={bar.style}
        />
      ))}
    </div>
  );
}

/**
 * The lit copy of the spectrum lives inside a narrow window that travels
 * across the field while its contents counter-travel by the exact inverse, so
 * the primary-colored bars stay pinned to the resting bars underneath and only
 * the *illumination* moves. Window is 25% wide, hence the 4× counter-scale.
 */
function Spotlight() {
  return (
    <div
      className="promote-sweep absolute inset-y-0 left-0 w-1/4"
      style={{ maskImage: SPOTLIGHT_FALLOFF, WebkitMaskImage: SPOTLIGHT_FALLOFF }}
    >
      <div className="absolute inset-0 bg-primary/25" />
      <div className="promote-sweep-inner absolute inset-y-0 left-0 w-[400%]">
        <SpectrumBars className="text-primary" />
      </div>
    </div>
  );
}

const REEL_TEETH = Array.from({ length: 6 }, (_, index) => {
  const angle = (index * Math.PI) / 3;
  return { x: round(Math.cos(angle)), y: round(Math.sin(angle)) };
});

function Reel({
  cx,
  cy,
  packRadius,
  duration,
}: {
  cx: number;
  cy: number;
  packRadius: number;
  duration: string;
}) {
  return (
    <g
      className="promote-reel"
      style={{ '--reel-duration': duration } as CSSProperties}
      // The bbox is symmetric about the reel centre, so fill-box rotation
      // spins it in place.
    >
      {/* Wound tape pack — dashed rings, not a disc: this is a reel. */}
      <circle
        cx={cx}
        cy={cy}
        r={packRadius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.45}
        strokeWidth={5}
        strokeDasharray="3 5"
      />
      <circle
        cx={cx}
        cy={cy}
        r={packRadius - 6}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeWidth={4}
        strokeDasharray="3 4"
      />
      {/* Hub and drive teeth. */}
      <circle cx={cx} cy={cy} r={9} fill="none" stroke="currentColor" strokeWidth={2.5} />
      {REEL_TEETH.map((tooth, index) => (
        <line
          key={index}
          x1={cx + tooth.x * 4}
          y1={cy + tooth.y * 4}
          x2={cx + tooth.x * 9}
          y2={cy + tooth.y * 9}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="square"
        />
      ))}
    </g>
  );
}

/**
 * Cassette shell, drawn rather than imaged so it inherits `currentColor` and
 * costs one request less. The supply reel carries the fuller pack and turns
 * slower than the take-up reel, the way a tape mid-play actually behaves.
 */
function CassetteShell({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 200"
      className={cn('h-auto w-full', className)}
    >
      <rect
        x={4}
        y={4}
        width={312}
        height={192}
        rx={7}
        // Translucent rather than the band color, so the spectrum reads
        // through the shell instead of being punched out by it.
        fill="currentColor"
        fillOpacity={0.06}
        stroke="currentColor"
        strokeWidth={4}
      />
      {[
        [22, 22],
        [298, 22],
        [22, 178],
        [298, 178],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill="currentColor" fillOpacity={0.5} />
      ))}

      {/* J-card label: ruled lines and a single brand mark. */}
      <rect
        x={40}
        y={22}
        width={240}
        height={62}
        fill="currentColor"
        fillOpacity={0.06}
        stroke="currentColor"
        strokeWidth={2}
      />
      <rect x={54} y={36} width={12} height={12} fill="hsl(var(--primary))" />
      <rect x={76} y={39} width={112} height={5} fill="currentColor" fillOpacity={0.75} />
      <rect x={54} y={58} width={186} height={3} fill="currentColor" fillOpacity={0.35} />
      <rect x={54} y={68} width={132} height={3} fill="currentColor" fillOpacity={0.35} />

      {/* Tape window. */}
      <rect
        x={62}
        y={96}
        width={196}
        height={72}
        rx={4}
        fill="currentColor"
        fillOpacity={0.05}
        stroke="currentColor"
        strokeWidth={2}
      />
      <Reel cx={112} cy={132} packRadius={28} duration="11s" />
      <Reel cx={208} cy={132} packRadius={19} duration="6.5s" />
      {/* Tape path across the head opening. */}
      <path
        d="M112 160 H208"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={2.5}
      />

      {/* Head opening and capstan cut-outs along the bottom edge. */}
      <rect x={126} y={176} width={26} height={12} fill="currentColor" fillOpacity={0.18} />
      <rect x={168} y={176} width={26} height={12} fill="currentColor" fillOpacity={0.18} />
    </svg>
  );
}

/**
 * Mono kicker behind a primary dash — the section marker both /promote views
 * share. Inherits the surrounding text color, so it works on the band and on
 * page background alike.
 */
export function Eyebrow({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em]',
        className,
      )}
    >
      <span aria-hidden="true" className="inline-block h-[2px] w-8 shrink-0 bg-primary" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Focal CTA styling for anything sitting on the band. The `brutalist` button
 * variant hard-codes `--foreground` for its border and offset shadow, which
 * disappears against the band in one theme or the other; this is the same
 * language keyed to the band's own foreground token so it reads in both.
 */
export const TAPE_DECK_CTA_CLASS =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 border-section-dark-fg bg-primary px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--section-dark-fg))] transition-[transform,box-shadow] duration-150 ease-out-quart hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--section-dark-fg))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50 [&_svg]:size-4 [&_svg]:shrink-0';

export function TapeDeckBand({
  variant = 'hero',
  children,
  className,
}: {
  variant?: 'hero' | 'band';
  children: ReactNode;
  className?: string;
}) {
  const isHero = variant === 'hero';

  return (
    <div className={cn('relative bg-background', className)}>
      <section
        className={cn(
          'relative isolate overflow-hidden bg-section-dark text-section-dark-fg',
          isHero
            ? 'px-4 pb-28 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-10 lg:pt-20'
            // Bottom padding clears the 64px spectrum strip so band copy never
            // lands on the dither.
            : 'px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-12 lg:px-10',
        )}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* Spectrum height is fixed in px, not a percentage, so the dither
              ramp always lands on whole cells and never resamples. */}
          <div
            className={cn(
              'absolute inset-x-0 bottom-0',
              isHero ? 'h-56' : 'h-16',
            )}
            style={{
              ...DITHER_MASK_STYLE,
              maskImage: isHero ? HERO_DITHER : BAND_DITHER,
              WebkitMaskImage: isHero ? HERO_DITHER : BAND_DITHER,
            }}
          >
            <div className="relative h-full w-full">
              <SpectrumBars className="opacity-[0.32]" />
              <Spotlight />
            </div>
          </div>

          {/* The slim band carries the identity through its color, dither
              strip and spectrum alone — a cropped cassette at that height
              reads as a stray fragment rather than a motif. */}
          {isHero && (
            <CassetteShell className="absolute -bottom-8 -right-24 w-[19rem] -rotate-6 text-section-dark-fg opacity-20 sm:bottom-auto sm:right-[-6%] sm:top-1/2 sm:w-[26rem] sm:-translate-y-1/2 sm:opacity-40 lg:right-4 lg:w-[30rem] lg:opacity-100" />
          )}
        </div>

        <div className="relative mx-auto w-full max-w-6xl">{children}</div>
      </section>

      <DitherEdge color="hsl(var(--section-dark))" side="bottom" />
    </div>
  );
}

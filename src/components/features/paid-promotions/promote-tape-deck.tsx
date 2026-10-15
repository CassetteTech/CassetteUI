import type { CSSProperties, ReactNode } from 'react';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { cn } from '@/lib/utils';

/** Standard 4×4 ordered-dither (Bayer) threshold matrix. */
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const CELL = 8;
const RAMP_COLUMNS = 4;

function ditherRamp(rows: number) {
  const cells: string[] = [];
  for (let row = 0; row < rows; row++) {
    const threshold = ((row + 1) / rows) * 16;
    for (let column = 0; column < RAMP_COLUMNS; column++) {
      if (BAYER_4X4[row % 4][column % 4] < threshold) {
        cells.push(`<rect x='${column * CELL}' y='${row * CELL}' width='6' height='6'/>`);
      }
    }
  }

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${RAMP_COLUMNS * CELL}' height='${rows * CELL}'>${cells.join('')}</svg>`;
  return { height: rows * CELL, mask: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` };
}

const HERO_RAMP = ditherRamp(28);
const BAND_RAMP = ditherRamp(8);

const DITHER_MASK_STYLE: CSSProperties = {
  maskRepeat: 'repeat-x',
  WebkitMaskRepeat: 'repeat-x',
  maskPosition: '0 100%',
  WebkitMaskPosition: '0 100%',
};

const SPOTLIGHT_FALLOFF =
  'linear-gradient(to right, transparent, rgba(0,0,0,0.65) 28%, #000 50%, rgba(0,0,0,0.65) 72%, transparent)';

const round = (value: number) => Math.round(value * 100) / 100;

const BAR_COUNT = 22;

/**
 * Rounded to two decimals so the generated style strings stay byte-identical
 * across engines (the server and the browser).
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
      '--eq-delay': `-${round(0.24 * index + 1.6 * detail)}s`,
    },
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
      style={{ '--reel-duration': duration }}
    >
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
      <path
        d="M112 160 H208"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={2.5}
      />

      <rect x={126} y={176} width={26} height={12} fill="currentColor" fillOpacity={0.18} />
      <rect x={168} y={176} width={26} height={12} fill="currentColor" fillOpacity={0.18} />
    </svg>
  );
}

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
  const ramp = isHero ? HERO_RAMP : BAND_RAMP;

  return (
    <div className={cn('relative bg-background', className)}>
      <section
        className={cn(
          'relative isolate overflow-hidden bg-section-dark text-section-dark-fg',
          isHero
            ? 'px-4 pb-28 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-10 lg:pt-20'
            : 'px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-12 lg:px-10',
        )}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              ...DITHER_MASK_STYLE,
              height: ramp.height,
              maskImage: ramp.mask,
              WebkitMaskImage: ramp.mask,
            }}
          >
            <div className="relative h-full w-full">
              <SpectrumBars className="opacity-[0.32]" />
              <Spotlight />
            </div>
          </div>

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

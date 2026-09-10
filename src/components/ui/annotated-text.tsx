/** Hand-drawn inline annotation for empty states and marketing copy. Not for forms or data. */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const filterId = 'annotated-text-rough';

/** Fractal-noise displacement that roughens the strokes; rendered once per annotation. */
function RoughFilter() {
  return (
    <svg className="absolute h-0 w-0" aria-hidden="true">
      <defs>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency={0.035} numOctaves={2} seed={11} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

const decorations = {
  wavy: {
    className: 'pointer-events-none absolute bottom-[-0.4em] left-[-2%] h-[0.7em] w-[104%]',
    svg: (
      <svg viewBox="0 0 140 14" fill="none" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
        <path
          d="M2,6 Q5.5,3 9,6 T17,6 T25,6 T33,6 T41,6 T49,6 T57,6 T65,6 T73,6 T81,6 T89,6 T97,6 T105,6 T113,6 T121,6 T129,6 T137,6"
          stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" filter={`url(#${filterId})`}
        />
      </svg>
    ),
  },
  highlight: {
    className: 'pointer-events-none absolute inset-x-[-4%] bottom-[-0.08em] z-0 h-[1.15em] w-[108%]',
    svg: (
      <svg viewBox="0 0 170 26" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
        <path
          d="M4,17 C2,11 5,7 12,6 C45,2 95,2 138,4 C152,5 164,7 166,13 C167,18 163,21 155,22 C112,24 60,24 16,22 C8,21.5 4,20 4,17 Z"
          fill="currentColor" filter={`url(#${filterId})`}
        />
      </svg>
    ),
  },
} as const;

export function AnnotatedText({
  children,
  variant = 'wavy',
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof decorations;
  /** Sets the decoration color, e.g. `text-primary/60`. */
  className?: string;
}) {
  const decoration = decorations[variant];
  return (
    <span className="relative inline-block whitespace-nowrap">
      <RoughFilter />
      <span className="relative z-10">{children}</span>
      <span className={cn(decoration.className, className ?? 'text-primary/60')}>{decoration.svg}</span>
    </span>
  );
}

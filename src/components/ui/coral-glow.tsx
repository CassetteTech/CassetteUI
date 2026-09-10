/** Decorative warm-glow surface: four blurred coral, peach, rose, and gold
    washes over the page background with a faint dot grain. Adapted from
    opensourceui.in's coral-glow-background (MIT) and re-toned so the washes
    tint the paper in light mode and recede to a low ember in dark mode. */

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function CoralGlow({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('relative isolate overflow-hidden bg-background', className)} {...props}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] opacity-50 blur-xl dark:opacity-20">
        <div className="absolute -left-[8%] -top-[30%] h-[80%] w-[46%] rounded-full bg-rose-300 blur-3xl" />
        <div className="absolute -right-[6%] -top-[20%] h-[70%] w-[40%] rounded-full bg-orange-300 blur-3xl" />
        <div className="absolute left-[28%] -top-[10%] h-[60%] w-[44%] rounded-full bg-rose-400/70 blur-3xl" />
        <div className="absolute right-[18%] top-[20%] h-[50%] w-[36%] rounded-full bg-amber-200 blur-3xl" />
        {/* Fade the glow into the paper so content below sits on plain background. */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] [background-image:radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] [background-size:4px_4px]"
      />
      {children}
    </div>
  );
}

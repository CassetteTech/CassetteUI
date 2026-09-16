/** Decorative warm surface with a faint dot grain. Light mode: four blurred
    coral, peach, rose, and gold washes tint the paper (adapted from
    opensourceui.in's coral-glow-background, MIT). Dark mode: the dark-ember
    treatment from the same library, a near-black radial base with amber,
    orange, and rose embers low in the frame. Both layers are decorative and
    sit under the content.

    Default is the pane tuning: half-strength washes in a top strip that fade
    to paper, so a full-height surface stays a low glow. `vivid` is the card
    tuning: the source's own blob geometry and opacities over the whole box. */

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function CoralGlow({ vivid = false, className, children, ...props }: ComponentProps<'div'> & { vivid?: boolean }) {
  return (
    // overflow-clip trims the blurred layers without becoming a scroll container,
    // so a sticky bar inside still tracks the page scroll.
    <div className={cn('relative isolate overflow-clip bg-background', className)} {...props}>
      {/* Light: coral washes over the paper. */}
      {vivid ? (
        <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 blur-xl dark:hidden">
          <div className="absolute -left-[8%] top-[6%] h-[68%] w-[62%] rounded-full bg-rose-300/75 blur-3xl" />
          <div className="absolute -right-[6%] top-[18%] h-[58%] w-[58%] rounded-full bg-orange-300/70 blur-3xl" />
          <div className="absolute -bottom-[24%] left-[30%] h-[64%] w-[64%] rounded-full bg-rose-400/60 blur-3xl" />
          <div className="absolute bottom-[8%] right-[14%] h-[52%] w-[52%] rounded-full bg-amber-200/65 blur-3xl" />
        </div>
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] opacity-50 blur-xl dark:hidden">
          <div className="absolute -left-[8%] -top-[30%] h-[80%] w-[46%] rounded-full bg-rose-300 blur-3xl" />
          <div className="absolute -right-[6%] -top-[20%] h-[70%] w-[40%] rounded-full bg-orange-300 blur-3xl" />
          <div className="absolute left-[28%] -top-[10%] h-[60%] w-[44%] rounded-full bg-rose-400/70 blur-3xl" />
          <div className="absolute right-[18%] top-[20%] h-[50%] w-[36%] rounded-full bg-amber-200 blur-3xl" />
          {/* Fade the glow into the paper so content below sits on plain background. */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>
      )}
      {/* Dark: ember base and low embers. The literal colors are the vendored palette at the
          source opacities; the pane tuning dims the group by a third so it stays a low glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden bg-[radial-gradient(circle_at_50%_120%,#1A1210_0%,#100C0A_48%,#080605_100%)] dark:block"
      />
      <div aria-hidden className={cn('pointer-events-none absolute -inset-8 -z-10 hidden blur-2xl dark:block', !vivid && 'opacity-[0.65]')}>
        <div className="absolute -left-[8%] bottom-[6%] h-[64%] w-[64%] rounded-full bg-[#F59E0B] opacity-[0.22] blur-3xl" />
        <div className="absolute bottom-[12%] left-[32%] h-[52%] w-[52%] rounded-full bg-[#FB923C] opacity-[0.17] blur-3xl" />
        <div className="absolute -right-[6%] top-[18%] h-[58%] w-[58%] rounded-full bg-[#F43F5E] opacity-[0.15] blur-3xl" />
        <div className="absolute left-[14%] top-[4%] h-[44%] w-[44%] rounded-full bg-[#FBBF24] opacity-[0.12] blur-3xl" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] [background-image:radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] [background-size:4px_4px]"
      />
      {children}
    </div>
  );
}

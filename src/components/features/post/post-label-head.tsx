'use client';

import type { ReactNode, Ref } from 'react';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { cn } from '@/lib/utils';

export const bandColor = (tint = 'hsl(var(--primary))') => `oklch(from ${tint} 0.42 clamp(0.03, c, 0.13) h)`;
export const bandInk = (tint = 'hsl(var(--primary))') => `oklch(from ${tint} 0.96 0.02 h)`;
export const bandTone = (tint?: string) => `oklch(from ${bandColor(tint)} var(--band-tone-lightness) c h)`;

interface PostLabelHeadProps {
  kicker?: ReactNode;
  title: string;
  artist?: ReactNode;
  meta?: ReactNode;
  tint?: string;
  compact?: boolean;
  titleRef?: Ref<HTMLHeadingElement>;
}

export function PostLabelHead({ kicker, title, artist, meta, tint, compact = false, titleRef }: PostLabelHeadProps) {
  const band = bandColor(tint);
  return (
    <header
      className={cn('relative text-left transition-colors duration-500', compact ? 'px-4 pb-4 pt-4' : 'px-6 pb-6 pt-5')}
      style={{ backgroundColor: band, color: bandInk(tint) }}
    >
      {kicker && (
        <p
          className={cn(
            'flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono font-bold uppercase tracking-[0.3em] opacity-75',
            compact ? 'mb-3 text-[10px]' : 'mb-5 text-[11px]',
          )}
        >
          {kicker}
        </p>
      )}
      <h1
        ref={titleRef}
        className={cn(
          'break-words font-teko font-bold uppercase leading-[0.9] tracking-tight',
          compact ? 'text-2xl' : 'text-4xl',
        )}
      >
        {title}
      </h1>
      {artist && <p className={cn('mt-2 font-roboto-flex opacity-85', compact ? 'text-sm' : 'text-base')}>{artist}</p>}
      {meta && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-roboto-flex text-sm opacity-75">{meta}</p>
      )}
      <DitherEdge color={band} side="bottom" className="transition-colors duration-500" />
    </header>
  );
}

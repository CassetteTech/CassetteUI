'use client';

import type { MouseEvent, ReactNode } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { cn } from '@/lib/utils';

/** The post's artwork color (brand red until it loads), re-toned so cream type stays legible on it in both themes. */
export const bandColor = (tint = 'hsl(var(--primary))') => `oklch(from ${tint} 0.42 clamp(0.03, c, 0.13) h)`;
export const bandInk = (tint = 'hsl(var(--primary))') => `oklch(from ${tint} 0.96 0.02 h)`;

interface PostLabelHeadProps {
  /** The post type and its genres, printed above the title. */
  kicker?: ReactNode;
  title: string;
  /** Artist names, with roles. Omitted for a playlist. */
  artist?: ReactNode;
  /** Short facts under the artist: duration and album, or the release date. */
  meta?: ReactNode;
  /** The service a playlist was shared from. */
  source?: {
    href: string;
    name: string;
    icon: string;
    onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  };
  /** The artwork's vibrant color. */
  tint?: string;
  /** Tighter type and padding for phones. */
  compact?: boolean;
}

/**
 * The printed label at the top of a post card: the title set in the artwork's color,
 * dissolving into the paper through the brand's dither seam. The same device as the
 * owner column, so the two read as one set. The card below needs 2.5rem of top padding
 * for the seam.
 */
export function PostLabelHead({ kicker, title, artist, meta, source, tint, compact = false }: PostLabelHeadProps) {
  const band = bandColor(tint);
  return (
    <header
      className={cn('relative text-left transition-colors duration-500', compact ? 'px-4 pb-5 pt-4' : 'px-6 pb-6 pt-5')}
      style={{ backgroundColor: band, color: bandInk(tint) }}
    >
      {kicker && (
        <p
          className={cn(
            'flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono font-bold uppercase tracking-[0.3em] opacity-75',
            compact ? 'mb-4 text-[10px]' : 'mb-5 text-[11px]',
          )}
        >
          {kicker}
        </p>
      )}
      <h1
        className={cn(
          'text-balance font-teko font-bold uppercase leading-[0.9] tracking-tight',
          compact ? 'text-3xl' : 'text-4xl',
        )}
      >
        {title}
      </h1>
      {artist && <p className={cn('mt-2 font-roboto-flex opacity-85', compact ? 'text-sm' : 'text-base')}>{artist}</p>}
      {(meta || source) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-roboto-flex text-sm opacity-75">
          {meta}
          {source && (
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={source.onClick}
              className="inline-flex items-center gap-1.5 underline-offset-4 transition-opacity hover:underline hover:opacity-100"
            >
              <span>From</span>
              <Image src={source.icon} alt="" width={14} height={14} />
              <span>{source.name}</span>
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </p>
      )}
      <DitherEdge color={band} side="bottom" className="transition-colors duration-500" />
    </header>
  );
}

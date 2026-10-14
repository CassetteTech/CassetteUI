'use client';

/** A membership as a wallet pass. Layout after opensourceui.in's wallet-pass
    (MIT) without the flip: a brand-red head with the product, the tier, and
    the holder that dissolves into the paper strip through the company pages'
    ordered dither, then the validity and the price. Children render below the
    strip inside the same card. Colors come from the theme tokens. */

import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function WalletPass({
  product,
  tier,
  holderName,
  holderHandle,
  holderHref,
  avatarUrl,
  price,
  priceUnit = '/month',
  priceNote,
  validityLabel,
  validityValue,
  active,
  summary,
  className,
  children,
  ...rest
}: Omit<ComponentProps<'div'>, 'children'> & {
  product: string;
  tier: string;
  holderName: string;
  holderHandle: string;
  holderHref?: string;
  avatarUrl?: string;
  price?: string;
  priceUnit?: string;
  priceNote?: ReactNode;
  validityLabel?: string;
  validityValue?: string;
  active: boolean;
  summary?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={cn('card-ink overflow-hidden', holderHref && 'group relative', className)} {...rest}>
      <div
        data-shared-tint="head"
        className={cn('relative p-4', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}
      >
        <div
          aria-hidden
          data-shared-tint="bloom"
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]',
            !active && 'opacity-0',
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15" />
          <div className="absolute -right-10 -top-20 size-48 rounded-full bg-amber-300/50 blur-3xl" />
          <div className="absolute -left-12 bottom-0 size-40 rounded-full bg-rose-950/35 blur-3xl" />
        </div>
        <div className="relative mb-5 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-75">
          <span className="truncate">{product}</span>
          <span className="shrink-0">{tier}</span>
        </div>
        <div className="relative flex items-center gap-3">
          <Avatar data-shared-size="avatar" className={cn('size-12 border-2', summary && 'lg:size-16', active ? 'border-primary-foreground/30' : 'border-border')}>
            <AvatarImage src={avatarUrl} alt="" />
            <AvatarFallback data-shared-size="initial" delayMs={avatarUrl ? 400 : undefined} className={cn('bg-background font-teko text-xl font-bold text-foreground', summary && 'lg:text-2xl')}>
              {holderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-left">
            <p data-shared-size="name" className={cn('truncate text-sm font-semibold underline-offset-4 group-hover:underline', summary && 'lg:text-base')}>{holderName}</p>
            <p className="truncate font-mono text-[11px] opacity-75">@{holderHandle}</p>
          </div>
        </div>
        <DitherEdge color="inherit" side="bottom" />
      </div>
      {summary && <div className="hidden px-4 pt-9 lg:block">{summary}</div>}
      {(validityLabel || price || priceNote) && (
      <div className={cn('flex items-end justify-between gap-3 px-4 pb-3 pt-9', summary && 'lg:pt-5')}>
        {validityLabel && (
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{validityLabel}</p>
            <p className="break-words text-xs font-semibold">{validityValue}</p>
          </div>
        )}
        {(price || priceNote) && (
          <div className="shrink-0 text-right">
            {price && (
              <p className="font-teko text-3xl font-bold leading-none tabular-nums">
                {price}
                <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">{priceUnit}</span>
              </p>
            )}
            {priceNote && <p className="mt-1 text-[11px] text-muted-foreground">{priceNote}</p>}
          </div>
        )}
      </div>
      )}
      {children && <div className="px-4 pb-4">{children}</div>}
      {holderHref && (
        <Link href={holderHref} className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="sr-only">{holderName}</span>
        </Link>
      )}
    </div>
  );
}

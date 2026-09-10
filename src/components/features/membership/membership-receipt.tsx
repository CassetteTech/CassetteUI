/** Register-paper receipt for a membership price: Membership, Service fee, Tax note, Total. */

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

/** Scalloped edge cut from the card tone so the paper reads as torn. */
const tornEdge = (side: 'top' | 'bottom') => ({
  background: `radial-gradient(circle at 8px ${side === 'top' ? 0 : 8}px, transparent 6px, hsl(var(--card)) 6px)`,
  backgroundSize: '16px 8px',
});

export function MembershipReceipt({
  title,
  meta,
  faceAmountMinor,
  serviceFeeMinor,
  currency,
  interval,
  footer,
  className,
  ...props
}: {
  title: string;
  meta?: string;
  faceAmountMinor: number;
  serviceFeeMinor: number;
  currency: string;
  interval: 'month' | 'year';
  footer?: string;
} & ComponentProps<'div'>) {
  const money = (minor: number) => formatPaidPromotionMinorAmount(minor, currency);
  return (
    <div className={cn('relative my-2 bg-card px-4 py-4 font-mono text-xs text-card-foreground', className)} {...props}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 h-2" style={tornEdge('top')} />
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]">{title}</p>
        {meta && <p className="mt-1 text-[10px] text-muted-foreground">{meta}</p>}
      </div>
      <dl className="mt-3 space-y-1 border-t border-dashed border-border pt-3 tabular-nums">
        <div className="flex justify-between gap-3">
          <dt>Membership</dt>
          <dd>{money(faceAmountMinor)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Service fee</dt>
          <dd>{money(serviceFeeMinor)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Tax</dt>
          <dd className="text-right">Added at Checkout where applicable</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-dashed border-border pt-2 text-sm font-bold">
          <dt>Total per {interval}</dt>
          <dd>{money(faceAmountMinor + serviceFeeMinor)}</dd>
        </div>
      </dl>
      {footer && <p className="mt-3 text-center text-[10px] leading-snug text-muted-foreground">{footer}</p>}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-2 h-2" style={tornEdge('bottom')} />
    </div>
  );
}

'use client';

/** Presentation for a membership plan: the fan-facing preview and the curator earnings receipt. */

import { ReceiptRow } from '@/components/features/curator/studio-shell';
import { MembershipOffer, type OfferBenefit, type OfferPrice } from '@/components/features/membership/membership-offer';
import { Button } from '@/components/ui/button';
import type { CuratorPlanEconomics } from '@/services/curator-plans';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

export function money(amountMinor: number, currency: string) {
  return formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');
}

/** Scalloped edge cut from the card tone so the paper reads as torn. */
const tornEdge = (side: 'top' | 'bottom') => ({
  background: `radial-gradient(circle at 8px ${side === 'top' ? 0 : 8}px, transparent 6px, hsl(var(--card)) 6px)`,
  backgroundSize: '16px 8px',
});

/** Curator-side receipt: the fan charge builds down to what the curator keeps.
    Same paper as the fan receipt in the rail, so the two read as one pair. */
export function EconomicsBreakdown({
  economics,
  currency,
  interval,
}: {
  economics: CuratorPlanEconomics;
  currency: string;
  interval: 'month' | 'year';
}) {
  return (
    <div className="relative my-2 bg-card px-4 py-4 font-mono text-xs text-card-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 h-2" style={tornEdge('top')} />
      <h4 className="text-center text-[11px] font-bold uppercase tracking-[0.2em]">Per {interval}</h4>
      <dl className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3">
        <ReceiptRow label="Your price" value={money(economics.faceMinor, currency)} />
        <ReceiptRow label="Fan service fee" value={money(economics.serviceFeeMinor, currency)} deduction />
        <ReceiptRow
          label="Fan pays"
          value={money(economics.fanChargeMinor, currency)}
          emphasized
          className="border-t border-dashed border-border pt-2"
        />
        <ReceiptRow label="Cassette platform fee" value={`−${money(economics.platformFeeMinor, currency)}`} deduction />
        <ReceiptRow label="Payout operations fee" value={`−${money(economics.payoutOpsFeeMinor, currency)}`} deduction />
        <ReceiptRow label="Payment processing" value={`−${money(economics.processingFeeMinor, currency)}`} deduction />
        {/* Total line: div wrapper kept so tests can find the amount via its row */}
        <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-border pt-3">
          <dt className="font-bold">Estimated earnings per member</dt>
          <dd className="font-teko text-3xl font-bold leading-none tabular-nums">
            {money(economics.curatorAccrualMinor, currency)}
          </dd>
        </div>
      </dl>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-2 h-2" style={tornEdge('bottom')} />
    </div>
  );
}

export type PreviewPrice = OfferPrice;

/** The offer exactly as a fan sees it on the public page. `frozen` marks
    published fan charges versus current-policy estimates. */
export function FanPreview({
  name,
  description,
  benefits,
  curatorName,
  curatorHandle,
  curatorAvatarUrl,
  monthly,
  annual,
  currency,
  frozen,
}: {
  name: string;
  description: string;
  benefits: OfferBenefit[];
  curatorName: string;
  curatorHandle: string;
  curatorAvatarUrl?: string;
  monthly: PreviewPrice | null;
  annual: PreviewPrice | null;
  currency: string;
  frozen: boolean;
}) {
  return (
    <MembershipOffer
      data-testid="curator-plan-preview"
      tier={frozen ? 'Preview' : 'Estimate'}
      curatorName={curatorName}
      curatorHandle={curatorHandle}
      curatorAvatarUrl={curatorAvatarUrl}
      name={name.trim() || 'Your plan name'}
      description={description}
      benefits={benefits}
      monthly={monthly}
      annual={annual}
      currency={currency}
      interval="month"
    >
      {/* Preview only: non-interactive stand-in for the join button. */}
      <Button
        type="button"
        aria-disabled="true"
        tabIndex={-1}
        className="pointer-events-none mt-6 w-full"
      >
        Join {curatorName}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {frozen
          ? 'Fans join from your public page'
          : 'Fan prices are set by the pricing policy in effect when you publish'}
      </p>
    </MembershipOffer>
  );
}

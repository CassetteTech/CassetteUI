'use client';

/** Presentation for a membership plan: the fan-facing preview and the curator earnings receipt. */

import { MembershipOffer, type OfferBenefit, type OfferPrice } from '@/components/features/membership/membership-offer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CuratorPlanEconomics } from '@/services/curator-plans';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

export function money(amountMinor: number, currency: string) {
  return formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');
}

/** Scalloped edge cut from the card tone so the paper reads as torn. */
export const tornEdge = (side: 'top' | 'bottom') => ({
  background: `radial-gradient(circle at 8px ${side === 'top' ? 0 : 8}px, transparent 6px, hsl(var(--card)) 6px)`,
  backgroundSize: '16px 8px',
});

/** One receipt line. A row header and one cell per billing interval, so tests
    and screen readers read a label with its amounts. */
function ReceiptLine({ label, amounts, emphasized, deduction, rule }: {
  label: string;
  amounts: string[];
  emphasized?: boolean;
  deduction?: boolean;
  /** A dashed rule above the line opens a new group. */
  rule?: boolean;
}) {
  return (
    <tr className={cn(rule && '[&>*]:border-t [&>*]:border-dashed [&>*]:border-border [&>*]:pt-2.5')}>
      <th scope="row" className={cn('py-1 pr-3 text-left font-normal text-muted-foreground', emphasized && 'font-semibold text-foreground')}>
        {label}
      </th>
      {amounts.map((amount, index) => (
        <td key={index} className={cn('py-1 pl-3 text-right tabular-nums', emphasized && 'font-semibold', deduction && 'text-muted-foreground')}>
          {amount}
        </td>
      ))}
    </tr>
  );
}

/** Curator-side receipt: the fan charge builds down to what the curator keeps,
    with a column per billing interval. Same paper as the fan receipt in the
    rail, so the two read as one pair. */
export function EconomicsBreakdown({
  monthly,
  annual,
  currency,
}: {
  monthly: CuratorPlanEconomics;
  annual: CuratorPlanEconomics | null;
  currency: string;
}) {
  const terms = annual ? [monthly, annual] : [monthly];
  const amounts = (pick: (economics: CuratorPlanEconomics) => number, sign = '') =>
    terms.map((economics) => `${sign}${money(pick(economics), currency)}`);
  return (
    <div className="relative my-2 bg-card px-4 py-4 font-mono text-xs text-card-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 h-2" style={tornEdge('top')} />
      {/* Large prices in two columns can outgrow a 320px phone; the table scrolls instead of widening the form.
          Focusable so keyboard users in every browser can scroll it. */}
      <section
        aria-label="Earnings estimate"
        // A scrollable region must take focus (WCAG 2.1.1); it is the one exception to this rule.
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.2em]">
            <th scope="col" className="pb-2 text-left font-normal"><span className="sr-only">Line</span></th>
            <th scope="col" className="pb-2 pl-3 text-right font-bold">Month</th>
            {annual && <th scope="col" className="pb-2 pl-3 text-right font-bold">Year</th>}
          </tr>
        </thead>
        <tbody>
          <ReceiptLine label="Your price" amounts={amounts((economics) => economics.faceMinor)} rule />
          <ReceiptLine label="Fan service fee" amounts={amounts((economics) => economics.serviceFeeMinor)} deduction />
          <ReceiptLine label="Fan pays" amounts={amounts((economics) => economics.fanChargeMinor)} emphasized rule />
          <ReceiptLine label="Platform fee" amounts={amounts((economics) => economics.platformFeeMinor, '−')} deduction />
          <ReceiptLine label="Payout fee" amounts={amounts((economics) => economics.payoutOpsFeeMinor, '−')} deduction />
          <ReceiptLine label="Payment processing" amounts={amounts((economics) => economics.processingFeeMinor, '−')} deduction />
          <tr className="[&>*]:border-t [&>*]:border-dashed [&>*]:border-border [&>*]:pt-3 [&>*]:align-bottom">
            <th scope="row" className="pr-3 text-left font-bold">Estimated earnings per member</th>
            {terms.map((economics, index) => (
              <td key={index} className="pl-3 text-right font-teko text-2xl font-bold leading-none tabular-nums">
                {money(economics.curatorAccrualMinor, currency)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      </section>
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

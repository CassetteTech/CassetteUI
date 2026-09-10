'use client';

/** Presentation for a membership plan: the fan-facing preview and the curator earnings receipt. */

import { Check } from 'lucide-react';
import { ReceiptRow } from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import type { CuratorPlanEconomics } from '@/services/curator-plans';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

export function money(amountMinor: number, currency: string) {
  return formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');
}

/** Receipt-style estimate: fan charge builds down to what the curator keeps. */
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
    <div className="rounded-lg bg-muted/40 p-4 sm:p-5">
      <h4 className="text-sm font-semibold">Per {interval}</h4>
      <dl className="mt-4 space-y-2 text-sm">
        <ReceiptRow label="Your price" value={money(economics.faceMinor, currency)} />
        <ReceiptRow label="Fan service fee" value={money(economics.serviceFeeMinor, currency)} />
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
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">Estimated earnings per member</dt>
          <dd className="font-teko text-2xl font-bold leading-none tabular-nums">
            {money(economics.curatorAccrualMinor, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export type PreviewPrice = { faceMinor: number; serviceFeeMinor: number };

/** The offer as a fan will read it on the public page. Gross (fee-inclusive)
    prices; `frozen` marks published fan charges versus current-policy estimates. */
export function FanPreview({
  name,
  description,
  featureNames,
  curatorName,
  monthly,
  annual,
  currency,
  frozen,
}: {
  name: string;
  description: string;
  featureNames: string[];
  curatorName: string;
  monthly: PreviewPrice | null;
  annual: PreviewPrice | null;
  currency: string;
  frozen: boolean;
}) {
  // Single text nodes ("$7.58/month") keep exact-text lookups on the receipt rows unambiguous.
  const line = (price: PreviewPrice, interval: 'month' | 'year') =>
    `${money(price.faceMinor + price.serviceFeeMinor, currency)}/${interval}`;
  return (
    <div className="relative pt-6" data-testid="curator-plan-preview">
      <p className="sr-only">What fans see</p>
      {/* Hanging tag: eyelet and string above a slightly tilted card. */}
      <span aria-hidden className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border" />
      <span aria-hidden className="absolute left-1/2 top-0 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background" />
      <div className="card-ink relative -rotate-1 px-4 py-4 sm:px-5">
        <span className="absolute -top-2.5 right-3 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {frozen ? 'Preview' : 'Estimate'}
        </span>
        <p className="pr-16 text-sm font-semibold leading-tight text-muted-foreground">
          {name.trim() || 'Your plan name'}
        </p>
        <div className="mt-2 space-y-0.5">
          {monthly && (
            <p className="font-teko text-4xl font-bold leading-none tabular-nums tracking-tight">
              {line(monthly, 'month')}
            </p>
          )}
          {annual && <p className="font-mono text-sm tabular-nums text-muted-foreground">{line(annual, 'year')}</p>}
          {!monthly && !annual && <p className="text-sm text-muted-foreground">Enter a valid monthly price.</p>}
          <p className="text-xs text-muted-foreground">
            Includes the fan service fee, plus applicable tax.
          </p>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">By {curatorName}</p>
        {description.trim() && (
          <p className="mt-2 whitespace-pre-line text-pretty break-words text-sm text-muted-foreground">{description}</p>
        )}
        {featureNames.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {featureNames.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Renews {annual ? 'monthly or annually' : 'monthly'}. Fans manage or cancel renewal in
          billing settings and confirm the effective date there.
        </p>
        {/* Preview only: non-interactive stand-in for the join button. */}
        <Button
          type="button"
          aria-disabled="true"
          tabIndex={-1}
          className="pointer-events-none mt-4 w-full"
        >
          Join {curatorName}
        </Button>
        <div aria-hidden className="mt-4 flex justify-center gap-0.5 border-t border-dashed border-border pt-3">
          {Array.from({ length: 24 }, (_, index) => (
            <span key={index} className={index % 2 === 0 ? 'h-4 w-px bg-foreground/60' : 'h-4 w-px'} />
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {frozen
            ? 'Fans join from your public page'
            : 'Fan prices are set by the pricing policy in effect when you publish'}
        </p>
      </div>
    </div>
  );
}

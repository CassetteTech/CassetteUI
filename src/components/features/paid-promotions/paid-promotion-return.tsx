'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  RefreshCw,
  TimerOff,
  Undo2,
} from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { PaidPromotionSupportContact } from '@/components/features/paid-promotions/paid-promotion-support';
import { PageLoader } from '@/components/ui/page-loader';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/use-auth';
import { usePaidPromotionCampaign } from '@/hooks/use-paid-promotion-campaign';
import { captureClientEvent } from '@/lib/analytics/client';
import { apiService } from '@/services/api';
import {
  formatPaidPromotionMinorAmount,
  getPaidPromotionReturnState,
  hasKnownPaidPromotionCheckoutTotals,
  isPaidPromotionCampaignId,
  type PaidPromotionReturnState,
} from '@/services/paid-promotion-lifecycle';
import { getPaidPromotionStatusPresentation } from '@/services/paid-promotion-status-presentation';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type ReturnStatePresentation = {
  title: string;
  description: string;
  icon: typeof Clock3;
  iconClassName: string;
};

const RETURN_STATE_PRESENTATIONS: Record<PaidPromotionReturnState, ReturnStatePresentation> = {
  not_started: {
    title: 'Checkout not started',
    description:
      'This campaign has no payment attempt yet. Start secure checkout to pay for your paid promotion.',
    icon: Clock3,
    iconClassName: 'text-info-text',
  },
  pending: {
    title: 'Waiting for payment confirmation',
    description:
      'Your payment has not been confirmed yet. If you just completed checkout, this page updates automatically within a few moments.',
    icon: Clock3,
    iconClassName: 'text-warning-text',
  },
  processing: {
    title: 'Payment is processing',
    description:
      'Your payment is being processed. This page updates automatically once the outcome is confirmed.',
    icon: RefreshCw,
    iconClassName: 'text-info-text',
  },
  paid: {
    title: 'Payment received',
    description:
      'Your payment is confirmed. Your paid-promotion campaign is now ready for Cassette review.',
    icon: CheckCircle2,
    iconClassName: 'text-success-text',
  },
  failed: {
    title: 'Payment was not completed',
    description:
      'The payment did not go through. Your campaign is still saved, and you can start a new checkout attempt.',
    icon: CircleAlert,
    iconClassName: 'text-destructive',
  },
  expired: {
    title: 'Checkout expired',
    description:
      'This checkout expired before payment completed. Your campaign is still saved, and you can start a new checkout attempt.',
    icon: TimerOff,
    iconClassName: 'text-warning-text',
  },
  refunded: {
    title: 'Payment refunded',
    description:
      'Some or all of this campaign’s payment has been refunded. The amounts below are the latest totals confirmed by Cassette.',
    icon: Undo2,
    iconClassName: 'text-warning-text',
  },
  disputed: {
    title: 'Payment disputed',
    description:
      'A dispute or chargeback is in progress on this campaign’s payment, and delivery is paused while your card issuer resolves it. The amounts below are the latest totals confirmed by Cassette.',
    icon: CircleAlert,
    iconClassName: 'text-warning-text',
  },
  unavailable: {
    title: 'Payment status unavailable',
    description:
      'Cassette could not read a recognized payment status for this campaign. Refresh the page or contact support if this continues.',
    icon: CircleAlert,
    iconClassName: 'text-destructive',
  },
};

// Shown when the visitor arrived through Stripe's cancel URL and no payment
// outcome has been confirmed — leaving checkout must never read as a payment
// that is still pending.
const CANCELED_CHECKOUT_PRESENTATION: ReturnStatePresentation = {
  title: 'Checkout not completed',
  description:
    'You left checkout before paying. Your campaign is saved — return to secure checkout whenever you are ready.',
  icon: Undo2,
  iconClassName: 'text-info-text',
};

interface PaidPromotionReturnProps {
  campaignId: string;
}

export function PaidPromotionReturn({ campaignId }: PaidPromotionReturnProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cameFromCancelUrl = searchParams.get('checkout') === 'canceled';
  const { isAuthenticated, isLoading: authLoading } = useAuthState();
  const returnedTrackedRef = useRef(false);
  const validCampaignId = isPaidPromotionCampaignId(campaignId);
  const pollCampaignId = !authLoading && isAuthenticated && validCampaignId ? campaignId : null;
  const { campaign, error, isLoading, refresh } = usePaidPromotionCampaign(pollCampaignId);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnPath = `/promote/${encodeURIComponent(campaignId)}/return`;
      router.replace(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
    }
  }, [authLoading, campaignId, isAuthenticated, router]);

  useEffect(() => {
    if (
      !campaign ||
      returnedTrackedRef.current
    ) {
      return;
    }

    returnedTrackedRef.current = true;
    void captureClientEvent('paid_promotion_checkout_returned', {
      route: `/promote/${campaign.id}/return`,
      source_surface: 'paid_promotion',
      paid_promotion_campaign_id: campaign.id,
      is_authenticated: true,
    });
  }, [campaign]);

  const state = campaign ? getPaidPromotionReturnState(campaign) : null;
  // An arrival via Stripe's cancel URL with no confirmed payment outcome
  // shows the abandoned-checkout panel, never the waiting-for-payment one.
  const showCanceledCheckout =
    cameFromCancelUrl && (state === 'pending' || state === 'not_started');
  const presentation = showCanceledCheckout
    ? CANCELED_CHECKOUT_PRESENTATION
    : state
      ? RETURN_STATE_PRESENTATIONS[state]
      : null;
  const campaignStatusPresentation = campaign
    ? getPaidPromotionStatusPresentation(campaign)
    : null;
  const hasKnownCheckoutTotals = campaign
    ? hasKnownPaidPromotionCheckoutTotals(campaign)
    : false;

  const reopenCheckout = async () => {
    if (!campaign || isOpeningCheckout) return;

    setIsOpeningCheckout(true);
    setCheckoutError('');

    try {
      const checkout = await apiService.createPaidPromotionCheckoutSession(campaign.id);
      void captureClientEvent('paid_promotion_checkout_started', {
        route: `/promote/${campaign.id}/return`,
        source_surface: 'paid_promotion',
        paid_promotion_campaign_id: campaign.id,
        is_authenticated: true,
      });
      window.location.assign(checkout.checkoutUrl);
    } catch (caught) {
      setCheckoutError(getUserFacingApiErrorMessage(
        caught,
        'We could not start a new checkout attempt. Please try again.',
      ));
    } finally {
      setIsOpeningCheckout(false);
    }
  };

  if (authLoading) {
    return <PageLoader message="Loading campaign status…" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.3]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      <section
        aria-labelledby="paid-promotion-return-heading"
        className="relative w-full max-w-xl"
      >
        {/* Persistent escape hatch in every state, including errors. */}
        <BackButton route="/promote" label="Promotion home" className="mb-4" />

        <Card className="border-2 border-foreground shadow-flat-6">
          <CardHeader className="text-center">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground">
              Paid-promotion checkout
            </p>
            <h1
              id="paid-promotion-return-heading"
              className="font-atkinson text-2xl sm:text-3xl"
            >
              Campaign status
            </h1>
            <CardDescription>
              This page shows the payment status confirmed by Cassette. We wait for Stripe&apos;s confirmation before marking a payment complete.
            </CardDescription>
          </CardHeader>

          <CardContent aria-live="polite" aria-atomic="true">
            {!validCampaignId ? (
              <StatusMessage
                presentation={RETURN_STATE_PRESENTATIONS.unavailable}
                detail="This campaign link is invalid. Return to your promotion home and open the campaign again."
              />
            ) : isLoading && !campaign ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Spinner size="lg" variant="primary" />
                <p className="text-sm text-muted-foreground">Checking the latest confirmed status…</p>
              </div>
            ) : error ? (
              <div className="space-y-5">
                <StatusMessage
                  presentation={RETURN_STATE_PRESENTATIONS.unavailable}
                  detail={getUserFacingApiErrorMessage(
                    error,
                    'We could not load this paid-promotion campaign.',
                  )}
                />
                <Button type="button" variant="brutalist-outline" onClick={refresh} className="w-full">
                  <RefreshCw /> Refresh status
                </Button>
              </div>
            ) : campaign && presentation && state ? (
              <div className="space-y-6">
                <StatusMessage presentation={presentation} />

                {campaignStatusPresentation && (
                  <div
                    data-testid="paid-promotion-campaign-status"
                    className="rounded-lg border border-border p-4"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      Campaign status
                    </p>
                    <p className="mt-1 font-atkinson font-bold text-foreground">
                      {campaignStatusPresentation.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {campaignStatusPresentation.explanation}
                    </p>
                    {campaign.status === 'rejected' && campaign.rejectionReason && (
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        Reviewer note: {campaign.rejectionReason}
                      </p>
                    )}
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {campaignStatusPresentation.nextAction}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                    Campaign
                  </span>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">{campaign.id}</p>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border p-4 text-sm">
                  <div data-testid="paid-promotion-campaign-weeks">
                    <dt className="text-xs text-muted-foreground">Run length</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {campaign.weeks} {campaign.weeks === 1 ? 'week' : 'weeks'} ·{' '}
                      {formatPaidPromotionMinorAmount(campaign.weeklyAmountMinor, campaign.currency)}/week
                    </dd>
                  </div>
                  <MoneyRow
                    label="Quote / subtotal"
                    value={formatPaidPromotionMinorAmount(campaign.amountMinor, campaign.currency)}
                  />
                  <MoneyRow
                    label="Discount"
                    value={formatPaidPromotionMinorAmount(campaign.discountAmountMinor, campaign.currency)}
                  />
                  <MoneyRow
                    label="Tax"
                    value={formatPaidPromotionMinorAmount(campaign.taxAmountMinor, campaign.currency)}
                  />
                  <MoneyRow
                    label="Final total"
                    value={formatPaidPromotionMinorAmount(campaign.finalTotalMinor, campaign.currency)}
                  />
                  <MoneyRow
                    label="Refunded amount"
                    value={formatPaidPromotionMinorAmount(campaign.amountRefundedMinor, campaign.currency)}
                  />
                  <MoneyRow
                    label="Refundable remainder"
                    value={formatPaidPromotionMinorAmount(campaign.refundableRemainderMinor, campaign.currency)}
                  />
                </dl>

                {!hasKnownCheckoutTotals && (
                  <p
                    role={campaign.paymentStatus === 'paid' ? 'alert' : 'status'}
                    className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    Final checkout totals are not available yet. Cassette will not treat the campaign subtotal as the amount you paid.
                  </p>
                )}

                {campaign.finalTotalMinor === 0 && (
                  <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    This zero-total campaign has no refundable charge.
                  </p>
                )}

                {(state === 'not_started' || state === 'pending' || state === 'failed' || state === 'expired') && (
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="brutalist"
                      onClick={() => void reopenCheckout()}
                      disabled={isOpeningCheckout}
                      data-testid="paid-promotion-reopen-checkout"
                      className="w-full bg-foreground text-background hover:bg-foreground/90"
                    >
                      {isOpeningCheckout ? <Spinner size="sm" /> : <ExternalLink />}
                      {showCanceledCheckout || state === 'pending'
                        ? 'Return to secure checkout'
                        : state === 'not_started'
                          ? 'Start secure checkout'
                          : 'Try checkout again'}
                    </Button>
                    {checkoutError && (
                      <p role="alert" className="text-center text-sm text-destructive">
                        {checkoutError}
                      </p>
                    )}
                  </div>
                )}

                {(state === 'paid' || state === 'refunded' || state === 'disputed') && (
                  <Button asChild variant="brutalist-outline" className="w-full">
                    <Link href={`/promote/${encodeURIComponent(campaign.id)}`}>
                      View campaign details
                    </Link>
                  </Button>
                )}

                {state === 'unavailable' && (
                  <Button type="button" variant="brutalist-outline" onClick={refresh} className="w-full">
                    <RefreshCw /> Refresh status
                  </Button>
                )}
              </div>
            ) : null}

            <PaidPromotionSupportContact className="mt-6 border-t border-border pt-4" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatusMessage({
  presentation,
  detail,
}: {
  presentation: ReturnStatePresentation;
  detail?: string;
}) {
  const Icon = presentation.icon;

  return (
    <div data-testid="paid-promotion-return-state" className="flex flex-col items-center py-4 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full border-2 border-current bg-card">
        <Icon className={`size-8 ${presentation.iconClassName}`} aria-hidden />
      </div>
      <h2 className="font-atkinson text-2xl font-bold text-foreground">{presentation.title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        {detail || presentation.description}
      </p>
    </div>
  );
}

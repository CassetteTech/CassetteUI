'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  RefreshCw,
  TimerOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/use-auth';
import { usePaidPromotionCampaign } from '@/hooks/use-paid-promotion-campaign';
import { captureClientEvent } from '@/lib/analytics/client';
import { apiService } from '@/services/api';
import {
  getPaidPromotionReturnState,
  isPaidPromotionCampaignId,
  type PaidPromotionReturnState,
} from '@/services/paid-promotion-lifecycle';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type ReturnStatePresentation = {
  title: string;
  description: string;
  icon: typeof Clock3;
  iconClassName: string;
};

const RETURN_STATE_PRESENTATIONS: Record<PaidPromotionReturnState, ReturnStatePresentation> = {
  pending: {
    title: 'Waiting for payment confirmation',
    description:
      'Stripe has not confirmed payment yet. If you just completed checkout, keep this page open while Cassette waits for the webhook.',
    icon: Clock3,
    iconClassName: 'text-warning-text',
  },
  processing: {
    title: 'Payment is processing',
    description:
      'Stripe has started processing your payment. Cassette will update this page after the signed webhook confirms the outcome.',
    icon: RefreshCw,
    iconClassName: 'text-info-text',
  },
  paid: {
    title: 'Payment received',
    description:
      'Stripe confirmed payment by webhook. Your paid-promotion campaign is now ready for Cassette review.',
    icon: CheckCircle2,
    iconClassName: 'text-success-text',
  },
  failed: {
    title: 'Payment was not completed',
    description:
      'Stripe reported that the payment failed. Your campaign is still saved, and you can start a new checkout attempt.',
    icon: CircleAlert,
    iconClassName: 'text-destructive',
  },
  expired: {
    title: 'Checkout expired',
    description:
      'Stripe reported that this Checkout Session expired. Your campaign is still saved, and you can start a new checkout attempt.',
    icon: TimerOff,
    iconClassName: 'text-warning-text',
  },
  unavailable: {
    title: 'Payment status unavailable',
    description:
      'Cassette did not receive a recognized persisted payment status. Refresh the page or contact support if this continues.',
    icon: CircleAlert,
    iconClassName: 'text-destructive',
  },
};

interface PaidPromotionReturnProps {
  campaignId: string;
}

export function PaidPromotionReturn({ campaignId }: PaidPromotionReturnProps) {
  const router = useRouter();
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
  const presentation = state ? RETURN_STATE_PRESENTATIONS[state] : null;

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
        <Card className="border-2 border-foreground shadow-flat-6">
          <CardHeader className="text-center">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground">
              Paid-promotion checkout
            </p>
            <CardTitle
              id="paid-promotion-return-heading"
              className="font-atkinson text-2xl sm:text-3xl"
            >
              Campaign status
            </CardTitle>
            <CardDescription>
              This page reads Cassette&apos;s persisted state. Returning from Stripe does not mark a payment complete.
            </CardDescription>
          </CardHeader>

          <CardContent aria-live="polite" aria-atomic="true">
            {!validCampaignId ? (
              <StatusMessage
                presentation={RETURN_STATE_PRESENTATIONS.unavailable}
                detail="The paid-promotion campaign id in this URL is invalid."
              />
            ) : isLoading && !campaign ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Spinner size="lg" variant="primary" />
                <p className="text-sm text-muted-foreground">Reading the latest persisted status…</p>
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

                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                    Campaign
                  </span>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">{campaign.id}</p>
                </div>

                {(state === 'pending' || state === 'failed' || state === 'expired') && (
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
                      {state === 'pending' ? 'Return to secure checkout' : 'Try checkout again'}
                    </Button>
                    {checkoutError && (
                      <p role="alert" className="text-center text-sm text-destructive">
                        {checkoutError}
                      </p>
                    )}
                  </div>
                )}

                {state === 'paid' && (
                  <Button asChild variant="brutalist-outline" className="w-full">
                    <Link href="/">Back to Cassette</Link>
                  </Button>
                )}

                {state === 'unavailable' && (
                  <Button type="button" variant="brutalist-outline" onClick={refresh} className="w-full">
                    <RefreshCw /> Refresh status
                  </Button>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
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
      <h1 className="font-atkinson text-2xl font-bold text-foreground">{presentation.title}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        {detail || presentation.description}
      </p>
    </div>
  );
}

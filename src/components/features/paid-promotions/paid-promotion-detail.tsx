'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  MessageSquareMore,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { PaidPromotionSupportContact } from '@/components/features/paid-promotions/paid-promotion-support';
import { Eyebrow, TapeDeckBand } from '@/components/features/paid-promotions/promote-tape-deck';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthState } from '@/hooks/use-auth';
import { usePaidPromotionCampaign } from '@/hooks/use-paid-promotion-campaign';
import { apiService } from '@/services/api';
import {
  formatPaidPromotionMinorAmount,
  isPaidPromotionCampaignId,
} from '@/services/paid-promotion-lifecycle';
import {
  getPaidPromotionElementTypeLabel,
  getPaidPromotionPaymentStatusLabel,
  getPaidPromotionStatusPresentation,
} from '@/services/paid-promotion-status-presentation';
import type {
  PaidPromotionCampaign,
  PaidPromotionCampaignDeliverable,
  PaidPromotionDeliverableChannel,
} from '@/types';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const CHANNEL_LABELS: Record<PaidPromotionDeliverableChannel, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  reddit: 'Reddit',
  curator_playlist_placement: 'Curator playlist placement',
  in_playlist_track_suggestion: 'In-playlist track suggestion',
  explore_boost: 'Explore boost',
  other: 'Other',
};

interface PaidPromotionDetailProps {
  campaignId: string;
}

export function PaidPromotionDetail({ campaignId }: PaidPromotionDetailProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthState();
  const validCampaignId = isPaidPromotionCampaignId(campaignId);
  const requestedCampaignId = !authLoading && isAuthenticated && validCampaignId
    ? campaignId
    : null;
  const { campaign, error, isLoading, refresh } = usePaidPromotionCampaign(requestedCampaignId);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnPath = `/promote/${encodeURIComponent(campaignId)}`;
      router.replace(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
    }
  }, [authLoading, campaignId, isAuthenticated, router]);

  if (authLoading) return <PageLoader message="Loading campaign details…" />;
  if (!isAuthenticated) return null;

  if (!validCampaignId) {
    return (
      <DetailFailure
        message="The paid-promotion campaign id in this URL is invalid."
      />
    );
  }

  if (isLoading && !campaign) return <PageLoader message="Loading campaign details…" />;

  if (error || !campaign) {
    return (
      <DetailFailure
        message={getUserFacingApiErrorMessage(
          error,
          'We could not load this paid-promotion campaign.',
        )}
        onRetry={refresh}
      />
    );
  }

  return <CampaignDetail campaign={campaign} onRefresh={refresh} />;
}

function CampaignDetail({
  campaign,
  onRefresh,
}: {
  campaign: PaidPromotionCampaign;
  onRefresh: () => void;
}) {
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const status = getPaidPromotionStatusPresentation(campaign);
  const completed = campaign.status === 'delivered' || campaign.status === 'completed';
  const canCancel = campaign.status === 'pending_payment' &&
    !campaign.paymentStatus?.match(
      /^(processing|paid|refund_pending|partially_refunded|refunded|disputed|charged_back)$/,
    );
  const deliverySummary = useMemo(() => summarizeDeliverables(campaign.deliverables), [campaign]);
  const deliveredWindow = campaign.deliverables.length > 0
    ? {
        start: campaign.deliverables[0].publishedAtUtc,
        end: campaign.deliverables[campaign.deliverables.length - 1].publishedAtUtc,
      }
    : null;

  const cancelCampaign = async () => {
    setIsCanceling(true);
    setCancelError(null);
    try {
      await apiService.cancelPaidPromotionCampaign(campaign.id);
      onRefresh();
    } catch (caught) {
      setCancelError(getUserFacingApiErrorMessage(
        caught,
        'We could not cancel this campaign. Please try again.',
      ));
    } finally {
      setIsCanceling(false);
    }
  };

  const respondToReview = async () => {
    const normalizedResponse = responseText.trim();
    if (!normalizedResponse) {
      setResponseError('Enter a response before sending it to the review team.');
      return;
    }

    setIsResponding(true);
    setResponseError(null);
    try {
      await apiService.respondToPaidPromotionNeedsInfo(campaign.id, normalizedResponse);
      setResponseText('');
      onRefresh();
    } catch (caught) {
      setResponseError(getUserFacingApiErrorMessage(
        caught,
        'We could not send your response. Please try again.',
      ));
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <TapeDeckBand variant="band">
        <Link
          href="/promote"
          className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] opacity-80 hover:opacity-100"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Promotion home
        </Link>
        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Eyebrow>{getPaidPromotionElementTypeLabel(campaign.elementType)} campaign</Eyebrow>
            <h1 className="mt-3 font-atkinson text-3xl font-bold tracking-tight sm:text-4xl">
              Campaign details
            </h1>
            <p className="mt-2 break-all font-mono text-[11px] uppercase tracking-[0.16em] opacity-80">
              {campaign.id}
            </p>
          </div>
          <div className="shrink-0 border-2 border-current px-4 py-3 md:max-w-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-75">
              Current status
            </p>
            <p className="mt-1 font-atkinson text-xl font-bold">{status.label}</p>
          </div>
        </div>
      </TapeDeckBand>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-10">
        <div className="min-w-0 space-y-8">
          {campaign.needsInfo && (
            <section
              aria-labelledby="campaign-review-request-heading"
              className="border-2 border-foreground bg-card shadow-flat-4"
            >
              <div className="border-b-2 border-foreground bg-primary/10 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <MessageSquareMore className="size-5 text-primary" aria-hidden="true" />
                  <h2 id="campaign-review-request-heading" className="font-atkinson text-2xl font-bold">
                    {campaign.status === 'needs_info' ? 'Review team needs your reply' : 'Latest review conversation'}
                  </h2>
                </div>
              </div>
              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Cassette review request
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {campaign.needsInfo.requestMessage}
                  </p>
                </div>

                {campaign.needsInfo.customerResponse ? (
                  <div className="border-t border-border pt-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Your response
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {campaign.needsInfo.customerResponse}
                    </p>
                  </div>
                ) : campaign.status === 'needs_info' ? (
                  <form
                    className="grid gap-3 border-t border-border pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void respondToReview();
                    }}
                  >
                    <Label htmlFor="paid-promotion-review-response">Your response</Label>
                    <Textarea
                      id="paid-promotion-review-response"
                      required
                      maxLength={2000}
                      rows={6}
                      disabled={isResponding}
                      value={responseText}
                      onChange={(event) => setResponseText(event.target.value)}
                      placeholder="Share the information the review team requested"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {responseText.length.toLocaleString()} / 2,000
                      </span>
                      <Button type="submit" variant="brutalist" disabled={isResponding || !responseText.trim()}>
                        {isResponding ? 'Sending response…' : 'Send response'}
                      </Button>
                    </div>
                    {responseError && (
                      <p role="alert" className="text-sm leading-6 text-destructive">{responseError}</p>
                    )}
                  </form>
                ) : null}
              </div>
            </section>
          )}

          <section aria-labelledby="campaign-overview-heading" className="border-2 border-foreground bg-card shadow-flat-4">
            <div className="border-b-2 border-foreground px-5 py-4 sm:px-6">
              <h2 id="campaign-overview-heading" className="font-atkinson text-2xl font-bold">
                Campaign overview
              </h2>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  What happens next
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{status.explanation}</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{status.nextAction}</p>
                {campaign.status === 'rejected' && campaign.rejectionReason && (
                  <p className="mt-3 border-l-2 border-destructive pl-3 text-sm leading-6 text-foreground">
                    Reviewer note: {campaign.rejectionReason}
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Your brief
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{campaign.brief}</p>
              </div>

              <dl className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
                <SummaryItem label="Subject" value={`${getPaidPromotionElementTypeLabel(campaign.elementType)} · ${campaign.elementId}`} />
                <SummaryItem
                  label="Run length"
                  value={`${campaign.weeks} ${campaign.weeks === 1 ? 'week' : 'weeks'} · ${formatPaidPromotionMinorAmount(campaign.weeklyAmountMinor, campaign.currency)}/week`}
                />
                <SummaryItem
                  label="Requested window"
                  value={formatRequestedWindow(campaign)}
                  icon={CalendarRange}
                />
                <SummaryItem
                  label="Last updated"
                  value={DATE_TIME_FORMATTER.format(new Date(campaign.updatedAtUtc))}
                  icon={Clock3}
                />
              </dl>
            </div>
          </section>

          <section aria-labelledby="campaign-deliverables-heading" className="border-2 border-foreground bg-card">
            <div className="border-b-2 border-foreground px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="campaign-deliverables-heading" className="font-atkinson text-2xl font-bold">
                  Published placements
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {campaign.deliverables.length} verified result{campaign.deliverables.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {campaign.deliverables.length === 0 ? (
              <div className="p-6">
                <p className="font-atkinson text-lg font-bold text-foreground">
                  No published placements yet
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Working evidence links appear here after Cassette records a published placement for your campaign.
                </p>
              </div>
            ) : (
              <div>
                {completed && (
                  <div data-testid="paid-promotion-delivery-summary" className="grid gap-4 border-b border-border bg-muted/30 p-5 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Results by channel
                      </p>
                      <p className="mt-2 text-sm text-foreground">{deliverySummary}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Delivery window covered
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {deliveredWindow ? formatDeliveredWindow(deliveredWindow) : 'Not available'}
                      </p>
                    </div>
                  </div>
                )}
                <ol className="divide-y divide-border">
                  {campaign.deliverables.map((deliverable, index) => (
                    <DeliverableRow key={`${deliverable.evidenceUrl}-${index}`} deliverable={deliverable} />
                  ))}
                </ol>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section aria-labelledby="campaign-payment-heading" className="border-2 border-foreground bg-card p-5">
            <CreditCard className="size-6 text-primary" aria-hidden="true" />
            <h2 id="campaign-payment-heading" className="mt-3 font-atkinson text-xl font-bold">
              Payment & receipt
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Server-confirmed payment information for this campaign.
            </p>
            <dl className="mt-5 space-y-4 border-t border-border pt-4">
              <SummaryItem
                label="Payment status"
                value={campaign.paymentStatus
                  ? getPaidPromotionPaymentStatusLabel(campaign.paymentStatus)
                  : 'Checkout not started'}
              />
              <SummaryItem
                label="Quote / subtotal"
                value={formatPaidPromotionMinorAmount(campaign.amountMinor, campaign.currency)}
              />
              <SummaryItem
                label="Final total"
                value={formatOptionalMoney(campaign.finalTotalMinor, campaign.currency)}
              />
              <SummaryItem
                label="Refunded"
                value={formatOptionalMoney(campaign.amountRefundedMinor, campaign.currency)}
              />
            </dl>
            <Button asChild variant="brutalist-outline" className="mt-5 w-full">
              <Link href={`/promote/${encodeURIComponent(campaign.id)}/return`}>
                View checkout details
              </Link>
            </Button>
            {canCancel && (
              <div className="mt-4 border-t border-border pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full"
                      disabled={isCanceling}
                    >
                      {isCanceling ? 'Canceling campaign...' : 'Cancel unpaid campaign'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this campaign?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Any open checkout session will expire. This campaign cannot be reopened,
                        and no payment will be taken.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep campaign</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => void cancelCampaign()}
                      >
                        Cancel campaign
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {cancelError && (
                  <p role="alert" className="mt-3 text-sm leading-6 text-destructive">
                    {cancelError}
                  </p>
                )}
              </div>
            )}
          </section>

          <PaidPromotionSupportContact className="justify-start border-t border-border pt-5" />
        </aside>
      </main>
    </div>
  );
}

function DeliverableRow({ deliverable }: { deliverable: PaidPromotionCampaignDeliverable }) {
  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Radio className="size-4 text-primary" aria-hidden="true" />
          <p className="font-atkinson text-lg font-bold text-foreground">
            {channelLabel(deliverable.channel)}
          </p>
          {deliverable.status === 'verified' && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-success-text">
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> Verified
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Published {DATE_TIME_FORMATTER.format(new Date(deliverable.publishedAtUtc))}
        </p>
      </div>
      <Button asChild variant="brutalist-outline" className="w-full shrink-0 sm:w-auto">
        <a href={deliverable.evidenceUrl} target="_blank" rel="noreferrer noopener">
          View evidence <ExternalLink aria-hidden="true" />
        </a>
      </Button>
    </li>
  );
}

function DetailFailure({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="w-full max-w-lg border-2 border-foreground bg-card p-6 shadow-flat-4">
        <h1 className="font-atkinson text-2xl font-bold text-foreground">Campaign unavailable</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {onRetry && (
            <Button type="button" variant="brutalist" onClick={onRetry}>
              <RefreshCw aria-hidden="true" /> Try again
            </Button>
          )}
          <Button asChild variant="brutalist-outline">
            <Link href="/promote">Promotion home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function SummaryItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof CalendarRange;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {Icon && <Icon className="size-3.5" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function summarizeDeliverables(deliverables: PaidPromotionCampaignDeliverable[]): string {
  const counts = new Map<string, number>();
  for (const deliverable of deliverables) {
    const label = channelLabel(deliverable.channel);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => `${label} ${count}`)
    .join(' · ');
}

function channelLabel(channel: PaidPromotionDeliverableChannel): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

function formatRequestedWindow(campaign: PaidPromotionCampaign): string {
  if (!campaign.requestedWindowStart && !campaign.requestedWindowEnd) return 'No preference provided';
  if (campaign.requestedWindowStart && campaign.requestedWindowEnd) {
    return `${DATE_FORMATTER.format(new Date(`${campaign.requestedWindowStart}T00:00:00`))} – ${DATE_FORMATTER.format(new Date(`${campaign.requestedWindowEnd}T00:00:00`))}`;
  }
  const date = campaign.requestedWindowStart ?? campaign.requestedWindowEnd;
  return date ? DATE_FORMATTER.format(new Date(`${date}T00:00:00`)) : 'No preference provided';
}

function formatDeliveredWindow(window: { start: string; end: string }): string {
  const start = DATE_FORMATTER.format(new Date(window.start));
  const end = DATE_FORMATTER.format(new Date(window.end));
  return start === end ? start : `${start} – ${end}`;
}

function formatOptionalMoney(amountMinor: number | null, currency: string): string {
  return amountMinor === null
    ? 'Pending confirmation'
    : formatPaidPromotionMinorAmount(amountMinor, currency);
}

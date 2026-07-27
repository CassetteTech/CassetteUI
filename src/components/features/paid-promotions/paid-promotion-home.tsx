'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Music2, RefreshCw } from 'lucide-react';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { Button } from '@/components/ui/button';
import { PaidPromotionSupportContact } from '@/components/features/paid-promotions/paid-promotion-support';
import { PromoteLanding } from '@/components/features/paid-promotions/promote-landing';
import {
  Eyebrow,
  TAPE_DECK_CTA_CLASS,
  TapeDeckBand,
} from '@/components/features/paid-promotions/promote-tape-deck';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import {
  getPaidPromotionPaymentStatusLabel,
  getPaidPromotionStatusLabel,
  getPaidPromotionStatusPresentation,
} from '@/services/paid-promotion-status-presentation';
import { paidPromotionSubjectsService } from '@/services/paid-promotion-subjects';
import type { PaidPromotionCampaign, PaidPromotionSubject } from '@/types';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type ResourceState<T> =
  | { phase: 'loading' }
  | { phase: 'ready'; data: T }
  | { phase: 'error'; message: string }
  | { phase: 'unknown'; message: string };

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Campaigns are grouped by whose move it is, so the first thing on screen is
 * whatever is actually waiting on the promoter. Statuses this build does not
 * recognize (a newer Bridge deploy) land in the in-flight group rather than
 * being filed away as closed — they still render their own
 * "status unavailable" presentation, but they stay above the archive.
 */
const CAMPAIGN_GROUPS = [
  {
    key: 'waiting-on-you',
    title: 'Waiting on you',
    caption: 'These campaigns cannot move until you finish something.',
    statuses: ['draft', 'pending_payment'],
  },
  {
    key: 'with-cassette',
    title: 'With Cassette',
    caption: 'Reviewed, scheduled, or being delivered by us right now.',
    statuses: ['in_review', 'scheduled', 'fulfilling', 'on_hold'],
  },
  {
    key: 'closed',
    title: 'Closed',
    caption: 'Finished, canceled, or refunded campaigns.',
    statuses: ['delivered', 'completed', 'expired', 'canceled', 'rejected', 'refunded_closed'],
  },
] as const;

const CLOSED_STATUSES = new Set<string>(CAMPAIGN_GROUPS[2].statuses);
const WAITING_STATUSES = new Set<string>(CAMPAIGN_GROUPS[0].statuses);

function groupKeyForStatus(status: string): (typeof CAMPAIGN_GROUPS)[number]['key'] {
  if (WAITING_STATUSES.has(status)) return 'waiting-on-you';
  if (CLOSED_STATUSES.has(status)) return 'closed';
  return 'with-cassette';
}

function resourceFailure(error: unknown, fallback: string): ResourceState<never> {
  if (
    error instanceof Error &&
    (error.message.startsWith('Invalid paid-promotion server response:') ||
      error.message.startsWith('Invalid paid-promotion subject response:'))
  ) {
    return {
      phase: 'unknown',
      message: 'Cassette returned unrecognized paid-promotion data. No campaign details were inferred.',
    };
  }

  return {
    phase: 'error',
    message: getUserFacingApiErrorMessage(error, fallback),
  };
}

/**
 * Status-first campaign card: the lifecycle state is the loudest thing on it,
 * the artwork is a framed tape-window rather than a list thumbnail, and the
 * copy underneath is the presentation layer's customer language verbatim.
 * `featured` promotes the single most urgent campaign to the focal brutalist
 * treatment; everything else stays quiet chrome.
 */
function CampaignCard({
  campaign,
  subject,
  featured = false,
}: {
  campaign: PaidPromotionCampaign;
  subject?: PaidPromotionSubject;
  featured?: boolean;
}) {
  const statusPresentation = getPaidPromotionStatusPresentation(campaign);
  const awaitingPromoter = statusPresentation.actor === 'you';

  return (
    <li className={cn(featured && 'xl:col-span-2')}>
      <article
        className={cn(
          'flex h-full min-w-0 flex-col bg-card',
          featured
            ? 'border-2 border-foreground shadow-flat-4'
            : 'border border-border',
        )}
      >
        {/* Status bar — the headline of the card. */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5',
            featured ? 'border-b-2 border-foreground' : 'border-border',
          )}
        >
          <span
            aria-hidden="true"
            className={cn('size-2 shrink-0', awaitingPromoter ? 'bg-primary' : 'bg-muted-foreground')}
          />
          <p
            className={cn(
              'font-mono text-[11px] font-bold uppercase tracking-[0.2em]',
              awaitingPromoter ? 'text-primary' : 'text-foreground',
            )}
          >
            {statusPresentation.label}
          </p>
          <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {campaign.paymentStatus
              ? `Payment: ${getPaidPromotionPaymentStatusLabel(campaign.paymentStatus)}`
              : 'Payment status not available'}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:gap-5">
          {/* Artwork framed like a cassette window. */}
          <div
            className={cn(
              // `self-start` keeps the square from being stretched by the
              // row's default `align-items: stretch`.
              'relative aspect-square w-24 shrink-0 self-start overflow-hidden border-2 border-foreground sm:w-28',
              featured && 'sm:w-36',
            )}
          >
            <ArtworkImage
              src={subject?.coverArtUrl}
              alt={subject ? `Artwork for ${subject.trackTitle}` : 'Track artwork unavailable'}
              fill
              sizes="(min-width: 640px) 144px, 96px"
              className="object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <h3
              className={cn(
                'truncate font-atkinson font-bold tracking-tight text-foreground',
                featured ? 'text-2xl' : 'text-lg',
              )}
            >
              {subject?.trackTitle ?? 'Track details unavailable'}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {subject?.artists.length ? subject.artists.join(', ') : 'Artist unavailable'}
            </p>
            {!subject && (
              <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                {campaign.trackId}
              </p>
            )}

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {statusPresentation.explanation}
            </p>
            {campaign.status === 'rejected' && campaign.rejectionReason && (
              <p className="mt-1 text-sm leading-6 text-foreground">
                Reviewer note: {campaign.rejectionReason}
              </p>
            )}
            <p className="mt-2 flex gap-2 text-sm leading-6 text-foreground">
              <span aria-hidden="true" className="text-primary">
                →
              </span>
              {statusPresentation.nextAction}
            </p>

            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:mt-auto sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Updated{' '}
                <time dateTime={campaign.updatedAtUtc} className="text-foreground">
                  {DATE_FORMATTER.format(new Date(campaign.updatedAtUtc))}
                </time>
              </p>
              <Button
                asChild
                variant={featured ? 'brutalist' : 'brutalist-outline'}
                className="w-full sm:w-auto"
              >
                <Link
                  href={`/promote/${encodeURIComponent(campaign.id)}/return`}
                  aria-label={`View campaign ${campaign.id} for ${subject?.trackTitle ?? campaign.trackId}`}
                  data-testid={`paid-promotion-campaign-link-${campaign.id}`}
                >
                  View campaign <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

function SubjectCard({ subject }: { subject: PaidPromotionSubject }) {
  return (
    <li className="flex min-w-0 gap-3 border border-border bg-card p-3">
      <div className="relative size-14 shrink-0 overflow-hidden border border-border">
        <ArtworkImage
          src={subject.coverArtUrl}
          alt={`Artwork for ${subject.trackTitle}`}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-atkinson font-bold text-foreground">{subject.trackTitle}</p>
        <p className="truncate text-sm text-muted-foreground">
          {subject.artists.length > 0 ? subject.artists.join(', ') : 'Artist unavailable'}
        </p>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
          {subject.campaignCount.toLocaleString()}{' '}
          {subject.campaignCount === 1 ? 'campaign' : 'campaigns'}
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          {Object.entries(subject.campaignStatusCounts).map(([status, count]) => (
            <li
              key={status}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              {getPaidPromotionStatusLabel(status)} · {count}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function ResourceFailure({
  kind,
  message,
  onRetry,
}: {
  kind: 'campaigns' | 'subjects';
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="border-l-2 border-destructive bg-destructive/10 p-4">
      <p className="font-atkinson font-bold text-destructive">
        {kind === 'campaigns' ? 'Campaigns could not be shown.' : 'Promoted tracks could not be shown.'}
      </p>
      <p className="mt-1 text-sm text-destructive">{message}</p>
      <Button type="button" variant="brutalist-outline" className="mt-4" onClick={onRetry}>
        <RefreshCw aria-hidden="true" /> Try again
      </Button>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <output className="flex min-h-36 items-center justify-center gap-3 border border-dashed border-border p-6 text-sm text-muted-foreground">
      <Spinner size="sm" /> {label}
    </output>
  );
}

export function PaidPromotionHome() {
  const { isAuthenticated, isLoading: authLoading } = useAuthState();
  const [campaigns, setCampaigns] = useState<ResourceState<PaidPromotionCampaign[]>>({
    phase: 'loading',
  });
  const [subjects, setSubjects] = useState<ResourceState<PaidPromotionSubject[]>>({
    phase: 'loading',
  });
  // Tracks whether the first campaign fetch has settled, so a later manual
  // refresh (which re-enters the loading phase) never bounces the workspace
  // back to the marketing landing.
  const [hasLoadedCampaigns, setHasLoadedCampaigns] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setCampaigns({ phase: 'loading' });
    setSubjects({ phase: 'loading' });
    setAnnouncement('Loading your paid-promotion campaigns and promoted tracks.');

    const [campaignResult, subjectResult] = await Promise.allSettled([
      apiService.getPaidPromotionCampaigns(),
      paidPromotionSubjectsService.listOwned(),
    ]);
    if (currentRequest !== requestId.current) return;

    const nextCampaigns: ResourceState<PaidPromotionCampaign[]> = campaignResult.status === 'fulfilled'
      ? { phase: 'ready', data: campaignResult.value }
      : resourceFailure(
          campaignResult.reason,
          'We could not load your paid-promotion campaigns. Please try again.',
        );
    const nextSubjects: ResourceState<PaidPromotionSubject[]> = subjectResult.status === 'fulfilled'
      ? { phase: 'ready', data: subjectResult.value }
      : resourceFailure(
          subjectResult.reason,
          'We could not load your promoted tracks. Please try again.',
        );

    setCampaigns(nextCampaigns);
    setSubjects(nextSubjects);
    setHasLoadedCampaigns(true);
    setAnnouncement(
      campaignResult.status === 'fulfilled' && subjectResult.status === 'fulfilled'
        ? `${campaignResult.value.length} campaigns and ${subjectResult.value.length} promoted tracks loaded.`
        : 'Some paid-promotion information could not be loaded.',
    );
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [authLoading, isAuthenticated, load]);

  const subjectsByTrackId = useMemo(() => {
    if (subjects.phase !== 'ready') return new Map<string, PaidPromotionSubject>();
    return new Map(subjects.data.map((subject) => [subject.trackId, subject]));
  }, [subjects]);

  // Server order is preserved inside each group; only the grouping reorders.
  const groupedCampaigns = useMemo(() => {
    if (campaigns.phase !== 'ready') return [];
    return CAMPAIGN_GROUPS.map((group) => ({
      ...group,
      items: campaigns.data.filter((campaign) => groupKeyForStatus(campaign.status) === group.key),
    })).filter((group) => group.items.length > 0);
  }, [campaigns]);

  // The marketing landing is the default render (including during SSR and
  // auth resolution), so signed-out visitors and crawlers get full public
  // content with no auth redirect. The sign-in gate lives on the start-a-
  // campaign path instead. The workspace appears only for signed-in users
  // whose first campaign fetch settled with campaign history or an error
  // worth surfacing with a retry; users with no campaigns stay on the
  // landing in its signed-in continue state.
  if (authLoading || !isAuthenticated || !hasLoadedCampaigns) {
    return <PromoteLanding signedIn={!authLoading && isAuthenticated} />;
  }

  if (campaigns.phase === 'ready' && campaigns.data.length === 0) {
    return <PromoteLanding signedIn />;
  }

  const isRefreshing = campaigns.phase === 'loading' || subjects.phase === 'loading';
  const totalCampaigns = campaigns.phase === 'ready' ? campaigns.data.length : null;

  return (
    <div className="relative min-h-screen bg-background pb-16">
      {/* Slim variant of the landing hero, so both states of /promote read as
          one page rather than a marketing site bolted to a workspace. */}
      <TapeDeckBand variant="band">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Eyebrow>Direct paid promotion</Eyebrow>
            <h1 className="mt-3 font-atkinson text-3xl font-bold tracking-tight sm:text-4xl">
              Promotion home
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 opacity-85">
              {totalCampaigns === null
                ? 'Your campaigns and the tracks you have promoted.'
                : `${totalCampaigns} ${totalCampaigns === 1 ? 'campaign' : 'campaigns'} on your account, showing each one's latest server-confirmed status.`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link
              href="/promote/new"
              data-testid="paid-promotion-new-campaign"
              className={`${TAPE_DECK_CTA_CLASS} w-full sm:w-auto`}
            >
              Start a new campaign <ArrowRight aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={isRefreshing}
              className="inline-flex w-full items-center justify-center gap-2 self-stretch border-b-2 border-current pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] opacity-75 transition-opacity hover:opacity-100 disabled:opacity-40 sm:w-auto sm:self-end"
            >
              {isRefreshing ? <Spinner size="sm" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
              Refresh server status
            </button>
          </div>
        </div>
      </TapeDeckBand>

      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </output>

      <div className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 lg:px-10">
        <section aria-labelledby="your-campaigns-heading" className="min-w-0">
          <h2
            id="your-campaigns-heading"
            className="font-atkinson text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Your campaigns
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Grouped by whose move it is. Opening a campaign shows its checkout and delivery status.
          </p>

          <div className="mt-6">
            {campaigns.phase === 'loading' ? (
              <LoadingPanel label="Loading your campaigns…" />
            ) : campaigns.phase === 'error' || campaigns.phase === 'unknown' ? (
              <ResourceFailure kind="campaigns" message={campaigns.message} onRetry={() => void load()} />
            ) : (
              <div className="space-y-10" data-testid="paid-promotion-campaign-list">
                {groupedCampaigns.map((group, groupIndex) => (
                  <section key={group.key} aria-label={group.title}>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-foreground pb-2">
                      <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-foreground">
                        {group.title}
                      </h3>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {group.items.length}
                      </span>
                      <p className="w-full text-sm text-muted-foreground sm:ml-auto sm:w-auto">
                        {group.caption}
                      </p>
                    </div>
                    <ul className="mt-5 grid gap-5 xl:grid-cols-2">
                      {group.items.map((campaign, index) => (
                        <CampaignCard
                          key={campaign.id}
                          campaign={campaign}
                          subject={subjectsByTrackId.get(campaign.trackId)}
                          // Only the single most urgent campaign gets the focal
                          // treatment; a page of focal cards has no hierarchy.
                          featured={groupIndex === 0 && index === 0}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="promoted-subjects-heading" className="mt-14 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-foreground pt-6">
            <h2
              id="promoted-subjects-heading"
              className="font-atkinson text-xl font-bold tracking-tight text-foreground"
            >
              Previously promoted tracks
            </h2>
            <p className="text-sm text-muted-foreground">
              Canonical tracks from your owner-scoped catalog.
            </p>
          </div>

          <div className="mt-5">
            {subjects.phase === 'loading' ? (
              <LoadingPanel label="Loading promoted tracks…" />
            ) : subjects.phase === 'error' || subjects.phase === 'unknown' ? (
              <ResourceFailure kind="subjects" message={subjects.message} onRetry={() => void load()} />
            ) : subjects.data.length === 0 ? (
              <div className="flex items-center gap-3 border border-dashed border-border p-5">
                <Music2 className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-atkinson font-bold text-foreground">No promoted tracks yet</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Tracks appear here after you create a paid-promotion campaign.
                  </p>
                </div>
              </div>
            ) : (
              <ul
                aria-label="Your previously promoted canonical tracks"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {subjects.data.map((subject) => (
                  <SubjectCard key={subject.trackId} subject={subject} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <PaidPromotionSupportContact className="mt-12 justify-start border-t border-border pt-6" />
      </div>
    </div>
  );
}

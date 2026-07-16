'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock3, Megaphone, Music2, RefreshCw } from 'lucide-react';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';
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

function formatState(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function CampaignCard({
  campaign,
  subject,
}: {
  campaign: PaidPromotionCampaign;
  subject?: PaidPromotionSubject;
}) {
  return (
    <li>
      <Card className="h-full border-2 border-foreground shadow-flat-3">
        <CardContent className="flex h-full min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border">
              <ArtworkImage
                src={subject?.coverArtUrl}
                alt={subject ? `Artwork for ${subject.trackTitle}` : 'Track artwork unavailable'}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-atkinson text-lg font-bold text-foreground">
                {subject?.trackTitle ?? 'Track details unavailable'}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {subject?.artists.length ? subject.artists.join(', ') : 'Artist unavailable'}
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                {campaign.trackId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Campaign status">
            <Badge variant="outline">{formatState(campaign.status)}</Badge>
            <Badge variant="secondary">
              {campaign.paymentStatus
                ? `Payment: ${formatState(campaign.paymentStatus)}`
                : 'Payment status not available'}
            </Badge>
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" aria-hidden="true" />
                Updated
              </p>
              <time dateTime={campaign.updatedAtUtc} className="mt-1 block text-foreground">
                {DATE_FORMATTER.format(new Date(campaign.updatedAtUtc))}
              </time>
            </div>
            <Button asChild variant="brutalist-outline" className="w-full sm:w-auto">
              <Link
                href={`/promote/${encodeURIComponent(campaign.id)}/return`}
                aria-label={`View campaign ${campaign.id} for ${subject?.trackTitle ?? campaign.trackId}`}
                data-testid={`paid-promotion-campaign-link-${campaign.id}`}
              >
                View campaign <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function SubjectCard({ subject }: { subject: PaidPromotionSubject }) {
  return (
    <li className="flex min-w-0 gap-3 border-b border-border py-4 last:border-b-0">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border">
        <ArtworkImage
          src={subject.coverArtUrl}
          alt={`Artwork for ${subject.trackTitle}`}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-atkinson font-bold text-foreground">{subject.trackTitle}</p>
        <p className="truncate text-sm text-muted-foreground">
          {subject.artists.length > 0 ? subject.artists.join(', ') : 'Artist unavailable'}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline">
            {subject.campaignCount.toLocaleString()} {subject.campaignCount === 1 ? 'campaign' : 'campaigns'}
          </Badge>
          {Object.entries(subject.campaignStatusCounts).map(([status, count]) => (
            <Badge key={status} variant="secondary">
              {formatState(status)} · {count}
            </Badge>
          ))}
        </div>
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
    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
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

export function PaidPromotionHome() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthState();
  const [campaigns, setCampaigns] = useState<ResourceState<PaidPromotionCampaign[]>>({
    phase: 'loading',
  });
  const [subjects, setSubjects] = useState<ResourceState<PaidPromotionSubject[]>>({
    phase: 'loading',
  });
  const [announcement, setAnnouncement] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/signin?redirect=/promote');
    }
  }, [authLoading, isAuthenticated, router]);

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

  if (authLoading) {
    return <PageLoader message="Loading promotion home…" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const isRefreshing = campaigns.phase === 'loading' || subjects.phase === 'loading';

  return (
    <div className="relative min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.3]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 border-b-2 border-foreground pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground">
              Direct paid promotion
            </p>
            <h1 className="font-atkinson text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Promotion home
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Follow your campaigns from Cassette&apos;s persisted status and revisit the canonical tracks you have promoted.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button asChild variant="brutalist" className="w-full bg-foreground text-background hover:bg-foreground/90 sm:w-auto">
              <Link href="/promote/new" data-testid="paid-promotion-new-campaign">
                Start a new campaign <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void load()}
              disabled={isRefreshing}
              className="w-full sm:w-auto"
            >
              {isRefreshing ? <Spinner size="sm" /> : <RefreshCw aria-hidden="true" />}
              Refresh server status
            </Button>
          </div>
        </header>

        <output className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </output>

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <section aria-labelledby="your-campaigns-heading" className="min-w-0">
            <div className="mb-4">
              <h2 id="your-campaigns-heading" className="font-atkinson text-2xl font-bold text-foreground">
                Your campaigns
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Campaign links open the existing persisted checkout and status page.
              </p>
            </div>

            {campaigns.phase === 'loading' ? (
              <output className="flex min-h-36 items-center justify-center gap-3 rounded-xl border-2 border-foreground bg-card p-6 text-sm text-muted-foreground">
                <Spinner size="sm" /> Loading your campaigns…
              </output>
            ) : campaigns.phase === 'error' || campaigns.phase === 'unknown' ? (
              <ResourceFailure kind="campaigns" message={campaigns.message} onRetry={() => void load()} />
            ) : campaigns.data.length === 0 ? (
              <Card className="border-2 border-foreground shadow-flat-3">
                <CardHeader>
                  <Megaphone className="size-7 text-muted-foreground" aria-hidden="true" />
                  <h3 className="font-atkinson text-xl font-semibold leading-none">
                    No campaigns yet
                  </h3>
                  <CardDescription>
                    Start a campaign when you are ready to put a canonical track in front of Cassette&apos;s audience.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="brutalist-outline" className="w-full sm:w-auto">
                    <Link href="/promote/new">Start your first campaign</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ul className="grid gap-4 xl:grid-cols-2" data-testid="paid-promotion-campaign-list">
                {campaigns.data.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    subject={subjectsByTrackId.get(campaign.trackId)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="promoted-subjects-heading" className="min-w-0">
            <Card className="border-2 border-foreground shadow-flat-3">
              <CardHeader>
                <h2 id="promoted-subjects-heading" className="font-atkinson text-xl font-semibold leading-none">
                  Previously promoted tracks
                </h2>
                <CardDescription>
                  Canonical subjects returned by your owner-scoped catalog.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subjects.phase === 'loading' ? (
                  <output className="flex min-h-28 items-center justify-center gap-3 text-sm text-muted-foreground">
                    <Spinner size="sm" /> Loading promoted tracks…
                  </output>
                ) : subjects.phase === 'error' || subjects.phase === 'unknown' ? (
                  <ResourceFailure kind="subjects" message={subjects.message} onRetry={() => void load()} />
                ) : subjects.data.length === 0 ? (
                  <div className="py-5 text-center">
                    <Music2 className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-3 font-atkinson font-bold text-foreground">No promoted tracks yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tracks appear here after you create a paid-promotion campaign.
                    </p>
                  </div>
                ) : (
                  <ul aria-label="Your previously promoted canonical tracks">
                    {subjects.data.map((subject) => (
                      <SubjectCard key={subject.trackId} subject={subject} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

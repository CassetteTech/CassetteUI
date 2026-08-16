'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  CalendarDays,
  Disc3,
  ListMusic,
  LockKeyhole,
  Music,
  User,
} from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth';
import { useCuratorPage } from '@/hooks/use-curator';
import { useMembershipStatus } from '@/hooks/use-membership-status';
import {
  CuratorPageError,
  type CuratorPage as CuratorPageData,
  type CuratorPostItem,
} from '@/services/curator';
import { apiService } from '@/services/api';
import {
  grantsMembershipAccess,
  type MembershipInterval,
  type MembershipStatus,
} from '@/services/membership';
import { captureClientEvent } from '@/lib/analytics/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { CuratorMembershipCard } from '@/components/features/curator/curator-membership-card';
import { ProfileLinksRow } from '@/components/features/profile/profile-links';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';

function getPostIcon(elementType: string) {
  switch (elementType.toLowerCase()) {
    case 'playlist': return ListMusic;
    case 'artist': return User;
    case 'album': return Disc3;
    default: return Music;
  }
}

type MembershipFlow = 'join' | 'return' | 'canceled' | 'portal-return' | null;
const joinIntentPrefix = 'cassette:membership-join-intent:';
const checkoutReturnPrefix = 'cassette:membership-checkout-return:';
const joinIntentLifetimeMs = 10 * 60 * 1_000;
const checkoutReturnLifetimeMs = (2 * 60 + 5) * 60 * 1_000;
const portalBaselinePrefix = 'cassette:membership-portal-baseline:';

function removeMembershipQuery(...keys: string[]) {
  const url = new URL(window.location.href);
  for (const key of keys) url.searchParams.delete(key);
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function PublicCuratorPage({
  username,
  membershipFlow,
  initialInterval,
}: {
  username: string;
  membershipFlow: MembershipFlow;
  initialInterval: MembershipInterval;
}) {
  const instanceId = useId();
  const curatorNameId = `curator-name-${instanceId}`;
  const feedHeadingId = `curator-feed-heading-${instanceId}`;
  const membershipId = `membership-${instanceId}`;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthState();
  const viewerKey = authLoading ? null : (user?.id ?? 'anonymous');
  const query = useCuratorPage(username, viewerKey);
  const page = query.data?.pages[0];
  const [interval, setInterval] = useState(initialInterval);
  const [pollStatus, setPollStatus] = useState(
    membershipFlow === 'return' || membershipFlow === 'portal-return',
  );
  const [notice, setNotice] = useState<string | null>(
    membershipFlow === 'canceled' ? 'Checkout was canceled. You were not charged.' : null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const pageViewCaptured = useRef(false);
  const flowHandled = useRef(false);
  const portalBaseline = useRef<{ cancelAtPeriodEnd: boolean; canceled: boolean } | null>(null);
  const statusQuery = useMembershipStatus(
    page?.curator.id ?? '',
    isAuthenticated && user?.id ? user.id : null,
    pollStatus,
  );
  const currentMembership = statusQuery.data?.membership;
  const checkoutInterval = currentMembership?.status === 'incomplete' &&
    currentMembership.planId === page?.membership?.planId
    ? currentMembership.billingInterval
    : interval;
  const checkoutIntervalAvailable = checkoutInterval === 'month' || (
    page?.membership?.annualAmountMinor != null &&
    page.membership.annualServiceFeeMinor != null
  );
  const startCheckout = useCallback(async (
    planId: string,
    curatorProfileId: string,
    selectedInterval: MembershipInterval,
  ) => {
    setCheckoutPending(true);
    setActionError(null);
    try {
      const checkout = await apiService.createMembershipCheckout(planId, selectedInterval);
      try {
        sessionStorage.setItem(
          `${checkoutReturnPrefix}${curatorProfileId}:${checkout.membershipSubscriptionId}`,
          String(Date.now()),
        );
      } catch {
        // Checkout still works; analytics attribution stays fail-closed.
      }
      void captureClientEvent('membership_checkout_started', {
        route: '/curator/[username]',
        source_surface: 'curator',
        curator_id: curatorProfileId,
        membership_plan_id: checkout.planId,
        is_member_view: false,
      });
      window.location.assign(checkout.checkoutUrl);
    } catch {
      setActionError('We could not start secure Checkout. Try again.');
      setCheckoutPending(false);
    }
  }, []);
  async function manage(
    membershipSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
    status: MembershipStatus,
  ) {
    setPortalPending(true);
    setActionError(null);
    try {
      const portal = await apiService.createMembershipPortal(membershipSubscriptionId);
      try {
        sessionStorage.setItem(
          `${portalBaselinePrefix}${membershipSubscriptionId}`,
          `${cancelAtPeriodEnd}:${status === 'canceled'}`,
        );
      } catch {
        // The status poll remains authoritative when storage is unavailable.
      }
      window.location.assign(portal.portalUrl);
    } catch {
      setActionError('We could not open membership management. Try again.');
      setPortalPending(false);
    }
  }

  useEffect(() => {
    removeMembershipQuery('session_id');
  }, []);

  useEffect(() => {
    if (
      authLoading ||
      isAuthenticated ||
      (membershipFlow !== 'return' &&
       membershipFlow !== 'portal-return')
    ) return;

    const query = new URLSearchParams({ membership: membershipFlow });
    const returnPath = `/curator/${encodeURIComponent(username)}?${query}`;
    router.replace(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
  }, [authLoading, isAuthenticated, membershipFlow, router, username]);

  useEffect(() => {
    if (!page || pageViewCaptured.current) return;
    pageViewCaptured.current = true;
    void captureClientEvent('curator_page_viewed', {
      route: '/curator/[username]',
      source_surface: 'curator',
      curator_id: page.curator.id,
      membership_plan_id: page.membership?.planId,
      is_member_view: page.viewer.isMember,
    });
  }, [page]);

  useEffect(() => {
    if (!pollStatus) return;
    const timeout = window.setTimeout(() => {
      setPollStatus(false);
      setNotice('Your membership update is still processing. Refresh in a moment.');
      removeMembershipQuery('membership', 'interval');
    }, 30_000);
    return () => window.clearTimeout(timeout);
  }, [pollStatus]);

  useEffect(() => {
    const status = statusQuery.data;
    const membership = status?.membership;
    if (!status || !membership || flowHandled.current) return;

    if (membershipFlow === 'return' && grantsMembershipAccess(membership.status)) {
      flowHandled.current = true;
      setPollStatus(false);
      setNotice('Your membership is active.');
      removeMembershipQuery('membership', 'interval');
      void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
      let checkoutStarted = false;
      try {
        const key = `${checkoutReturnPrefix}${status.curatorProfileId}:${membership.membershipSubscriptionId}`;
        const createdAt = Number(sessionStorage.getItem(key));
        sessionStorage.removeItem(key);
        const age = Date.now() - createdAt;
        checkoutStarted = Number.isFinite(createdAt) && age >= 0 && age <= checkoutReturnLifetimeMs;
      } catch {
        // Server truth still renders; analytics attribution stays fail-closed.
      }
      if (checkoutStarted) {
        void captureClientEvent('membership_started', {
          route: '/curator/[username]',
          source_surface: 'curator',
          curator_id: status.curatorProfileId,
          membership_plan_id: membership.planId,
          is_member_view: true,
        });
      }
      return;
    }

    if (membershipFlow === 'return' && membership.status !== 'incomplete') {
      flowHandled.current = true;
      setPollStatus(false);
      setNotice('Checkout did not activate this membership. You can try again.');
      removeMembershipQuery('membership', 'interval');
      return;
    }

    if (membershipFlow !== 'portal-return') return;

    if (portalBaseline.current === null) {
      try {
        const key = `${portalBaselinePrefix}${membership.membershipSubscriptionId}`;
        const stored = sessionStorage.getItem(key);
        sessionStorage.removeItem(key);
        if (['false:false', 'false:true', 'true:false', 'true:true'].includes(stored ?? '')) {
          const [cancelAtPeriodEnd, canceled] = stored!.split(':');
          portalBaseline.current = {
            cancelAtPeriodEnd: cancelAtPeriodEnd === 'true',
            canceled: canceled === 'true',
          };
        }
      } catch {
        // Fall back to the first server response below.
      }
    }

    const baseline = portalBaseline.current;
    const cancellationObserved = baseline !== null && (
      (!baseline.canceled && membership.status === 'canceled') ||
      (!baseline.cancelAtPeriodEnd && membership.cancelAtPeriodEnd)
    );
    if (cancellationObserved) {
      flowHandled.current = true;
      setPollStatus(false);
      setNotice(
        membership.status === 'canceled'
          ? 'Your membership is canceled.'
          : 'Your membership will end after the current billing period.',
      );
      removeMembershipQuery('membership', 'interval');
      void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
      void captureClientEvent('membership_canceled', {
        route: '/curator/[username]',
        source_surface: 'curator',
        curator_id: status.curatorProfileId,
        membership_plan_id: membership.planId,
        is_member_view: grantsMembershipAccess(membership.status),
      });
      return;
    }

    if (baseline === null) {
      portalBaseline.current = {
        cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
        canceled: membership.status === 'canceled',
      };
      return;
    }

    if (baseline.canceled && membership.status === 'canceled') {
      flowHandled.current = true;
      setPollStatus(false);
      setNotice('Membership management is up to date.');
      removeMembershipQuery('membership', 'interval');
      return;
    }

    if (
      (baseline.cancelAtPeriodEnd && !membership.cancelAtPeriodEnd) ||
      (baseline.canceled && membership.status !== 'canceled')
    ) {
      flowHandled.current = true;
      setPollStatus(false);
      setNotice('Your membership will continue.');
      removeMembershipQuery('membership', 'interval');
      void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
    }
  }, [membershipFlow, queryClient, statusQuery.data, username]);

  useEffect(() => {
    if (membershipFlow !== 'canceled') return;
    removeMembershipQuery('membership', 'interval');
  }, [membershipFlow]);

  useEffect(() => {
    if (
      membershipFlow !== 'join' ||
      flowHandled.current ||
      !isAuthenticated ||
      !page?.membership ||
      !statusQuery.data
    ) return;

    flowHandled.current = true;
    removeMembershipQuery('membership', 'interval');
    let intentCreatedAt = Number.NaN;
    try {
      const key = `${joinIntentPrefix}${page.membership.planId}:${checkoutInterval}`;
      intentCreatedAt = Number(sessionStorage.getItem(key));
      sessionStorage.removeItem(key);
    } catch {
      // An explicit authenticated Join remains available when storage is unavailable.
    }
    const intentAge = Date.now() - intentCreatedAt;
    if (!Number.isFinite(intentCreatedAt) || intentAge < 0 || intentAge > joinIntentLifetimeMs) {
      setNotice('Choose a billing option and select Join to continue.');
      return;
    }

    if (statusQuery.data.canSubscribe) {
      if (!checkoutIntervalAvailable) {
        setInterval('month');
        setActionError('Annual billing is not available. Review the monthly option before joining.');
        return;
      }
      void startCheckout(page.membership.planId, page.curator.id, checkoutInterval);
    } else {
      setNotice('This membership already has an active or pending billing record.');
    }
  }, [
    checkoutInterval,
    checkoutIntervalAvailable,
    isAuthenticated,
    membershipFlow,
    page,
    startCheckout,
    statusQuery.data,
  ]);

  if (authLoading || query.isPending) {
    return <CuratorPageSkeleton />;
  }

  if (query.isError) {
    if (query.error instanceof CuratorPageError && query.error.status === 404) {
      return <CuratorNotFound />;
    }
    return <CuratorLoadError onRetry={() => void query.refetch()} />;
  }

  if (!page) return <CuratorLoadError onRetry={() => void query.refetch()} />;

  const join = () => {
    if (!page.membership) return;
    if (!checkoutIntervalAvailable) {
      setInterval('month');
      setActionError('Annual billing is not available. Review the monthly option before joining.');
      return;
    }
    if (!isAuthenticated) {
      try {
        sessionStorage.setItem(
          `${joinIntentPrefix}${page.membership.planId}:${checkoutInterval}`,
          String(Date.now()),
        );
      } catch {
        // The fan can select Join again after signing in.
      }
      const returnPath = `/curator/${encodeURIComponent(username)}?membership=join&interval=${checkoutInterval}`;
      router.push(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
      return;
    }
    void startCheckout(page.membership.planId, page.curator.id, checkoutInterval);
  };

  const posts = query.data.pages.flatMap((result) => result.posts.items);
  const displayName = page.curator.displayName?.trim() || page.curator.username;
  const showMembership = Boolean(page.membership || statusQuery.data?.membership?.canManage);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <CuratorIdentity page={page} displayName={displayName} headingId={curatorNameId} />

      <div className={cn(
        'mt-8 grid gap-6',
        showMembership && 'lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start',
      )}>
        <CuratorFeed
          items={posts}
          displayName={displayName}
          headingId={feedHeadingId}
          membershipId={membershipId}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
        />
        {showMembership && (
          <CuratorMembershipCard
            page={page}
            displayName={displayName}
            membershipId={membershipId}
            interval={checkoutIntervalAvailable ? checkoutInterval : 'month'}
            status={statusQuery.data ?? null}
            statusLoading={statusQuery.isPending}
            statusUnavailable={statusQuery.isError}
            authenticated={isAuthenticated}
            notice={notice}
            error={actionError}
            checkoutPending={checkoutPending}
            portalPending={portalPending}
            checkoutCanceled={membershipFlow === 'canceled'}
            onIntervalChange={setInterval}
            onJoin={join}
            onManage={(id, cancelAtPeriodEnd, status) => void manage(id, cancelAtPeriodEnd, status)}
          />
        )}
      </div>
    </div>
  );
}

function CuratorIdentity({
  page,
  displayName,
  headingId,
}: {
  page: CuratorPageData;
  displayName: string;
  headingId: string;
}) {
  const { curator, viewer } = page;
  const interests = [...new Set([...curator.declaredGenres, ...curator.declaredPlatforms])];

  return (
    <section
      data-testid="curator-profile"
      aria-labelledby={headingId}
      className="rounded-xl border border-border/70 bg-card p-5 elev-1 sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar className="size-24 border-2 border-foreground/80 sm:size-28">
          <AvatarImage src={curator.avatarUrl ?? undefined} alt={`@${curator.username}`} />
          <AvatarFallback className="text-2xl font-bold text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id={headingId} className="min-w-0 break-words font-teko text-4xl font-bold uppercase leading-none sm:text-5xl">
              {displayName}
            </h1>
            <VerificationBadge accountType={curator.accountType} size="md" />
            {viewer.hasMemberBadge && (
              <Badge className="gap-1">
                <BadgeCheck aria-hidden />
                Member
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            @{curator.username}
          </p>
          {curator.headline && (
            <p className="mt-4 max-w-3xl break-words text-lg font-semibold leading-snug sm:text-xl">
              {curator.headline}
            </p>
          )}
          {curator.bio && (
            <p className="mt-3 max-w-3xl whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
              {curator.bio}
            </p>
          )}
          <ProfileLinksRow links={curator.profileLinks} className="mt-3" />
        </div>
      </div>

      <div className="mt-6 border-t border-border/70 pt-5">
        {curator.about && (
          <div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em]">About</h2>
            <p className="mt-2 max-w-3xl whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
              {curator.about}
            </p>
          </div>
        )}
        {interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Curator interests">
            {interests.map((label) => (
              <Badge key={label} variant="outline">{label}</Badge>
            ))}
          </div>
        )}
        <p className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          Curating since {new Date(curator.curatorSinceUtc).getUTCFullYear()}
        </p>
      </div>
    </section>
  );
}

function CuratorFeed({
  items,
  displayName,
  headingId,
  membershipId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  items: CuratorPostItem[];
  displayName: string;
  headingId: string;
  membershipId: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section data-testid="curator-feed" aria-labelledby={headingId} className="min-w-0">
      <h2 id={headingId} className="font-teko text-3xl font-bold uppercase">Latest posts</h2>
      {items.length === 0 ? (
        <Card className="mt-3 px-6 text-center text-sm text-muted-foreground">
          No posts yet.
        </Card>
      ) : (
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {items.map((item) => item.kind === 'locked'
            ? (
                <LockedPost
                  key={item.postId}
                  createdAt={item.createdAt}
                  displayName={displayName}
                  membershipId={membershipId}
                />
              )
            : <CuratorPost key={item.post.postId} post={item.post} />)}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  );
}

function LockedPost({
  createdAt,
  displayName,
  membershipId,
}: {
  createdAt: string;
  displayName: string;
  membershipId: string;
}) {
  return (
    <article data-testid="curator-locked-post" aria-label="Members-only post">
      <Card className="justify-center border-dashed border-primary/40 px-5 py-6 text-center">
        <LockKeyhole className="mx-auto size-7 text-primary" aria-hidden />
        <div>
          <h3 className="font-teko text-2xl font-bold uppercase">Members-only post</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Join {displayName} to unlock this post.
          </p>
          <time dateTime={createdAt} className="mt-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {formatRelativeTime(createdAt)}
          </time>
        </div>
        <Button asChild variant="outline" size="sm" className="mx-auto">
          <a href={`#${membershipId}`}>Join</a>
        </Button>
      </Card>
    </article>
  );
}

function CuratorPost({ post }: { post: Extract<CuratorPostItem, { kind: 'post' }>['post'] }) {
  const TypeIcon = getPostIcon(post.elementType);
  const targetPostId = post.redirectPostId || post.postId;
  const title = post.title.trim() || `${post.elementType} post`;
  const detail = post.description?.trim() || post.subtitle?.trim();

  return (
    <Card className="gap-0 overflow-hidden p-0 elev-1 sm:gap-0 sm:p-0">
      <Link href={`/post/${targetPostId}`} prefetch={false} className="block p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4">
          <div className="relative size-24 shrink-0 sm:size-28">
            <ArtworkImage
              src={post.imageUrl}
              alt={title}
              width={112}
              height={112}
              className="size-full rounded-md object-cover ring-1 ring-border/40"
              fallbackClassName="rounded-md ring-1 ring-border/40"
            />
            <Badge className="absolute bottom-1.5 left-1.5 bg-background/90 text-foreground" variant="outline">
              <TypeIcon aria-hidden />
              {post.elementType}
            </Badge>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <span className="truncate font-bold text-foreground/80">@{post.username}</span>
              <VerificationBadge accountType={post.accountType ?? undefined} size="sm" />
              <span>/ {formatRelativeTime(post.createdAt)}</span>
            </div>
            <h3 className="mt-2 line-clamp-2 break-words font-teko text-2xl uppercase leading-none">
              {title}
            </h3>
            {detail && (
              <p className="mt-2 line-clamp-2 text-sm italic leading-snug text-muted-foreground">
                {detail}
              </p>
            )}
            {post.privacy === 'subscriber' && (
              <Badge variant="secondary" className="mt-3">Members</Badge>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}

function CuratorNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-teko text-4xl font-bold uppercase">Curator not found</h1>
      <p className="mt-2 text-muted-foreground">This curator page is not available.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/explore">Explore music</Link>
      </Button>
    </div>
  );
}

function CuratorLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-teko text-4xl font-bold uppercase">Could not load curator</h1>
      <p className="mt-2 text-muted-foreground">Try again in a moment.</p>
      <Button onClick={onRetry} className="mt-6">Try again</Button>
    </div>
  );
}

function CuratorPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10" aria-label="Loading curator">
      <div className="rounded-xl border bg-card p-5 sm:p-7">
        <div className="flex gap-5">
          <Skeleton className="size-24 shrink-0 rounded-full sm:size-28" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-52" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <Skeleton className="order-first h-72 rounded-xl lg:order-last" />
      </div>
    </div>
  );
}

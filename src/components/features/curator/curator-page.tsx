'use client';

/** Coordinates the public curator feed, fan entitlement state, and Stripe handoff flows. */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
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
  formatCuratorPlanPrice,
  type CuratorPostItem,
} from '@/services/curator';
import { apiService } from '@/services/api';
import {
  grantsMembershipAccess,
  type MembershipInterval,
  type MembershipStatus,
} from '@/services/membership';
import { captureClientEvent } from '@/lib/analytics/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { CuratorMembershipCard } from '@/components/features/curator/curator-membership-card';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
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
  const [interval, setBillingInterval] = useState(initialInterval);
  const [pollStatus, setPollStatus] = useState(
    membershipFlow === 'return' || membershipFlow === 'portal-return',
  );
  const [notice, setNotice] = useState<string | null>(
    membershipFlow === 'canceled' ? 'Checkout was canceled. You were not charged.' : null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
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
        route: '/profile/[username]',
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
    // bfcache restore: the page comes back with stale "opening…" pending state.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setCheckoutPending(false);
      setPortalPending(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(() => {
    if (
      authLoading ||
      isAuthenticated ||
      (membershipFlow !== 'return' &&
       membershipFlow !== 'portal-return')
    ) return;

    const query = new URLSearchParams({ membership: membershipFlow });
    const returnPath = `/profile/${encodeURIComponent(username)}?${query}`;
    router.replace(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
  }, [authLoading, isAuthenticated, membershipFlow, router, username]);

  useEffect(() => {
    if (!page || pageViewCaptured.current) return;
    pageViewCaptured.current = true;
    void captureClientEvent('curator_page_viewed', {
      route: '/profile/[username]',
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
      setPollTimedOut(true);
      setNotice('Your membership update is still processing.');
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
          route: '/profile/[username]',
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
      toast.info('Checkout did not activate this membership. You can try again.');
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
      if (membership.status === 'canceled') {
        // Transient toast; the persistent canceled state stays inline via statusNotice.
        toast.info('Your membership is canceled.');
      } else {
        setNotice('Your membership will end after the current billing period.');
      }
      removeMembershipQuery('membership', 'interval');
      void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
      void captureClientEvent('membership_canceled', {
        route: '/profile/[username]',
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
        setBillingInterval('month');
        setActionError('Annual billing is not available. Review the monthly option before joining.');
        return;
      }
      void startCheckout(page.membership.planId, page.curator.id, checkoutInterval);
    } else {
      setNotice('You already have a membership with this curator.');
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
      setBillingInterval('month');
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
      const returnPath = `/profile/${encodeURIComponent(username)}?membership=join&interval=${checkoutInterval}`;
      router.push(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
      return;
    }
    void startCheckout(page.membership.planId, page.curator.id, checkoutInterval);
  };

  const posts = query.data.pages.flatMap((result) => result.posts.items);
  const displayName = page.curator.displayName?.trim() || page.curator.username;
  const showMembership = Boolean(page.membership || statusQuery.data?.membership?.canManage);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-none lg:px-8 lg:py-10">
      <h1 className="sr-only" id={curatorNameId}>{displayName}</h1>

      <div className={cn(
        'grid gap-6',
        showMembership && 'lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start',
      )}>
        {/* Compact membership banner: mobile-only, the single Join CTA above the feed */}
        {page.membership && !page.viewer.isMember && !page.viewer.isOwner && (
          <a
            href={`#${membershipId}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 transition-colors hover:bg-primary/15 lg:hidden"
          >
            <span className="min-w-0 truncate text-sm font-semibold">
              {page.membership.name}
              <span className="font-normal tabular-nums text-muted-foreground">
                {' · '}
                {formatCuratorPlanPrice(
                  page.membership.amountMinor,
                  page.membership.serviceFeeMinor,
                  page.membership.currency,
                )}/mo
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Join
            </span>
          </a>
        )}
        <CuratorFeed
          items={posts}
          displayName={displayName}
          headingId={feedHeadingId}
          membershipId={membershipId}
          showMembership={showMembership}
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
            noticeAction={pollTimedOut ? {
              label: 'Check again',
              onClick: () => {
                setPollTimedOut(false);
                setNotice(null);
                setPollStatus(true);
              },
            } : null}
            onIntervalChange={setBillingInterval}
            onJoin={join}
            onManage={(id, cancelAtPeriodEnd, status) => void manage(id, cancelAtPeriodEnd, status)}
            onCheckStatus={() => void statusQuery.refetch()}
          />
        )}
      </div>
    </div>
  );
}

function CuratorFeed({
  items,
  displayName,
  headingId,
  membershipId,
  showMembership,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  items: CuratorPostItem[];
  displayName: string;
  headingId: string;
  membershipId: string;
  showMembership: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section data-testid="curator-feed" aria-labelledby={headingId} className="min-w-0 max-w-2xl">
      <h2 id={headingId} className="text-balance font-teko text-3xl font-bold uppercase">Latest posts</h2>
      {items.length === 0 ? (
        <Empty className="mt-3">
          <EmptyTitle>No posts yet</EmptyTitle>
          <EmptyDescription>
            {displayName} has not shared any posts. Explore music from other curators in the meantime.
          </EmptyDescription>
          <Button asChild variant="outline">
            <Link href="/explore">Explore music</Link>
          </Button>
        </Empty>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item) => item.kind === 'locked'
            ? (
                <LockedPost
                  key={item.postId}
                  createdAt={item.createdAt}
                  displayName={displayName}
                  membershipId={membershipId}
                  showMembership={showMembership}
                />
              )
            : <CuratorPost key={item.post.postId} post={item.post} />)}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Spinner size="sm" />}
            Load more
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
  showMembership,
}: {
  createdAt: string;
  displayName: string;
  membershipId: string;
  showMembership: boolean;
}) {
  const card = (
    <Card className="flex-row gap-0 overflow-hidden p-0 elev-1 sm:gap-0 sm:py-0">
      {/* Obscured artwork slot, flush to the card's left edge */}
      <div className="relative flex size-24 shrink-0 items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-transparent sm:size-28">
        <LockKeyhole className="size-8 text-primary/60" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3 pl-3 sm:py-4 sm:pr-4 sm:pl-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            <LockKeyhole aria-hidden />
            Members only
          </Badge>
          <time dateTime={createdAt} className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {formatRelativeTime(createdAt)}
          </time>
        </div>
        <h3 className="mt-1.5 text-base font-semibold leading-snug sm:text-lg">Members-only post</h3>
        <p className="mt-1 text-pretty text-sm leading-snug text-muted-foreground">
          Join {displayName} to unlock this post.
        </p>
      </div>
    </Card>
  );

  return (
    <article data-testid="curator-locked-post" aria-label="Members-only post">
      {showMembership ? (
        <a
          href={`#${membershipId}`}
          aria-label={`Join ${displayName}`}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {card}
        </a>
      ) : card}
    </article>
  );
}

function CuratorPost({ post }: { post: Extract<CuratorPostItem, { kind: 'post' }>['post'] }) {
  const TypeIcon = getPostIcon(post.elementType);
  const targetPostId = post.redirectPostId || post.postId;
  const title = post.title.trim() || `${post.elementType} post`;
  const detail = post.description?.trim() || post.subtitle?.trim();

  return (
    <Card className="gap-0 overflow-hidden p-0 elev-1 sm:gap-0 sm:py-0">
      <Link href={`/post/${targetPostId}`} prefetch={false} className="flex gap-3 sm:gap-4">
        {/* Artwork flush to the card's left edge; outer card corners do the rounding */}
        <div className="relative size-24 shrink-0 sm:size-28">
          <ArtworkImage
            src={post.imageUrl}
            alt={title}
            width={112}
            height={112}
            className="size-full object-cover"
          />
          <Badge className="absolute bottom-1.5 left-1.5 bg-background/90 text-foreground" variant="outline">
            <TypeIcon aria-hidden />
            {post.elementType}
          </Badge>
        </div>
        <div className="min-w-0 flex-1 py-3 pr-3 sm:py-4 sm:pr-4">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            <span className="truncate font-bold text-foreground/80">@{post.username}</span>
            <VerificationBadge accountType={post.accountType ?? undefined} size="sm" />
            <span>/ {formatRelativeTime(post.createdAt)}</span>
          </div>
          <h3 className="mt-1.5 line-clamp-2 break-words text-base font-semibold leading-snug sm:text-lg">
            {title}
          </h3>
          {detail && (
            <p className="mt-1 line-clamp-2 text-pretty text-sm leading-snug text-muted-foreground">
              {detail}
            </p>
          )}
          {post.privacy === 'subscriber' && (
            <Badge variant="outline" className="mt-2 border-primary/40 bg-primary/10 text-primary">
              <LockKeyhole aria-hidden />
              Members
            </Badge>
          )}
        </div>
      </Link>
    </Card>
  );
}

function CuratorNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-6">
      <Empty className="w-full border-none">
        <EmptyTitle className="text-balance font-teko text-4xl font-bold uppercase">
          Curator not found
        </EmptyTitle>
        <EmptyDescription>This curator page is not available.</EmptyDescription>
        <Button asChild variant="outline" className="mt-3">
          <Link href="/explore">Explore music</Link>
        </Button>
      </Empty>
    </div>
  );
}

function CuratorLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-6">
      <Empty className="w-full border-none">
        <EmptyTitle className="text-balance font-teko text-4xl font-bold uppercase">
          Could not load curator
        </EmptyTitle>
        <EmptyDescription>Try again in a moment.</EmptyDescription>
        <Button onClick={onRetry} className="mt-3">Try again</Button>
      </Empty>
    </div>
  );
}

function CuratorPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-none lg:px-8 lg:py-10" aria-label="Loading curator">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

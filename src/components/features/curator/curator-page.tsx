'use client';

/** Coordinates the public curator feed, fan entitlement state, and Stripe handoff flows. */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthState } from '@/hooks/use-auth';
import { useCuratorPage } from '@/hooks/use-curator';
import { refreshAfterMembershipChange, useMembershipStatus } from '@/hooks/use-membership-status';
import {
  CuratorPageError,
  formatCuratorPlanPrice,
  type CuratorPostItem,
} from '@/services/curator';
import { ActivitySkeleton, type MusicCardPost } from '@/components/features/profile/profile-activity';
import { ProfileMusic, type ProfileMusicItem } from '@/components/features/profile/profile-music';
import {
  curatorMusicViews,
  curatorPageFilterOf,
  type ProfileMusicView,
} from '@/components/features/profile/profile-music-view';
import { apiService } from '@/services/api';
import {
  grantsMembershipAccess,
  rememberMembershipPortalBaseline,
  SOURCE_POST_PARAM,
  sourcePostIdOf,
  takeMembershipPortalBaseline,
  type MembershipInterval,
  type MembershipPortalBaseline,
  type MembershipSubscription,
} from '@/services/membership';
import { captureClientEvent } from '@/lib/analytics/client';
import { getDeviceCategory, getUserCohort } from '@/lib/analytics/audience';
import { Button } from '@/components/ui/button';
import { CuratorMembershipCard, MEMBERSHIP_OFFER_ID } from '@/components/features/curator/curator-membership-card';
import { useSubscriberPostEligibility } from '@/hooks/use-curator';
import { removeQueryParameters } from '@/utils/remove-query-parameters';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

type MembershipFlow = 'join' | 'return' | 'canceled' | 'portal-return' | null;
const joinIntentPrefix = 'cassette:membership-join-intent:';
const joinIntentLifetimeMs = 10 * 60 * 1_000;

/** What a Portal return compares status reads with: the membership as the fan opened the
    Portal when that baseline survived, otherwise the first read after the return. */
type PortalReturnReference = { state: MembershipPortalBaseline; openedBaseline: boolean };

export function PublicCuratorPage({
  username,
  membershipFlow,
  initialInterval,
  membershipSlot,
  identitySummary,
  view,
  onViewChange,
}: {
  username: string;
  membershipFlow: MembershipFlow;
  initialInterval: MembershipInterval;
  /** Page rail the membership card renders into; the same rail Curator Studio uses. */
  membershipSlot: HTMLElement | null;
  /** The profile's bio, services, and links, printed inside the pass on wide screens. */
  identitySummary?: ReactNode;
  /** The Music view in the URL. */
  view: ProfileMusicView;
  onViewChange: (view: ProfileMusicView) => void;
}) {
  const instanceId = useId();
  const curatorNameId = `curator-name-${instanceId}`;
  const musicId = `curator-music-${instanceId}`;
  const membershipId = MEMBERSHIP_OFFER_ID;
  const router = useRouter();
  const queryClient = useQueryClient();
  // The post a Join came from: named by a link from another page, or by a
  // locked post selected here. The URL keeps it through tab changes, reloads,
  // and sign-in. Bridge validates it before storing it.
  const sourcePostId = sourcePostIdOf(useSearchParams().get(SOURCE_POST_PARAM));
  const selectSourcePost = useCallback((postId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(SOURCE_POST_PARAM, postId);
    // A null state lets the App Router copy its own state and update useSearchParams.
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);
  const { user, isLoading: authLoading, isAuthenticated } = useAuthState();
  const viewerKey = authLoading ? null : (user?.id ?? 'anonymous');
  const query = useCuratorPage(username, viewerKey, curatorPageFilterOf(view));
  const page = query.data?.pages[0];
  // One shared read for the whole list; React Query dedupes it across cards.
  const canLockPosts = useSubscriberPostEligibility(page?.viewer.isOwner ?? false);
  const [interval, setBillingInterval] = useState(initialInterval);
  // A Portal change reaches Bridge by webhook, possibly after the fan is back,
  // so a Portal return also polls for a bounded time.
  const [pollStatus, setPollStatus] = useState(membershipFlow === 'return' || membershipFlow === 'portal-return');
  const [notice, setNotice] = useState<string | null>(
    membershipFlow === 'canceled' ? 'Checkout was canceled. You were not charged.' : null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [activated, setActivated] = useState(false);
  const pageViewCaptured = useRef(false);
  const flowHandled = useRef(false);
  const portalReturn = useRef<PortalReturnReference | null>(null);
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
  const userCohort = getUserCohort(user?.id);
  const startCheckout = useCallback(async (
    planId: string,
    curatorProfileId: string,
    selectedInterval: MembershipInterval,
    joinSourcePostId: string | undefined,
  ) => {
    setCheckoutPending(true);
    setActionError(null);
    try {
      const checkout = await apiService.createMembershipCheckout(planId, selectedInterval, joinSourcePostId);
      void captureClientEvent('membership_checkout_started', {
        route: '/profile/[username]',
        source_surface: 'curator',
        curator_id: curatorProfileId,
        post_id: joinSourcePostId,
        membership_plan_id: checkout.planId,
        billing_interval: checkout.billingInterval,
        is_member_view: false,
        user_cohort: userCohort,
        device_category: getDeviceCategory(),
      });
      window.location.assign(checkout.checkoutUrl);
    } catch {
      setActionError('We could not start secure Checkout. Try again.');
      setCheckoutPending(false);
    }
  }, [userCohort]);
  async function manage(membership: MembershipSubscription) {
    setPortalPending(true);
    setActionError(null);
    try {
      const portal = await apiService.createMembershipPortal(membership.membershipSubscriptionId);
      rememberMembershipPortalBaseline(membership);
      window.location.assign(portal.portalUrl);
    } catch {
      setActionError('We could not open membership management. Try again.');
      setPortalPending(false);
    }
  }

  useEffect(() => {
    removeQueryParameters('session_id');
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
      setNotice(membershipFlow !== 'portal-return'
        ? 'Your membership update is still processing.'
        : portalReturn.current?.openedBaseline
          ? 'No membership change has reached Cassette yet. A change made in Stripe can take a minute to appear.'
          : 'A change made in Stripe can take a minute to appear here.');
      removeQueryParameters('membership', 'interval');
    }, 30_000);
    return () => window.clearTimeout(timeout);
  }, [membershipFlow, pollStatus]);

  useEffect(() => {
    const status = statusQuery.data;
    if (!status || flowHandled.current) return;
    const membership = status.membership;

    if (membershipFlow === 'return') {
      if (!membership) return;
      if (grantsMembershipAccess(membership.status)) {
        flowHandled.current = true;
        setPollStatus(false);
        setActivated(true);
        setNotice('Your membership is active.');
        removeQueryParameters('membership', 'interval');
        refreshAfterMembershipChange(queryClient, username);
        return;
      }
      if (membership.status !== 'incomplete') {
        flowHandled.current = true;
        setPollStatus(false);
        toast.info('Checkout did not activate this membership. You can try again.');
        removeQueryParameters('membership', 'interval');
      }
      return;
    }

    if (membershipFlow !== 'portal-return') return;
    // Settle only on a status read completed after this mount, never on a cached snapshot.
    if (!statusQuery.isFetchedAfterMount || statusQuery.isFetching || !membership) return;

    const current = { status: membership.status, cancelAtPeriodEnd: membership.cancelAtPeriodEnd };
    if (!portalReturn.current) {
      const opened = takeMembershipPortalBaseline(membership.membershipSubscriptionId);
      portalReturn.current = { state: opened ?? current, openedBaseline: opened !== null };
      // Without that baseline, the page can predate a change that this first read
      // already shows, so the page is read once more.
      if (!opened) void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
    }
    const { state: reference, openedBaseline } = portalReturn.current;
    // An unchanged read proves nothing: the change can still be on its way, or
    // the fan only looked. The bounded poll ends with neutral copy instead.
    if (current.status === reference.status && current.cancelAtPeriodEnd === reference.cancelAtPeriodEnd) return;

    // Any change, such as a repaired payment, refreshes the server-owned page and its posts.
    flowHandled.current = true;
    setPollStatus(false);
    setPollTimedOut(false);
    setNotice(null);
    removeQueryParameters('membership', 'interval');
    refreshAfterMembershipChange(queryClient, username);
    const cancellationObserved =
      (reference.status !== 'canceled' && current.status === 'canceled') ||
      (!reference.cancelAtPeriodEnd && current.cancelAtPeriodEnd);
    const continuationObserved =
      (reference.cancelAtPeriodEnd && !current.cancelAtPeriodEnd) ||
      (reference.status === 'canceled' && current.status !== 'canceled');
    if (cancellationObserved) {
      // The persistent state (ends on date / canceled) renders inline via the standing notice.
      toast.info(membership.status === 'canceled'
        ? 'Your membership is canceled.'
        : 'Your membership renewal is canceled.');
      // A first read after the return cannot show that the Portal visit caused it.
      if (!openedBaseline) return;
      void captureClientEvent('membership_canceled', {
        route: '/profile/[username]',
        source_surface: 'curator',
        curator_id: status.curatorProfileId,
        membership_plan_id: membership.planId,
        billing_interval: membership.billingInterval,
        is_member_view: grantsMembershipAccess(membership.status),
        user_cohort: userCohort,
        device_category: getDeviceCategory(),
      });
    } else if (continuationObserved) {
      setNotice('Your membership will continue.');
    }
  }, [
    membershipFlow,
    queryClient,
    statusQuery.data,
    statusQuery.isFetchedAfterMount,
    statusQuery.isFetching,
    userCohort,
    username,
  ]);

  useEffect(() => {
    if (membershipFlow !== 'canceled') return;
    removeQueryParameters('membership', 'interval');
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
    removeQueryParameters('membership', 'interval');
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
      void startCheckout(page.membership.planId, page.curator.id, checkoutInterval, sourcePostId);
    } else {
      setNotice('You already have a membership with this curator.');
    }
  }, [
    checkoutInterval,
    checkoutIntervalAvailable,
    isAuthenticated,
    membershipFlow,
    page,
    sourcePostId,
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
    void captureClientEvent('membership_join_clicked', {
      route: '/profile/[username]',
      source_surface: 'curator',
      curator_id: page.curator.id,
      membership_plan_id: page.membership.planId,
      post_id: sourcePostId,
      billing_interval: checkoutInterval,
      is_authenticated: isAuthenticated,
      is_member_view: false,
      user_cohort: userCohort,
      device_category: getDeviceCategory(),
    });
    if (!isAuthenticated) {
      try {
        sessionStorage.setItem(
          `${joinIntentPrefix}${page.membership.planId}:${checkoutInterval}`,
          String(Date.now()),
        );
      } catch {
        // The fan can select Join again after signing in.
      }
      const returnQuery = new URLSearchParams({ membership: 'join', interval: checkoutInterval });
      if (sourcePostId) returnQuery.set(SOURCE_POST_PARAM, sourcePostId);
      const returnPath = `/profile/${encodeURIComponent(username)}?${returnQuery}`;
      router.push(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
      return;
    }
    void startCheckout(page.membership.planId, page.curator.id, checkoutInterval, sourcePostId);
  };

  const items = query.data.pages.flatMap((result) => result.posts.items).map((item): ProfileMusicItem =>
    item.kind === 'locked' ? item : { kind: 'post', post: toMusicCardPost(item.post) });
  const displayName = page.curator.displayName?.trim() || page.curator.username;
  const showMembership = Boolean(page.membership || statusQuery.data?.membership?.canManage);
  const bannerInterval = checkoutIntervalAvailable ? checkoutInterval : 'month';
  const bannerPrice = page.membership && (bannerInterval === 'year'
    ? formatCuratorPlanPrice(
        page.membership.annualAmountMinor ?? 0,
        page.membership.annualServiceFeeMinor ?? 0,
        page.membership.currency,
      )
    : formatCuratorPlanPrice(
        page.membership.amountMinor,
        page.membership.serviceFeeMinor,
        page.membership.currency,
      ));

  return (
    <div className="w-full">
      <h1 className="sr-only" id={curatorNameId}>{displayName}</h1>

      <div className="grid gap-6">
        {/* Compact membership summary: mobile-only, sits under the identity header and scrolls to
            the full offer. Join is reserved for the actual checkout control in the card. */}
        {page.membership && !page.viewer.isMember && !page.viewer.isOwner && (
          <a
            href={`#${membershipId}`}
            data-testid="membership-banner"
            className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 transition-colors hover:bg-primary/15 lg:hidden"
          >
            <span className="min-w-0 truncate text-sm font-semibold">
              {page.membership.name}
              <span className="font-normal tabular-nums text-muted-foreground">
                {' · '}
                {bannerPrice}/{bannerInterval}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              View membership
            </span>
          </a>
        )}
        <ProfileMusic
          id={musicId}
          views={curatorMusicViews(page, view)}
          view={view}
          onViewChange={onViewChange}
          items={items}
          pending={false}
          switching={query.isPlaceholderData}
          hasMore={query.hasNextPage}
          loadingMore={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
          isOwner={page.viewer.isOwner}
          canLockPosts={canLockPosts}
          // The page carries only public and members-only posts.
          visibilities={['public', 'subscriber']}
          displayName={displayName}
          ownerUsername={page.curator.username}
          ownerAccountType={page.curator.accountType}
          membershipId={membershipId}
          showMembership={showMembership}
          onLockedPostSelect={selectSourcePost}
        />
        {showMembership && membershipSlot && createPortal(
          <CuratorMembershipCard
            page={page}
            displayName={displayName}
            membershipId={membershipId}
            feedHeadingId={musicId}
            interval={bannerInterval}
            status={statusQuery.data ?? null}
            statusLoading={statusQuery.isPending}
            statusUnavailable={statusQuery.isError}
            authenticated={isAuthenticated}
            activated={activated}
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
            onManage={(membership) => void manage(membership)}
            onCheckStatus={() => void statusQuery.refetch()}
            onViewMemberPosts={() => onViewChange('members')}
            summary={identitySummary}
          />,
          membershipSlot,
        )}
      </div>
    </div>
  );
}

/** A curator page post in the shape the music card reads. */
function toMusicCardPost(post: Extract<CuratorPostItem, { kind: 'post' }>['post']): MusicCardPost {
  return {
    ...post,
    title: post.title.trim() || `${post.elementType} post`,
    subtitle: post.subtitle ?? undefined,
    description: post.description ?? undefined,
    imageUrl: post.imageUrl ?? undefined,
    accountType: post.accountType ?? undefined,
  };
}

function CuratorNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-6">
      <Empty className="w-full border-none">
        <EmptyTitle className="font-teko text-4xl font-bold uppercase">
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
        <EmptyTitle className="font-teko text-4xl font-bold uppercase">
          Could not load curator
        </EmptyTitle>
        <EmptyDescription>Try again in a moment.</EmptyDescription>
        <Button onClick={onRetry} className="mt-3">Try again</Button>
      </Empty>
    </div>
  );
}

/** The music list's skeleton; the profile page draws the rail. */
function CuratorPageSkeleton() {
  return (
    <div aria-label="Loading curator">
      <ActivitySkeleton count={6} />
    </div>
  );
}

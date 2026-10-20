'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthState } from '@/hooks/use-auth';
import { useProviderReturnPoll } from '@/hooks/use-provider-return-poll';
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
  type MembershipStatusView,
  type MembershipSubscription,
} from '@/services/membership';
import { captureClientEvent } from '@/lib/analytics/client';
import { cn } from '@/lib/utils';
import { getDeviceCategory, getUserCohort } from '@/lib/analytics/audience';
import { Button } from '@/components/ui/button';
import { listTabsRowClassName } from '@/components/ui/list-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CuratorMembershipCard,
  MEMBERSHIP_OFFER_ID,
  type UnlockedPost,
} from '@/components/features/curator/curator-membership-card';
import { removeQueryParameters, removeQueryParametersFromRouter } from '@/utils/remove-query-parameters';
import { parseProfileActionIntent } from '@/utils/profile-action-intent';
import { CarriedActionConfirmation } from '@/components/features/curator/carried-action-confirmation';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { tryStorage } from '@/lib/best-effort';

type MembershipFlow = 'join' | 'return' | 'canceled' | 'portal-return' | null;
const joinIntentPrefix = 'cassette:membership-join-intent:';
const joinIntentLifetimeMs = 10 * 60 * 1_000;

function signInToJoin(
  router: ReturnType<typeof useRouter>,
  username: string,
  planId: string,
  interval: MembershipInterval,
  sourcePostId: string | undefined,
) {
  tryStorage(() => sessionStorage.setItem(`${joinIntentPrefix}${planId}:${interval}`, String(Date.now())), undefined);
  const returnQuery = new URLSearchParams({ membership: 'join', interval });
  if (sourcePostId) returnQuery.set(SOURCE_POST_PARAM, sourcePostId);
  const returnPath = `/profile/${encodeURIComponent(username)}?${returnQuery}`;
  router.push(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
}

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
  membershipSlot: HTMLElement | null;
  identitySummary?: ReactNode;
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
  const { user, isLoading: authLoading, isAuthenticated, sessionError } = useAuthState();
  const carried = parseProfileActionIntent(useSearchParams());
  const carriedJoinInterval = carried?.action === 'join' ? carried.interval : null;
  const [confirmingJoin, setConfirmingJoin] = useState(false);
  const carriedJoinHandled = useRef(false);
  const viewerKey = authLoading ? null : (user?.id ?? 'anonymous');
  const query = useCuratorPage(username, viewerKey, curatorPageFilterOf(view));
  const page = query.data?.pages[0];
  const [activated, setActivated] = useState(false);
  const unlocked = useCuratorPage(username, activated ? viewerKey : null, curatorPageFilterOf('members'));
  const [interval, setBillingInterval] = useState(initialInterval);
  const [pollStatus, setPollStatus] = useState(membershipFlow === 'return' || membershipFlow === 'portal-return');
  const [notice, setNotice] = useState<string | null>(
    membershipFlow === 'canceled' ? 'Checkout was canceled. You were not charged.' : null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
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
    const resetPendingAfterBackForwardRestore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setCheckoutPending(false);
      setPortalPending(false);
    };
    window.addEventListener('pageshow', resetPendingAfterBackForwardRestore);
    return () => window.removeEventListener('pageshow', resetPendingAfterBackForwardRestore);
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

  useProviderReturnPoll({
    flow: membershipFlow === 'return' || membershipFlow === 'portal-return' ? membershipFlow : null,
    polling: pollStatus,
    read: statusQuery,
    onTimeout: (flow) => {
      setPollStatus(false);
      setPollTimedOut(true);
      setNotice(flow !== 'portal-return'
        ? 'Your membership update is still processing.'
        : portalReturn.current?.openedBaseline
          ? 'No membership change has reached Cassette yet. A change made in Stripe can take a minute to appear.'
          : 'A change made in Stripe can take a minute to appear here.');
      removeQueryParameters('membership', 'interval');
    },
    onRead: (flow, status) => {
      if (flowHandled.current) return;
      settleMembershipReturn(flow, status);
    },
  });

  function settleMembershipReturn(flow: 'return' | 'portal-return', status: MembershipStatusView) {
    const membership = status.membership;

    if (flow === 'return') {
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

    if (!membership) return;

    const current = { status: membership.status, cancelAtPeriodEnd: membership.cancelAtPeriodEnd };
    if (!portalReturn.current) {
      const opened = takeMembershipPortalBaseline(membership.membershipSubscriptionId);
      portalReturn.current = { state: opened ?? current, openedBaseline: opened !== null };
      if (!opened) void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
    }
    const { state: reference, openedBaseline } = portalReturn.current;
    if (current.status === reference.status && current.cancelAtPeriodEnd === reference.cancelAtPeriodEnd) return;

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
      toast.info(membership.status === 'canceled'
        ? 'Your membership is canceled.'
        : 'Your membership renewal is canceled.');
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
  }

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
    const intentKey = `${joinIntentPrefix}${page.membership.planId}:${checkoutInterval}`;
    const intentCreatedAt = tryStorage(() => {
      const createdAt = Number(sessionStorage.getItem(intentKey));
      sessionStorage.removeItem(intentKey);
      return createdAt;
    }, Number.NaN);
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

  useEffect(() => {
    if (!carriedJoinInterval || carriedJoinHandled.current || authLoading || !page) return;
    const done = () => {
      carriedJoinHandled.current = true;
      removeQueryParametersFromRouter('intent', 'interval');
    };
    if (!page.membership || page.viewer.isOwner) {
      done();
      return;
    }
    if (!isAuthenticated) {
      if (sessionError) return;
      done();
      signInToJoin(router, username, page.membership.planId, carriedJoinInterval, sourcePostId);
      return;
    }
    if (!statusQuery.data) return;

    done();
    if (!statusQuery.data.canSubscribe) {
      setNotice('You already have a membership with this curator.');
      return;
    }
    setBillingInterval(carriedJoinInterval);
    setConfirmingJoin(true);
  }, [authLoading, carriedJoinInterval, isAuthenticated, page, router, sessionError, sourcePostId, statusQuery.data, username]);

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
    if (!page.membership || checkoutPending) return;
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
      signInToJoin(router, username, page.membership.planId, checkoutInterval, sourcePostId);
      return;
    }
    void startCheckout(page.membership.planId, page.curator.id, checkoutInterval, sourcePostId);
  };

  const unlockedPosts = unlocked.data?.pages[0].posts.items.flatMap((item): UnlockedPost[] => item.kind === 'post' ? [{
    postId: item.post.redirectPostId || item.post.postId,
    title: item.post.title.trim() || `${item.post.elementType} post`,
    elementType: item.post.elementType,
    imageUrl: item.post.imageUrl,
    createdAt: item.post.createdAt,
  }] : []) ?? null;
  const items = query.data.pages.flatMap((result) => result.posts.items).map((item): ProfileMusicItem =>
    item.kind === 'locked' ? item : { kind: 'post', post: toMusicCardPost(item.post) });
  const displayName = page.curator.displayName?.trim() || page.curator.username;
  const showMembership = Boolean(page.membership || statusQuery.data?.membership?.canManage);
  const joinInterval = checkoutIntervalAvailable ? checkoutInterval : 'month';
  const joinPrice = page.membership && (joinInterval === 'year'
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
            interval={joinInterval}
            status={statusQuery.data ?? null}
            statusLoading={statusQuery.isPending}
            statusUnavailable={statusQuery.isError}
            authenticated={isAuthenticated}
            activated={activated}
            confirming={membershipFlow === 'return' && pollStatus}
            unlockedPosts={unlockedPosts}
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
        {page.membership && (
          <CarriedActionConfirmation
            open={confirmingJoin}
            onDismiss={() => setConfirmingJoin(false)}
            onConfirm={join}
            title={`Join ${displayName}?`}
            description={`${page.membership.name} · ${joinPrice}/${joinInterval}. You review and pay on the next page.`}
            confirmLabel="Continue to payment"
            returnFocusSelector='[data-testid="membership-join"], [data-testid="membership-compact-join"]'
          />
        )}
      </div>
    </div>
  );
}

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

const TAB_LABEL_WIDTHS = ['w-4', 'w-14', 'w-11', 'w-12'];

export function CuratorPageSkeleton() {
  return (
    <div aria-label="Loading curator">
      {/* ProfileMusic's ListTabs: a curator with more than one type of post gets the type filter. */}
      <div aria-hidden className="mb-5 border-b border-border">
        <div className={cn(listTabsRowClassName, '-mb-px')}>
          {TAB_LABEL_WIDTHS.map((width) => (
            <div key={width} className="flex h-9 items-center px-1">
              <Skeleton className={cn('h-3.5', width)} />
            </div>
          ))}
        </div>
      </div>
      <ActivitySkeleton count={6} />
    </div>
  );
}

/** The phone membership pass while the curator page loads: the plan line with Join, then Plan details. */
export function MembershipPassSkeleton() {
  return (
    <div aria-hidden className="px-4 pt-4 sm:px-6 lg:hidden">
      <div className="card-quiet p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex h-[1.375rem] items-center"><Skeleton className="h-4 w-28" /></div>
            <div className="flex h-[1.203125rem] items-center"><Skeleton className="h-3 w-44" /></div>
          </div>
          <Skeleton className="h-9 w-16 shrink-0" />
        </div>
        <div className="-mx-4 -mb-4 mt-4 border-t border-border/70">
          <div className="flex h-11 items-center px-4">
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

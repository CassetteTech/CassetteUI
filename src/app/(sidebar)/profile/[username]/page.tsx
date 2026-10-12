'use client';

/** Renders the canonical public profile, enriching it with curator membership content when active. */

import { useEffect, useState, useCallback, useMemo, type ComponentProps } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { useUserBio, useUserActivity, useUserLikedPosts, profileQueryKeys } from '@/hooks/use-profile';
import { ProfileHeader } from '@/components/features/profile/profile-header';
import { ProfileOwnerBar } from '@/components/features/profile/profile-owner-bar';
import { ProfileIdentityPass, ProfileSummary } from '@/components/features/profile/profile-identity-pass';
import { ProfileHeaderSkeleton } from '@/components/features/profile/profile-header-skeleton';
import { ProfileTabs, TabType } from '@/components/features/profile/profile-tabs';
import { ProfileActivity, ActivitySkeleton } from '@/components/features/profile/profile-activity';
import { profileService } from '@/services/profile';
import { applyCachedArtwork } from '@/services/profile-artwork-cache';
import { ActivityPost } from '@/types';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { appLogger } from '@/lib/observability/logger';
import { canShareWebContent, shareWebContent } from '@/utils/web-share';
import { PublicCuratorPage } from '@/components/features/curator/curator-page';
import { CuratorFollowContext } from '@/components/features/curator/curator-follow-action';
import { useCuratorPage } from '@/hooks/use-curator';
import { useCuratorFollow } from '@/hooks/use-curator-follow';
import { toast } from 'sonner';
import { useCopyToClipboard } from '@/components/ui/interior/copy-button';

const TAB_ELEMENT_TYPE: Partial<Record<TabType, string>> = {
  playlists: 'Playlist',
  tracks: 'Track',
  artists: 'Artist',
  albums: 'Album',
};

const membershipFlows = ['join', 'return', 'canceled', 'portal-return'] as const;

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuthState();

  const [chosenTab, setActiveTab] = useState<TabType>('playlists');
  const [hasResolvedInitialTab, setHasResolvedInitialTab] = useState(false);
  const [additionalPosts, setAdditionalPosts] = useState<ActivityPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [membershipSlot, setMembershipSlot] = useState<HTMLElement | null>(null);

  const userIdentifier = Array.isArray(username) ? username[0] : username;

  // Check if this is edit mode and determine the actual user to fetch
  const isEditMode = userIdentifier === 'edit';
  const userIdToFetch = isEditMode && user ? user.id : userIdentifier;
  const curatorQuery = useCuratorPage(
    isEditMode ? '' : (userIdentifier ?? ''),
    isEditMode || authLoading ? null : (user?.id ?? 'anonymous'),
  );
  const hasCuratorPage = Boolean(curatorQuery.data?.pages[0]);
  // A cached curator page resolves to the posts feed on first paint, so the
  // membership rail does not flash in after the playlists layout.
  const tabParam = searchParams.get('tab');
  const activeTab: TabType = !hasResolvedInitialTab && hasCuratorPage && (tabParam === null || tabParam === 'posts')
    ? 'posts'
    : chosenTab;
  const membership = membershipFlows.find(
    (flow) => flow === searchParams.get('membership'),
  ) ?? null;
  const membershipInterval = searchParams.get('interval') === 'year' ? 'year' : 'month';
  // One Follow state for every place the profile shows its control.
  const curatorPage = curatorQuery.data?.pages[0];
  const follow = useCuratorFollow(
    curatorPage ? {
      id: curatorPage.curator.id,
      username: curatorPage.curator.username,
      displayName: curatorPage.curator.displayName?.trim() || curatorPage.curator.username,
    } : null,
    curatorPage?.viewer.isOwner ?? false,
    activeTab,
  );

  // Use React Query for bio and activity - handles deduplication automatically
  const {
    data: userBio,
    isLoading: isLoadingBio,
    error: bioError
  } = useUserBio(userIdToFetch);
  const isCurrentUser = Boolean(
    userBio &&
    user &&
    (
      userBio.isOwnProfile ||
      user.id === userBio.id ||
      user.username?.toLowerCase() === userBio.username?.toLowerCase()
    )
  );
  const likedSectionVisible =
    isCurrentUser ||
    (userBio?.likedPostsPrivacy
      ? userBio.likedPostsPrivacy === 'public'
      : userBio?.showLikedPosts !== false);
  const likedTabVisibility: 'public' | 'private' =
    userBio?.likedPostsPrivacy || userBio?.likedPostsVisibility || (userBio?.showLikedPosts === false ? 'private' : 'public');

  const isLikedTab = activeTab === 'liked';
  const likedPostsUserId = userBio?.id || (isEditMode && user ? user.id : undefined);

  const {
    data: regularActivityData,
    isLoading: isLoadingRegularActivity,
    error: regularActivityError
  } = useUserActivity(userIdToFetch, {
    page: 1,
    elementType: TAB_ELEMENT_TYPE[activeTab],
    enabled: !isLikedTab && activeTab !== 'posts' && Boolean(userBio)
  });

  const {
    data: likedActivityData,
    isLoading: isLoadingLikedActivity,
    error: likedActivityError
  } = useUserLikedPosts(likedPostsUserId, {
    page: 1,
    enabled: isLikedTab && likedSectionVisible
  });

  const activityData = isLikedTab ? likedActivityData : regularActivityData;
  const isLoadingActivity = isLikedTab ? isLoadingLikedActivity : isLoadingRegularActivity;
  const activityError = isLikedTab ? likedActivityError : regularActivityError;
  const isLikedTabPrivateError = isLikedTab && activityError?.message === 'Liked posts are private';

  // Combine initial activity with paginated additional posts
  const allActivityPosts = useMemo(() => {
    const initialPosts = activityData?.items ?? [];
    return applyCachedArtwork([...initialPosts, ...additionalPosts]);
  }, [activityData?.items, additionalPosts]);

  const totalItems = activityData?.totalItems ?? 0;

  const updateUrlForTab = useCallback((tab: TabType) => {
    if (!pathname) return;
    const currentTab = searchParams.get('tab');
    if (currentTab === tab) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', tab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setHasResolvedInitialTab(false);
  }, [userIdToFetch]);

  useEffect(() => {
    if (hasResolvedInitialTab || !userIdToFetch) return;
    if (!isEditMode && curatorQuery.isPending) return;

    const validTabs: TabType[] = [
      ...(hasCuratorPage ? ['posts' as TabType] : []),
      'playlists', 'tracks', 'artists', 'albums', 'liked',
    ];
    const hasValidTabParam = tabParam && validTabs.includes(tabParam as TabType);
    const canUseTabParam = hasValidTabParam && !(tabParam === 'liked' && !likedSectionVisible);
    if (canUseTabParam) {
      setActiveTab(tabParam as TabType);
      setHasResolvedInitialTab(true);
      return;
    }

    // Curators land on their posts feed (also the membership checkout return surface).
    // Skip the URL write during membership flows: the curator page strips those
    // params itself and a concurrent router.replace could resurrect them.
    if (hasCuratorPage) {
      setActiveTab('posts');
      setHasResolvedInitialTab(true);
      if (!membership) updateUrlForTab('posts');
      return;
    }

    // Probe only after the bio has settled: likedSectionVisible and
    // likedPostsUserId derive from it, and rerunning before then restarts the
    // chain with stale liked-tab inputs.
    if (isLoadingBio || !userBio) return;

    const tabOrder: Array<{ tab: TabType; elementType?: string }> = [
      { tab: 'playlists', elementType: 'Playlist' },
      { tab: 'tracks', elementType: 'Track' },
      { tab: 'artists', elementType: 'Artist' },
      { tab: 'albums', elementType: 'Album' },
      ...(likedSectionVisible ? [{ tab: 'liked' as TabType }] : []),
    ];

    // fetchQuery dedupes concurrent and recently-completed probes, so a
    // rerun of this effect never re-issues a request for the same tab.
    const PROBE_STALE_TIME = 60 * 1000;
    const probeTab = (candidate: { tab: TabType; elementType?: string }) => {
      if (candidate.tab === 'liked') {
        if (!likedPostsUserId) return Promise.resolve(null);
        return queryClient.fetchQuery({
          queryKey: profileQueryKeys.tabProbe(likedPostsUserId, 'liked'),
          queryFn: () => profileService.fetchUserLikedPosts(likedPostsUserId, { page: 1, pageSize: 1 }),
          staleTime: PROBE_STALE_TIME,
          retry: false,
        });
      }
      return queryClient.fetchQuery({
        queryKey: profileQueryKeys.tabProbe(userIdToFetch, candidate.elementType ?? ''),
        queryFn: () => profileService.fetchUserActivity(userIdToFetch, {
          page: 1,
          pageSize: 1,
          elementType: candidate.elementType,
        }),
        staleTime: PROBE_STALE_TIME,
        retry: false,
      });
    };

    let isCancelled = false;
    const resolveInitialTab = async () => {
      for (const candidate of tabOrder) {
        if (isCancelled) return;
        try {
          const response = await probeTab(candidate);
          if (isCancelled) return;
          if (response && response.totalItems > 0) {
            setActiveTab(candidate.tab);
            setHasResolvedInitialTab(true);
            updateUrlForTab(candidate.tab);
            return;
          }
        } catch {
          // Ignore per-tab fetch errors and continue to next candidate.
        }
      }

      if (isCancelled) return;
      setActiveTab('playlists');
      setHasResolvedInitialTab(true);
      updateUrlForTab('playlists');
    };

    void resolveInitialTab();
    return () => {
      isCancelled = true;
    };
  }, [curatorQuery.isPending, hasCuratorPage, hasResolvedInitialTab, isEditMode, isLoadingBio, likedPostsUserId, likedSectionVisible, membership, queryClient, tabParam, updateUrlForTab, userBio, userIdToFetch]);

  useEffect(() => {
    if (!likedSectionVisible && activeTab === 'liked') {
      setActiveTab('playlists');
      updateUrlForTab('playlists');
    }
  }, [activeTab, likedSectionVisible, updateUrlForTab]);

  // Reset tab pagination when user or tab changes
  useEffect(() => {
    setAdditionalPosts([]);
    setCurrentPage(1);
  }, [userIdToFetch, activeTab]);

  // Load more posts (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || allActivityPosts.length >= totalItems) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const moreActivity = isLikedTab
        ? (
            likedPostsUserId
              ? await profileService.fetchUserLikedPosts(likedPostsUserId, { page: nextPage })
              : { items: [] }
          )
        : (
            userIdToFetch
              ? await profileService.fetchUserActivity(userIdToFetch, {
                  page: nextPage,
                  elementType: TAB_ELEMENT_TYPE[activeTab],
                })
              : { items: [] }
          );

      setAdditionalPosts(prev => [...prev, ...moreActivity.items]);
      setCurrentPage(nextPage);
    } catch (e) {
      appLogger.error('profile_activity_load_more_failed', { error: e, route: '/profile/[username]' });
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    activeTab,
    allActivityPosts.length,
    currentPage,
    isLikedTab,
    isLoadingMore,
    likedPostsUserId,
    totalItems,
    userIdToFetch
  ]);

  const filterByElementType = useCallback((type: TabType) => {
    if (activeTab === type) return;
    if (!hasResolvedInitialTab) setHasResolvedInitialTab(true);
    setActiveTab(type);
    updateUrlForTab(type);
  }, [activeTab, hasResolvedInitialTab, updateUrlForTab]);

  const { copy: copyShareLink, copied: shareLinkCopied } = useCopyToClipboard({
    onError: (error) => {
      appLogger.warn('profile_share_copy_failed', { error, route: '/profile/[username]' });
      toast.error('Could not copy the profile link');
    },
  });

  const handleShare = useCallback(async () => {
    void captureClientEvent('profile_shared', {
      route: `/profile/${userBio?.username || ''}`,
      source_surface: 'profile',
      user_id: user?.id,
      is_authenticated: Boolean(user),
    });

    const shareUrl = `${window.location.origin}/profile/${userBio?.username}`;

    if (canShareWebContent()) {
      try {
        await shareWebContent({
          title: `${userBio?.displayName || userBio?.username}'s Profile`,
          text: `Check out ${userBio?.displayName || userBio?.username}'s music profile on Cassette`,
          url: shareUrl,
        });
      } catch (error) {
        appLogger.warn('profile_share_failed', { error, route: '/profile/[username]' });
      }
    } else {
      await copyShareLink(shareUrl);
    }
  }, [userBio, user, copyShareLink]);

  useEffect(() => {
    if (!userBio) return;

    void captureClientEvent('profile_viewed', {
      route: `/profile/${userBio.username}`,
      source_surface: 'profile',
      user_id: user?.id,
      is_authenticated: Boolean(user),
    });
  }, [userBio, user]);

  const handleAddMusic = useCallback(() => {
    router.push('/studio/music/new');
  }, [router]);

  // Compute loading states
  const showHeaderSkeleton = isLoadingBio && !userBio;
  const showActivitySkeleton = (isLoadingBio || isLoadingActivity) && allActivityPosts.length === 0;

  // Keep privacy filtering on the selected tab payload
  const filteredPosts = allActivityPosts.filter(post => {
    if (!isCurrentUser && post.privacy?.toLowerCase() === 'private') return false;
    return true;
  });
  const displayPosts = filteredPosts;

  // Handle edit mode without auth
  if (isEditMode && !user) {
    return (
      <div className="flex items-center justify-center min-h-svh">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">You must be logged in to edit your profile</p>
          <Button onClick={() => router.push('/auth/login')}>Log in</Button>
        </div>
      </div>
    );
  }

  // Handle errors
  const isProfileNotFound = bioError?.message === 'User not found';
  const error = (isProfileNotFound ? undefined : bioError?.message) || (isLikedTabPrivateError ? undefined : activityError?.message);
  if (error) {
    return (
      <>
        <div className="bg-background lg:hidden">
          <Container className="min-h-svh bg-transparent p-0 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <BackButton variant="button" fallbackRoute="/" />
            </div>
          </Container>
        </div>
        <div className="hidden lg:flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <BackButton variant="button" fallbackRoute="/" />
          </div>
        </div>
      </>
    );
  }

  // Show "not found" only after loading completes and no userBio
  if (isProfileNotFound || (!isLoadingBio && !userBio)) {
    return (
      <>
        <div className="bg-background lg:hidden">
          <Container className="min-h-svh bg-transparent p-0 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">User Not Found</h1>
              <p className="text-muted-foreground mb-4">The profile you&apos;re looking for doesn&apos;t exist.</p>
              <BackButton variant="button" fallbackRoute="/" />
            </div>
          </Container>
        </div>
        <div className="hidden lg:flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">User Not Found</h1>
            <p className="text-muted-foreground mb-4">The profile you&apos;re looking for doesn&apos;t exist.</p>
            <BackButton variant="button" fallbackRoute="/" />
          </div>
        </div>
      </>
    );
  }

  const isPostsTab = activeTab === 'posts' && hasCuratorPage;
  const showRail = Boolean(curatorQuery.data?.pages[0]?.membership);

  // One responsive tree for every tab: the tab strip stays mounted when Posts swaps in, so its
  // underline slides, and the curator posts pane, which owns the Stripe flow effects, mounts once.
  return (
    <CuratorFollowContext.Provider value={follow}>
    <div className="studio-surface min-w-0 flex-1 lg:h-screen lg:overflow-y-auto" data-testid="profile-content-pane">
      <div className="bg-background lg:hidden">
        <div className="mx-auto max-w-4xl">
          {!isCurrentUser && userBio && (
            <div className="px-4 pt-4">
              <BackButton fallbackRoute="/explore" />
            </div>
          )}
          {showHeaderSkeleton ? (
            <ProfileHeaderSkeleton />
          ) : userBio ? (
            <ProfileHeader
              userBio={userBio}
              isCurrentUser={isCurrentUser}
              onShare={handleShare}
              shareCopied={shareLinkCopied}
              onAddMusic={isCurrentUser ? handleAddMusic : undefined}
            />
          ) : null}
        </div>
      </div>
      {/* Tab strip and owner bar run edge to edge, above the content and the rail alike. */}
      <ProfileTabStrip
        showBack={!isCurrentUser && Boolean(userBio)}
        activeTab={activeTab}
        onTabChange={filterByElementType}
        showPostsTab={hasCuratorPage}
        showLikedTab={likedSectionVisible}
        likedTabVisibility={likedTabVisibility}
      />
      {isCurrentUser && userBio && <ProfileOwnerBar username={userBio.username} />}
      {isPostsTab && userBio ? (
        /* Same right rail as Curator Studio; the pass slides between the two pages' spots. */
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 lg:px-8 lg:pt-6 lg:pb-10">
          <div className="min-w-0">
            <PublicCuratorPage
              username={userBio.username}
              membershipFlow={membership}
              initialInterval={membershipInterval}
              membershipSlot={membershipSlot}
              identitySummary={<ProfileSummary user={userBio} />}
            />
          </div>
          {/* One pass in the rail: the membership pass by portal when the curator sells one, else
              the profile pass. The has() guard covers a lapsed member whose manage pass arrives late.
              The top offset clears the sticky tab strip and sits just above the rail's resting spot,
              so a tall column never pushes the pass down on one tab and not the other. */}
          <div className="group lg:sticky lg:top-[5.25rem]">
            <aside
              ref={setMembershipSlot}
              aria-label="Membership"
              className="membership-slot empty:hidden px-4 pb-6 sm:px-6 sm:pb-8 lg:p-0"
            />
            {!showRail && (
              <ProfileIdentityPass
                user={userBio}
                className="hidden lg:block group-has-[.membership-slot:not(:empty)]:hidden"
              />
            )}
          </div>
        </div>
      ) : (
        /* The music tabs keep the activity grid's own padding; the rail matches its top edge. A margin,
           not padding, so the rail sticks at the same spot as on Posts and the pass holds still across tabs. */
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 lg:pr-8">
          <div className="mx-auto min-w-0 max-w-4xl lg:mx-0 lg:max-w-none">
            {showActivitySkeleton ? (
              <div className="p-3 sm:p-4 md:p-6 lg:p-8">
                <ActivitySkeleton count={6} />
              </div>
            ) : isLikedTabPrivateError ? (
              <div className="p-8 text-center text-muted-foreground">
                Liked posts are private
              </div>
            ) : (
              <ProfileActivity
                posts={displayPosts}
                activeTab={activeTab}
                isLoading={isLoadingMore}
                onLoadMore={loadMore}
                hasMore={allActivityPosts.length < totalItems}
                ownerAccountType={userBio?.accountType}
                ownerUsername={userBio?.username}
                isCurrentUser={isCurrentUser}
                currentUserId={user?.id}
              />
            )}
          </div>
          {userBio && (
            <div className="hidden lg:sticky lg:top-[5.25rem] lg:mt-6 lg:block">
              <ProfileIdentityPass user={userBio} />
            </div>
          )}
        </div>
      )}
    </div>
    </CuratorFollowContext.Provider>
  );
}

/** Sticky tab strip with the desktop back control for visitors; phones keep theirs above the masthead. */
function ProfileTabStrip({ showBack, ...tabs }: { showBack: boolean } & ComponentProps<typeof ProfileTabs>) {
  return (
    <div className="sticky top-0 z-10 flex items-end bg-background/80 backdrop-blur-sm">
      {showBack && (
        <div className="hidden pb-2.5 pl-6 lg:block">
          <BackButton fallbackRoute="/explore" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <ProfileTabs {...tabs} />
      </div>
    </div>
  );
}

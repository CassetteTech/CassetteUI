'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { useUserBio, useUserActivity, useUserLikedPosts } from '@/hooks/use-profile';
import { ProfileHeader } from '@/components/features/profile/profile-header';
import { NotificationMenu } from '@/components/layout/notification-menu';
import { ProfileHeaderSkeleton } from '@/components/features/profile/profile-header-skeleton';
import { ProfileTabs, TabType } from '@/components/features/profile/profile-tabs';
import { ProfileActivity, ActivitySkeleton } from '@/components/features/profile/profile-activity';
import { profileService } from '@/services/profile';
import { applyCachedArtwork } from '@/services/profile-artwork-cache';
import { ActivityPost } from '@/types';
import { Container } from '@/components/ui/container';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';

const TAB_ELEMENT_TYPE: Partial<Record<TabType, string>> = {
  playlists: 'Playlist',
  tracks: 'Track',
  artists: 'Artist',
  albums: 'Album',
};

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthState();

  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [hasResolvedInitialTab, setHasResolvedInitialTab] = useState(false);
  const [additionalPosts, setAdditionalPosts] = useState<ActivityPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const userIdentifier = Array.isArray(username) ? username[0] : username;

  // Check if this is edit mode and determine the actual user to fetch
  const isEditMode = userIdentifier === 'edit';
  const userIdToFetch = isEditMode && user ? user.id : userIdentifier;

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
    enabled: !isLikedTab
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

    const tabParam = searchParams.get('tab');
    const validTabs: TabType[] = ['playlists', 'tracks', 'artists', 'albums', 'liked'];
    const hasValidTabParam = tabParam && validTabs.includes(tabParam as TabType);
    const canUseTabParam = hasValidTabParam && !(tabParam === 'liked' && !likedSectionVisible);
    if (canUseTabParam) {
      setActiveTab(tabParam as TabType);
      setHasResolvedInitialTab(true);
      return;
    }

    const tabOrder: Array<{ tab: TabType; elementType?: string }> = [
      { tab: 'playlists', elementType: 'Playlist' },
      { tab: 'tracks', elementType: 'Track' },
      { tab: 'artists', elementType: 'Artist' },
      { tab: 'albums', elementType: 'Album' },
      ...(likedSectionVisible ? [{ tab: 'liked' as TabType }] : []),
    ];

    let isCancelled = false;
    const resolveInitialTab = async () => {
      for (const candidate of tabOrder) {
        if (isCancelled) return;
        try {
          const response = candidate.tab === 'liked'
            ? (
                likedPostsUserId
                  ? await profileService.fetchUserLikedPosts(likedPostsUserId, { page: 1, pageSize: 1 })
                  : null
              )
            : await profileService.fetchUserActivity(userIdToFetch, {
                page: 1,
                pageSize: 1,
                elementType: candidate.elementType,
              });

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
  }, [hasResolvedInitialTab, likedPostsUserId, likedSectionVisible, searchParams, updateUrlForTab, userIdToFetch]);

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
      console.error('Error loading more activity:', e);
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

  const handleShare = useCallback(() => {
    void captureClientEvent('profile_shared', {
      route: `/profile/${userBio?.username || ''}`,
      source_surface: 'profile',
      user_id: user?.id,
      is_authenticated: Boolean(user),
    });

    const shareUrl = `${window.location.origin}/profile/${userBio?.username}`;

    if (navigator.share) {
      navigator.share({
        title: `${userBio?.displayName || userBio?.username}'s Profile`,
        text: `Check out ${userBio?.displayName || userBio?.username}'s music profile on Cassette`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  }, [userBio, user]);

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
    router.push('/add-music');
  }, [router]);

  // Compute loading states
  const showHeaderSkeleton = isLoadingBio && !userBio;
  const showActivitySkeleton = isLoadingActivity && allActivityPosts.length === 0;

  // Keep privacy filtering on the selected tab payload
  const filteredPosts = allActivityPosts.filter(post => {
    if (!isCurrentUser && post.privacy?.toLowerCase() === 'private') return false;
    return true;
  });
  const displayPosts = filteredPosts;

  // Handle edit mode without auth
  if (isEditMode && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">You must be logged in to edit your profile</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  // Handle errors
  const error = bioError?.message || (isLikedTabPrivateError ? undefined : activityError?.message);
  if (error) {
    return (
      <>
        <div className="bg-background lg:hidden">
          <Container className="min-h-screen bg-transparent p-0 flex items-center justify-center">
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
  if (!isLoadingBio && !userBio) {
    return (
      <>
        <div className="bg-background lg:hidden">
          <Container className="min-h-screen bg-transparent p-0 flex items-center justify-center">
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

  return (
    <>
      {/* --- MOBILE & TABLET LAYOUT --- */}
      <div className="bg-background lg:hidden">
        <Container className="bg-transparent p-0">
          <div className="max-w-4xl mx-auto">
            {/* Back button — only for other users' profiles */}
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
                onAddMusic={isCurrentUser ? handleAddMusic : undefined}
              />
            ) : null}
            <div className="sticky top-0 z-10">
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={filterByElementType}
                showLikedTab={likedSectionVisible}
                likedTabVisibility={likedTabVisibility}
              />
            </div>
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
        </Container>
      </div>

      {/* --- DESKTOP LAYOUT --- */}
      <div className="hidden lg:flex lg:flex-1 lg:min-h-0">
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="bg-background/80 backdrop-blur-sm sticky top-0 z-10 border-b flex items-center">
            <div className="flex-1 min-w-0">
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={filterByElementType}
                showLikedTab={likedSectionVisible}
                likedTabVisibility={likedTabVisibility}
              />
            </div>
            {isCurrentUser && (
              <div className="px-4 flex-shrink-0">
                <NotificationMenu />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto" data-testid="profile-content-pane">
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
        </div>
      </div>
    </>
  );
}

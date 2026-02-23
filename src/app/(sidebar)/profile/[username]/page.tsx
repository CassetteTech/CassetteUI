'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { useUserBio, useUserActivity } from '@/hooks/use-profile';
import { ProfileHeader } from '@/components/features/profile/profile-header';
import { ProfileHeaderSkeleton } from '@/components/features/profile/profile-header-skeleton';
import { ProfileTabs, TabType } from '@/components/features/profile/profile-tabs';
import { ProfileActivity, ActivitySkeleton } from '@/components/features/profile/profile-activity';
import { MusicConnectionsStatus } from '@/components/features/music/music-connections-status';
import { profileService } from '@/services/profile';
import { applyCachedArtwork } from '@/services/profile-artwork-cache';
import { ActivityPost } from '@/types';
import { Container } from '@/components/ui/container';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';

const TAB_ELEMENT_TYPE: Record<TabType, string> = {
  playlists: 'Playlist',
  tracks: 'Track',
  artists: 'Artist',
  albums: 'Album',
};

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const { user } = useAuthState();

  const [activeTab, setActiveTab] = useState<TabType>('playlists');
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

  const {
    data: activityData,
    isLoading: isLoadingActivity,
    error: activityError
  } = useUserActivity(userIdToFetch, { page: 1, elementType: TAB_ELEMENT_TYPE[activeTab] });

  // Combine initial activity with paginated additional posts
  const allActivityPosts = useMemo(() => {
    const initialPosts = activityData?.items ?? [];
    return applyCachedArtwork([...initialPosts, ...additionalPosts]);
  }, [activityData?.items, additionalPosts]);

  const totalItems = activityData?.totalItems ?? 0;

  // Determine if current user is viewing their own profile
  const isCurrentUser = useMemo(() => {
    if (!userBio || !user) return false;
    return userBio.isOwnProfile ||
           user.id === userBio.id ||
           user.username?.toLowerCase() === userBio.username?.toLowerCase();
  }, [userBio, user]);

  // Reset tab pagination when user or tab changes
  useEffect(() => {
    setAdditionalPosts([]);
    setCurrentPage(1);
  }, [userIdToFetch, activeTab]);

  // Load more posts (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !userIdToFetch || allActivityPosts.length >= totalItems) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;

      const moreActivity = await profileService.fetchUserActivity(userIdToFetch, {
        page: nextPage,
        elementType: TAB_ELEMENT_TYPE[activeTab],
      });

      setAdditionalPosts(prev => [...prev, ...moreActivity.items]);
      setCurrentPage(nextPage);
    } catch (e) {
      console.error('Error loading more activity:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userIdToFetch, currentPage, isLoadingMore, allActivityPosts.length, totalItems, activeTab]);

  const filterByElementType = useCallback((type: TabType) => {
    if (activeTab === type) return;
    setActiveTab(type);
  }, [activeTab]);

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
  const error = bioError?.message || activityError?.message;
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

  // Keep privacy filtering on the selected tab payload
  const filteredPosts = allActivityPosts.filter(post => {
    if (!isCurrentUser && post.privacy?.toLowerCase() === 'private') return false;
    return true;
  });

  return (
    <>
      {/* --- MOBILE & TABLET LAYOUT --- */}
      <div className="bg-background lg:hidden">
        <Container className="min-h-screen bg-transparent p-0">
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
            {isCurrentUser && !showHeaderSkeleton && (
              <div className="px-4 mb-4">
                <MusicConnectionsStatus
                  variant="profile"
                  platformPreferencesOverride={userBio?.platformPreferences}
                  connectedServicesOverride={userBio?.connectedServices}
                />
              </div>
            )}
            <div className="sticky top-0 z-10">
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={filterByElementType}
              />
            </div>
            {showActivitySkeleton ? (
              <div className="p-3 sm:p-4 md:p-6 lg:p-8">
                <ActivitySkeleton count={6} />
              </div>
            ) : (
              <ProfileActivity
                posts={filteredPosts}
                isLoading={isLoadingMore}
                onLoadMore={loadMore}
                hasMore={allActivityPosts.length < totalItems}
                ownerAccountType={userBio?.accountType}
                isCurrentUser={isCurrentUser}
              />
            )}
          </div>
        </Container>
      </div>

      {/* --- DESKTOP LAYOUT --- */}
      <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
        <div className="bg-background/80 backdrop-blur-sm sticky top-0 z-10 border-b">
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={filterByElementType}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {showActivitySkeleton ? (
            <div className="p-3 sm:p-4 md:p-6 lg:p-8">
              <ActivitySkeleton count={6} />
            </div>
          ) : (
            <ProfileActivity
              posts={filteredPosts}
              isLoading={isLoadingMore}
              onLoadMore={loadMore}
              hasMore={allActivityPosts.length < totalItems}
              ownerAccountType={userBio?.accountType}
              isCurrentUser={isCurrentUser}
            />
          )}
        </div>
      </div>
    </>
  );
}

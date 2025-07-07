'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { ProfileHeader } from '@/components/features/profile/profile-header';
import { ProfileTabs, TabType } from '@/components/features/profile/profile-tabs';
import { ProfileActivity } from '@/components/features/profile/profile-activity';
import { profileService } from '@/services/profile';
import { UserBio, ActivityPost } from '@/types';
import { Container } from '@/components/ui/container';

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const { user } = useAuthState();
  
  const [userBio, setUserBio] = useState<UserBio | null>(null);
  const [activityPosts, setActivityPosts] = useState<ActivityPost[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [lastLoadedUserId, setLastLoadedUserId] = useState<string | null>(null);

  const userIdentifier = Array.isArray(username) ? username[0] : username;

  const loadProfile = useCallback(async () => {
    if (!userIdentifier) return;

    // Check if we already loaded this user's profile
    if (lastLoadedUserId === userIdentifier && userBio) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if this is the current user's profile
      const isEditMode = userIdentifier === 'edit';
      const userIdToFetch = isEditMode && user
        ? user.id
        : userIdentifier;

      const currentUserCheck = user && (
        user.id === userIdToFetch ||
        user.username?.toLowerCase() === userIdToFetch.toLowerCase()
      );

      if (isEditMode && !currentUserCheck) {
        throw new Error('You must be logged in to edit your profile');
      }

      // Fetch user bio
      const bio = await profileService.fetchUserBio(userIdToFetch);
      
      // Fetch all activity types initially
      const activityData = await profileService.fetchUserActivity(userIdToFetch, {
        page: 1,
      });

      // Determine if this is the current user's profile
      // Use both backend isOwnProfile and client-side validation as fallback
      const clientSideCurrentUserCheck = user ? (
        user.id === bio.id ||
        user.username?.toLowerCase() === bio.username?.toLowerCase()
      ) : false;
      const finalIsCurrentUser = bio.isOwnProfile || clientSideCurrentUserCheck;
      
      setUserBio(bio);
      setActivityPosts(activityData.items);
      setTotalItems(activityData.totalItems);
      setCurrentPage(activityData.page);
      setIsCurrentUser(finalIsCurrentUser);
      setLastLoadedUserId(userIdToFetch);
      setActiveTab('playlists'); // Set default tab after loading data
      
    } catch (e) {
      console.error('❌ Error loading profile:', e);
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [userIdentifier, user, userBio, lastLoadedUserId]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !userIdentifier || activityPosts.length >= totalItems) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      
      const moreActivity = await profileService.fetchUserActivity(userIdentifier, {
        page: nextPage,
      });

      setActivityPosts(prev => [...prev, ...moreActivity.items]);
      setCurrentPage(nextPage);
    } catch (e) {
      console.error('❌ Error loading more activity:', e);
      setError(e instanceof Error ? e.message : 'Failed to load more activity');
    } finally {
      setIsLoadingMore(false);
    }
  }, [userIdentifier, currentPage, isLoadingMore, activityPosts.length, totalItems]);

  const filterByElementType = useCallback((type: TabType) => {
    if (activeTab === type) return;
    
    setActiveTab(type);
  }, [activeTab]);

  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/profile/${userBio?.username}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${userBio?.displayName || userBio?.username}&apos;s Profile`,
        text: `Check out ${userBio?.displayName || userBio?.username}&apos;s music profile on Cassette`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
    }
  }, [userBio]);

  const handleAddMusic = useCallback(() => {
    router.push('/add-music');
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (isLoading) {
    return (
      <div className="bg-background">
        <Container className="min-h-screen bg-transparent p-0">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground"></div>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background">
        <Container className="min-h-screen bg-transparent p-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Go Back
            </button>
          </div>
        </Container>
      </div>
    );
  }

  if (!userBio) {
    return (
      <div className="bg-background">
        <Container className="min-h-screen bg-transparent p-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">User Not Found</h1>
            <p className="text-muted-foreground mb-4">The profile you&apos;re looking for doesn&apos;t exist.</p>
            <button
              onClick={() => router.back()}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Go Back
            </button>
          </div>
        </Container>
      </div>
    );
  }

  // Filter posts by element type
  const filteredPosts = activityPosts.filter(post => {
    if (activeTab === 'playlists') return post.elementType.toLowerCase() === 'playlist';
    if (activeTab === 'tracks') return post.elementType.toLowerCase() === 'track';
    if (activeTab === 'artists') return post.elementType.toLowerCase() === 'artist';
    if (activeTab === 'albums') return post.elementType.toLowerCase() === 'album';
    return true;
  });

  return (
    <div className="bg-background">
      <Container className="min-h-screen bg-transparent p-0">
      
      {/* --- MOBILE & TABLET LAYOUT --- */}
      {/* This block will be visible on screens smaller than `lg` (1024px) */}
      <div className="max-w-4xl mx-auto lg:hidden">
        <ProfileHeader
          userBio={userBio}
          isCurrentUser={isCurrentUser}
          onShare={handleShare}
          onAddMusic={isCurrentUser ? handleAddMusic : undefined}
        />
        <div className="sticky top-0 z-10">
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={filterByElementType}
          />
        </div>
        <ProfileActivity
          posts={filteredPosts}
          isLoading={isLoadingMore}
          onLoadMore={loadMore}
          hasMore={activityPosts.length < totalItems}
        />
      </div>

      {/* --- DESKTOP LAYOUT --- */}
      {/* This block is hidden by default and becomes a grid on `lg` screens */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-0 w-full h-full">
        
        {/* Left Column (Profile Sidebar) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-card h-screen overflow-hidden">
          {/* Make the profile header sticky so it stays visible on scroll */}
          <div className="h-full overflow-y-auto">
            <div className="p-6 xl:p-8">
              <ProfileHeader
                userBio={userBio}
                isCurrentUser={isCurrentUser}
                onShare={handleShare}
                onAddMusic={isCurrentUser ? handleAddMusic : undefined}
              />
            </div>
          </div>
        </div>

        {/* Right Column (Tabs and Activity Feed) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-background h-screen overflow-hidden flex flex-col">
          <div className="bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={filterByElementType}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <ProfileActivity
              posts={filteredPosts}
              isLoading={isLoadingMore}
              onLoadMore={loadMore}
              hasMore={activityPosts.length < totalItems}
            />
          </div>
        </div>
      </div>
      </Container>
    </div>
  );
}
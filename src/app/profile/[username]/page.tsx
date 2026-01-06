'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { ProfileHeader } from '@/components/features/profile/profile-header';
import { ProfileTabs, TabType } from '@/components/features/profile/profile-tabs';
import { ProfileActivity } from '@/components/features/profile/profile-activity';
import { MusicConnectionsStatus } from '@/components/features/music/music-connections-status';
import { profileService } from '@/services/profile';
import { apiService } from '@/services/api';
import { UserBio, ActivityPost } from '@/types';
import { Container } from '@/components/ui/container';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppSidebar, AppSidebarSkeleton } from '@/components/layout/app-sidebar';

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
  const enrichedPostIdsRef = useRef(new Set<string>());

  const userIdentifier = Array.isArray(username) ? username[0] : username;

  const getOptimalTab = useCallback((posts: ActivityPost[]): TabType => {
    const tabPriority: TabType[] = ['playlists', 'tracks', 'artists', 'albums'];
    
    for (const tabType of tabPriority) {
      const hasContent = posts.some(post => {
        if (tabType === 'playlists') return post.elementType.toLowerCase() === 'playlist';
        if (tabType === 'tracks') return post.elementType.toLowerCase() === 'track';
        if (tabType === 'artists') return post.elementType.toLowerCase() === 'artist';
        if (tabType === 'albums') return post.elementType.toLowerCase() === 'album';
        return false;
      });
      
      if (hasContent) {
        return tabType;
      }
    }
    
    // Fallback to playlists if no content found
    return 'playlists';
  }, []);

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
      setActiveTab(getOptimalTab(activityData.items)); // Set optimal tab based on content availability
      
    } catch (e) {
      console.error('❌ Error loading profile:', e);
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [userIdentifier, user, userBio, lastLoadedUserId, getOptimalTab]);

  const enrichActivityPosts = useCallback(async (posts: ActivityPost[]) => {
    const resolveText = (...values: Array<string | null | undefined>) => {
      for (const value of values) {
        if (typeof value === 'string' && value.trim() !== '') {
          return value;
        }
      }
      return undefined;
    };

    const resolvePostArtwork = (post: {
      details?: { coverArtUrl?: string; imageUrl?: string };
      platforms?: Record<string, { artworkUrl?: string; imageUrl?: string; coverArtUrl?: string }>;
    }) => {
      if (post.details?.coverArtUrl) return post.details.coverArtUrl;
      if (post.details?.imageUrl) return post.details.imageUrl;
      if (post.platforms) {
        for (const platform of Object.values(post.platforms)) {
          const artwork = resolveText(platform?.artworkUrl, platform?.imageUrl, platform?.coverArtUrl);
          if (artwork) return artwork;
        }
      }
      return undefined;
    };

    const candidates = posts.filter((post) => {
      if (!post.postId || enrichedPostIdsRef.current.has(post.postId)) return false;
      const type = post.elementType?.toLowerCase();
      if (type === 'playlist') return false;
      return !post.imageUrl;
    }).slice(0, 4);

    if (candidates.length === 0) return;

    await Promise.all(
      candidates.map(async (post) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          const result = await apiService.fetchPostById(post.postId, { signal: controller.signal });
          clearTimeout(timeout);

          const resolvedImage = resolvePostArtwork(result);
          if (!resolvedImage) {
            enrichedPostIdsRef.current.add(post.postId);
            return;
          }

          enrichedPostIdsRef.current.add(post.postId);
          setActivityPosts((prev) =>
            prev.map((item) =>
              item.postId === post.postId
                ? { ...item, imageUrl: item.imageUrl ?? resolvedImage }
                : item,
            ),
          );
        } catch {
          enrichedPostIdsRef.current.add(post.postId);
        }
      }),
    );
  }, []);

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

  useEffect(() => {
    if (activityPosts.length > 0) {
      enrichActivityPosts(activityPosts);
    }
  }, [activityPosts, enrichActivityPosts]);


  // Mobile loading states
  if (isLoading) {
    return (
      <>
        {/* Mobile Loading */}
        <div className="bg-background lg:hidden">
          <Container className="min-h-screen bg-transparent p-0">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground"></div>
            </div>
          </Container>
        </div>
        
        {/* Desktop Loading with Sidebar */}
        <div className="hidden lg:block min-h-screen bg-background">
          <SidebarProvider defaultOpen={true}>
            <AppSidebarSkeleton />
            <SidebarInset>
              <div className="flex flex-col h-screen overflow-hidden">
                <div className="flex items-center justify-center flex-1">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground"></div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {/* Mobile Error */}
        <div className="bg-background lg:hidden">
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
        
        {/* Desktop Error with Sidebar */}
        <div className="hidden lg:block min-h-screen bg-background">
          <SidebarProvider defaultOpen={true}>
            <AppSidebarSkeleton />
            <SidebarInset>
              <div className="flex flex-col h-screen overflow-hidden">
                <div className="flex items-center justify-center flex-1">
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
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </>
    );
  }

  if (!userBio) {
    return (
      <>
        {/* Mobile Not Found */}
        <div className="bg-background lg:hidden">
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
        
        {/* Desktop Not Found with Sidebar */}
        <div className="hidden lg:block min-h-screen bg-background">
          <SidebarProvider defaultOpen={true}>
            <AppSidebarSkeleton />
            <SidebarInset>
              <div className="flex flex-col h-screen overflow-hidden">
                <div className="flex items-center justify-center flex-1">
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
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </>
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
    <>
      {/* --- MOBILE & TABLET LAYOUT --- */}
      {/* This block will be visible on screens smaller than `lg` (1024px) */}
      <div className="bg-background lg:hidden">
        <Container className="min-h-screen bg-transparent p-0">
          <div className="max-w-4xl mx-auto">
            <ProfileHeader
              userBio={userBio}
              isCurrentUser={isCurrentUser}
              onShare={handleShare}
              onAddMusic={isCurrentUser ? handleAddMusic : undefined}
            />
            {isCurrentUser && (
              <div className="px-4 mb-4">
                <MusicConnectionsStatus variant="profile" />
              </div>
            )}
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
        </Container>
      </div>

      {/* --- DESKTOP LAYOUT --- */}
      {/* This block is hidden by default and becomes visible on `lg` screens */}
      <div className="hidden lg:block min-h-screen bg-background">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          
          {/* Main Content Area */}
          <SidebarInset>
            <div className="flex flex-col h-screen overflow-hidden">
              <div className="bg-background/80 backdrop-blur-sm sticky top-0 z-10 border-b">
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
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
            

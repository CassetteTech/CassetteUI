'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { profileService } from '@/services/profile';
import { UserBio, ActivityPost } from '@/types';
import Image from 'next/image';
import Link from 'next/link';

type TabType = 'playlists' | 'tracks' | 'artists' | 'albums';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthState();
  
  const [userBio, setUserBio] = useState<UserBio | null>(null);
  const [activityPosts, setActivityPosts] = useState<ActivityPost[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user bio using current user's ID
      const bio = await profileService.fetchUserBio(user.id);
      
      // Fetch all activity types initially
      const activityData = await profileService.fetchUserActivity(user.id, {
        page: 1,
      });

      setUserBio(bio);
      setActivityPosts(activityData.items);
      setTotalItems(activityData.totalItems);
      setCurrentPage(activityData.page);
      setIsCurrentUser(true); // This is always the current user's own profile
      setActiveTab('playlists'); // Set default tab after loading data
    } catch (e) {
      console.error('❌ Error loading profile:', e);
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !user?.id || activityPosts.length >= totalItems) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      
      const moreActivity = await profileService.fetchUserActivity(user.id, {
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
  }, [user?.id, currentPage, isLoadingMore, activityPosts.length, totalItems]);

  const filterByElementType = useCallback((type: TabType) => {
    if (activeTab === type) return;
    setActiveTab(type);
  }, [activeTab]);

  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/profile/${userBio?.username}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${userBio?.displayName || userBio?.username}'s Profile`,
        text: `Check out ${userBio?.displayName || userBio?.username}'s music profile on Cassette`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      // Could add a toast notification here
    }
  }, [userBio]);

  const handleAddMusic = useCallback(() => {
    router.push('/add-music');
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      if (user?.id) {
        loadProfile();
      } else {
        console.log('❌ [ProfilePage] No user found, redirecting to signin');
        router.replace('/auth/signin');
      }
    }
  }, [authLoading, user?.id, loadProfile, router]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white font-atkinson">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!userBio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-300 mb-6">Unable to load your profile data.</p>
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            Go Back
          </button>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]">
      {/* Header with Logo and Menu */}
      <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Image
            src="/images/cassette_logo.png"
            alt="Cassette"
            width={120}
            height={32}
            className="h-8 w-auto"
          />
        </div>
        <button className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-[#1a1a1a] text-white p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white/20 overflow-hidden bg-gray-700">
                {userBio.avatarUrl ? (
                  <Image
                    src={userBio.avatarUrl}
                    alt={userBio.username}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {userBio.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl md:text-2xl font-atkinson font-bold text-white truncate">
                  {userBio.displayName || userBio.username}
                </h1>
                {isCurrentUser && (
                  <Link 
                    href="/profile/edit" 
                    className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Image 
                      src="/images/ic_edit.png" 
                      alt="Edit" 
                      width={20} 
                      height={20}
                      className="opacity-80 hover:opacity-100"
                    />
                  </Link>
                )}
              </div>
              
              <p className="text-sm md:text-base text-white/80 mb-2 font-atkinson">
                @{userBio.username}
              </p>
              
              {userBio.bio && (
                <p className="text-sm md:text-base text-white/95 mb-4 font-atkinson leading-relaxed">
                  {userBio.bio}
                </p>
              )}
              
              {/* Connected Services */}
              {userBio.connectedServices && userBio.connectedServices.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  {userBio.connectedServices.map((service, index) => (
                    <div
                      key={`${service.serviceType}-${index}`}
                      className={`flex-shrink-0 w-7 h-7 rounded-full p-1.5 ${
                        service.serviceType.toLowerCase() === 'spotify' ? 'bg-green-500' :
                        service.serviceType.toLowerCase() === 'apple' ? 'bg-gray-700' :
                        service.serviceType.toLowerCase() === 'youtube' ? 'bg-red-500' :
                        service.serviceType.toLowerCase() === 'tidal' ? 'bg-blue-500' :
                        service.serviceType.toLowerCase() === 'deezer' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}
                    >
                      <Image
                        src={`/images/social_images/ic_${service.serviceType.toLowerCase()}.png`}
                        alt={service.serviceType}
                        width={16}
                        height={16}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-atkinson font-bold transition-all transform hover:scale-105"
                >
                  <Image 
                    src="/images/ic_share.png" 
                    alt="Share" 
                    width={16} 
                    height={16}
                    className="opacity-90"
                  />
                  Share Profile
                </button>
                
                {isCurrentUser && (
                  <button
                    onClick={handleAddMusic}
                    className="flex items-center justify-center gap-2 bg-transparent border-2 border-white/20 text-white px-4 py-2.5 rounded-lg text-sm font-atkinson font-bold hover:bg-white/10 hover:border-white/30 transition-all transform hover:scale-105"
                  >
                    <Image 
                      src="/images/ic_music.png" 
                      alt="Add Music" 
                      width={16} 
                      height={16}
                      className="opacity-90"
                    />
                    Add Music
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Profile Tabs */}
        <div className="bg-[#1a1a1a] border-b border-white/10 sticky top-0 z-10">
          <div className="flex">
            {[
              { key: 'playlists' as TabType, label: 'Playlists' },
              { key: 'tracks' as TabType, label: 'Songs' },
              { key: 'artists' as TabType, label: 'Artists' },
              { key: 'albums' as TabType, label: 'Albums' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => filterByElementType(tab.key)}
                className={`flex-1 py-3 px-4 text-sm font-atkinson font-bold transition-colors ${
                  activeTab === tab.key
                    ? 'text-white border-b-2 border-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Profile Activity */}
        <div className="p-4">
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 mb-4 opacity-50">
                <Image
                  src="/images/ic_music.png"
                  alt="No music"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-gray-400 text-lg font-atkinson">No {activeTab} to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <ActivityPostItem key={post.postId} post={post} />
              ))}
            </div>
          )}
          
          {activityPosts.length < totalItems && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-atkinson font-bold disabled:opacity-50 transition-all transform hover:scale-105"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityPostItem({ post }: { post: ActivityPost }) {
  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      track: '🎵',
      playlist: '📋',
      artist: '👤',
      album: '💿',
    };
    return iconMap[type.toLowerCase()] || '❓';
  };

  const getNavigationPath = (post: ActivityPost) => {
    const type = post.elementType.toLowerCase();
    switch (type) {
      case 'track':
        return `/track/${post.postId}`;
      case 'artist':
        return `/artist/${post.postId}`;
      case 'album':
        return `/album/${post.postId}`;
      case 'playlist':
        return `/playlist/${post.postId}`;
      default:
        return '#';
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}${getNavigationPath(post)}`;
    
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: `Check out "${post.title}" on Cassette`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <Link href={getNavigationPath(post)} className="block">
      <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/10 border border-white/10 hover:from-white/10 hover:to-white/15 hover:border-white/20 transition-all transform hover:scale-[1.02]">
        <div className="flex gap-4">
          {/* Artwork */}
          <div className="flex-shrink-0">
            {post.imageUrl ? (
              <Image
                src={post.imageUrl}
                alt={post.title}
                width={100}
                height={100}
                className="w-20 h-20 md:w-25 md:h-25 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 md:w-25 md:h-25 rounded-lg bg-gray-700 flex items-center justify-center">
                <Image
                  src="/images/ic_music.png"
                  alt="Music"
                  width={24}
                  height={24}
                  className="opacity-50"
                />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                {/* Type Badge */}
                <div className="inline-flex items-center gap-1 px-2 py-1 mb-2 bg-red-500/10 border border-red-500/20 rounded text-xs font-atkinson font-bold text-red-400">
                  <span>{getTypeIcon(post.elementType)}</span>
                  {post.elementType.toUpperCase()}
                </div>
                
                {/* Title */}
                <h3 className="text-white font-atkinson font-bold text-base md:text-lg mb-1 truncate">
                  {post.title}
                </h3>
              </div>
              
              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex-shrink-0 w-8 h-8 bg-[#1a1a1a] border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors ml-3"
              >
                <Image
                  src="/images/ic_share.png"
                  alt="Share"
                  width={12}
                  height={12}
                  className="opacity-80"
                />
              </button>
            </div>
            
            {/* Subtitle */}
            {post.subtitle && (
              <p className="text-gray-300 text-sm mb-2 font-atkinson leading-relaxed line-clamp-2">
                {post.subtitle}
              </p>
            )}
            
            {/* From User */}
            <p className="text-gray-400 text-xs font-atkinson">
              <span className="text-gray-500">from: </span>
              <span className="text-gray-300 font-bold underline">{post.username}</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
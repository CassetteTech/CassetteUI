'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ActivityPost } from '@/types';
import { Card } from '@/components/ui/card';
import { AnimatedButton } from '@/components/ui/animated-button';

interface ProfileActivityProps {
  posts: ActivityPost[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ProfileActivity({ 
  posts, 
  isLoading = false, 
  onLoadMore,
  hasMore = false 
}: ProfileActivityProps) {
  if (isLoading && posts.length === 0) {
    return (
      <div className="p-6">
        <ActivitySkeleton />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 mb-4 opacity-50">
          <Image
            src="/images/ic_music.png"
            alt="No music"
            width={64}
            height={64}
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-gray-400 text-lg">No items to display</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-4">
        {posts.map((post) => (
          <ActivityPostItem key={post.postId} post={post} />
        ))}
      </div>
      
      {hasMore && onLoadMore && (
        <div className="flex justify-center mt-6">
          <AnimatedButton
            onClick={onLoadMore}
            disabled={isLoading}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </AnimatedButton>
        </div>
      )}
    </div>
  );
}

function ActivityPostItem({ post }: { post: ActivityPost }) {
  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      track: 'music_note',
      playlist: 'playlist_play',
      artist: 'person',
      album: 'album',
    };
    return iconMap[type.toLowerCase()] || 'help';
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

  const handleShare = () => {
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
      // You could add a toast notification here
    }
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow bg-gradient-to-br from-cream/5 to-white/5 border border-white/10">
      <Link href={getNavigationPath(post)} className="block">
        <div className="flex gap-4">
          {/* Artwork */}
          <div className="flex-shrink-0">
            {post.imageUrl ? (
              <Image
                src={post.imageUrl}
                alt={post.title}
                width={120}
                height={120}
                className="w-20 h-20 md:w-28 md:h-28 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-lg bg-gray-700 flex items-center justify-center">
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
                <div className="inline-flex items-center gap-1 px-2 py-1 mb-2 bg-red-500/10 border border-red-500/20 rounded text-xs font-bold text-red-400">
                  <span className="material-icons text-xs">
                    {getTypeIcon(post.elementType)}
                  </span>
                  {post.elementType.toUpperCase()}
                </div>
                
                {/* Title */}
                <h3 className="text-white font-semibold text-base md:text-lg mb-1 truncate">
                  {post.title}
                </h3>
              </div>
              
              {/* Share Button */}
              <AnimatedButton
                onClick={() => {
                  handleShare();
                }}
                className="flex-shrink-0 w-10 h-7 bg-[#1a1a1a] border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Image
                  src="/images/ic_share.png"
                  alt="Share"
                  width={12}
                  height={12}
                  className="opacity-80"
                />
              </AnimatedButton>
            </div>
            
            {/* Subtitle */}
            {post.subtitle && (
              <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                {post.subtitle}
              </p>
            )}
            
            {/* From User */}
            <p className="text-gray-400 text-xs">
              <span className="text-gray-500">from: </span>
              <span className="text-gray-300">{post.username}</span>
            </p>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="p-4 bg-gradient-to-br from-cream/5 to-white/5 border border-white/10">
          <div className="flex gap-4 animate-pulse">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-gray-700 rounded-lg" />
            <div className="flex-1">
              <div className="w-16 h-4 bg-gray-700 rounded mb-2" />
              <div className="w-3/4 h-6 bg-gray-700 rounded mb-2" />
              <div className="w-1/2 h-4 bg-gray-700 rounded mb-2" />
              <div className="w-1/3 h-3 bg-gray-700 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
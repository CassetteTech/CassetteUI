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
      <div className="min-h-screen lg:min-h-0 lg:h-full">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          <ActivitySkeleton />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="min-h-screen lg:min-h-0 lg:h-full">
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center h-full">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50">
            <Image
              src="/images/ic_music.png"
              alt="No music"
              width={64}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-muted-foreground text-base sm:text-lg">No items to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full">
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
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

  const getNavigationPath = (post: ActivityPost) =>
    post.postId ? `/post?id=${post.postId}` : '#';

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
  const detailText = post.description ?? post.subtitle;

  return (
    <Card className="p-3 sm:p-4 hover:shadow-lg transition-all duration-200 bg-card/60 backdrop-blur-sm hover:bg-card/80">
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
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-lg bg-muted/40 flex items-center justify-center">
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
                <div className="inline-flex items-center gap-1 px-2 py-1 mb-2 bg-red-500/15 border border-red-500/30 rounded text-xs font-bold text-red-600">
                  <span className="material-icons text-xs">
                    {getTypeIcon(post.elementType)}
                  </span>
                  {post.elementType.toUpperCase()}
                </div>
                
                {/* Title */}
                <h3 className="text-foreground font-semibold text-sm sm:text-base md:text-lg mb-1 truncate">
                  {post.title}
                </h3>
              </div>
              
              {/* Share Button */}
              <AnimatedButton
                onClick={() => {
                  handleShare();
                }}
                className="flex-shrink-0 w-8 h-6 sm:w-10 sm:h-7 bg-card/60 border border-border/50 rounded-lg flex items-center justify-center hover:bg-card/80 transition-colors"
              >
                <Image
                  src="/images/ic_share.png"
                  alt="Share"
                  width={10}
                  height={10}
                  className="sm:w-3 sm:h-3 opacity-70"
                />
              </AnimatedButton>
            </div>
            
            {/* Subtitle */}
            {detailText && (
              <p className="text-muted-foreground text-xs sm:text-sm mb-2 line-clamp-2">
                {detailText}
              </p>
            )}
            
            {/* From User */}
            <p className="text-muted-foreground/80 text-xs">
              <span className="text-muted-foreground/60">from: </span>
              <span className="text-muted-foreground">{post.username}</span>
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
        <Card key={index} className="p-3 sm:p-4 bg-card/60 backdrop-blur-sm">
          <div className="flex gap-3 sm:gap-4 animate-pulse">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 bg-muted/40 rounded-lg" />
            <div className="flex-1">
              <div className="w-12 sm:w-16 h-3 sm:h-4 bg-muted/40 rounded mb-2" />
              <div className="w-3/4 h-4 sm:h-6 bg-muted/40 rounded mb-2" />
              <div className="w-1/2 h-3 sm:h-4 bg-muted/40 rounded mb-2" />
              <div className="w-1/3 h-2 sm:h-3 bg-muted/40 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

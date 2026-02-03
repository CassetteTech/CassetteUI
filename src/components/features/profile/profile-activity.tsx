'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ActivityPost, AccountType } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VerificationBadge } from '@/components/ui/verification-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditPostModal } from '@/components/features/post/edit-post-modal';
import { DeletePostModal } from '@/components/features/post/delete-post-modal';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface ProfileActivityProps {
  posts: ActivityPost[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  ownerAccountType?: AccountType | number;
  isCurrentUser?: boolean;
}

export function ProfileActivity({
  posts,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  ownerAccountType,
  isCurrentUser = false
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
            <ActivityPostItem key={post.postId} post={post} accountType={ownerAccountType} isOwnPost={isCurrentUser} />
          ))}
        </div>
        
        {hasMore && onLoadMore && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityPostItem({ post, accountType, isOwnPost = false }: { post: ActivityPost; accountType?: AccountType | number; isOwnPost?: boolean }) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    }
  };
  // Only use description if it's a non-empty user-provided value
  const hasDescription = post.description && post.description.trim().length > 0;
  const detailText = hasDescription ? post.description : post.subtitle;

  return (
    <>
      <Card className="p-3 sm:p-4 hover:shadow-lg transition-all duration-200 bg-card/60 backdrop-blur-sm hover:bg-card/80">
        <Link href={getNavigationPath(post)} className="block">
          <div className="flex gap-4">
            {/* Artwork - Fixed dimensions to prevent layout shift */}
            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28">
              {post.imageUrl ? (
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  width={120}
                  height={120}
                  className="w-full h-full rounded-lg object-cover"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJoc2woMjQwLCA0LjglLCA4My45JSkiLz48L3N2Zz4="
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-muted/40 flex items-center justify-center">
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

                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Share Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      handleShare();
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9"
                  >
                    <Image
                      src="/images/ic_share.png"
                      alt="Share"
                      width={14}
                      height={14}
                      className="opacity-70"
                    />
                  </Button>

                  {/* More Menu (only for own posts) */}
                  {isOwnPost && (
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.preventDefault()}
                          className="w-8 h-8 sm:w-9 sm:h-9"
                        >
                          <MoreVertical className="h-4 w-4 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            setDropdownOpen(false);
                            setEditModalOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            setDropdownOpen(false);
                            setDeleteModalOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Subtitle */}
              {detailText && (
                <p className="text-muted-foreground text-xs sm:text-sm mb-2 line-clamp-2">
                  {detailText}
                </p>
              )}

              {/* From User */}
              <div className="flex items-center gap-1 text-muted-foreground/80 text-xs">
                <span className="text-muted-foreground/60">from: </span>
                <span className="text-muted-foreground">{post.username}</span>
                <VerificationBadge accountType={accountType} size="sm" />
                {post.createdAt && (
                  <>
                    <span className="text-muted-foreground/60 mx-1">·</span>
                    <span className="text-muted-foreground/60">{formatRelativeTime(post.createdAt)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Link>
      </Card>

      {/* Edit Modal - always render to allow Radix UI animations */}
      <EditPostModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        postId={post.postId}
        currentDescription={post.description || ''}
      />

      {/* Delete Modal - always render to allow Radix UI animations */}
      <DeletePostModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        postId={post.postId}
        postTitle={post.title}
      />
    </>
  );
}

export function ActivitySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-3 sm:p-4 bg-card/60 backdrop-blur-sm">
          <div className="flex gap-3 sm:gap-4 animate-pulse">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 bg-muted/40 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
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

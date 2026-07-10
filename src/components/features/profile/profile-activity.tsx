'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
import { Disc3, ListMusic, Lock, MoreHorizontal, Music, Pencil, Repeat2, Share, Trash2, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ProfileActivityProps {
  posts: ActivityPost[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  ownerAccountType?: AccountType | number | string;
  ownerUsername?: string;
  isCurrentUser?: boolean;
  currentUserId?: string;
}

export function ProfileActivity({
  posts,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  ownerAccountType,
  ownerUsername,
  isCurrentUser = false,
  currentUserId
}: ProfileActivityProps) {
  if (isLoading && posts.length === 0) {
    return (
      <div className="lg:h-full">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          <ActivitySkeleton />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="lg:h-full">
        <div className="flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 text-center h-full">
          <div className="w-full max-w-sm">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground border-t-2 border-dashed border-foreground/20 py-5">
              — Nothing on this side yet —
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {posts.map((post) => (
            <ActivityPostItem
              key={post.postId}
              post={post}
              ownerAccountType={ownerAccountType}
              ownerUsername={ownerUsername}
              isOwnPost={
                isCurrentUser &&
                !!currentUserId &&
                !!post.userId &&
                post.userId.toLowerCase() === currentUserId.toLowerCase()
              }
            />
          ))}
        </div>
        
        {hasMore && onLoadMore && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoading}
              className="rounded-md border border-border bg-transparent px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? 'Loading…' : 'Load more +'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityPostItem({
  post,
  ownerAccountType,
  ownerUsername,
  isOwnPost = false,
}: {
  post: ActivityPost;
  ownerAccountType?: AccountType | number | string;
  ownerUsername?: string;
  isOwnPost?: boolean;
}) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [failedArtworkUrl, setFailedArtworkUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getTypeIcon = (type: string): LucideIcon => {
    const iconMap: Record<string, LucideIcon> = {
      track: Music,
      playlist: ListMusic,
      artist: User,
      album: Disc3,
    };
    return iconMap[type.toLowerCase()] || Music;
  };
  const TypeIcon = getTypeIcon(post.elementType);

  const getNavigationPath = (post: ActivityPost) => {
    const targetPostId = post.redirectPostId || post.postId;
    if (!targetPostId) return '#';
    const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return `/post/${targetPostId}?from=${encodeURIComponent(currentPath)}`;
  };

  const handleShare = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/post/${post.postId}`;

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

  const sourceUsername = post.isRepost
    ? (
      post.originalPostOwnerUsername ||
      post.originalUsername ||
      post.username
    )
    : post.username;
  const ownerAccountTypeApplies =
    !!ownerUsername && sourceUsername.toLowerCase() === ownerUsername.toLowerCase();
  const sourceAccountType = post.isRepost
    ? post.originalPostOwnerAccountType
    : post.accountType;
  const displayedAccountType =
    sourceAccountType ?? (ownerAccountTypeApplies ? ownerAccountType : undefined);

  // Only use description if it's a non-empty user-provided value
  const hasDescription = post.description && post.description.trim().length > 0;
  const detailText = hasDescription ? post.description : post.subtitle;
  const artworkUrl = post.imageUrl?.trim();

  return (
    <>
      <Card className="group relative gap-0 sm:gap-0 p-0 sm:p-0 overflow-hidden rounded-lg bg-card border-border/70 font-atkinson elev-1 hover:border-foreground/30 transition-colors duration-200">
        {/* prefetch={false}: viewport prefetch runs /post/[id] generateMetadata on the
            server, bursting one Bridge GetPost per visible card (see 2026-07-08 prod
            latency investigation). Cards navigate fine without route prefetch. */}
        <Link href={getNavigationPath(post)} prefetch={false} className="block px-3 sm:px-4 py-3">
          <div className="flex gap-3 sm:gap-4 items-start">
            {/* Artwork with overlaid type badge */}
            <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 relative">
              {artworkUrl && artworkUrl !== failedArtworkUrl ? (
                <Image
                  src={artworkUrl}
                  alt={post.title}
                  width={128}
                  height={128}
                  className="w-full h-full rounded-md object-cover ring-1 ring-border/40"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJoc2woMjQwLCA0LjglLCA4My45JSkiLz48L3N2Zz4="
                  onError={() => setFailedArtworkUrl(artworkUrl)}
                />
              ) : (
                <div className="w-full h-full rounded-md bg-muted/60 ring-1 ring-border/40 flex items-center justify-center">
                  <Music className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                </div>
              )}
              {/* Type chip overlaid on artwork — mono annotation voice */}
              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-md font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/80 ring-1 ring-border/50">
                <TypeIcon className="h-2.5 w-2.5" aria-hidden="true" />
                {post.elementType}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Top row: attribution + actions */}
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  {/* Repost caption — only rendered when isRepost; sits above original poster */}
                  {post.isRepost && (
                    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/80 mb-1 min-w-0">
                      <Repeat2 className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        reposted by{' '}
                        <span className="text-foreground/70">@{post.username}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground min-w-0">
                    <span className="font-bold text-foreground/80 truncate">@{sourceUsername}</span>
                    <VerificationBadge accountType={displayedAccountType} size="sm" />
                    {post.createdAt && (
                      <>
                        <span className="text-muted-foreground/50 flex-shrink-0">/</span>
                        <span className="flex-shrink-0">
                          {formatRelativeTime(post.createdAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center -mt-1 -mr-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      handleShare();
                    }}
                    className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                    aria-label="Share"
                  >
                    <Share className="h-4 w-4" />
                  </Button>

                  {isOwnPost && (
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.preventDefault()}
                          className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
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

              {/* Title — the hero, set in the display face like Explore/post pages */}
              <h3 className="font-teko text-2xl uppercase leading-[0.95] tracking-tight text-foreground line-clamp-2 mt-1.5">
                {post.title}
              </h3>

              {/* Description (optional) */}
              {detailText && (
                <p className="text-muted-foreground text-sm italic line-clamp-2 leading-snug mt-1">
                  {detailText}
                </p>
              )}

              {/* Private flag (own private posts only) */}
              {isOwnPost && post.privacy?.toLowerCase() === 'private' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground ring-1 ring-border/40 self-start mt-1.5">
                  <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                  Private
                </span>
              )}
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
        currentPrivacy={post.privacy}
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="gap-0 sm:gap-0 p-0 sm:p-0 rounded-lg bg-card border-border/70 elev-1">
          <div className="flex gap-3 sm:gap-4 items-start px-3 sm:px-4 py-3 animate-pulse">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-muted/50 rounded-md flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="w-1/2 h-3 bg-muted/40 rounded" />
              <div className="w-3/4 h-5 bg-muted/50 rounded" />
              <div className="w-1/3 h-3 bg-muted/40 rounded" />
              <div className="w-16 h-5 bg-muted/40 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

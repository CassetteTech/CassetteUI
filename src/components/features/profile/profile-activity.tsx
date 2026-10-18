'use client';

import Link from 'next/link';
import { PostLink } from '@/components/features/post/post-link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ActivityPost, AccountType } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { PostQuickActions } from '@/components/features/post/post-quick-actions';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { LockKeyhole, Repeat2, Share } from 'lucide-react';
import type { TabType } from './profile-tabs';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { cn } from '@/lib/utils';
import { appLogger } from '@/lib/observability/logger';
import { canShareWebContent, shareWebContent } from '@/utils/web-share';
import { PendingLabel } from '@/components/ui/interior/loading-button';

interface ProfileActivityProps {
  posts: ActivityPost[];
  activeTab: TabType;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  ownerAccountType?: AccountType;
  ownerUsername?: string;
  /** The owner's own view: changes only the empty copy, never the rows. */
  isCurrentUser?: boolean;
}

const TAB_LABELS = {
  music: 'music',
  liked: 'liked posts',
} satisfies Record<TabType, string>;

export function ProfileActivity({
  posts,
  activeTab,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  ownerAccountType,
  ownerUsername,
  isCurrentUser = false,
}: ProfileActivityProps) {
  if (isLoading && posts.length === 0) {
    return <ActivitySkeleton />;
  }

  if (posts.length === 0) {
    const label = TAB_LABELS[activeTab];
    const title = `No ${label} yet`;
    const description = isCurrentUser
      ? activeTab === 'liked'
        ? 'Posts you like will appear here.'
        : `Add ${label} to start building your profile.`
      : activeTab === 'liked'
        ? `@${ownerUsername || 'this user'} has not liked any public posts yet.`
        : `@${ownerUsername || 'this user'} has not shared any ${label} yet.`;

    return (
      <div>
        <Empty className="motion-safe:animate-reveal">
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
          {isCurrentUser && activeTab !== 'liked' && (
            <Button asChild>
              <Link href="/studio/music/new">Add music</Link>
            </Button>
          )}
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <div>
        <div className="divide-y divide-border motion-safe:animate-reveal">
          {posts.map((post) => (
            <MusicPostCard
              key={post.postId}
              post={post}
              ownerAccountType={ownerAccountType}
              ownerUsername={ownerUsername}
            />
          ))}
        </div>
        
        {hasMore && onLoadMore && (
          <div className="flex justify-center mt-6">
            <Button type="button" variant="outline" onClick={onLoadMore} disabled={isLoading}>
              <PendingLabel pending={isLoading} label="Load more" pendingLabel="Loading…" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const rowArtwork = 'size-16 shrink-0 rounded-md outline outline-1 -outline-offset-1 outline-black/10 sm:size-20 dark:outline-white/10';

/** The small label after a title: who can open the post. The red tint is the brand label. */
const titleLabel = 'ml-2 inline-flex rounded-sm px-1.5 py-0.5 align-[0.125em] text-[11px] font-medium leading-none';

export type MusicCardPost = Pick<
  ActivityPost,
  | 'postId'
  | 'redirectPostId'
  | 'isRepost'
  | 'originalUsername'
  | 'originalPostOwnerUsername'
  | 'originalPostOwnerAccountType'
  | 'elementType'
  | 'title'
  | 'subtitle'
  | 'description'
  | 'imageUrl'
  | 'privacy'
  | 'username'
  | 'createdAt'
  | 'commentsEnabled'
  | 'accountType'
>;

export function MusicPostCard({
  post,
  ownerAccountType,
  ownerUsername,
}: {
  post: MusicCardPost;
  ownerAccountType?: AccountType;
  ownerUsername?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getNavigationPath = (post: MusicCardPost) => {
    const targetPostId = post.redirectPostId || post.postId;
    if (!targetPostId) return '#';
    const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return `/post/${targetPostId}?from=${encodeURIComponent(currentPath)}`;
  };

  const handleShare = async () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/post/${post.postId}`;

    if (canShareWebContent()) {
      try {
        await shareWebContent({
          title: post.title,
          text: `Check out "${post.title}" on Cassette`,
          url: shareUrl,
        });
      } catch (error) {
        appLogger.warn('profile_activity_share_failed', { error, route: '/profile/[username]' });
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (error) {
        appLogger.warn('profile_activity_share_copy_failed', { error, route: '/profile/[username]' });
      }
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
  // The page owner's own posts need no byline; reposts and liked posts name their author.
  const showAuthor = !ownerUsername || sourceUsername.toLowerCase() !== ownerUsername.toLowerCase();

  const note = post.description?.trim();
  const type = post.elementType.charAt(0).toUpperCase() + post.elementType.slice(1).toLowerCase();
  const details = [type, post.subtitle?.trim()].filter(Boolean).join(' · ');

  const actions = (
    <div className="-my-1 -mr-2 flex flex-shrink-0 items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          void handleShare();
        }}
        className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Share"
      >
        <Share className="size-4" />
      </Button>
    </div>
  );

  return (
    <PostQuickActions
      postId={post.postId}
      title={post.title}
      href={getNavigationPath(post)}
      onShare={() => void handleShare()}
      isOwner={false}
    >
      <div className="group relative">
        <PostLink
          href={getNavigationPath(post)}
          className="flex items-start gap-4 rounded-md py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArtworkImage
            src={post.imageUrl}
            alt={post.title}
            width={128}
            height={128}
            className={cn(rowArtwork, 'object-cover')}
            fallbackClassName={cn(rowArtwork, 'bg-muted/60')}
            fallbackIconClassName="size-6 text-muted-foreground/50"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJoc2woMjQwLCA0LjglLCA4My45JSkiLz48L3N2Zz4="
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 min-w-0 text-[0.9375rem] font-medium leading-snug [text-wrap:pretty]">
                <span className="underline-offset-2 group-hover:underline">{post.title}</span>
                {post.privacy === 'subscriber' && (
                  <span className={cn(titleLabel, 'bg-primary/10 text-primary')}>Members only</span>
                )}
              </h3>
              {actions}
            </div>
            <p className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-sm text-muted-foreground">
              {showAuthor && (
                <>
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate">@{sourceUsername}</span>
                    <VerificationBadge accountType={displayedAccountType} size="sm" />
                  </span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span className="truncate">{details}</span>
              {post.createdAt && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={post.createdAt} className="shrink-0 tabular-nums">
                    {formatRelativeTime(post.createdAt)}
                  </time>
                </>
              )}
            </p>
            {post.isRepost && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Repeat2 aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">Reposted by @{post.username}</span>
              </p>
            )}
            {note && (
              <p className="mt-1 line-clamp-2 text-sm text-foreground/85 [text-wrap:pretty]">{note}</p>
            )}
          </div>
        </PostLink>
      </div>
    </PostQuickActions>
  );
}

export function LockedMusicCard({
  createdAt,
  displayName,
  membershipId,
  showMembership,
  onSelect,
}: {
  createdAt: string;
  displayName: string;
  membershipId: string;
  showMembership: boolean;
  onSelect?: () => void;
}) {
  const row = (
    <div className="flex items-start gap-4 py-4">
      <div className={cn(rowArtwork, 'flex items-center justify-center bg-primary/10')}>
        <LockKeyhole className="size-6 text-primary/70" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[0.9375rem] font-medium leading-snug">
          Members-only post
          <span className={cn(titleLabel, 'bg-primary/10 text-primary')}>Members only</span>
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <time dateTime={createdAt}>{formatRelativeTime(createdAt)}</time>
        </p>
        <p className="mt-1 text-sm text-foreground/85">Join {displayName} to open this post.</p>
      </div>
    </div>
  );

  return (
    <article data-testid="curator-locked-post" aria-label="Members-only post">
      {showMembership ? (
        <a
          href={`#${membershipId}`}
          onClick={onSelect}
          aria-label={`View ${displayName} membership`}
          className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {row}
        </a>
      ) : row}
    </article>
  );
}

export function ActivitySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start gap-4 py-4">
          <Skeleton className={rowArtwork} />
          <div className="flex-1 space-y-2.5 pt-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Explore's paper cards, shared with the Feed: post cards, their grid and skeleton, section headings, and creator cards. */

import Image from 'next/image';
import Link from 'next/link';
import { LockKeyhole, Music2, Repeat2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { cn } from '@/lib/utils';
import type { ActivityPost, ExploreUser } from '@/types';

// Row gaps leave room for the offset shadow below each card.
export const POST_GRID = 'grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4 sm:gap-x-6 sm:gap-y-8';

// The paper card shared by posts and skeletons: warm white in every theme.
const PAPER_CARD = 'border-2 border-foreground bg-primary-foreground force-light-surface text-foreground';

export function SectionHeading({
  id,
  title,
  action,
}: {
  id?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <h2 id={id} className="font-teko text-3xl font-bold uppercase leading-none tracking-tight sm:text-4xl">
        {title}
      </h2>
      {action}
    </div>
  );
}

const ARTWORK_CHIP = 'absolute top-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]';

/**
 * A paper card: ink border, offset shadow, artwork flush at the top printing
 * into the paper through the brand's dither seam (the post page's label
 * device). Every card reserves the same title, detail, and footer lines, so a
 * grid row has one height whatever the copy. The card lifts on hover and its
 * shadow turns brand red.
 */
export function PostCard({
  post,
  label,
  artworkTestId,
  onClick,
}: {
  post: ActivityPost;
  /** A disclosure printed in the footer, such as "Sponsored"; it also turns the shadow red. */
  label?: string;
  artworkTestId?: string;
  onClick?: () => void;
}) {
  const targetPostId = post.redirectPostId || post.postId;
  const href = targetPostId ? `/post/${targetPostId}` : '#';
  const detail = (post.description && post.description.trim()) || post.subtitle;
  const username = post.isRepost
    ? post.originalPostOwnerUsername || post.originalUsername || post.username
    : post.username;

  return (
    <div className="group flex transition-transform duration-200 ease-out-quart hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          PAPER_CARD,
          'flex w-full flex-col transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          label
            ? 'shadow-flat-primary-6 group-hover:shadow-flat-primary-8'
            : 'shadow-flat-4 group-hover:shadow-flat-primary-6',
        )}
      >
        <div data-testid={artworkTestId} className="relative aspect-square overflow-hidden bg-muted">
          {post.imageUrl ? (
            <Image
              src={post.imageUrl}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Music2 aria-hidden className="size-8 text-muted-foreground/50" />
            </div>
          )}
          {post.isRepost && (
            <span className={cn(ARTWORK_CHIP, 'left-1.5 bg-foreground text-background')}>
              <Repeat2 aria-hidden className="size-2.5" />
              Repost
            </span>
          )}
          {post.privacy === 'subscriber' && (
            <span className={cn(ARTWORK_CHIP, 'right-1.5 bg-primary text-primary-foreground')}>
              <LockKeyhole aria-hidden className="size-2.5" />
              Members only
            </span>
          )}
        </div>

        {/* min-h holds two title lines, a detail line, and the footer, so a
            one-line title leaves its slack above the pinned footer. */}
        <div className="relative flex min-h-28 flex-1 flex-col px-3 pb-3 pt-3">
          <DitherEdge color="hsl(var(--primary-foreground))" side="top" scale={0.5} />
          <h3 className="font-teko text-2xl uppercase leading-[0.95] tracking-tight line-clamp-2 transition-colors group-hover:text-primary">
            {post.title}
          </h3>
          {detail && <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground">{detail}</p>}
          <div className="mt-auto flex items-center gap-2 pt-2">
            {label && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{label}</span>
            )}
            <span className="h-px flex-1 bg-foreground/20" />
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              @{username}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function CreatorCard({ user }: { user: ExploreUser }) {
  const initials = user.username?.charAt(0)?.toUpperCase() || 'U';
  const displayName = user.displayName?.trim() || user.username;
  return (
    <Link
      href={`/profile/${user.username}`}
      className="group flex w-[220px] shrink-0 items-center gap-3 rounded-2xl border-2 border-foreground bg-primary-foreground force-light-surface px-4 py-3 text-foreground shadow-flat-4 transition-shadow hover:shadow-flat-primary-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar className="size-11 shrink-0 border-2 border-foreground">
        <AvatarImage src={user.avatarUrl} alt={`@${user.username}`} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">{displayName}</p>
          <VerificationBadge accountType={user.accountType} size="sm" showTooltip={false} />
        </div>
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">@{user.username}</p>
      </div>
    </Link>
  );
}

export function PostGridSkeleton() {
  return (
    <div className={POST_GRID} data-testid="post-grid-skeleton">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={cn(PAPER_CARD, 'shadow-flat-4')}>
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="min-h-28 px-3 pb-3 pt-3">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="mt-2 h-3 w-3/5" />
            <Skeleton className="ml-auto mt-3 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

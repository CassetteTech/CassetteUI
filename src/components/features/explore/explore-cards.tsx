import Image from 'next/image';
import Link from 'next/link';
import { LockKeyhole, Music2, Repeat2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';
import type { ActivityPost, CuratorFeedItem, ExploreUser } from '@/types';

export const POST_GRID = 'grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4 sm:gap-x-6 sm:gap-y-8';

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

export function PostCard({
  post,
  label,
  artworkTestId,
  onClick,
}: {
  post: ActivityPost;
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

export function LockedPostCard({
  item,
  joinHref,
  availability,
}: {
  item: Extract<CuratorFeedItem, { kind: 'locked' }>;
  joinHref: string;
  availability: 'available' | 'unavailable' | 'unknown';
}) {
  const { curator } = item;
  const name = curator.displayName?.trim() || curator.username;
  const profileHref = `/profile/${encodeURIComponent(curator.username)}`;
  const action = availability === 'available'
    ? { href: joinHref, label: 'Join' }
    : { href: profileHref, label: 'View profile' };

  return (
    <article
      aria-label={`Members-only post from ${name}`}
      data-testid="feed-locked-post"
      className={cn(PAPER_CARD, 'flex flex-col shadow-flat-4')}
    >
      <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-primary/20 via-primary/5 to-transparent">
        <LockKeyhole aria-hidden className="size-8 text-primary/70" />
        <span className={cn(ARTWORK_CHIP, 'right-1.5 bg-primary text-primary-foreground')}>
          <LockKeyhole aria-hidden className="size-2.5" />
          Members only
        </span>
      </div>

      <div className="relative flex min-h-28 flex-1 flex-col px-3 pb-3 pt-3">
        <DitherEdge color="hsl(var(--primary-foreground))" side="top" scale={0.5} />
        <h3 className="font-teko text-2xl uppercase leading-[0.95] tracking-tight">Members-only post</h3>
        <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
          {availability === 'unavailable' ? `${name} is not taking new members right now.` : `For ${name}'s members.`}
        </p>
        <div className="mt-auto flex min-w-0 items-center gap-2 pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Link
            href={profileHref}
            className="flex min-w-0 items-center gap-1.5 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar aria-hidden className="size-5 shrink-0 border border-foreground">
              <AvatarImage src={curator.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-[9px]">{curator.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate">@{curator.username}</span>
          </Link>
          <time dateTime={item.createdAt} className="ml-auto shrink-0">{formatRelativeTime(item.createdAt)}</time>
        </div>
        <Link
          href={action.href}
          className="mt-2 flex min-h-9 items-center justify-center border-2 border-foreground px-3 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {action.label}
          <span className="sr-only"> {name}</span>
        </Link>
      </div>
    </article>
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

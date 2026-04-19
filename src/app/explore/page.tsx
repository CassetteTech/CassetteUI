'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/ui/back-button';
import { Loader2, Search, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityPost, ExploreUser } from '@/types';
import {
  useExploreData,
  MUSIC_SECTION_ORDER,
  MUSIC_SECTION_LABELS,
  MUSIC_SECTION_EMPTY_COPY,
} from './_shared/use-explore-data';

// Deterministic pseudo-random from string so SSR/CSR stay in sync.
function hashRand(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return () => {
    h = (h * 1664525 + 1013904223) | 0;
    return (h >>> 0) / 0xffffffff;
  };
}

const TAPE_COLORS = [
  'bg-primary/70',
  'bg-accentRoyal/60',
  'bg-warning/70',
  'bg-info/60',
];

export default function ExplorePage() {
  const data = useExploreData();
  const isInitialLoading = data.isLoadingPosts && data.allPosts.length === 0;

  if (data.postsError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="font-teko text-5xl font-bold uppercase">Explore</h1>
          <p className="mt-3 text-muted-foreground">Unable to load the explore feed right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Subtle dotted paper */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 relative z-20">
        <BackButton fallbackRoute="/" />
      </div>

      {/* ─── Zine Cover ─────────────────────────────────────────────────── */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-10 relative z-0">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="relative inline-block max-w-full">
            <h1 className="font-teko font-bold uppercase leading-[0.85] tracking-tight text-foreground text-[clamp(3.5rem,19vw,14rem)]">
              EXPLORE
            </h1>
            <span
              aria-hidden
              className="absolute top-1 right-1 sm:top-2 sm:right-6 rotate-[14deg] bg-primary text-primary-foreground px-2.5 py-0.5 sm:px-4 sm:py-1 font-teko text-base sm:text-2xl uppercase tracking-widest shadow-[2px_2px_0_hsl(var(--foreground))] sm:shadow-[3px_3px_0_hsl(var(--foreground))]"
            >
              Cassette
            </span>
          </div>
          <p className="mt-8 max-w-md text-base text-muted-foreground italic">
            The latest public mixes &amp; the creators behind them.
          </p>
        </motion.div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-20 relative">
        <CreatorsMarquee
          users={data.users}
          isLoading={data.isLoadingUsers && data.users.length === 0}
          error={data.usersError}
          searchValue={data.userSearch}
          onSearchChange={data.setUserSearch}
          onRetry={() => void data.refetchUsers()}
          hasMore={!data.isSearchingUsers && data.totalUsers > data.visibleUsersCount || data.hasMoreUsers}
          isLoadingMore={data.isLoadingMoreUsers}
          onLoadMore={data.loadMoreUsers}
        />

        {isInitialLoading ? (
          <PolaroidSkeleton />
        ) : data.allPosts.length === 0 ? (
          <div className="mx-auto max-w-md rotate-[-1.5deg] bg-card border-2 border-foreground px-6 py-10 text-center shadow-[6px_6px_0_hsl(var(--foreground))]">
            <p className="font-teko text-3xl uppercase">Nothing public — yet</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Paste something in!
            </p>
          </div>
        ) : (
          MUSIC_SECTION_ORDER.map((type, idx) => (
            <ZineSection
              key={type}
              title={MUSIC_SECTION_LABELS[type]}
              accentIndex={idx}
              posts={data.groupedPosts[type].slice(0, data.visiblePostsBySection[type])}
              emptyText={MUSIC_SECTION_EMPTY_COPY[type]}
              hasMore={
                data.groupedPosts[type].length > data.visiblePostsBySection[type] ||
                (data.hasMorePosts && data.sectionHasMorePotential[type])
              }
              isLoadingMore={data.isLoadingMoreBySection[type]}
              onLoadMore={() => data.loadMorePostsForSection(type)}
            />
          ))
        )}
      </main>
    </div>
  );
}

/* ─── Sections ────────────────────────────────────────────────────────────── */

function ZineSection({
  title,
  accentIndex,
  posts,
  emptyText,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  title: string;
  accentIndex: number;
  posts: ActivityPost[];
  emptyText: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const titleRotate = accentIndex % 2 === 0 ? '-rotate-[2deg]' : 'rotate-[2deg]';
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-end justify-between gap-4 mb-8">
        <div className={cn('inline-block', titleRotate)}>
          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight leading-none text-foreground">
            {title}
            <span
              aria-hidden
              className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
            />
          </h2>
        </div>
        {hasMore && posts.length > 0 && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="shrink-0 rotate-[2deg] bg-background border-2 border-foreground px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-50 shadow-[3px_3px_0_hsl(var(--foreground))]"
          >
            {isLoadingMore ? <Loader2 className="inline w-3 h-3 animate-spin" /> : 'More clips +'}
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground border-t-2 border-dashed border-foreground/30 py-4 text-center">
          — {emptyText} —
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {posts.map((post, i) => (
            <Polaroid key={post.postId} post={post} index={i} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

function Polaroid({ post, index }: { post: ActivityPost; index: number }) {
  const rand = hashRand(post.postId || String(index));
  const rot = (rand() - 0.5) * 5;
  const tapeColor = TAPE_COLORS[index % TAPE_COLORS.length];
  const tapeSide = index % 2 === 0 ? 'left' : 'right';

  const targetPostId = post.redirectPostId || post.postId;
  const href = targetPostId ? `/post/${targetPostId}` : '#';
  const detail = (post.description && post.description.trim()) || post.subtitle;
  const username = post.isRepost
    ? post.originalPostOwnerUsername || post.originalUsername || post.username
    : post.username;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: rot }}
      whileHover={{ rotate: 0, y: -4, scale: 1.02 }}
      viewport={{ once: true, margin: '-5%' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.2) }}
      className="relative"
      style={{ transformOrigin: 'center' }}
    >
      <span
        aria-hidden
        className={cn(
          'absolute -top-2 z-10 h-5 w-16 rotate-[-6deg] opacity-80 border border-foreground/10',
          tapeColor,
          tapeSide === 'left' ? 'left-3' : 'right-3'
        )}
      />

      <Link
        href={href}
        className="group block bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-3 pb-4 shadow-[4px_4px_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_hsl(var(--cassette-white))] hover:shadow-[6px_6px_0_hsl(var(--primary))] dark:hover:shadow-[6px_6px_0_hsl(var(--primary))] transition-shadow"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {post.imageUrl ? (
            <Image
              src={post.imageUrl}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image src="/images/ic_music.png" alt="" width={40} height={40} className="opacity-30" />
            </div>
          )}
          <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 bg-background/90 border border-foreground px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]">
            {post.elementType}
          </span>
          {post.isRepost && (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 bg-foreground text-background px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]">
              <Star className="w-2.5 h-2.5" fill="currentColor" />
              repost
            </span>
          )}
        </div>

        <div className="pt-3">
          <h3 className="font-teko text-2xl uppercase leading-[0.95] tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          {detail && <p className="mt-1 text-xs text-muted-foreground line-clamp-1 italic">{detail}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className="h-px flex-1 bg-foreground/20" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              @{username}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function CreatorsMarquee({
  users,
  isLoading,
  error,
  searchValue,
  onSearchChange,
  onRetry,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  users: ExploreUser[];
  isLoading: boolean;
  error: Error | null;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onRetry: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="-rotate-[1.5deg]">
          <h2 className="font-teko text-5xl sm:text-6xl font-bold uppercase leading-none tracking-tight">
            Creators
          </h2>
        </div>
      </div>

      <div className="relative mb-6 max-w-md force-light-surface">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="who are you looking for?"
          className="h-11 rounded-full border-2 border-foreground !bg-primary-foreground pl-9 pr-9 text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_hsl(var(--primary))]"
        />
        {searchValue && (
          <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-52 rounded-2xl shrink-0" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border-2 border-destructive/30 bg-card px-5 py-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-destructive">
            Unable to load creators right now.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 border-foreground/30"
          >
            Retry
          </Button>
        </div>
      ) : users.length === 0 ? (
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground border-t-2 border-dashed border-foreground/30 py-4 text-center">
          — No creators match —
        </p>
      ) : (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-5 snap-x snap-mandatory">
            {users.map((u, i) => (
              <CreatorSticker key={u.userId || u.username} user={u} index={i} />
            ))}
            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="shrink-0 snap-start w-[200px] rotate-[-2deg] bg-primary-foreground force-light-surface border-2 border-dashed border-foreground/50 hover:border-primary flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 px-4 py-4 rounded-2xl"
              >
                {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load more ✎'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CreatorSticker({ user, index }: { user: ExploreUser; index: number }) {
  const rand = hashRand(user.userId || user.username || String(index));
  const rot = (rand() - 0.5) * 4;
  const initials = user.username?.charAt(0)?.toUpperCase() || 'U';
  const displayName = user.displayName?.trim() || user.username;
  return (
    <Link
      href={`/profile/${user.username}`}
      className="group shrink-0 snap-start w-[220px] bg-primary-foreground force-light-surface text-foreground border-2 border-foreground rounded-2xl px-4 py-3 shadow-[4px_4px_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_hsl(var(--cassette-white))] hover:shadow-[6px_6px_0_hsl(var(--primary))] dark:hover:shadow-[6px_6px_0_hsl(var(--primary))] transition-all"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 border-2 border-foreground shrink-0">
          <AvatarImage src={user.avatarUrl} alt={`@${user.username}`} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{displayName}</p>
            <VerificationBadge accountType={user.accountType} size="sm" showTooltip={false} />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">@{user.username}</p>
        </div>
      </div>
    </Link>
  );
}

function PolaroidSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-primary-foreground force-light-surface border-2 border-foreground p-3 pb-4 shadow-[4px_4px_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_hsl(var(--cassette-white))]">
          <Skeleton className="aspect-square w-full rounded-none" />
          <Skeleton className="h-5 w-4/5 mt-3" />
          <Skeleton className="h-3 w-3/5 mt-2" />
        </div>
      ))}
    </div>
  );
}

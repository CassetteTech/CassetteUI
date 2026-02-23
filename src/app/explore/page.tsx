'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useExploreActivity } from '@/hooks/use-profile';
import { profileService } from '@/services/profile';
import { applyCachedArtwork } from '@/services/profile-artwork-cache';
import { ActivityPost } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Music, Disc3, Mic2, ListMusic, Compass, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/ui/back-button';

const PAGE_SIZE = 20;

/* ── Type styling config ─────────────────────────────────────────
   Each element type gets a unique icon + color scheme derived from
   the existing theme tokens (primary, accentRoyal, info).
   This makes type identification instant at a glance.
──────────────────────────────────────────────────────────────────── */

interface TypeStyle {
  icon: typeof Music;
  label: string;
  badge: string;     // badge bg/text/border classes
  accent: string;    // top accent strip color
}

const TYPE_STYLES: Record<string, TypeStyle> = {
  track: {
    icon: Music,
    label: 'Track',
    badge: 'bg-info/20 text-info border-info/25',
    accent: 'bg-info',
  },
  album: {
    icon: Disc3,
    label: 'Album',
    badge: 'bg-accentRoyal/20 text-accentRoyal border-accentRoyal/25',
    accent: 'bg-accentRoyal',
  },
  artist: {
    icon: Mic2,
    label: 'Artist',
    badge: 'bg-info/20 text-info-text border-info/25',
    accent: 'bg-info',
  },
  playlist: {
    icon: ListMusic,
    label: 'Playlist',
    badge: 'bg-primary/20 text-primary border-primary/25',
    accent: 'bg-primary',
  },
};

const DEFAULT_TYPE_STYLE: TypeStyle = {
  icon: Music,
  label: 'Music',
  badge: 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/25',
  accent: 'bg-muted-foreground',
};

function getTypeStyle(elementType: string): TypeStyle {
  return TYPE_STYLES[elementType.toLowerCase()] ?? DEFAULT_TYPE_STYLE;
}

export default function ExplorePage() {
  const [additionalPosts, setAdditionalPosts] = useState<ActivityPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    data: exploreData,
    isLoading,
    error,
  } = useExploreActivity({ page: 1, pageSize: PAGE_SIZE });

  const allPosts = useMemo(() => {
    const initialPosts = exploreData?.items ?? [];
    return applyCachedArtwork([...initialPosts, ...additionalPosts]);
  }, [exploreData?.items, additionalPosts]);

  const totalItems = exploreData?.totalItems ?? 0;
  const hasMore = allPosts.length < totalItems;

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const nextPageData = await profileService.fetchExploreActivity({
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setAdditionalPosts((prev) => [...prev, ...nextPageData.items]);
      setCurrentPage(nextPage);
    } catch (loadError) {
      console.error('Error loading more explore posts:', loadError);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="font-teko text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight uppercase">
            Explore
          </h1>
          <p className="mt-3 text-muted-foreground">
            Unable to load the explore feed right now. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8">
          <div className="mb-4">
            <BackButton fallbackRoute="/" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-end gap-2">
              <h1 className="font-teko text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] font-bold text-foreground tracking-tight uppercase leading-[0.85]">
                Explore
              </h1>
              <div className="w-2.5 h-2.5 rounded-full bg-primary mb-3 sm:mb-4 shrink-0" />
            </div>
            <p className="mt-2 text-muted-foreground text-base sm:text-lg max-w-md">
              Discover the latest music conversions from across Cassette.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Content Grid ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        {isLoading && allPosts.length === 0 ? (
          <ExploreGridSkeleton />
        ) : allPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-border/60 bg-card/40 p-10 sm:p-14 text-center"
          >
            <Compass className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-foreground font-semibold text-lg">
              No public conversions yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              Once users share public conversions, they&apos;ll appear here.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {allPosts.map((post, index) => (
                <ExploreCard key={post.postId} post={post} index={index} />
              ))}
            </div>

            {hasMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center mt-8 sm:mt-10"
              >
                <Button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="px-8 py-5 rounded-full border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Individual Explore Card ───────────────────────────────────── */

function ExploreCard({ post, index }: { post: ActivityPost; index: number }) {
  const style = getTypeStyle(post.elementType);
  const TypeIcon = style.icon;
  const navigationPath = post.postId ? `/post?id=${post.postId}` : '#';
  const hasDescription = post.description && post.description.trim().length > 0;
  const detailText = hasDescription ? post.description : post.subtitle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.04, 0.4),
      }}
    >
      <Link href={navigationPath} className="block group">
        <div
          className={cn(
            'rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden',
            'transition-all duration-300 ease-out',
            'group-hover:shadow-lg group-hover:border-border/80 group-hover:-translate-y-1 group-hover:bg-card/90'
          )}
        >
          {/* Colored accent strip — instant type identification */}
          <div className={cn('h-[3px]', style.accent)} />

          {/* Artwork */}
          <div className="relative aspect-square overflow-hidden bg-muted/20">
            {post.imageUrl ? (
              <Image
                src={post.imageUrl}
                alt={post.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJoc2woMjQwLCA0LjglLCA4My45JSkiLz48L3N2Zz4="
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image
                  src="/images/ic_music.png"
                  alt="Music"
                  width={32}
                  height={32}
                  className="opacity-25"
                />
              </div>
            )}

          </div>

          {/* Info section */}
          <div className="p-3 sm:p-3.5">
            <h3 className="font-semibold text-foreground text-sm sm:text-[0.9375rem] leading-snug truncate">
              {post.title}
            </h3>

            {detailText && (
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 line-clamp-1">
                {detailText}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                @{post.username}
              </span>
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border shrink-0',
                  'text-[10px] sm:text-xs font-bold uppercase tracking-wider',
                  style.badge
                )}
              >
                <TypeIcon className="w-3 h-3" />
                <span className="hidden sm:inline">{style.label}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Loading Skeleton ──────────────────────────────────────────── */

function ExploreGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/40 bg-card/50 overflow-hidden"
        >
          <div className="h-[3px] bg-muted" />
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="p-3 sm:p-3.5 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-2/5 mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

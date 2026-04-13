'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useExploreActivity, useExploreUsers } from '@/hooks/use-profile';
import { profileService } from '@/services/profile';
import { applyCachedArtwork } from '@/services/profile-artwork-cache';
import { ActivityPost, ExploreUser } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Music, Disc3, Mic2, ListMusic, Compass, Loader2, Repeat2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/ui/back-button';

const PAGE_SIZE = 20;
const SECTION_INCREMENT = 8;

type MusicElementType = 'track' | 'album' | 'artist' | 'playlist';

interface TypeStyle {
  icon: typeof Music;
  label: string;
  badge: string;
  accent: string;
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

const MUSIC_SECTION_ORDER: MusicElementType[] = ['track', 'album', 'artist', 'playlist'];

const MUSIC_SECTION_LABELS: Record<MusicElementType, string> = {
  track: 'Tracks',
  album: 'Albums',
  artist: 'Artists',
  playlist: 'Playlists',
};

const MUSIC_SECTION_EMPTY_COPY: Record<MusicElementType, string> = {
  track: 'No public track conversions yet.',
  album: 'No public album conversions yet.',
  artist: 'No public artist conversions yet.',
  playlist: 'No public playlist conversions yet.',
};

function getTypeStyle(elementType: string): TypeStyle {
  return TYPE_STYLES[elementType.toLowerCase()] ?? DEFAULT_TYPE_STYLE;
}

export default function ExplorePage() {
  const [additionalPosts, setAdditionalPosts] = useState<ActivityPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetchingMorePosts, setIsFetchingMorePosts] = useState(false);
  const [isLoadingMoreBySection, setIsLoadingMoreBySection] = useState<Record<MusicElementType, boolean>>({
    track: false,
    album: false,
    artist: false,
    playlist: false,
  });
  const [sectionHasMorePotential, setSectionHasMorePotential] = useState<Record<MusicElementType, boolean>>({
    track: true,
    album: true,
    artist: true,
    playlist: true,
  });
  const [visiblePostsBySection, setVisiblePostsBySection] = useState<Record<MusicElementType, number>>({
    track: SECTION_INCREMENT,
    album: SECTION_INCREMENT,
    artist: SECTION_INCREMENT,
    playlist: SECTION_INCREMENT,
  });

  const [additionalUsers, setAdditionalUsers] = useState<ExploreUser[]>([]);
  const [currentUsersPage, setCurrentUsersPage] = useState(1);
  const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState(false);
  const [visibleUsersCount, setVisibleUsersCount] = useState(SECTION_INCREMENT);

  const {
    data: exploreData,
    isLoading: isLoadingPosts,
    error: postsError,
  } = useExploreActivity({ page: 1, pageSize: PAGE_SIZE });

  const {
    data: exploreUsersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useExploreUsers({ page: 1, pageSize: PAGE_SIZE });

  const allPosts = useMemo(() => {
    const initialPosts = exploreData?.items ?? [];
    return applyCachedArtwork([...initialPosts, ...additionalPosts]);
  }, [exploreData?.items, additionalPosts]);

  const users = useMemo(() => {
    const initialUsers = exploreUsersData?.users ?? [];
    return [...initialUsers, ...additionalUsers];
  }, [exploreUsersData?.users, additionalUsers]);

  const groupedPosts = useMemo(() => {
    const groups: Record<MusicElementType, ActivityPost[]> = {
      track: [],
      album: [],
      artist: [],
      playlist: [],
    };

    for (const post of allPosts) {
      const key = post.elementType.toLowerCase() as MusicElementType;
      if (key in groups) {
        groups[key].push(post);
      }
    }

    return groups;
  }, [allPosts]);

  const postTotalItems = exploreData?.totalItems ?? 0;
  const hasMorePosts = allPosts.length < postTotalItems;

  const usersTotalItems = exploreUsersData?.totalItems ?? 0;
  const hasMoreUsers = users.length < usersTotalItems;

  const loadMorePostsForSection = useCallback(async (section: MusicElementType) => {
    if (isFetchingMorePosts || isLoadingMoreBySection[section]) return;

    const currentVisible = visiblePostsBySection[section];
    const targetVisible = currentVisible + SECTION_INCREMENT;
    const currentSectionCount = groupedPosts[section].length;

    if (currentSectionCount >= targetVisible) {
      setVisiblePostsBySection((prev) => ({ ...prev, [section]: targetVisible }));
      return;
    }

    if (!hasMorePosts) {
      setVisiblePostsBySection((prev) => ({ ...prev, [section]: currentSectionCount }));
      return;
    }

    const fetchedItems: ActivityPost[] = [];
    let nextPage = currentPage;
    let combinedPosts = [...allPosts];
    let sectionCount = currentSectionCount;

    try {
      setIsFetchingMorePosts(true);
      setIsLoadingMoreBySection((prev) => ({ ...prev, [section]: true }));

      while (sectionCount < targetVisible && combinedPosts.length < postTotalItems) {
        nextPage += 1;
        const nextPageData = await profileService.fetchExploreActivity({
          page: nextPage,
          pageSize: PAGE_SIZE,
        });

        fetchedItems.push(...nextPageData.items);
        combinedPosts = applyCachedArtwork([...combinedPosts, ...nextPageData.items]);
        sectionCount = combinedPosts.filter(
          (post) => post.elementType.toLowerCase() === section
        ).length;
      }

      if (fetchedItems.length > 0) {
        setAdditionalPosts((prev) => [...prev, ...fetchedItems]);
        setCurrentPage(nextPage);
      }

      setVisiblePostsBySection((prev) => ({
        ...prev,
        [section]: Math.min(targetVisible, sectionCount),
      }));
      if (sectionCount <= currentVisible) {
        setSectionHasMorePotential((prev) => ({ ...prev, [section]: false }));
      }
    } catch (loadError) {
      console.error(`Error loading more explore posts for ${section}:`, loadError);
    } finally {
      setIsLoadingMoreBySection((prev) => ({ ...prev, [section]: false }));
      setIsFetchingMorePosts(false);
    }
  }, [
    allPosts,
    currentPage,
    groupedPosts,
    hasMorePosts,
    isFetchingMorePosts,
    isLoadingMoreBySection,
    postTotalItems,
    visiblePostsBySection,
  ]);

  const loadMoreUsers = useCallback(async () => {
    if (isLoadingMoreUsers) return;

    const targetVisible = visibleUsersCount + SECTION_INCREMENT;
    if (users.length >= targetVisible) {
      setVisibleUsersCount(targetVisible);
      return;
    }

    if (!hasMoreUsers) {
      setVisibleUsersCount(Math.min(targetVisible, users.length));
      return;
    }

    try {
      setIsLoadingMoreUsers(true);
      let nextPage = currentUsersPage;
      const fetchedUsers: ExploreUser[] = [];
      let combinedUsers = [...users];

      while (combinedUsers.length < targetVisible && combinedUsers.length < usersTotalItems) {
        nextPage += 1;
        const nextPageData = await profileService.fetchExploreUsers({
          page: nextPage,
          pageSize: PAGE_SIZE,
        });

        fetchedUsers.push(...nextPageData.users);
        combinedUsers = [...combinedUsers, ...nextPageData.users];
      }

      if (fetchedUsers.length > 0) {
        setAdditionalUsers((prev) => [...prev, ...fetchedUsers]);
        setCurrentUsersPage(nextPage);
      }

      setVisibleUsersCount(Math.min(targetVisible, combinedUsers.length));
    } catch (loadError) {
      console.error('Error loading more explore users:', loadError);
    } finally {
      setIsLoadingMoreUsers(false);
    }
  }, [currentUsersPage, hasMoreUsers, isLoadingMoreUsers, users, usersTotalItems, visibleUsersCount]);

  if (postsError) {
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

  const isInitialLoading = isLoadingPosts && allPosts.length === 0;
  const noMusicItems = allPosts.length === 0;

  return (
    <div className="min-h-screen bg-background">
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
              Discover the latest music conversions and creators from across Cassette.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 space-y-10 sm:space-y-12">
        {isInitialLoading ? (
          <ExploreGridSkeleton />
        ) : noMusicItems ? (
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
              Once users share public conversions, they will appear here.
            </p>
          </motion.div>
        ) : (
          <>
            {MUSIC_SECTION_ORDER.map((elementType) => (
              <ExplorePostSection
                key={elementType}
                title={MUSIC_SECTION_LABELS[elementType]}
                posts={groupedPosts[elementType].slice(0, visiblePostsBySection[elementType])}
                totalAvailable={groupedPosts[elementType].length}
                emptyText={MUSIC_SECTION_EMPTY_COPY[elementType]}
                hasMore={
                  groupedPosts[elementType].length > visiblePostsBySection[elementType] ||
                  (groupedPosts[elementType].length >= visiblePostsBySection[elementType] &&
                    hasMorePosts &&
                    sectionHasMorePotential[elementType])
                }
                isLoadingMore={isLoadingMoreBySection[elementType]}
                onLoadMore={() => loadMorePostsForSection(elementType)}
              />
            ))}
          </>
        )}

        <ExploreUsersSection
          users={users.slice(0, visibleUsersCount)}
          totalAvailable={users.length}
          isLoading={isLoadingUsers && users.length === 0}
          error={usersError}
          hasMore={
            users.length > visibleUsersCount ||
            (visibleUsersCount >= SECTION_INCREMENT && hasMoreUsers)
          }
          isLoadingMore={isLoadingMoreUsers}
          onLoadMore={loadMoreUsers}
        />
      </div>
    </div>
  );
}

function ExplorePostSection({
  title,
  posts,
  totalAvailable,
  emptyText,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  title: string;
  posts: ActivityPost[];
  totalAvailable: number;
  emptyText: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <h2 className="font-teko text-3xl sm:text-4xl uppercase tracking-tight text-foreground">
          {title}
        </h2>
        <span className="text-xs sm:text-sm text-muted-foreground font-medium">
          {totalAvailable}
        </span>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-6 sm:p-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {posts.map((post, index) => (
            <ExploreCard key={post.postId} post={post} index={index} />
          ))}
        </div>
      )}

      {hasMore && posts.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="px-6 py-4 rounded-full border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
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
        </div>
      )}
    </section>
  );
}

function ExploreUsersSection({
  users,
  totalAvailable,
  isLoading,
  error,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  users: ExploreUser[];
  totalAvailable: number;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <h2 className="font-teko text-3xl sm:text-4xl uppercase tracking-tight text-foreground">
          Users
        </h2>
        <span className="text-xs sm:text-sm text-muted-foreground font-medium">
          {totalAvailable}
        </span>
      </div>

      {isLoading ? (
        <UsersGridSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-6 sm:p-8 text-center text-sm text-muted-foreground">
          Unable to load explore users right now.
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-6 sm:p-8 text-center text-sm text-muted-foreground">
          No users match explore criteria yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
            {users.map((user) => (
              <ExploreUserCard key={user.userId || user.username} user={user} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                className="px-8 py-5 rounded-full border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading users...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ExploreUserCard({ user }: { user: ExploreUser }) {
  const initials = user.username?.charAt(0)?.toUpperCase() || 'U';
  const displayName = user.displayName && user.displayName.trim() ? user.displayName : user.username;

  return (
    <Link href={`/profile/${user.username}`} className="block group">
      <div
        className={cn(
          'rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4',
          'transition-all duration-300 ease-out',
          'group-hover:shadow-lg group-hover:border-border/80 group-hover:-translate-y-0.5 group-hover:bg-card/90'
        )}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border border-border/60">
            <AvatarImage src={user.avatarUrl} alt={`@${user.username}`} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <VerificationBadge accountType={user.accountType} size="sm" showTooltip={false} />
            </div>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          </div>

          <div className="shrink-0 text-muted-foreground/70">
            <Users className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ExploreCard({ post, index }: { post: ActivityPost; index: number }) {
  const style = getTypeStyle(post.elementType);
  const TypeIcon = style.icon;
  const targetPostId = post.redirectPostId || post.postId;
  const navigationPath = targetPostId ? `/post/${targetPostId}` : '#';
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
            'relative rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden',
            'transition-all duration-300 ease-out',
            'group-hover:shadow-lg group-hover:border-border/80 group-hover:-translate-y-1 group-hover:bg-card/90'
          )}
        >
          {post.isRepost && (
            <div className="absolute right-2 top-2 z-20 rounded-full bg-background/80 p-1 text-muted-foreground backdrop-blur-sm">
              <Repeat2 className="h-3.5 w-3.5" />
            </div>
          )}
          <div className={cn('h-[3px]', style.accent)} />

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
                @{post.isRepost
                  ? (post.originalPostOwnerUsername || post.originalUsername || post.username)
                  : post.username}
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

function UsersGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

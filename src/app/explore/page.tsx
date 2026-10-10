'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parseProfileLink, type ParsedProfileLink } from '@/lib/profile-links';
import { ProfileLinkIcon } from '@/components/features/profile/profile-links';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { SegmentedControl } from '@/components/ui/interior/segmented-control';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabUnderline } from '@/components/ui/tab-underline';
import { BackButton } from '@/components/ui/back-button';
import { ArrowRight, LockKeyhole, Plus, Repeat2, Search, X, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityPost, ExploreCurator, ExploreUser } from '@/types';
import type { SponsoredExplorePlacement } from '@/types';
import { rememberViewedSponsoredExplorePost } from '@/services/sponsored-explore-rotation';
import { useExploreCurators, useSubscriptionFeed } from '@/hooks/use-profile';
import { useAuthState } from '@/hooks/use-auth';
import { captureClientEvent } from '@/lib/analytics/client';
import {
  useExploreData,
  MUSIC_SECTION_ORDER,
  MUSIC_SECTION_LABELS,
  MUSIC_SECTION_EMPTY_COPY,
  type MusicElementType,
} from './_shared/use-explore-data';

const POST_GRID = 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-5';

type ExploreTab = 'discover' | 'subscriptions';

const exploreTabStorageKey = 'cassette:explore-tab';

function parseExploreTab(value: string | null): ExploreTab | null {
  return value === 'discover' || value === 'subscriptions' ? value : null;
}

function readStoredExploreTab(): ExploreTab | null {
  try {
    return parseExploreTab(localStorage.getItem(exploreTabStorageKey));
  } catch {
    return null;
  }
}

// The stored tab only changes through this page, which also rewrites the URL,
// so the snapshot never needs a change subscription.
const subscribeToStoredExploreTab = () => () => {};

export default function ExplorePage() {
  return (
    // The creator rail bleeds to the viewport edges, so the page clips any
    // sliver it adds past the scrollbar.
    <div className="min-h-svh overflow-x-hidden bg-background">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <BackButton fallbackRoute="/" />
      </div>

      <header className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <h1 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
          Explore
        </h1>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {/* The tab and filter live in the URL, which only the client knows. */}
        <Suspense fallback={<ExploreFeedsSkeleton />}>
          <ExploreFeeds />
        </Suspense>
      </main>
    </div>
  );
}

/**
 * Discover and Subscriptions. An explicit choice (the URL, then the last tab
 * picked on this device) wins; otherwise members land on Subscriptions and
 * everyone else on Discover. The server decides membership and access; this
 * only picks the first tab.
 */
function ExploreFeeds() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuthState();
  const viewerId = user?.id ?? null;
  const storedTab = useSyncExternalStore(subscribeToStoredExploreTab, readStoredExploreTab, () => null);
  const query = searchParams.toString();
  // A choice applies at once; the URL owns it again as soon as it updates.
  // Without this, a second arrow key press acts on the tab before the first.
  const [pendingChoice, setPendingChoice] = useState<{ query: string; tab: ExploreTab; membersOnly: boolean } | null>(null);
  const choice = pendingChoice?.query === query ? pendingChoice : null;
  const explicitTab = choice?.tab ?? parseExploreTab(searchParams.get('tab')) ?? storedTab;
  const membersOnly = choice ? choice.membersOnly : searchParams.get('filter') === 'members';
  const feed = useSubscriptionFeed(viewerId, membersOnly, explicitTab !== 'discover');
  const isMember = (feed.data?.pages[0]?.subscribedCuratorCount ?? 0) > 0;
  const isResolvingDefault = explicitTab === null && (isAuthLoading || (viewerId !== null && feed.isPending));
  const activeTab: ExploreTab = explicitTab ?? (isMember ? 'subscriptions' : 'discover');

  const updateQuery = useCallback((tab: ExploreTab, nextMembersOnly: boolean) => {
    setPendingChoice({ query, tab, membersOnly: tab === 'subscriptions' && nextMembersOnly });
    try {
      localStorage.setItem(exploreTabStorageKey, tab);
    } catch {
      // Without storage the URL still keeps the choice for this visit.
    }
    const params = new URLSearchParams(query);
    params.set('tab', tab);
    if (tab === 'subscriptions' && nextMembersOnly) params.set('filter', 'members');
    else params.delete('filter');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, query, router]);

  return (
    <>
      {isResolvingDefault && <ExploreFeedsSkeleton />}
      {/* Mounted while the first tab resolves so Discover's reads start at once. */}
      <Tabs
        value={activeTab}
        onValueChange={(next) => updateQuery(parseExploreTab(next) ?? 'discover', false)}
        className={cn('gap-0', isResolvingDefault && 'hidden')}
      >
        {/* The same underline strip as the profile and Studio pages; the
            negative margin lines the first label up with the page title. */}
        <TabsList
          aria-label="Explore feeds"
          className="relative -mx-3 mb-10 flex h-auto w-auto justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"
        >
          {!isResolvingDefault && <TabUnderline value={activeTab} />}
          {(['discover', 'subscriptions'] as const).map((tab) => {
            const label = tab === 'discover' ? 'Discover' : 'Subscriptions';
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-10 flex-none rounded-none border-0 px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
              >
                <span className="tab-label" data-label={label}>{label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Kept mounted so Discover's loaded pages survive a tab switch. */}
        <TabsContent value="discover" forceMount className="data-[state=inactive]:hidden">
          <DiscoverFeed />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionFeed
            feed={feed}
            isSignedIn={viewerId !== null}
            isAuthLoading={isAuthLoading}
            membersOnly={membersOnly}
            onMembersOnlyChange={(next) => updateQuery('subscriptions', next)}
            onDiscover={() => updateQuery('discover', false)}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ExploreFeedsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading Explore">
      <Skeleton className="mb-10 h-10 w-56" />
      <PostGridSkeleton />
    </div>
  );
}

function DiscoverFeed() {
  const data = useExploreData();
  const isInitialLoading = data.isLoadingPosts && data.allPosts.length === 0;
  const sponsoredSectionType = sponsoredMusicElementType(data.sponsoredPlacement);
  const hasExploreContent = data.allPosts.length > 0 || sponsoredSectionType !== null;

  if (data.postsError) {
    return <p className="text-sm text-muted-foreground">Unable to load the explore feed right now.</p>;
  }

  return (
    <div className="space-y-16">
      <FeaturedCurators />

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
        <PostGridSkeleton />
      ) : !hasExploreContent ? (
        <Empty>
          <EmptyTitle>Nothing public yet</EmptyTitle>
          <EmptyDescription>Public posts appear here as creators share them.</EmptyDescription>
        </Empty>
      ) : (
        MUSIC_SECTION_ORDER.map((type) => (
          <MusicSection
            key={type}
            title={MUSIC_SECTION_LABELS[type]}
            posts={data.groupedPosts[type].slice(0, data.visiblePostsBySection[type])}
            sponsoredPlacement={sponsoredSectionType === type ? data.sponsoredPlacement : undefined}
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
    </div>
  );
}

/**
 * Posts from the curators the viewer is a member of, newest first. Every
 * page is authorized by the server, so an ending membership drops that
 * curator's posts from the next read. Billing stays on My memberships.
 */
function SubscriptionFeed({
  feed,
  isSignedIn,
  isAuthLoading,
  membersOnly,
  onMembersOnlyChange,
  onDiscover,
}: {
  feed: ReturnType<typeof useSubscriptionFeed>;
  isSignedIn: boolean;
  isAuthLoading: boolean;
  membersOnly: boolean;
  onMembersOnlyChange: (membersOnly: boolean) => void;
  onDiscover: () => void;
}) {
  const discoverButton = (
    <Button variant="outline" onClick={onDiscover}>
      Discover curators
    </Button>
  );

  if (isAuthLoading || (isSignedIn && feed.isPending)) {
    return <PostGridSkeleton />;
  }

  if (!isSignedIn) {
    return (
      <Empty>
        <EmptyTitle>Sign in to see your subscriptions</EmptyTitle>
        <EmptyDescription>
          Posts from the curators you are a member of appear here, newest first.
        </EmptyDescription>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={`/auth/signin?redirect=${encodeURIComponent('/explore?tab=subscriptions')}`}>Sign in</Link>
          </Button>
          {discoverButton}
        </div>
      </Empty>
    );
  }

  if (feed.isError && !feed.data) {
    return (
      <Empty>
        <EmptyTitle>Your subscriptions could not load</EmptyTitle>
        <EmptyDescription>Check your connection, then try again.</EmptyDescription>
        <Button variant="outline" onClick={() => void feed.refetch()}>
          Try again
        </Button>
      </Empty>
    );
  }

  const pages = feed.data?.pages ?? [];
  const posts = pages.flatMap((page) => page.items);
  const firstPage = pages.at(0);
  const subscribedCuratorCount = firstPage?.subscribedCuratorCount ?? 0;
  const hasMembershipHistory = firstPage?.hasMembershipHistory ?? false;

  if (subscribedCuratorCount === 0) {
    return hasMembershipHistory ? (
      <Empty>
        <EmptyTitle>Your memberships have ended</EmptyTitle>
        <EmptyDescription>
          Join a curator again to see their posts here. Billing and past memberships are in My memberships.
        </EmptyDescription>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/memberships">My memberships</Link>
          </Button>
          {discoverButton}
        </div>
      </Empty>
    ) : (
      <Empty>
        <EmptyTitle>No memberships yet</EmptyTitle>
        <EmptyDescription>
          Join a curator to see their public and members-only posts here, newest first.
        </EmptyDescription>
        {discoverButton}
      </Empty>
    );
  }

  return (
    <section aria-labelledby="subscription-feed-heading">
      <SectionHeading
        id="subscription-feed-heading"
        title={membersOnly ? 'Member posts' : 'From your curators'}
        action={
          <SegmentedControl
            label="Post filter"
            value={membersOnly ? 'members' : 'all'}
            onValueChange={(next) => onMembersOnlyChange(next === 'members')}
            options={[
              { value: 'all', label: 'All' },
              { value: 'members', label: 'Members only' },
            ]}
          />
        }
      />

      {posts.length === 0 ? (
        <Empty>
          <EmptyTitle>{membersOnly ? 'No member posts yet' : 'No posts yet'}</EmptyTitle>
          <EmptyDescription>
            {membersOnly
              ? 'The curators you support have not shared members-only posts yet.'
              : 'The curators you support have not posted yet. New posts appear here first.'}
          </EmptyDescription>
          {membersOnly ? (
            <Button variant="outline" onClick={() => onMembersOnlyChange(false)}>
              Show all posts
            </Button>
          ) : discoverButton}
        </Empty>
      ) : (
        <div className={POST_GRID}>
          {posts.map((post) => (
            <PostCard key={post.postId} post={post} />
          ))}
        </div>
      )}

      {feed.isFetchNextPageError && (
        <p role="alert" className="mt-10 text-center text-sm text-destructive">
          More posts could not load.
        </p>
      )}
      {feed.hasNextPage && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => void feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
            {feed.isFetchingNextPage && <Spinner size="sm" />}
            {feed.isFetchNextPageError ? 'Try again' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  );
}

function sponsoredMusicElementType(placement?: SponsoredExplorePlacement): MusicElementType | null {
  const type = placement?.post.elementType.toLowerCase();
  return MUSIC_SECTION_ORDER.includes(type as MusicElementType) ? type as MusicElementType : null;
}

function SponsoredPostCard({ placement }: { placement: SponsoredExplorePlacement }) {
  const cardRef = useRef<HTMLElement>(null);
  const impressionCaptured = useRef(false);
  const impressionPostId = useRef<string | null>(null);

  useEffect(() => {
    if (impressionPostId.current !== placement.post.postId) {
      impressionPostId.current = placement.post.postId;
      impressionCaptured.current = false;
    }
    if (!placement || impressionCaptured.current) return;
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      impressionCaptured.current = true;
      rememberViewedSponsoredExplorePost(placement.post.postId);
      void captureClientEvent('sponsored_explore_impression', {
        source_surface: 'explore',
        placement_type: placement.placementType,
        post_id: placement.post.postId,
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || impressionCaptured.current) return;
        impressionCaptured.current = true;
        rememberViewedSponsoredExplorePost(placement.post.postId);
        void captureClientEvent('sponsored_explore_impression', {
          source_surface: 'explore',
          placement_type: placement.placementType,
          post_id: placement.post.postId,
        });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [placement]);

  return (
    <article ref={cardRef} data-testid="sponsored-explore">
      <PostCard
        post={placement.post}
        artworkTestId="sponsored-explore-artwork"
        kicker={
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">{placement.label}</p>
        }
        onClick={() => {
          void captureClientEvent('sponsored_explore_opened', {
            source_surface: 'explore',
            placement_type: placement.placementType,
            post_id: placement.post.postId,
          });
        }}
      />
    </article>
  );
}

/* ─── Sections ────────────────────────────────────────────────────────────── */

function SectionHeading({
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

function MusicSection({
  title,
  posts,
  sponsoredPlacement,
  emptyText,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  title: string;
  posts: ActivityPost[];
  sponsoredPlacement?: SponsoredExplorePlacement;
  emptyText: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const organicPosts = sponsoredPlacement
    ? posts.filter((post) => post.postId !== sponsoredPlacement.post.postId)
    : posts;
  const hasPosts = organicPosts.length > 0 || Boolean(sponsoredPlacement);
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.4 }}
    >
      <SectionHeading
        title={title}
        action={
          hasMore && organicPosts.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              aria-label={`Load more ${title.toLowerCase()}`}
            >
              {isLoadingMore && <Spinner size="sm" />}
              Load more
            </Button>
          ) : undefined
        }
      />

      {!hasPosts ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className={POST_GRID}>
          {sponsoredPlacement && <SponsoredPostCard placement={sponsoredPlacement} />}
          {organicPosts.map((post) => (
            <PostCard key={post.postId} post={post} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

// Overlaid on artwork: the same chip as the profile post card's type label.
const ARTWORK_BADGE =
  'absolute bottom-2 inline-flex items-center gap-1 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/80 ring-1 ring-border/50 backdrop-blur-md';

function PostCard({
  post,
  kicker,
  artworkTestId,
  onClick,
}: {
  post: ActivityPost;
  /** A line above the title, such as a sponsored label. */
  kicker?: React.ReactNode;
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
    <Link
      href={href}
      onClick={onClick}
      className="card-ink group block overflow-hidden transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div data-testid={artworkTestId} className="relative aspect-square overflow-hidden bg-muted">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Music2 aria-hidden className="size-8 text-muted-foreground/50" />
          </div>
        )}
        {post.isRepost && (
          <span className={cn(ARTWORK_BADGE, 'left-2')}>
            <Repeat2 aria-hidden className="size-2.5" />
            Repost
          </span>
        )}
        {post.privacy === 'subscriber' && (
          <span className={cn(ARTWORK_BADGE, 'right-2')}>
            <LockKeyhole aria-hidden className="size-2.5" />
            Members only
          </span>
        )}
      </div>

      <div className="p-3">
        {kicker}
        <h3 className="font-teko text-2xl uppercase leading-[0.95] tracking-tight line-clamp-2 transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        {detail && <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground">{detail}</p>}
        <p className="mt-2 truncate font-mono text-xs text-muted-foreground">@{username}</p>
      </div>
    </Link>
  );
}

function FeaturedCurators() {
  const { data: curators, isLoading } = useExploreCurators();

  // Promotional section: reserve the space with a skeleton rail immediately so
  // navigation doesn't pop the section in later; render nothing only once we
  // know there are no verified curators (or the fetch failed).
  if (!isLoading && (!curators || curators.length === 0)) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.4 }}
    >
      <SectionHeading title="Featured curators" />

      {curators && curators.length > 0 ? (
        <CuratorCoverflow curators={curators} />
      ) : (
        // Mirrors the coverflow's vertical rhythm (card size and margin/padding
        // slack) so the real rail mounts without a layout shift.
        <div className="-mt-8 -mb-12 flex justify-center gap-6 overflow-hidden py-14">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-[240px] shrink-0 rounded-lg sm:w-[280px]" />
          ))}
        </div>
      )}
    </motion.section>
  );
}

/**
 * Coverflow rail: the centered card sits flat and full-size while neighbors
 * fan away with rotateY/depth based on distance from the viewport
 * center. Native scroll + snap does the driving; transforms are written
 * imperatively on a rAF so scrolling never re-renders React.
 *
 * Looping: the list renders several identical copies and the scroll position
 * teleports by one copy width whenever it settles outside the middle copy.
 * The copies are pixel-identical, so the jump is invisible, and it means the
 * first curator starts centered with real neighbors on both sides.
 */
function CuratorCoverflow({ curators }: { curators: ExploreCurator[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const settle = useRef<number | undefined>(undefined);
  const running = useRef(false);
  const lastTick = useRef(0);
  // Painted pose per card element (WeakMap so poses follow React's element
  // reuse and vanish with removed cards). Easing lives here in JS: a CSS
  // transition on the cards would be retargeted by every rAF write, and each
  // retarget fires transitionrun/start/cancel — hundreds of events per frame
  // across the clones — which saturates the main thread and reads as low FPS
  // while swiping.
  const poses = useRef(new WeakMap<HTMLElement, { angle: number; depth: number; fade: number; z: number }>());

  // Duplicate the list until the runway holds at least 75 cards, so even a
  // hard fling stays deep inside rendered content and the rail reads as
  // infinite. The settle-time correction still re-normalizes the position;
  // an odd copy count keeps a true middle copy to normalize back to.
  const n = curators.length;
  const minCards = 75;
  const rawCopies = Math.max(3, Math.ceil(minCards / n));
  const copies = n > 1 ? rawCopies + (1 - (rawCopies % 2)) : 1;
  const midCopy = (copies - 1) / 2;

  // Computes every card's coverflow pose from the live scroll position and
  // eases the painted pose toward it (~60ms time constant, frame-rate
  // independent), so coarse scroll input (wheel notches, snap landings) still
  // glides. Returns true once every card has settled. `instant` snaps poses
  // in one write: the loop teleport swaps every element's role with a
  // clone's, and the swap is only invisible when nothing eases across it.
  const render = useCallback((instant: boolean) => {
    const track = trackRef.current;
    if (!track) return true;
    const items = track.children as HTMLCollectionOf<HTMLElement>;
    const mid = track.scrollLeft + track.clientWidth / 2;
    // Cards overlap, so their pitch is narrower than a card. Measuring it makes
    // t == ±1 the immediate neighbor no matter how deep the overlap gets.
    const pitch = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : 1;
    const now = performance.now();
    const k = instant ? 1 : 1 - Math.exp(-Math.min(now - lastTick.current, 64) / 60);
    lastTick.current = now;
    let settled = true;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const card = item.firstElementChild as HTMLElement | null;
      if (!card) continue;
      const t = (item.offsetLeft + item.offsetWidth / 2 - mid) / pitch;
      const a = Math.abs(t);
      // Coverflow: the angle ramps fast then holds, so off-center cards all
      // "file in" at the same tilt. A positive angle on a right-side card
      // swings its OUTER edge back, so the fan faces inward toward the
      // centered card; the opposite sign faces cards away from center and
      // slices the forward outer edge across the centered card.
      const angle = Math.sign(t) * Math.min(a * 2.5, 1) * 45;
      // Depth does all the shrinking — perspective also pulls receding cards
      // toward the centered one, which is what tucks them behind it. It must
      // stay unclamped: two cards at the same depth stop converging and the
      // fan opens a gap between them instead of filing back in a stack. The
      // projection is self-limiting — centers asymptote at 4 pitches out — so
      // distant clones pile into the edge stack instead of drifting into view.
      const depth = -a * 300;
      // The edge stack dissolves instead of piling: full opacity through four
      // neighbors, gone by eight. Mobile never shows past ~1.2 pitches, so the
      // fade only ever engages on wide viewports. Fully faded cards drop hit
      // testing (not visibility — that would evict focusable middle-copy cards
      // from the tab order and accessibility tree); a keyboard focus on an
      // invisible card natively scrolls it into view, which fades it back in.
      const fade = Math.max(0, Math.min(1, (8 - a) / 4));
      let pose = poses.current.get(card);
      // A fully faded card's styles are static, so skip it once painted (the
      // pose keeps its last painted values, so a card scrolling back into
      // range resumes from exactly what is on screen). Most of the runway is
      // edge-stack clones; this bounds per-frame work to the visible fan.
      if (pose && pose.fade === 0 && fade === 0) continue;
      if (!pose) {
        pose = { angle, depth, fade, z: NaN };
        poses.current.set(card, pose);
      } else if (instant) {
        pose.angle = angle;
        pose.depth = depth;
        pose.fade = fade;
      } else {
        pose.angle += (angle - pose.angle) * k;
        pose.depth += (depth - pose.depth) * k;
        pose.fade += (fade - pose.fade) * k;
        if (
          Math.abs(angle - pose.angle) > 0.1 ||
          Math.abs(depth - pose.depth) > 0.5 ||
          Math.abs(fade - pose.fade) > 0.005
        ) {
          settled = false;
        } else {
          pose.angle = angle;
          pose.depth = depth;
          pose.fade = fade;
        }
      }
      card.style.transform = `translateZ(${pose.depth.toFixed(1)}px) rotateY(${pose.angle.toFixed(2)}deg)`;
      card.style.opacity = pose.fade.toFixed(3);
      card.style.pointerEvents = pose.fade === 0 ? 'none' : '';
      // overflow-x-auto forces the track's transform-style back to flat, so the
      // browser paints in DOM order instead of depth-sorting and later cards
      // slice across the centered one. Order the stack by distance ourselves —
      // but only on change, so settled cards cost no per-frame style writes.
      const z = 50 - Math.round(a * 10);
      if (z !== pose.z) {
        item.style.zIndex = String(z);
        pose.z = z;
      }
    }
    return settled;
  }, []);

  const tick = useCallback(() => {
    if (render(false)) {
      running.current = false;
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }, [render]);

  // Runs the easing loop until every pose settles; scroll events keep it fed.
  const kick = useCallback(() => {
    if (running.current) return;
    running.current = true;
    lastTick.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }, [tick]);

  const recenter = useCallback(() => {
    const track = trackRef.current;
    if (!track || copies === 1) return;
    const items = track.children as HTMLCollectionOf<HTMLElement>;
    // Measure pitch inside the repeated region: the very first card has no
    // overlap margin, so spans that include it would skew the copy width.
    const first = items[midCopy * n];
    const copyWidth = items[(midCopy + 1) * n].offsetLeft - first.offsetLeft;
    // Keep the settled position within one copy width centered on the middle
    // copy's first card; anything outside teleports back by whole copies.
    const lo = first.offsetLeft + first.offsetWidth / 2 - track.clientWidth / 2 - copyWidth / 2;
    let next = track.scrollLeft;
    while (next < lo) next += copyWidth;
    while (next >= lo + copyWidth) next -= copyWidth;
    if (next !== track.scrollLeft) {
      track.scrollLeft = next;
      render(true);
    }
  }, [copies, midCopy, n, render]);

  // Teleporting mid-momentum kills the fling on iOS, so the loop correction
  // only runs once scrolling has settled. The kick lets any residual easing
  // finish when no teleport was needed.
  const onSettle = useCallback(() => {
    recenter();
    kick();
  }, [kick, recenter]);

  const onScroll = useCallback(() => {
    kick();
    // scrollend is not universal; guarantee a final correction after the last
    // scroll event so momentum + snap never leave a stale loop position.
    clearTimeout(settle.current);
    settle.current = window.setTimeout(onSettle, 140);
  }, [kick, onSettle]);

  // A click on an off-center card means "bring that one to the front", not
  // "open it". Capture phase so the card's own handler (and the platform link
  // anchors) never fire — an angled card is a poor click target anyway.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const item = (Array.from(track.children) as HTMLElement[]).find((c) =>
      c.contains(e.target as Node)
    );
    if (!item) return;
    const offset = item.offsetLeft + item.offsetWidth / 2 - (track.scrollLeft + track.clientWidth / 2);
    if (Math.abs(offset) < 12) return; // already centered — let the card open
    e.preventDefault();
    e.stopPropagation();
    track.scrollTo({ left: track.scrollLeft + offset, behavior: 'smooth' });
  }, []);

  // Start on the first curator of the middle copy so both neighbors are
  // visible immediately; layout effect so neither the jump nor the initial
  // fan-out paints untransformed first. Deps deliberately exclude `curators`:
  // recentering on a data refresh would visibly yank the user's position.
  // A hidden rail (Discover behind another Explore tab) has no layout, so it
  // centers again each time it is shown; ResizeObserver runs before paint.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || copies === 1) return;
    let laidOut = track.clientWidth > 0;
    const center = () => {
      // SAFETY: the track renders only the HTML wrapper divs below.
      const item = (track.children as HTMLCollectionOf<HTMLElement>)[midCopy * n];
      track.scrollLeft = item.offsetLeft + item.offsetWidth / 2 - track.clientWidth / 2;
      render(true);
    };
    if (laidOut) center();
    const observer = new ResizeObserver(() => {
      const shown = track.clientWidth > 0;
      if (shown && !laidOut) center();
      laidOut = shown;
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [copies, midCopy, n, render]);

  // A changed featured set swaps card elements under the rail (react-query
  // keeps `curators` identity stable for equal data). Paint the fresh
  // elements before the browser shows them — poses are per-element, so
  // unswapped cards keep easing and the scroll position is untouched.
  useLayoutEffect(() => {
    render(false);
    kick();
  }, [curators, kick, render]);

  useEffect(() => {
    const track = trackRef.current;
    window.addEventListener('resize', kick);
    track?.addEventListener('scrollend', onSettle);
    return () => {
      window.removeEventListener('resize', kick);
      track?.removeEventListener('scrollend', onSettle);
      cancelAnimationFrame(frame.current);
      // The canceled frame never runs tick, so it cannot hand the flag back;
      // clear it or every later kick() no-ops and the easing loop stays dead.
      running.current = false;
      clearTimeout(settle.current);
    };
  }, [kick, onSettle]);

  return (
    <div
      ref={trackRef}
      onScroll={onScroll}
      onClickCapture={onClickCapture}
      // py must clear the card's shadow: overflow-x-auto forces the vertical axis
      // to clip too, so a tight padding slices the shadow with a hard line. The
      // negative vertical margins hand back the slack so the section doesn't
      // float in dead space. Percentage padding uses the main content width, so
      // compensate for the matching negative margin to keep snap centers exact.
      className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 -mb-12 flex overflow-x-auto overscroll-x-contain no-scrollbar snap-x snap-mandatory py-14 px-[calc(50%-104px)] sm:px-[calc(50%-116px)] lg:px-[calc(50%-108px)] [perspective:1200px] [transform-style:preserve-3d]"
    >
      {/* Wrappers overlap each other's cards, so they must be click-transparent;
          only the card itself (pointer-events-auto) takes the hit. */}
      {Array.from({ length: copies }, (_, copy) =>
        curators.map((curator) => (
          <div
            key={`${copy}:${curator.userId}`}
            aria-hidden={copy !== midCopy || undefined}
            className="pointer-events-none relative shrink-0 snap-center -ml-24 first:ml-0 [transform-style:preserve-3d]"
          >
            {/* Pose easing is JS-driven (see render); a CSS transition here
                would be retargeted by every rAF write and flood the page with
                transition events. */}
            <div className="pointer-events-auto will-change-transform [transform-style:preserve-3d]">
              <CuratorCard curator={curator} focusable={copy === midCopy} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CuratorCard({
  curator,
  focusable = true,
}: {
  curator: ExploreCurator;
  // Looping clones are aria-hidden, so nothing inside them may take focus.
  focusable?: boolean;
}) {
  const router = useRouter();
  const displayName = curator.displayName?.trim() || curator.username;
  const artwork = curator.recentArtworkUrls.slice(0, 4);
  const genres = (curator.topGenres ?? []).slice(0, 2).join(' · ');
  const tagline = curator.bio?.trim() || null;
  const links = (curator.profileLinks ?? [])
    .map(parseProfileLink)
    .filter((l): l is ParsedProfileLink => l !== null)
    .slice(0, 2);
  const profileHref = `/profile/${curator.username}`;
  const openProfile = () => router.push(profileHref);

  return (
    // The platform buttons are real anchors, so the card wrapper is a div-as-link
    // (nested <a> is invalid HTML and browsers restructure it).
    <div
      role="link"
      tabIndex={focusable ? 0 : -1}
      aria-label={`View ${displayName} on Cassette`}
      onClick={openProfile}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openProfile();
        }
      }}
      className="group relative block w-[240px] cursor-pointer overflow-hidden card-ink transition-colors duration-300 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[280px]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {/* The curator themself is the hero; recent artwork fills in when they
            have no photo, and a branded tile when they have neither. */}
        {curator.avatarUrl ? (
          <Image
            src={curator.avatarUrl}
            alt=""
            fill
            sizes="280px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : artwork.length > 0 ? (
          <div
            className={cn(
              'grid h-full gap-px',
              artwork.length === 1 && 'grid-cols-1',
              artwork.length === 2 && 'grid-cols-2',
              artwork.length >= 3 && 'grid-cols-2 grid-rows-2'
            )}
          >
            {artwork.map((url, i) => (
              <div
                key={i}
                className={cn(
                  'relative overflow-hidden bg-muted',
                  artwork.length === 3 && i === 0 && 'row-span-2'
                )}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="280px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/30 via-muted to-accentRoyal/30">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background/60 ring-1 ring-foreground/15">
              <Music2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Magazine cover: full-bleed photo, dark scrim, frosted badge, masthead strap. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-section-dark/90 via-section-dark/25 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-section-dark-fg/20 bg-section-dark-fg/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-section-dark-fg backdrop-blur-md">
          Featured
          <VerificationBadge
            accountType={curator.accountType}
            size="sm"
            showTooltip={false}
            className="[&_svg]:text-section-dark-fg"
          />
        </span>

        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 text-section-dark-fg">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-section-dark-fg/60">
            Curator{genres && ` · ${genres}`}
          </p>
          <p className="truncate text-xl font-semibold leading-tight tracking-tight">{displayName}</p>
          {tagline && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-section-dark-fg/80">{tagline}</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-section-dark-fg/60">
              @{curator.username} · {curator.publicPostCount} {curator.publicPostCount === 1 ? 'post' : 'posts'}
            </p>
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-section-dark-fg/20 bg-section-dark-fg/15 backdrop-blur-md transition-colors duration-300 group-hover:bg-section-dark-fg group-hover:text-section-dark">
              <ArrowRight className="size-3.5" />
            </span>
          </div>
          {links.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  tabIndex={focusable ? undefined : -1}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${displayName} on ${link.platform} (${link.label})`}
                  title={`${link.platform}: ${link.label}`}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-section-dark-fg/60 px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-section-dark-fg hover:text-section-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ProfileLinkIcon link={link} className="shrink-0" />
                  <span className="truncate">{link.platform}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Alpha fade at the full-bleed rail's viewport edges so cards dissolve
// instead of clipping hard; alpha masks are theme-agnostic. Percentage stops
// scale the fade with the viewport but are capped at the rail's sm:px-16
// end padding, so resting cards and the load-more card sit clear of the
// fade on any viewport. Inline style because the repo sets mask properties
// with both prefixes.
const RAIL_EDGE_FADE_CSS =
  'linear-gradient(to right, transparent, black min(4%, 64px), black calc(100% - min(4%, 64px)), transparent)';
const RAIL_EDGE_FADE: React.CSSProperties = {
  WebkitMaskImage: RAIL_EDGE_FADE_CSS,
  maskImage: RAIL_EDGE_FADE_CSS,
};

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
  const railRef = useRef<HTMLDivElement>(null);

  // Gently pans the rail while nobody interacts with it. Any pointer, wheel,
  // touch, or focus contact pauses the pan; it resumes a few seconds after
  // the last contact, and not while the rail is hovered or holds focus.
  // Ping-pongs at the ends (the list is finite) and respects reduced motion.
  // Position accumulates in a float because scrollLeft rounds to device
  // pixels and would swallow sub-pixel steps at this speed.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let dir = 1;
    let pos = 0;
    let raf = 0;
    let timer = 0;
    let last = 0;
    const step = (t: number) => {
      const dt = Math.min(t - last, 64);
      last = t;
      const max = rail.scrollWidth - rail.clientWidth;
      // Nothing to pan (rail fits) — park on a slow retry instead of a
      // no-op 60fps loop; load-more or a resize can add overflow later.
      if (max <= 0) {
        timer = window.setTimeout(start, 3000);
        return;
      }
      pos = Math.max(0, Math.min(max, pos + dir * dt * 0.024)); // 24px/s
      if (pos <= 0) dir = 1;
      else if (pos >= max) dir = -1;
      rail.scrollLeft = pos;
      raf = requestAnimationFrame(step);
    };
    const start = () => {
      if (rail.matches(':hover') || rail.contains(document.activeElement)) {
        timer = window.setTimeout(start, 3000);
        return;
      }
      pos = rail.scrollLeft;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      timer = window.setTimeout(start, 3000);
    };
    const events = ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'focusin'] as const;
    for (const e of events) rail.addEventListener(e, pause, { passive: true });
    timer = window.setTimeout(start, 2000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      for (const e of events) rail.removeEventListener(e, pause);
    };
    // isLoading/error are deps because they unmount and remount the rail
    // without changing users.length (e.g. a failed background refetch then
    // Retry); the remounted rail needs fresh listeners and a fresh loop.
  }, [users.length, isLoading, error]);

  return (
    <section>
      <SectionHeading
        title="Creators"
        action={
          <div className="relative w-full sm:w-72">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search creators"
              aria-label="Search creators"
              className="h-10 pl-9 pr-9"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div
          className="mx-[calc(50%-50vw)] flex gap-4 overflow-hidden px-10 py-2 sm:px-16"
          style={RAIL_EDGE_FADE}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px] w-[220px] shrink-0 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="card-ink px-5 py-4">
          <p className="text-sm text-destructive">Unable to load creators right now.</p>
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
            Retry
          </Button>
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No creators match.</p>
      ) : (
        <div
          ref={railRef}
          className="no-scrollbar mx-[calc(50%-50vw)] overflow-x-auto px-10 py-2 sm:px-16"
          style={RAIL_EDGE_FADE}
        >
          <div className="flex gap-4">
            {users.map((u) => (
              <CreatorCard key={u.userId || u.username} user={u} />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                aria-label="Load more creators"
                className="card-ink group flex w-[220px] shrink-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border">
                  {isLoadingMore ? <Spinner size="sm" /> : <Plus aria-hidden className="size-4" />}
                </span>
                <span className="text-sm font-semibold transition-colors group-hover:text-primary">Load more</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CreatorCard({ user }: { user: ExploreUser }) {
  const initials = user.username?.charAt(0)?.toUpperCase() || 'U';
  const displayName = user.displayName?.trim() || user.username;
  return (
    <Link
      href={`/profile/${user.username}`}
      className="card-ink group flex w-[220px] shrink-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar className="size-11 shrink-0 ring-1 ring-border/40">
        <AvatarImage src={user.avatarUrl} alt={`@${user.username}`} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">{displayName}</p>
          <VerificationBadge accountType={user.accountType} size="sm" showTooltip={false} />
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">@{user.username}</p>
      </div>
    </Link>
  );
}

function PostGridSkeleton() {
  return (
    <div className={POST_GRID}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card-ink overflow-hidden">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="p-3">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="mt-2 h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

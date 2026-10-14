'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { parseProfileLink, type ParsedProfileLink } from '@/lib/profile-links';
import { ProfileLinkIcon } from '@/components/features/profile/profile-links';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { BackButton } from '@/components/ui/back-button';
import {
  CreatorCard,
  POST_GRID,
  PostCard,
  PostGridSkeleton,
  SectionHeading,
} from '@/components/features/explore/explore-cards';
import { ArrowRight, Plus, Search, X, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityPost, ExploreCurator, ExploreUser } from '@/types';
import type { SponsoredExplorePlacement } from '@/types';
import { rememberViewedSponsoredExplorePost } from '@/services/sponsored-explore-rotation';
import { useExploreCurators } from '@/hooks/use-profile';
import { captureClientEvent } from '@/lib/analytics/client';
import { removeQueryParameters } from '@/utils/remove-query-parameters';
import {
  useExploreData,
  MUSIC_SECTION_ORDER,
  MUSIC_SECTION_LABELS,
  MUSIC_SECTION_EMPTY_COPY,
  type MusicElementType,
} from './_shared/use-explore-data';

const DASHED_NOTE = 'border-t-2 border-dashed border-foreground/30 py-4 text-center font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground';

export default function ExplorePage() {
  // Explore was once split into tabs; an old link keeps working as plain Explore.
  useEffect(() => removeQueryParameters('tab', 'filter'), []);

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <BackButton fallbackRoute="/" />
      </div>

      <header className="relative mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <h1 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
          Explore
        </h1>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <DiscoverFeed />
      </main>
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
        <div className="mx-auto max-w-md border-2 border-foreground bg-card px-6 py-10 text-center shadow-flat-6">
          <p className="font-teko text-3xl uppercase">Nothing public yet</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Paste something in!
          </p>
        </div>
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
        label={placement.label}
        artworkTestId="sponsored-explore-artwork"
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
              variant="brutalist-outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              aria-label={`Load more ${title.toLowerCase()}`}
              className="rounded-none"
            >
              {isLoadingMore && <Spinner size="sm" />}
              Load more
            </Button>
          ) : undefined
        }
      />

      {!hasPosts ? (
        <p className={DASHED_NOTE}>— {emptyText} —</p>
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

function FeaturedCurators() {
  const { data: curators, isLoading } = useExploreCurators();

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

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const item = (Array.from(track.children) as HTMLElement[]).find((c) =>
      c.contains(e.target as Node)
    );
    if (!item) return;
    const offset = item.offsetLeft + item.offsetWidth / 2 - (track.scrollLeft + track.clientWidth / 2);
    if (Math.abs(offset) < 12) return;
    e.preventDefault();
    e.stopPropagation();
    track.scrollTo({ left: track.scrollLeft + offset, behavior: 'smooth' });
  }, []);

  // Start on the first curator of the middle copy so both neighbors are
  // visible immediately; layout effect so neither the jump nor the initial
  // fan-out paints untransformed first. Deps deliberately exclude `curators`:
  // recentering on a data refresh would visibly yank the user's position.
  // A rail mounted without layout (a hidden ancestor) centers again each time
  // it is shown; ResizeObserver runs before paint.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || copies === 1) return;
    let laidOut = track.clientWidth > 0;
    const center = () => {
      const item = track.children[midCopy * n];
      if (!(item instanceof HTMLElement)) return;
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
      {Array.from({ length: copies }, (_, copy) =>
        curators.map((curator) => (
          <div
            key={`${copy}:${curator.userId}`}
            aria-hidden={copy !== midCopy || undefined}
            className="pointer-events-none relative shrink-0 snap-center -ml-24 first:ml-0 [transform-style:preserve-3d]"
          >
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
          <div className="relative w-full force-light-surface sm:w-80">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search creators"
              aria-label="Search creators"
              className="h-11 rounded-full border-2 border-foreground !bg-primary-foreground pl-10 pr-10 text-foreground shadow-flat-3 focus-visible:border-foreground focus-visible:ring-foreground/10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div
          className="mx-[calc(50%-50vw)] flex gap-5 overflow-hidden px-10 py-4 sm:px-16"
          style={RAIL_EDGE_FADE}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-[220px] shrink-0 rounded-2xl" />
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
        <p className={DASHED_NOTE}>— No creators match —</p>
      ) : (
        <div
          ref={railRef}
          className="no-scrollbar mx-[calc(50%-50vw)] overflow-x-auto px-10 py-4 sm:px-16"
          style={RAIL_EDGE_FADE}
        >
          <div className="flex gap-5">
            {users.map((u) => (
              <CreatorCard key={u.userId || u.username} user={u} />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                aria-label="Load more creators"
                className="group flex w-[220px] shrink-0 items-center gap-3 rounded-2xl border-2 border-foreground bg-primary-foreground force-light-surface px-4 py-3 text-left text-foreground shadow-flat-4 transition-shadow hover:shadow-flat-primary-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-foreground">
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

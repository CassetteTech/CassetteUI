'use client';

/**
 * Posts from the curators the viewer follows or joined, newest first. The
 * session says how many such curators there are; the Feed reads posts only
 * after it knows that count is positive. Every page is authorized by Bridge,
 * so an ending membership or an Unfollow drops that curator's posts from the
 * next read, and a followed curator's members-only post arrives locked.
 * Billing stays on Memberships.
 */

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AccountCheckError, AccountCheckStatus } from '@/components/auth/account-check';
import {
  CreatorCard,
  LockedPostCard,
  POST_GRID,
  PostCard,
  PostGridSkeleton,
} from '@/components/features/explore/explore-cards';
import { MEMBERSHIP_OFFER_ID } from '@/components/features/curator/curator-membership-card';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { FilterPills } from '@/components/ui/filter-pills';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/use-auth';
import { useMembershipStatus } from '@/hooks/use-membership-status';
import { profileQueryKeys, useCuratorFeed, useExploreCurators } from '@/hooks/use-profile';
import { authService } from '@/services/auth';
import { SESSION_MAX_AGE_MS, useAuthStore } from '@/stores/auth-store';
import type { CuratorFeedItem } from '@/types';

const FEATURED_CURATOR_LIMIT = 3;

export default function FeedPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* The filter lives in the URL, which only the client knows. */}
      <Suspense fallback={null}>
        <CuratorFeed />
      </Suspense>
    </div>
  );
}

function CuratorFeed() {
  const router = useRouter();
  const membersOnly = useSearchParams().get('filter') === 'members';
  const queryClient = useQueryClient();
  const {
    user,
    isLoading,
    sessionError,
    isRefreshingSession,
    activeMembershipCount,
    feedCuratorCount,
    sessionCheckedAt,
  } = useAuthState();
  const setFeedSourceCounts = useAuthStore((state) => state.setFeedSourceCounts);
  const [openedAt] = useState(() => Date.now());
  const viewerId = user?.id ?? null;
  // Only the count of followed and joined curators opens the Feed; the paid
  // count can briefly exceed it while a source changes, and never does on its own.
  const hasSources = !sessionError && feedCuratorCount !== null && feedCuratorCount > 0;
  // Posts wait for a session read that is fresh for this visit and not being replaced.
  const sessionCurrent =
    !isRefreshingSession && sessionCheckedAt !== null && sessionCheckedAt + SESSION_MAX_AGE_MS > openedAt;
  const feedEnabled = hasSources && sessionCurrent;
  const feed = useCuratorFeed(viewerId, membersOnly, feedEnabled);
  const { headingRef, recordFocus } = useResetFocusRecovery(feedEnabled && feed.data !== undefined);

  // Reads the session on entry when the last read is too old, then again each
  // time it ages out while the page is visible. Each read restarts the Feed
  // at its first page, so a membership that ended, even one replaced by
  // another, leaves no earlier rows on screen.
  useEffect(() => {
    if (!viewerId) return;
    const wait = sessionCheckedAt === null ? 0 : Math.max(0, sessionCheckedAt + SESSION_MAX_AGE_MS - Date.now());
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') void authService.refreshSession();
    }, wait);
    return () => window.clearTimeout(timer);
  }, [viewerId, sessionCheckedAt]);

  // Bridge counts the sources again with each page. A different count means
  // the loaded pages came from an earlier set of sources: keep both new counts
  // and start over at the first page, or show the join state at zero.
  const latestPage = feed.data?.pages.at(-1);
  const pageMemberships = latestPage?.activeMembershipCount;
  const pageSources = latestPage?.feedCuratorCount;
  useEffect(() => {
    if (pageMemberships === undefined || pageSources === undefined) return;
    if (pageMemberships === activeMembershipCount && pageSources === feedCuratorCount) return;
    setFeedSourceCounts({ activeMembershipCount: pageMemberships, feedCuratorCount: pageSources });
    queryClient.removeQueries({ queryKey: profileQueryKeys.allCuratorFeeds() });
  }, [pageMemberships, pageSources, activeMembershipCount, feedCuratorCount, queryClient, setFeedSourceCounts]);

  const setMembersOnly = (next: boolean) =>
    router.replace(next ? '/feed?filter=members' : '/feed', { scroll: false });

  let content: React.ReactNode;
  if (isLoading) {
    content = <AccountCheckStatus />;
  } else if (sessionError) {
    content = <AccountCheckError />;
  } else if (!user) {
    content = <SignInPrompt membersOnly={membersOnly} />;
  } else if (feedCuratorCount === null) {
    content = <AccountCheckStatus />;
  } else if (feedCuratorCount === 0) {
    content = <JoinCuratorPrompt viewerId={user.id} />;
  } else {
    content = (
      <FeedPosts
        feed={feed}
        viewerId={user.id}
        sessionCurrent={sessionCurrent}
        membersOnly={membersOnly}
        onShowAll={() => setMembersOnly(false)}
      />
    );
  }

  return (
    // The section only records where focus is, for focus recovery after a reset; it takes no input itself.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section aria-labelledby="feed-heading" onFocus={recordFocus}>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h1
          ref={headingRef}
          id="feed-heading"
          tabIndex={-1}
          className="font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl"
        >
          From your curators
        </h1>
        {hasSources && (
          <FilterPills
            label="Post filter"
            value={membersOnly ? 'members' : 'all'}
            onValueChange={(next) => setMembersOnly(next === 'members')}
            options={[
              { value: 'all', label: 'All' },
              { value: 'members', label: 'Members only' },
            ]}
          />
        )}
      </header>
      {content}
    </section>
  );
}

/**
 * A reset replaces the posts. If it removed the element that had focus, the
 * browser drops focus to the page body; this puts it on the heading instead.
 */
function useResetFocusRecovery(postsShown: boolean) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastFocused = useRef<Element | null>(null);

  useLayoutEffect(() => {
    if (postsShown) return;
    const previous = lastFocused.current;
    lastFocused.current = null;
    if (previous && !previous.isConnected && document.activeElement === document.body) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [postsShown]);

  const recordFocus = (event: React.FocusEvent) => {
    lastFocused.current = event.target;
  };
  return { headingRef, recordFocus };
}

function SignInPrompt({ membersOnly }: { membersOnly: boolean }) {
  const returnPath = membersOnly ? '/feed?filter=members' : '/feed';

  return (
    <Empty>
      <EmptyTitle>Sign in to see your Feed</EmptyTitle>
      <EmptyDescription>Posts from the curators you follow or join appear here, newest first.</EmptyDescription>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href={`/auth/signin?redirect=${encodeURIComponent(returnPath)}`}>Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/explore">Explore curators</Link>
        </Button>
      </div>
    </Empty>
  );
}

/** No followed or joined curators: the curators a fan could join now, from the featured list in its own order. */
function JoinCuratorPrompt({ viewerId }: { viewerId: string }) {
  const curators = useExploreCurators();
  const joinable = (curators.data ?? [])
    .filter((curator) => curator.hasActiveMembershipPlan && curator.userId !== viewerId)
    .slice(0, FEATURED_CURATOR_LIMIT);

  return (
    <div className="max-w-3xl">
      <h2 className="font-teko text-3xl font-bold uppercase leading-none tracking-tight">Join a curator</h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        When you follow or join a curator, their posts appear here, newest first. Each curator&apos;s page lists what
        their membership includes.
      </p>

      {curators.isPending ? (
        <div aria-hidden className="mt-6 flex flex-wrap gap-5">
          {Array.from({ length: FEATURED_CURATOR_LIMIT }, (_, i) => (
            <Skeleton key={i} className="h-[72px] w-[220px] rounded-2xl" />
          ))}
        </div>
      ) : curators.isError ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">Featured curators could not load.</p>
          <Button variant="outline" size="sm" onClick={() => void curators.refetch()}>
            Try again
          </Button>
        </div>
      ) : joinable.length > 0 ? (
        <ul aria-label="Featured curators" className="mt-6 flex flex-wrap gap-5">
          {joinable.map((curator) => (
            <li key={curator.userId}>
              <CreatorCard user={curator} />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/explore">Explore curators</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/memberships">Memberships</Link>
        </Button>
      </div>
    </div>
  );
}

function FeedPosts({
  feed,
  viewerId,
  sessionCurrent,
  membersOnly,
  onShowAll,
}: {
  feed: ReturnType<typeof useCuratorFeed>;
  viewerId: string;
  sessionCurrent: boolean;
  membersOnly: boolean;
  onShowAll: () => void;
}) {
  // Cached pages outlive the session read they followed. Until a current read
  // replaces them, show the skeleton, never the earlier rows.
  if (!sessionCurrent) {
    return <PostGridSkeleton />;
  }

  if (feed.isError && !feed.data) {
    return (
      <Empty>
        <EmptyTitle>Posts could not load</EmptyTitle>
        <EmptyDescription>Check your connection, then try again.</EmptyDescription>
        <Button variant="outline" onClick={() => void feed.refetch()}>
          Try again
        </Button>
      </Empty>
    );
  }

  if (!feed.data) {
    return <PostGridSkeleton />;
  }

  const items = feed.data.pages.flatMap((page) => page.items);

  return (
    <>
      {items.length === 0 ? (
        <Empty>
          <EmptyTitle>{membersOnly ? 'No members-only posts yet' : 'No posts yet'}</EmptyTitle>
          <EmptyDescription>
            {membersOnly
              ? 'The curators you joined have not shared members-only posts yet.'
              : 'The curators you follow have not posted yet. New posts appear here first.'}
          </EmptyDescription>
          {membersOnly ? (
            <Button variant="outline" onClick={onShowAll}>
              Show all posts
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/explore">Explore curators</Link>
            </Button>
          )}
        </Empty>
      ) : (
        <div className={POST_GRID}>
          {items.map((item) => item.kind === 'post'
            ? <PostCard key={item.post.postId} post={item.post} />
            : <LockedFeedPost key={item.postId} item={item} viewerId={viewerId} />)}
        </div>
      )}

      {feed.isFetchNextPageError && (
        <p role="alert" className="mt-10 text-center text-sm text-destructive">
          More posts could not load.
        </p>
      )}
      {feed.hasNextPage && (
        <div className="mt-6 text-center">
          <Button
            variant="brutalist-outline"
            onClick={() => void feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
            className="rounded-none"
          >
            {feed.isFetchingNextPage && <Spinner size="sm" aria-hidden />}
            {feed.isFetchNextPageError ? 'Try again' : 'Load more'}
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * Whether the curator takes new members now comes from the viewer's own
 * membership status, read once per curator; the locked row never carries it.
 */
function LockedFeedPost({ item, viewerId }: { item: Extract<CuratorFeedItem, { kind: 'locked' }>; viewerId: string }) {
  const status = useMembershipStatus(item.curator.id, viewerId, false);
  let availability: 'available' | 'unavailable' | 'unknown' = 'unknown';
  if (status.data) availability = status.data.canSubscribe ? 'available' : 'unavailable';
  return (
    <LockedPostCard
      item={item}
      availability={availability}
      joinHref={`/profile/${encodeURIComponent(item.curator.username)}#${MEMBERSHIP_OFFER_ID}`}
    />
  );
}

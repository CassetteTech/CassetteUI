'use client';

/** The public page's Music tab: one list for every account, narrowed by ink filter pills, in the
    one music card. A visitor sees a members-only post as a locked card that leads to the offer. */

import { useId } from 'react';
import Link from 'next/link';
import type { OwnerVisibility } from '@/components/features/post/post-visibility';
import {
  ActivitySkeleton,
  LockedMusicCard,
  MusicPostCard,
  type MusicCardPost,
} from '@/components/features/profile/profile-activity';
import { musicViewLabels, type ProfileMusicView } from '@/components/features/profile/profile-music-view';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { FilterPills } from '@/components/ui/filter-pills';
import { PendingLabel } from '@/components/ui/interior/loading-button';
import { cn } from '@/lib/utils';
import type { AccountType } from '@/types';

export type ProfileMusicItem =
  | { kind: 'post'; post: MusicCardPost }
  | { kind: 'locked'; postId: string; createdAt: string };

function MusicEmpty({ view, isOwner, displayName }: { view: ProfileMusicView; isOwner: boolean; displayName: string }) {
  if (view === 'members') {
    return (
      <Empty>
        <EmptyTitle>No members-only posts yet</EmptyTitle>
        <EmptyDescription>
          {isOwner
            ? 'Lock a post from Studio Music, or add music for members.'
            : `${displayName} has not shared any members-only posts yet. You will see them here first.`}
        </EmptyDescription>
        {isOwner && (
          <Button asChild variant="outline">
            <Link href="/studio/music">Open Studio Music</Link>
          </Button>
        )}
      </Empty>
    );
  }
  const noun = view === 'all' ? 'music' : musicViewLabels[view].toLowerCase();
  if (isOwner) {
    return (
      <Empty>
        <EmptyTitle>{`No ${noun} yet`}</EmptyTitle>
        <EmptyDescription>Add music to start your page. Fans see it here.</EmptyDescription>
        <Button asChild>
          <Link href="/studio/music/new">{view === 'all' ? 'Add your first music' : 'Add music'}</Link>
        </Button>
      </Empty>
    );
  }
  return (
    <Empty>
      <EmptyTitle>{`No ${noun} yet`}</EmptyTitle>
      <EmptyDescription>{`${displayName} has not shared any ${noun} yet.`}</EmptyDescription>
      <Button asChild variant="outline">
        <Link href="/explore">Explore music</Link>
      </Button>
    </Empty>
  );
}

export function ProfileMusic({
  id,
  views,
  view,
  onViewChange,
  items,
  pending,
  switching = false,
  hasMore,
  loadingMore,
  onLoadMore,
  isOwner,
  canLockPosts,
  visibilities,
  displayName,
  ownerUsername,
  ownerAccountType,
  membershipId,
  showMembership = false,
}: {
  /** The section's id, for links that bring the list into view. */
  id?: string;
  /** The pills to offer; a single view shows no pills. */
  views: readonly ProfileMusicView[];
  view: ProfileMusicView;
  onViewChange: (view: ProfileMusicView) => void;
  items: ProfileMusicItem[];
  /** The first read of this view is in flight. */
  pending: boolean;
  /** A view change is loading; the last list stays on screen, inert and dimmed. */
  switching?: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  isOwner: boolean;
  canLockPosts: boolean;
  visibilities?: readonly OwnerVisibility[];
  displayName: string;
  ownerUsername: string;
  ownerAccountType?: AccountType | number | string;
  /** Where a locked card leads: the membership offer in the rail. */
  membershipId?: string;
  showMembership?: boolean;
}) {
  const headingId = useId();
  let body;
  if (pending) {
    body = <ActivitySkeleton count={6} />;
  } else if (items.length === 0) {
    body = <MusicEmpty view={view} isOwner={isOwner} displayName={displayName} />;
  } else {
    body = (
      <div
        inert={switching}
        aria-busy={switching || undefined}
        className={cn(
          'grid grid-cols-1 gap-4 transition-opacity duration-150 motion-safe:animate-reveal xl:grid-cols-2',
          switching && 'opacity-50',
        )}
      >
        {items.map((item) => item.kind === 'locked'
          ? (
              <LockedMusicCard
                key={item.postId}
                createdAt={item.createdAt}
                displayName={displayName}
                membershipId={membershipId ?? ''}
                showMembership={showMembership && Boolean(membershipId)}
              />
            )
          : (
              <MusicPostCard
                key={item.post.postId}
                post={item.post}
                ownerUsername={ownerUsername}
                ownerAccountType={ownerAccountType}
                isOwnPost={isOwner}
                canLockPosts={canLockPosts}
                visibilities={visibilities}
              />
            ))}
      </div>
    );
  }

  return (
    <section id={id} data-testid="profile-music" aria-labelledby={headingId} className="min-w-0 scroll-mt-24">
      <h2 id={headingId} className="sr-only">Music</h2>
      {views.length > 1 && (
        <FilterPills
          label="Music filter"
          value={view}
          onValueChange={onViewChange}
          options={views.map((value) => ({ value, label: musicViewLabels[value] }))}
          className="mb-4"
        />
      )}
      {body}
      {hasMore && !pending && !switching && (
        <div className="mt-6 flex justify-center">
          <Button type="button" variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            <PendingLabel pending={loadingMore} label="Load more" pendingLabel="Loading…" />
          </Button>
        </div>
      )}
    </section>
  );
}

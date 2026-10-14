'use client';

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
import { PendingLabel } from '@/components/ui/interior/loading-button';
import { ListTabs } from '@/components/ui/list-tabs';
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
  id?: string;
  views: readonly ProfileMusicView[];
  view: ProfileMusicView;
  onViewChange: (view: ProfileMusicView) => void;
  items: ProfileMusicItem[];
  pending: boolean;
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
        <ListTabs
          label="Music filter"
          value={view}
          onValueChange={onViewChange}
          options={views.map((value) => ({ value, label: musicViewLabels[value] }))}
          className="mb-5"
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

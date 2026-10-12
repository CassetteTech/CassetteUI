'use client';

/** The Overview's recent music: the latest posts with the Studio Music row tools, so a curator
    can change who can open a post, edit its note, or share it without leaving the Overview. */

import { useContext, useMemo, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { LibraryEmpty, useLibrary, useLibraryRowTools } from '@/components/features/curator/studio-music-library';
import { StudioMusicRow, StudioMusicRowSkeleton } from '@/components/features/curator/studio-music-row';
import { studioPaths } from '@/components/features/curator/studio-routes';
import { StudioSection, StudioStepsContext } from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import { useAuthState } from '@/hooks/use-auth';
import { useMemberPostAccess } from '@/hooks/use-curator';

const recentCount = 5;

export function StudioRecentMusic() {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  const steps = useContext(StudioStepsContext);
  const access = useMemberPostAccess();
  // The library's All list: the Overview and Studio Music share one read, one cache, and one patch.
  const { library, posts: allPosts } = useLibrary(userId, null, null);
  const posts = useMemo(() => allPosts.slice(0, recentCount), [allPosts]);
  const listRef = useRef<HTMLUListElement>(null);
  // Every audience is in this list, so a new setting never takes a row out of it.
  const { onSaved, onEdit, onDelete, sheets } = useLibraryRowTools({
    userId,
    posts,
    listRef,
    sectionId: 'studio-recent-music',
    leavesList: () => false,
  });
  const returnPath = studioPaths['studio-overview'];

  let body: ReactNode;
  if (library.isPending) {
    body = (
      <>
        <output className="sr-only">Loading your music…</output>
        <ul aria-hidden className="divide-y divide-border/60">
          {[0, 1, 2].map((index) => <StudioMusicRowSkeleton key={index} />)}
        </ul>
      </>
    );
  } else if (posts.length === 0 && library.isError) {
    body = (
      <div className="flex flex-wrap items-center gap-3 py-2">
        <p role="alert" className="text-sm text-destructive">Could not load your music.</p>
        <Button variant="outline" size="sm" onClick={() => void library.refetch()}>Try again</Button>
      </div>
    );
  } else if (posts.length === 0) {
    body = <LibraryEmpty type={null} audience={null} returnPath={returnPath} />;
  } else {
    body = (
      <ul ref={listRef} className="divide-y divide-border/60">
        {posts.map((post) => (
          <StudioMusicRow
            key={post.postId}
            post={post}
            returnPath={returnPath}
            access={access.state}
            retryAccess={access.refetch}
            openPlanSetup={() => steps?.open('studio-plan')}
            onSaved={onSaved}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    );
  }

  return (
    <StudioSection
      id="studio-recent-music"
      title="Recent music"
      headingId="studio-recent-music-title"
      chip={posts.length > 0 && (
        <Button asChild variant="outline" size="sm" className="bg-background/60">
          <Link href={studioPaths['studio-music']}>All music</Link>
        </Button>
      )}
    >
      <div className="[container-type:inline-size]">{body}</div>
      {sheets}
    </StudioSection>
  );
}

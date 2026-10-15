'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { audienceDetails, nounsOf, typeDetails } from '@/components/features/curator/studio-music-filters';
import {
  addMusicHref,
  studioMusicHref,
  type MusicAudience,
  type MusicType,
} from '@/components/features/curator/studio-routes';
import { DeletePostModal } from '@/components/features/post/delete-post-modal';
import { EditPostModal } from '@/components/features/post/edit-post-modal';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { profileQueryKeys } from '@/hooks/use-profile';
import { patchMusicPages, uniquePosts } from '@/lib/studio-music-pages';
import { profileService } from '@/services/profile';
import type { ActivityPost, PaginatedActivityResponse } from '@/types';

export const libraryPageSize = 20;

type LibraryPages = InfiniteData<PaginatedActivityResponse, string | null>;

const firstLibraryPage: string | null = null;

const libraryKeys = {
  all: (userId: string | null) => profileQueryKeys.studioActivity(userId, 'studio-library'),
  list: (userId: string | null, type: MusicType | null, audience: MusicAudience | null) =>
    [...libraryKeys.all(userId), type ?? 'all', audience ? audienceDetails[audience].privacy : 'all'] as const,
  privacyOf: (key: QueryKey) => String(key.at(-1)),
};

export function useLibrary(userId: string | null, type: MusicType | null, audience: MusicAudience | null) {
  const library = useInfiniteQuery({
    queryKey: libraryKeys.list(userId, type, audience),
    queryFn: ({ pageParam }) => profileService.fetchUserActivity(userId!, {
      cursor: pageParam ?? undefined,
      pageSize: libraryPageSize,
      elementType: type ? typeDetails[type].elementType : undefined,
      privacy: audience ? audienceDetails[audience].privacy : undefined,
    }),
    initialPageParam: firstLibraryPage,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: userId !== null,
    placeholderData: keepPreviousData,
  });
  const posts = useMemo(() => uniquePosts(library.data?.pages ?? []), [library.data]);
  return { library, posts, total: library.data?.pages[0]?.totalItems ?? 0 };
}

function useLibraryPatch(userId: string | null) {
  const queryClient = useQueryClient();
  return useCallback((postId: string, change: Partial<ActivityPost> | null) => {
    for (const [key, data] of queryClient.getQueriesData<LibraryPages>({ queryKey: libraryKeys.all(userId) })) {
      if (data) queryClient.setQueryData<LibraryPages>(key, patchMusicPages(data, postId, change, libraryKeys.privacyOf(key)));
    }
    void queryClient.invalidateQueries({ queryKey: libraryKeys.all(userId), refetchType: 'none' });
  }, [queryClient, userId]);
}

function useRowSheets({ patch, leavesList, focusAfterRemoval }: {
  patch: (postId: string, change: Partial<ActivityPost> | null) => void;
  leavesList: (privacy: string | undefined) => boolean;
  focusAfterRemoval: (postId: string) => () => HTMLElement | null;
}) {
  const [editing, setEditing] = useState<{ post: ActivityPost; open: boolean } | null>(null);
  const [deleting, setDeleting] = useState<{ post: ActivityPost; open: boolean } | null>(null);
  const returnTarget = useRef<(() => HTMLElement | null) | null>(null);
  const returnFocusTo = () => {
    const target = returnTarget.current?.() ?? null;
    returnTarget.current = null;
    return target;
  };
  const opener = (open: (post: ActivityPost) => void) => (post: ActivityPost, returnFocus: HTMLElement | null) => {
    returnTarget.current = () => returnFocus;
    open(post);
  };

  return {
    onEdit: opener((post) => setEditing({ post, open: true })),
    onDelete: opener((post) => setDeleting({ post, open: true })),
    sheets: (
      <>
        {editing && (
          <EditPostModal
            open={editing.open}
            onOpenChange={(open) => setEditing({ ...editing, open })}
            postId={editing.post.postId}
            currentDescription={editing.post.description ?? ''}
            currentPrivacy={editing.post.privacy}
            currentCommentsEnabled={editing.post.commentsEnabled ?? true}
            onSuccess={(change) => {
              if (leavesList(change.privacy)) returnTarget.current = focusAfterRemoval(editing.post.postId);
              patch(editing.post.postId, change);
            }}
            returnFocusTo={returnFocusTo}
          />
        )}
        {deleting && (
          <DeletePostModal
            open={deleting.open}
            onOpenChange={(open) => setDeleting({ ...deleting, open })}
            postId={deleting.post.postId}
            postTitle={deleting.post.title}
            onSuccess={() => {
              returnTarget.current = focusAfterRemoval(deleting.post.postId);
              patch(deleting.post.postId, null);
            }}
            returnFocusTo={returnFocusTo}
          />
        )}
      </>
    ),
  };
}

export function useLibraryRowTools({ userId, posts, listRef, sectionId, leavesList }: {
  userId: string | null;
  posts: readonly ActivityPost[];
  listRef: RefObject<HTMLUListElement | null>;
  sectionId: string;
  leavesList: (privacy: string | undefined) => boolean;
}) {
  const patch = useLibraryPatch(userId);
  const focusAfterRemoval = (postId: string) => {
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-post-id]') ?? [])];
    const index = rows.findIndex((row) => row.dataset.postId === postId);
    const neighbor = rows[index + 1] ?? rows[index - 1];
    return () => neighbor?.querySelector<HTMLElement>('[data-row-title]') ?? document.getElementById(sectionId);
  };
  const { onEdit, onDelete, sheets } = useRowSheets({ patch, leavesList, focusAfterRemoval });

  const focusAfterDrop = useRef<(() => HTMLElement | null) | null>(null);
  useEffect(() => {
    const refocus = focusAfterDrop.current;
    focusAfterDrop.current = null;
    if (refocus && (document.activeElement === null || document.activeElement === document.body)) refocus()?.focus();
  }, [posts]);
  const onSaved = (post: ActivityPost, change: Partial<ActivityPost>) => {
    if (leavesList(change.privacy)) focusAfterDrop.current = focusAfterRemoval(post.postId);
    patch(post.postId, change);
  };
  return { onSaved, onEdit, onDelete, sheets };
}

export function LibraryEmpty({ type, audience, returnPath }: {
  type: MusicType | null;
  audience: MusicAudience | null;
  returnPath: string;
}) {
  const nouns = nounsOf(type);
  if (audience) {
    return (
      <Empty className="mt-2">
        <EmptyTitle>{`No ${audienceDetails[audience].adjective} ${nouns.many}`}</EmptyTitle>
        <EmptyDescription>Change who can open a post from its row.</EmptyDescription>
        <Button asChild variant="outline">
          <Link href={studioMusicHref({ type })} replace scroll={false}>{`Show all ${nouns.many}`}</Link>
        </Button>
      </Empty>
    );
  }
  if (type) {
    return (
      <Empty className="mt-2">
        <EmptyTitle>{`No ${nouns.many} yet`}</EmptyTitle>
        <EmptyDescription>{`${typeDetails[type].label} you add show here.`}</EmptyDescription>
        <Button asChild>
          <Link href={addMusicHref(returnPath)}>
            <Plus aria-hidden />
            Add music
          </Link>
        </Button>
      </Empty>
    );
  }
  return (
    <Empty className="mt-2">
      <EmptyTitle>No music yet</EmptyTitle>
      <EmptyDescription>Add a playlist, track, or album with a note. Fans see it on your page.</EmptyDescription>
      <Button asChild>
        <Link href={addMusicHref(returnPath)}>
          <Plus aria-hidden />
          Add your first music
        </Link>
      </Button>
    </Empty>
  );
}

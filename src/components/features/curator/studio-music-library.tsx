'use client';

/** The curator's music library, shared by Studio Music and the Overview's recent music: the list
    reads, the cache patch after a save, the row sheets, and the empty states. */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
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
import { patchMusicPages, uniquePosts } from '@/lib/studio-music-pages';
import { profileService } from '@/services/profile';
import type { ActivityPost, PaginatedActivityResponse } from '@/types';

export const libraryPageSize = 20;

type LibraryPages = InfiniteData<PaginatedActivityResponse, number>;

// Under the activity key, so a post added, saved, or deleted anywhere refreshes the library; the
// app's default freshness then spares a long list a refetch of every page on each window focus.
const libraryKey = (userId: string | null) => ['user-activity', userId, 'studio-library'] as const;

/** One view of the library: its pages, the posts without repeats, and the view's total. */
export function useLibrary(userId: string | null, type: MusicType | null, audience: MusicAudience | null) {
  const library = useInfiniteQuery({
    queryKey: [...libraryKey(userId), type ?? 'all', audience ? audienceDetails[audience].privacy : 'all'],
    queryFn: ({ pageParam }) => profileService.fetchUserActivity(userId!, {
      page: pageParam,
      pageSize: libraryPageSize,
      elementType: type ? typeDetails[type].elementType : undefined,
      privacy: audience ? audienceDetails[audience].privacy : undefined,
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: userId !== null,
    // A filter change keeps the last list on screen, inert and dimmed, until the new one lands.
    placeholderData: keepPreviousData,
  });
  const posts = useMemo(() => uniquePosts(library.data?.pages ?? []), [library.data]);
  return { library, posts, total: library.data?.pages[0]?.totalItems ?? 0 };
}

/** Applies a saved change to every cached library list at once (see `patchMusicPages`). A patch
    counts as fresh data, yet it cannot add a post that moved into a list, so every list is marked
    stale again and reads Bridge the next time it shows. The save's own refresh covers the open one. */
function useLibraryPatch(userId: string | null) {
  const queryClient = useQueryClient();
  return useCallback((postId: string, change: Partial<ActivityPost> | null) => {
    for (const [key, data] of queryClient.getQueriesData<LibraryPages>({ queryKey: libraryKey(userId) })) {
      // The key's last part is the list's audience: a privacy value, or 'all'.
      if (data) queryClient.setQueryData<LibraryPages>(key, patchMusicPages(data, postId, change, String(key[4])));
    }
    void queryClient.invalidateQueries({ queryKey: libraryKey(userId), refetchType: 'none' });
  }, [queryClient, userId]);
}

/** The note and delete sheets, shared by every row. Radix focuses nothing when a sheet without a
    trigger closes, so each opening records where focus returns: the opener, or the next post
    when the post left the list. */
function useRowSheets({ patch, leavesList, focusAfterRemoval }: {
  patch: (postId: string, change: Partial<ActivityPost> | null) => void;
  leavesList: (privacy: string | undefined) => boolean;
  focusAfterRemoval: (postId: string) => () => void;
}) {
  const [editing, setEditing] = useState<{ post: ActivityPost; open: boolean } | null>(null);
  const [deleting, setDeleting] = useState<{ post: ActivityPost; open: boolean } | null>(null);
  const restoreFocus = useRef<(() => void) | null>(null);
  const returnFocusOnClose = (event: Event) => {
    event.preventDefault();
    restoreFocus.current?.();
    restoreFocus.current = null;
  };
  const opener = (open: (post: ActivityPost) => void) => (post: ActivityPost, returnFocus: HTMLElement | null) => {
    restoreFocus.current = () => returnFocus?.focus();
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
              if (leavesList(change.privacy)) restoreFocus.current = focusAfterRemoval(editing.post.postId);
              patch(editing.post.postId, change);
            }}
            onCloseAutoFocus={returnFocusOnClose}
          />
        )}
        {deleting && (
          <DeletePostModal
            open={deleting.open}
            onOpenChange={(open) => setDeleting({ ...deleting, open })}
            postId={deleting.post.postId}
            postTitle={deleting.post.title}
            onSuccess={() => {
              restoreFocus.current = focusAfterRemoval(deleting.post.postId);
              patch(deleting.post.postId, null);
            }}
            onCloseAutoFocus={returnFocusOnClose}
          />
        )}
      </>
    ),
  };
}

/** The row tools for one list of library rows: a save patches every cached list, the note and
    delete sheets open from the row, and focus moves to the next post when a post leaves the list.
    `leavesList` says whether a saved privacy takes a row out of this list. */
export function useLibraryRowTools({ userId, posts, listRef, sectionId, leavesList }: {
  userId: string | null;
  posts: readonly ActivityPost[];
  listRef: RefObject<HTMLUListElement | null>;
  /** Takes focus when the last post leaves the list. */
  sectionId: string;
  leavesList: (privacy: string | undefined) => boolean;
}) {
  const patch = useLibraryPatch(userId);
  /** Where focus goes once a row leaves: the next row's title, else the one before, else the section. */
  const focusAfterRemoval = (postId: string) => {
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-post-id]') ?? [])];
    const index = rows.findIndex((row) => row.dataset.postId === postId);
    const neighbor = rows[index + 1] ?? rows[index - 1];
    return () => (neighbor?.querySelector<HTMLElement>('[data-row-title]') ?? document.getElementById(sectionId))?.focus();
  };
  const { onEdit, onDelete, sheets } = useRowSheets({ patch, leavesList, focusAfterRemoval });

  // A row whose new setting leaves this list takes its control, or its still-open menu, with it,
  // and the browser drops focus to the page. Once that render lands, focus moves to the next post.
  const focusAfterDrop = useRef<(() => void) | null>(null);
  useEffect(() => {
    const refocus = focusAfterDrop.current;
    focusAfterDrop.current = null;
    if (refocus && (document.activeElement === null || document.activeElement === document.body)) refocus();
  }, [posts]);
  const onSaved = (post: ActivityPost, change: Partial<ActivityPost>) => {
    if (leavesList(change.privacy)) focusAfterDrop.current = focusAfterRemoval(post.postId);
    patch(post.postId, change);
  };
  return { onSaved, onEdit, onDelete, sheets };
}

/** One empty state per view: no music at all leads to Add music; an empty type offers to add
    one; an empty audience offers the whole type back. */
export function LibraryEmpty({ type, audience, returnPath }: {
  type: MusicType | null;
  audience: MusicAudience | null;
  returnPath: string;
}) {
  const nouns = nounsOf(type);
  if (audience) {
    return (
      <Empty>
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
      <Empty>
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
    <Empty>
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

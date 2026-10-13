'use client';

/**
 * The signed-in viewer's private Follow of one curator: one relationship read,
 * one write at a time, and the return from sign-in after a signed-out Follow.
 * A write changes nothing on screen until Bridge confirms it.
 */

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { profileQueryKeys } from '@/hooks/use-profile';
import { authService } from '@/services/auth';
import { fetchCuratorFollow, setCuratorFollow } from '@/services/curator';
import { useAuthStore } from '@/stores/auth-store';
import { removeQueryParameters } from '@/utils/remove-query-parameters';

const followIntentPrefix = 'cassette:follow-intent:';
const followIntentLifetimeMs = 10 * 60 * 1_000;

const curatorFollowQueryKey = (curatorProfileId: string, viewerId: string | null) =>
  ['curator-follow', curatorProfileId, viewerId] as const;

export type CuratorFollow = {
  displayName: string;
  /** `member` and `loading` render no control: Join and Manage cover a member. */
  state: 'loading' | 'signed-out' | 'unavailable' | 'member' | 'not-following' | 'following';
  pending: boolean;
  error: string | null;
  follow: () => void;
  unfollow: () => void;
  retry: () => void;
};

/**
 * A Follow adds or removes a Feed source: the session read restarts, which
 * reports the new counts, and both Feed filters start again from the first page.
 */
function refreshAfterFollowChange(queryClient: QueryClient, username: string) {
  void authService.refreshSession({ restart: true });
  queryClient.removeQueries({ queryKey: profileQueryKeys.allCuratorFeeds() });
  void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
}

export function useCuratorFollow(
  curator: { id: string; username: string; displayName: string } | null,
  isOwner: boolean,
  /** The profile query a signed-out viewer returns to after signing in, such as `tab=liked`. */
  returnQuery: string,
): CuratorFollow | null {
  const router = useRouter();
  const queryClient = useQueryClient();
  const returning = useSearchParams().get('follow') === '1';
  const { user, isLoading: authLoading, isAuthenticated, sessionError } = useAuthState();
  const viewerId = isAuthenticated && user ? user.id : null;
  const curatorId = curator?.id ?? '';
  const relationship = useQuery({
    queryKey: curatorFollowQueryKey(curatorId, viewerId),
    queryFn: ({ signal }) => fetchCuratorFollow(curatorId, signal),
    enabled: curatorId !== '' && viewerId !== null && !isOwner,
    staleTime: 0,
    retry: 1,
  });
  const write = useMutation({
    mutationFn: ({ following }: { following: boolean; viewerId: string }) => setCuratorFollow(curatorId, following),
    onSuccess: async (state, { viewerId: startedBy }) => {
      const key = curatorFollowQueryKey(curatorId, startedBy);
      // A relationship read still open may carry Bridge's answer from before this write.
      await queryClient.cancelQueries({ queryKey: key });
      // An answer for an account that is no longer signed in here changes nothing.
      if (useAuthStore.getState().user?.id !== startedBy) return;
      queryClient.setQueryData(key, state);
      refreshAfterFollowChange(queryClient, curator?.username ?? '');
    },
    onError: (_error, { viewerId: startedBy }) => {
      // The write may have reached Bridge before it failed here: read the relationship again.
      if (useAuthStore.getState().user?.id !== startedBy) return;
      void queryClient.invalidateQueries({ queryKey: curatorFollowQueryKey(curatorId, startedBy) });
    },
  });
  const { mutate } = write;

  // After sign-in, a Follow the viewer selected while signed out goes through
  // once. The URL alone does nothing: the intent must come from this tab's own
  // recent click. An account or relationship read error keeps both for a retry.
  const returnHandled = useRef(false);
  const knownRelationship = relationship.data;
  useEffect(() => {
    if (!returning || returnHandled.current || curatorId === '' || authLoading) return;
    if (!viewerId) {
      if (!sessionError) removeQueryParameters('follow');
      return;
    }
    if (!isOwner && !knownRelationship) return;

    returnHandled.current = true;
    removeQueryParameters('follow');
    let intentCreatedAt = Number.NaN;
    try {
      const key = `${followIntentPrefix}${curatorId}`;
      intentCreatedAt = Number(sessionStorage.getItem(key));
      sessionStorage.removeItem(key);
    } catch {
      // Without storage the viewer selects Follow again.
    }
    const intentAge = Date.now() - intentCreatedAt;
    if (!Number.isFinite(intentCreatedAt) || intentAge < 0 || intentAge > followIntentLifetimeMs) return;
    if (isOwner || knownRelationship?.isFollowing) return;
    mutate({ following: true, viewerId });
  }, [authLoading, curatorId, isOwner, knownRelationship, mutate, returning, sessionError, viewerId]);

  if (!curator || isOwner) return null;

  const change = (following: boolean) => {
    if (write.isPending) return;
    if (viewerId) {
      mutate({ following, viewerId });
      return;
    }
    try {
      sessionStorage.setItem(`${followIntentPrefix}${curator.id}`, String(Date.now()));
    } catch {
      // The viewer can select Follow again after signing in.
    }
    const query = new URLSearchParams(returnQuery);
    query.set('follow', '1');
    const returnPath = `/profile/${encodeURIComponent(curator.username)}?${query}`;
    router.push(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
  };

  let state: CuratorFollow['state'];
  if (authLoading || (!viewerId && sessionError)) state = 'loading';
  else if (!viewerId) state = 'signed-out';
  else if (relationship.isError && !knownRelationship) state = 'unavailable';
  else if (!knownRelationship) state = 'loading';
  else if (knownRelationship.hasActiveMembership) state = 'member';
  else state = knownRelationship.isFollowing ? 'following' : 'not-following';

  // An error belongs to the account that made the request.
  const failed = write.isError && write.variables?.viewerId === viewerId;
  return {
    displayName: curator.displayName,
    state,
    pending: write.isPending,
    error: failed ? (write.variables?.following ? 'Could not follow. Try again.' : 'Could not unfollow. Try again.') : null,
    follow: () => change(true),
    unfollow: () => change(false),
    retry: () => void relationship.refetch(),
  };
}

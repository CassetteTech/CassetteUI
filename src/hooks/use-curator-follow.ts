'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { profileQueryKeys } from '@/hooks/use-profile';
import { authService } from '@/services/auth';
import { fetchCuratorFollow, setCuratorFollow, type CuratorFollowState } from '@/services/curator';
import { isCurrentAccount } from '@/stores/auth-store';
import { removeQueryParameters, removeQueryParametersFromRouter } from '@/utils/remove-query-parameters';
import { parseProfileActionIntent } from '@/utils/profile-action-intent';
import { tryStorage } from '@/lib/best-effort';

const followIntentPrefix = 'cassette:follow-intent:';
const followIntentLifetimeMs = 10 * 60 * 1_000;

// Reports already written to the cache. Each post read parses a new report object, so a remount of the
// control (the post page swaps layouts at 900 px) does not write an older report over a later Follow.
const appliedReports = new WeakSet<CuratorFollowState>();

const curatorFollowQueryKey = (curatorProfileId: string, viewerId: string | null) =>
  ['curator-follow', curatorProfileId, viewerId] as const;

export type CuratorFollow = {
  displayName: string;
  state: 'loading' | 'signed-out' | 'unavailable' | 'member' | 'not-following' | 'following';
  pending: boolean;
  error: string | null;
  follow: () => void;
  unfollow: () => void;
  retry: () => void;
  confirming: boolean;
  confirm: () => void;
  dismissConfirmation: () => void;
};

function refreshAfterFollowChange(queryClient: QueryClient, username: string) {
  void authService.refreshSession({ restart: true });
  queryClient.removeQueries({ queryKey: profileQueryKeys.allCuratorFeeds() });
  void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
}

function signInToFollow(
  router: ReturnType<typeof useRouter>,
  curator: { id: string; username: string },
  returnQuery: string,
  returnPathname: string | undefined,
) {
  tryStorage(() => sessionStorage.setItem(`${followIntentPrefix}${curator.id}`, String(Date.now())), undefined);
  const query = new URLSearchParams(returnQuery);
  query.set('follow', '1');
  const returnPath = `${returnPathname ?? `/profile/${encodeURIComponent(curator.username)}`}?${query}`;
  router.push(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
}

export function useCuratorFollow(
  curator: { id: string; username: string; displayName: string } | null,
  isOwner: boolean,
  returnQuery: string,
  /** Where a signed-out Follow returns after sign-in; the curator page when omitted. */
  returnPathname?: string,
  /**
   * The relationship as another read already reported it, such as the post read; null while that
   * read predates the signed-in viewer. Given either way, the hook never reads the relationship itself.
   */
  reportedRelationship?: CuratorFollowState | null,
): CuratorFollow | null {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const returning = searchParams.get('follow') === '1';
  const carried = parseProfileActionIntent(searchParams)?.action === 'follow';
  const [confirming, setConfirming] = useState(false);
  const { user, isLoading: authLoading, isAuthenticated, sessionError } = useAuthState();
  const viewerId = isAuthenticated && user ? user.id : null;
  const curatorId = curator?.id ?? '';
  const curatorUsername = curator?.username ?? '';
  const relationship = useQuery({
    queryKey: curatorFollowQueryKey(curatorId, viewerId),
    queryFn: ({ signal }) => fetchCuratorFollow(curatorId, signal),
    enabled: curatorId !== '' && viewerId !== null && !isOwner && reportedRelationship === undefined,
    staleTime: 0,
    retry: 1,
  });
  // Each new report replaces the cached relationship once, so it wins over an older cached read
  // (from another page, before a change in another tab), and a later Follow or Unfollow wins over it.
  const unappliedReport = reportedRelationship && !appliedReports.has(reportedRelationship) ? reportedRelationship : null;
  useLayoutEffect(() => {
    if (!unappliedReport || viewerId === null) return;
    appliedReports.add(unappliedReport);
    queryClient.setQueryData(curatorFollowQueryKey(curatorId, viewerId), unappliedReport);
  }, [curatorId, queryClient, unappliedReport, viewerId]);
  const write = useMutation({
    mutationFn: ({ following }: { following: boolean; viewerId: string }) => setCuratorFollow(curatorId, following),
    onSuccess: async (state, { viewerId: startedBy }) => {
      const key = curatorFollowQueryKey(curatorId, startedBy);
      await queryClient.cancelQueries({ queryKey: key });
      if (!isCurrentAccount(startedBy)) return;
      queryClient.setQueryData(key, state);
      refreshAfterFollowChange(queryClient, curator?.username ?? '');
    },
    onError: (_error, { viewerId: startedBy }) => {
      if (!isCurrentAccount(startedBy)) return;
      void queryClient.invalidateQueries({ queryKey: curatorFollowQueryKey(curatorId, startedBy) });
    },
  });
  const { mutate } = write;

  const returnHandled = useRef(false);
  const knownRelationship = unappliedReport ?? relationship.data;
  useEffect(() => {
    if (!returning || returnHandled.current || curatorId === '' || authLoading) return;
    if (!viewerId) {
      if (!sessionError) removeQueryParameters('follow');
      return;
    }
    if (!isOwner && !knownRelationship) return;

    returnHandled.current = true;
    removeQueryParameters('follow');
    const intentKey = `${followIntentPrefix}${curatorId}`;
    const intentCreatedAt = tryStorage(() => {
      const createdAt = Number(sessionStorage.getItem(intentKey));
      sessionStorage.removeItem(intentKey);
      return createdAt;
    }, Number.NaN);
    const intentAge = Date.now() - intentCreatedAt;
    if (!Number.isFinite(intentCreatedAt) || intentAge < 0 || intentAge > followIntentLifetimeMs) return;
    if (isOwner || knownRelationship?.isFollowing) return;
    mutate({ following: true, viewerId });
  }, [authLoading, curatorId, isOwner, knownRelationship, mutate, returning, sessionError, viewerId]);

  const carriedHandled = useRef(false);
  useEffect(() => {
    if (!carried || carriedHandled.current || curatorId === '' || authLoading) return;
    if (!viewerId) {
      if (sessionError) return;
      carriedHandled.current = true;
      removeQueryParametersFromRouter('intent');
      signInToFollow(router, { id: curatorId, username: curatorUsername }, returnQuery, returnPathname);
      return;
    }
    if (!isOwner && !knownRelationship) return;

    carriedHandled.current = true;
    removeQueryParametersFromRouter('intent');
    if (isOwner || knownRelationship?.isFollowing || knownRelationship?.hasActiveMembership) return;
    setConfirming(true);
  }, [
    authLoading,
    carried,
    curatorId,
    curatorUsername,
    isOwner,
    knownRelationship,
    returnPathname,
    returnQuery,
    router,
    sessionError,
    viewerId,
  ]);

  if (!curator || isOwner) return null;

  const change = (following: boolean) => {
    if (write.isPending) return;
    if (viewerId) {
      mutate({ following, viewerId });
      return;
    }
    signInToFollow(router, curator, returnQuery, returnPathname);
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
    confirming: confirming && state === 'not-following',
    confirm: () => {
      setConfirming(false);
      change(true);
    },
    dismissConfirmation: () => setConfirming(false),
  };
}

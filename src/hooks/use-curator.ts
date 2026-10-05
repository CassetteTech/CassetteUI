'use client';

/** Loads public curator pages incrementally while isolating each viewer's cached entitlement data. */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { fetchCuratorPlans, memberPostAccessState, memberPostPlans } from '@/services/curator-plans';
import { fetchCuratorPage, fetchOwnCuratorProfile } from '@/services/curator';

const PAGE_SIZE = 20;

export function useCuratorPage(username: string, viewerKey: string | null) {
  return useInfiniteQuery({
    queryKey: ['curator-page', username.toLowerCase(), viewerKey],
    queryFn: ({ pageParam, signal }) => fetchCuratorPage(username, pageParam, PAGE_SIZE, '', signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.posts.page * lastPage.posts.pageSize;
      return loaded < lastPage.posts.totalItems ? lastPage.posts.page + 1 : undefined;
    },
    enabled: viewerKey !== null,
    staleTime: 0,
  });
}

/** The signed-in user's curator profile and the published plans that unlock members-only posts. */
export function useMemberPostAccess(enabled = true) {
  const { user } = useAuthState();
  // Plans exist only under a curator profile; Bridge answers 404 without one.
  const profile = useQuery({
    queryKey: ['curator-profile', 'me', user?.id ?? null],
    queryFn: ({ signal }) => fetchOwnCuratorProfile(signal),
    enabled: enabled && Boolean(user?.id),
    staleTime: 0,
  });
  const plans = useQuery({
    queryKey: ['curator-plans', user?.id ?? null],
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    enabled: enabled && profile.data != null,
    staleTime: 0,
  });

  return {
    state: profile.isError || plans.isError
      ? 'error' as const
      : memberPostAccessState(profile.data === undefined ? undefined : profile.data !== null, plans.data),
    plans: memberPostPlans(plans.data ?? []),
    // Both explicitly: a settled profile read does not re-run an errored plans query.
    refetch: () => {
      void profile.refetch();
      void plans.refetch();
    },
  };
}

export function useSubscriberPostEligibility(enabled = true): boolean {
  return useMemberPostAccess(enabled).state === 'ready';
}

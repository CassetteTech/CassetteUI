'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { fetchMemberPostAuthoring } from '@/services/curator-plans';
import { fetchCuratorPage, unfilteredCuratorPage, type CuratorPageFilter } from '@/services/curator';

const PAGE_SIZE = 20;

export function useCuratorPage(username: string, viewerKey: string | null, filter: CuratorPageFilter = unfilteredCuratorPage) {
  const filtered = filter.elementType !== null || filter.membersOnly;
  return useInfiniteQuery({
    queryKey: filtered
      ? ['curator-page', username.toLowerCase(), viewerKey, filter.elementType, filter.membersOnly]
      : ['curator-page', username.toLowerCase(), viewerKey],
    queryFn: ({ pageParam, signal }) => fetchCuratorPage(username, pageParam, PAGE_SIZE, '', signal, filter),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.posts.page * lastPage.posts.pageSize;
      return loaded < lastPage.posts.totalItems ? lastPage.posts.page + 1 : undefined;
    },
    enabled: viewerKey !== null,
    staleTime: 0,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === username.toLowerCase() && previousQuery.queryKey[2] === viewerKey
        ? keepPreviousData(previous)
        : undefined,
  });
}

export type MemberPostAccessState = 'error' | 'loading' | 'needs-plan' | 'ready';

export function useMemberPostAccess(enabled = true) {
  const { user } = useAuthState();
  const authoring = useQuery({
    queryKey: ['member-post-authoring', user?.id ?? null],
    queryFn: ({ signal }) => fetchMemberPostAuthoring(signal),
    enabled: enabled && Boolean(user?.id),
    staleTime: 0,
  });

  let state: MemberPostAccessState = 'loading';
  if (authoring.isError) state = 'error';
  else if (authoring.data !== undefined) state = authoring.data ? 'ready' : 'needs-plan';
  return { state, refetch: () => void authoring.refetch() };
}

export function useSubscriberPostEligibility(enabled = true): boolean {
  return useMemberPostAccess(enabled).state === 'ready';
}

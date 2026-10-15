'use client';

import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { fetchCuratorPlans, fetchMemberPostAuthoring } from '@/services/curator-plans';
import {
  fetchCuratorPage,
  fetchCuratorPayoutAccount,
  unfilteredCuratorPage,
  type CuratorPageFilter,
} from '@/services/curator';

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

/** Reads the access that Studio Music fetches, without a second request. */
export function useObservedMemberPostAccess() {
  return useMemberPostAccess(false);
}

export function useSubscriberPostEligibility(enabled = true): boolean {
  return useMemberPostAccess(enabled).state === 'ready';
}

export const curatorPlansKey = (profileId: string | null) => ['curator-plans', profileId ?? 'none'] as const;

export function useCuratorPlans(profileId: string | null) {
  return useQuery({
    queryKey: curatorPlansKey(profileId),
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    enabled: profileId !== null,
    staleTime: 0,
  });
}

export const payoutAccountKey = ['curator-payout-account', 'current'] as const;

/** During a payout provider return the payout card refreshes and seeds this key, so this read waits for it. */
export function usePayoutAccount() {
  const payoutReturn = useSearchParams().has('payout');
  const account = useQuery({
    queryKey: payoutAccountKey,
    queryFn: ({ signal }) => fetchCuratorPayoutAccount(false, signal),
    enabled: !payoutReturn,
    staleTime: 0,
  });
  return { account, payoutReturn };
}

'use client';

/** Loads public curator pages incrementally while isolating each viewer's cached entitlement data. */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';
import { fetchCuratorPlans } from '@/services/curator-plans';
import { fetchCuratorPage } from '@/services/curator';

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

export function useSubscriberPostEligibility(enabled = true): boolean {
  const { user } = useAuthState();
  const pro = useQuery({
    queryKey: ['curator-pro-status', user?.id ?? null],
    queryFn: ({ signal }) => apiService.getCuratorProStatus(signal),
    enabled: enabled && Boolean(user?.id),
    staleTime: 0,
  });
  const plans = useQuery({
    queryKey: ['curator-plans', user?.id ?? null],
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    enabled: pro.data?.hasAccess === true,
    staleTime: 0,
  });

  return pro.data?.hasAccess === true && plans.data?.some((plan) =>
    plan.status === 'active' && plan.featureKeys.includes('member_posts')) === true;
}

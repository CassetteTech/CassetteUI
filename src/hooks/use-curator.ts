'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
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

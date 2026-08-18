'use client';

/** Polls the authenticated fan's Bridge-owned membership status for one curator. */

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';

export function useMembershipStatus(
  curatorProfileId: string,
  viewerId: string | null,
  poll: boolean,
) {
  return useQuery({
    queryKey: ['membership-status', curatorProfileId, viewerId],
    queryFn: ({ signal }) => apiService.getMembershipStatus(curatorProfileId, signal),
    enabled: viewerId !== null && curatorProfileId !== '',
    refetchInterval: poll ? 1_000 : false,
    staleTime: 0,
    retry: 1,
  });
}

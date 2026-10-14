'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { authService } from '@/services/auth';

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

export function refreshAfterMembershipChange(queryClient: QueryClient, username: string) {
  void authService.refreshSession({ restart: true });
  void queryClient.invalidateQueries({ queryKey: ['membership-status'] });
  void queryClient.invalidateQueries({ queryKey: ['curator-follow'] });
  void queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
  void queryClient.invalidateQueries({ queryKey: ['curator-page', username.toLowerCase()] });
}

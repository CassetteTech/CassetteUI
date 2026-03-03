'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';

export function NotificationPoller() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuthState();
  const enabled = !isLoading && isAuthenticated;

  useNotifications({
    enabled,
    page: 1,
    pageSize: 20,
    refetchIntervalMs: 5000,
    refetchInBackground: true,
  });

  useEffect(() => {
    if (enabled) {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } else {
      queryClient.removeQueries({ queryKey: ['notifications'] });
    }
  }, [enabled, queryClient]);

  return null;
}

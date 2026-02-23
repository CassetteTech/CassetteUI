'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import {
  identifyClientUser,
  setClientAnalyticsContext,
  surfaceFromRoute,
  trackBrowserPageview,
} from '@/lib/analytics/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const dispose = authService.initializeAuthListener();
    return () => dispose && dispose();
  }, []);

  useEffect(() => {
    setClientAnalyticsContext({
      route: pathname,
      source_surface: surfaceFromRoute(pathname),
      is_authenticated: isAuthenticated,
      user_id: user?.id,
      account_type: user?.accountType != null ? String(user.accountType) : undefined,
    });

    if (!isLoading) {
      void trackBrowserPageview({
        route: pathname,
        isAuthenticated,
        userId: user?.id,
        accountType: user?.accountType,
      });
    }
  }, [pathname, user?.id, user?.accountType, isAuthenticated, isLoading]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void identifyClientUser({
      userId: user.id,
      isAuthenticated,
      accountType: user.accountType,
    });
  }, [user?.id, user?.accountType, isAuthenticated]);

  return <>{children}</>;
}

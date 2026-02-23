'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';
import { PageLoader } from '@/components/ui/page-loader';
import { InternalDashboardShell } from './_components/internal-dashboard-shell';
import { authService } from '@/services/auth';

export default function InternalDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthState();
  const canAccess = isCassetteInternalAccount(user?.accountType ?? null);
  const [isAccessResolved, setIsAccessResolved] = useState(false);
  const [canAccessResolved, setCanAccessResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveAccess = async () => {
      if (isLoading) return;

      if (!isAuthenticated) {
        router.replace('/auth/signin?redirect=/internal');
        return;
      }

      if (canAccess) {
        if (!cancelled) {
          setCanAccessResolved(true);
          setIsAccessResolved(true);
        }
        return;
      }

      const accountType = user?.accountType;
      const hasUnknownAccountType =
        accountType == null || (typeof accountType === 'string' && accountType.trim().length === 0);
      if (hasUnknownAccountType) {
        const refreshedUser = await authService.getCurrentUser();
        if (cancelled) return;

        if (isCassetteInternalAccount(refreshedUser?.accountType ?? null)) {
          setCanAccessResolved(true);
          setIsAccessResolved(true);
          return;
        }
      }

      if (!cancelled) {
        setCanAccessResolved(false);
        setIsAccessResolved(true);
      }
      router.replace('/');
    };

    void resolveAccess();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, canAccess, user?.accountType, router]);

  if (isLoading || !isAuthenticated || !isAccessResolved || !canAccessResolved) {
    return <PageLoader message="Loading internal dashboard..." />;
  }

  return <InternalDashboardShell />;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';
import { PageLoader } from '@/components/ui/page-loader';
import { InternalDashboardShell } from './_components/internal-dashboard-shell';

export default function InternalDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthState();
  const canAccess = isCassetteInternalAccount(user?.accountType ?? null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth/signin?redirect=/internal');
      return;
    }
    if (!canAccess) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, canAccess, router]);

  if (isLoading || !isAuthenticated || !canAccess) {
    return <PageLoader message="Loading internal dashboard..." />;
  }

  return <InternalDashboardShell />;
}

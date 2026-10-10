'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';
import { PageLoader } from '@/components/ui/page-loader';
import { AccountCheckError } from '@/components/auth/account-check';
import { authService } from '@/services/auth';

/**
 * Guards the entire /internal section. Lifted out of the old page.tsx so it now
 * lives in the section layout and resolves once for every sub-route (rather than
 * re-running per page). Behaviour is otherwise unchanged: unauthenticated users
 * are sent to sign-in, non-internal accounts are bounced home, and an unknown
 * account type triggers a single refresh before deciding.
 */
export function InternalAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, sessionError } = useAuthState();
  const canAccess = isCassetteInternalAccount(user?.accountType ?? null);
  const [isAccessResolved, setIsAccessResolved] = useState(false);
  const [canAccessResolved, setCanAccessResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveAccess = async () => {
      // A failed session read decides nothing; the viewer can retry it.
      if (isLoading || sessionError) return;

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
        const refreshed = await authService.refreshSession({ restart: true });
        if (cancelled) return;

        if (refreshed.kind === 'authenticated' && isCassetteInternalAccount(refreshed.user.accountType ?? null)) {
          setCanAccessResolved(true);
          setIsAccessResolved(true);
          return;
        }
        // An outage shows the retry; a sign-out or another account re-runs this check.
        if (refreshed.kind !== 'authenticated') return;
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
  }, [isLoading, sessionError, isAuthenticated, canAccess, user?.accountType, router]);

  if (sessionError && !isAccessResolved) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <AccountCheckError />
      </div>
    );
  }

  if (isLoading || !isAuthenticated || !isAccessResolved || !canAccessResolved) {
    return <PageLoader message="Loading internal dashboard..." />;
  }

  return <>{children}</>;
}

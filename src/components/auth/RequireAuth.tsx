'use client';

import { useEffect, ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { AccountCheckError } from '@/components/auth/account-check';

interface RequireAuthProps {
  children: ReactElement;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, isLoading, sessionError } = useAuthState();
  // An outage before any session answer is not a sign-out.
  const sessionUnknown = sessionError && !user;

  useEffect(() => {
    if (!isLoading && !sessionUnknown) {
      if (!user) {
        router.replace('/auth/signin');
      } else if (!user.isOnboarded) {
        router.replace('/onboarding');
      }
    }
  }, [user, isLoading, sessionUnknown, router]);

  if (sessionUnknown) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <AccountCheckError />
      </div>
    );
  }

  // Show loading or nothing while redirecting
  if (isLoading || !user || !user.isOnboarded) {
    return null;
  }

  return children;
}
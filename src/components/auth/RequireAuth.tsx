'use client';

import { useEffect, ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';

interface RequireAuthProps {
  children: ReactElement;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, isLoading } = useAuthState();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/auth/signin');
      } else if (!user.isOnboarded) {
        router.replace('/onboarding');
      }
    }
  }, [user, isLoading, router]);

  // Show loading or nothing while redirecting
  if (isLoading || !user || !user.isOnboarded) {
    return null;
  }

  return children;
}
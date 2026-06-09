'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { appLogger } from '@/lib/observability/logger';

export default function ProfileRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuthState();

  useEffect(() => {
    if (!isLoading) {
      appLogger.debug('profile_redirect_resolved', { has_user: Boolean(user), is_loading: isLoading });
      
      if (!user) {
        appLogger.debug('profile_redirect_signin');
        router.replace('/auth/signin');
      } else if (!user.isOnboarded) {
        appLogger.debug('profile_redirect_onboarding', { user_id: user.id });
        router.replace('/onboarding');
      } else if (user.username) {
        appLogger.debug('profile_redirect_username', { user_id: user.id });
        router.replace(`/profile/${user.username}`);
      } else {
        appLogger.warn('profile_redirect_missing_username', { user_id: user.id });
        router.replace('/auth/signin');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

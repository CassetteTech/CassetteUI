'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuthState();

  useEffect(() => {
    if (!isLoading) {
      console.log('🔄 [Profile] Profile redirect logic running', { user, isLoading });
      
      if (!user) {
        console.log('❌ [Profile] No user, redirecting to signin');
        router.replace('/auth/signin');
      } else if (!user.isOnboarded) {
        console.log('⚠️ [Profile] User not onboarded, redirecting to onboarding', user);
        router.replace('/onboarding');
      } else if (user.username) {
        console.log('✅ [Profile] User onboarded with username, redirecting to profile', user);
        router.replace(`/profile/${user.username}`);
      } else {
        console.log('❌ [Profile] User onboarded but no username, redirecting to signin', user);
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

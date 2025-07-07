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
      if (user?.username) {
        router.replace(`/profile/${user.username}`);
      } else {
        router.replace('/auth/signin');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
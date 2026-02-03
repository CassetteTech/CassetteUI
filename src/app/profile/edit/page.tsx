'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { PageLoader } from '@/components/ui/page-loader';

export default function EditProfileRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuthState();

  useEffect(() => {
    if (!isLoading) {
      if (user?.username) {
        router.replace(`/profile/${user.username}/edit`);
      } else {
        router.replace('/auth/signin');
      }
    }
  }, [user, isLoading, router]);

  return <PageLoader message="Loading profile..." />;
}
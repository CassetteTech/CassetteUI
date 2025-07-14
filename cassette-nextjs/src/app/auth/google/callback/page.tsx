'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      authService.handleGoogleCallback(code, state)
        .then((user) => {
          useAuthStore.getState().setUser(user);
          router.push('/profile');
        })
        .catch((error) => {
          console.error('Google callback error:', error);
          router.push('/auth/signin');
        });
    } else {
        console.error('Missing code or state in Google callback');
        router.push('/auth/signin');
    }
  }, [searchParams, router]);

  return <div>Loading...</div>;
}

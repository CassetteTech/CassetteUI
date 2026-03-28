'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { pendingActionService } from '@/utils/pending-action';
import { PageLoader } from '@/components/ui/page-loader';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [status] = useState('Checking session...');
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    authService.getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) {
          throw new Error('No valid authenticated session found');
        }

        useAuthStore.getState().setUser(currentUser);
        window.history.replaceState(null, '', window.location.pathname);
        const pendingAction = pendingActionService.get();
        if (pendingAction?.returnUrl) {
          window.location.href = pendingAction.returnUrl;
          return;
        }

        router.replace('/profile');
      })
      .catch((err: Error) => {
        console.error('Callback session error:', err);
        setError(err.message);
      });
  }, [router]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-destructive">Login Failed</h1>
        <p>{error}</p>
        <button onClick={() => router.push('/auth/signin')} className="underline">
          Back to Sign In
        </button>
      </div>
    );
  }

  return <PageLoader message={status} />;
}

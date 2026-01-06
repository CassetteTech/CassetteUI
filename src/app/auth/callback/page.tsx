'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { pendingActionService } from '@/utils/pending-action';

function CallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing login...');
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    
    const hash = window.location.hash;
    console.log('🟦 [Callback Page] Hash found:', hash);

    if (!hash) {
      console.log('⚠️ [Callback Page] No hash present');
      return;
    }

    processed.current = true;
    setStatus('Verifying token...');

    try {
      const params = new URLSearchParams(hash.substring(1));
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      console.log('🟦 [Callback Page] Token Type:', type);

      if (!accessToken) {
        throw new Error('No access token found in URL hash');
      }

      authService.handleOAuthCallback(accessToken, refreshToken || '')
        .then(() => {
          console.log('🟩 [Callback Page] Success! Redirecting...');
          window.history.replaceState(null, '', window.location.pathname);

          // Check for pending action to redirect back to original page
          const pendingAction = pendingActionService.get();
          if (pendingAction?.returnUrl) {
            window.location.href = pendingAction.returnUrl;
          } else {
            router.replace('/profile');
          }
        })
        .catch((err: Error) => {
          console.error('🟥 [Callback Page] API Error:', err);
          setError(err.message);
        });

    } catch (e) {
      const err = e as Error;
      console.error('🟥 [Callback Page] Parse Error:', err);
      setError(err.message);
    }

  }, [router]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-red-500">Login Failed</h1>
        <p>{error}</p>
        <button onClick={() => router.push('/auth/signin')} className="underline">Back to Sign In</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      <p className="font-medium">{status}</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}

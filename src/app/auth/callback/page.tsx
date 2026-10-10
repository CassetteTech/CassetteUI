'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountCheckError } from '@/components/auth/account-check';
import { authService } from '@/services/auth';
import { pendingActionService } from '@/utils/pending-action';
import { PageLoader } from '@/components/ui/page-loader';
import { authRedirectService } from '@/utils/auth-redirect';
import { appLogger } from '@/lib/observability/logger';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [status] = useState('Checking session...');
  const [error, setError] = useState<string | null>(null);
  // A session outage keeps the pending return intent; Retry runs the callback again.
  const [sessionOutage, setSessionOutage] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const processedAttempt = useRef(-1);

  useEffect(() => {
    if (processedAttempt.current === attempt) return;
    processedAttempt.current = attempt;

    authService.refreshSession()
      .then((session) => {
        if (session.kind === 'error') {
          setSessionOutage(true);
          return;
        }
        if (session.kind !== 'authenticated') {
          throw new Error('No valid authenticated session found');
        }

        const currentUser = session.user;

        window.history.replaceState(null, '', window.location.pathname);
        if (!currentUser.isOnboarded) {
          router.replace('/onboarding');
          return;
        }

        const pendingAction = pendingActionService.get();
        if (pendingAction?.returnUrl) {
          window.location.href = pendingAction.returnUrl;
          return;
        }

        const authRedirect = authRedirectService.consume();
        if (authRedirect) {
          window.location.href = authRedirect;
          return;
        }

        router.replace('/profile');
      })
      .catch((err: Error) => {
        appLogger.error('auth_callback_session_failed', { error: err, route: '/auth/callback' });
        pendingActionService.clear();
        setError('We could not complete sign-in. Please try again.');
      });
  }, [router, attempt]);

  if (sessionOutage) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <div className="w-full max-w-md">
          <AccountCheckError
            onRetry={() => {
              setSessionOutage(false);
              setAttempt((current) => current + 1);
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-destructive">Login Failed</h1>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams({ error: 'callback-error' });
            const redirect = authRedirectService.get();
            if (redirect) {
              params.set('redirect', redirect);
            }
            router.push(`/auth/signin?${params.toString()}`);
          }}
          className="underline"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return <PageLoader message={status} />;
}

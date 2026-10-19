'use client';

import { useEffect, useState } from 'react';
import { AccountCheckError } from '@/components/auth/account-check';
import { authService } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { pendingActionService } from '@/utils/pending-action';
import { PageLoader } from '@/components/ui/page-loader';
import { authRedirectService, parseMembershipIntentRedirect } from '@/utils/auth-redirect';
import { appLogger } from '@/lib/observability/logger';
import { captureClientEvent } from '@/lib/analytics/client';
import { getDeviceCategory, rememberUserCohort } from '@/lib/analytics/audience';
import type { AuthUser } from '@/types';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [sessionOutage, setSessionOutage] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: number | undefined;

    const handleCallback = async () => {
      const signInErrorPath = (errorCode: string) => {
        const params = new URLSearchParams({ error: errorCode });
        const redirect = authRedirectService.get();
        if (redirect) {
          params.set('redirect', redirect);
        }
        return `/auth/signin?${params.toString()}`;
      };

      const redirectToDestination = (user: AuthUser) => {
        if (cancelled) {
          return;
        }

        const isOnboarded = user.isOnboarded;
        const cohort = isOnboarded ? 'existing' : 'new';
        rememberUserCohort(user.id, cohort);
        void captureClientEvent('auth_google_oauth_completed', {
          route: '/auth/google/callback',
          source_surface: 'auth',
          is_authenticated: true,
          user_id: user.id,
          auth_provider: 'google',
          user_cohort: cohort,
          billing_interval: parseMembershipIntentRedirect(authRedirectService.get())?.interval,
          device_category: getDeviceCategory(),
        });
        if (!isOnboarded) {
          appLogger.debug('google_callback_redirect_onboarding');
          router.push('/onboarding');
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

        router.push('/studio');
      };

      try {
        const url = new URL(window.location.href);
        const error = url.searchParams.get('error');

        appLogger.debug('google_callback_started', { route: url.pathname });

        if (error) {
          appLogger.error('google_callback_oauth_error', { error_code: error });
          pendingActionService.clear();
          router.push(signInErrorPath('oauth-error'));
          return;
        }

        const session = await authService.refreshSession();
        if (cancelled) {
          return;
        }

        if (session.kind === 'authenticated') {
          redirectToDestination(session.user);
        } else if (session.kind === 'error') {
          setSessionOutage(true);
        } else if (session.kind === 'signed-out') {
          appLogger.warn('google_callback_session_missing');
          retryTimeout = window.setTimeout(async () => {
            if (cancelled) {
              return;
            }

            const retry = await authService.refreshSession();
            if (cancelled) {
              return;
            }

            if (retry.kind === 'authenticated') {
              redirectToDestination(retry.user);
            } else if (retry.kind === 'error') {
              setSessionOutage(true);
            } else if (retry.kind === 'signed-out') {
              appLogger.error('google_callback_session_missing_after_retry');
              pendingActionService.clear();
              router.push(signInErrorPath('callback-failed'));
            }
          }, 1000);
        }
      } catch (error) {
        appLogger.error('google_callback_processing_failed', { error });
        pendingActionService.clear();
        router.push(signInErrorPath('callback-error'));
      }
    };

    void handleCallback();

    return () => {
      cancelled = true;
      if (retryTimeout !== undefined) {
        window.clearTimeout(retryTimeout);
      }
    };
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

  return (
    <PageLoader
      message="Completing Google sign in..."
      subtitle="Please wait while we process your authentication."
    />
  );
}

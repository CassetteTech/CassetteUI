'use client';

import { useEffect } from 'react';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { pendingActionService } from '@/utils/pending-action';
import { PageLoader } from '@/components/ui/page-loader';
import { authRedirectService } from '@/utils/auth-redirect';
import { appLogger } from '@/lib/observability/logger';

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: number | undefined;

    const handleCallback = async () => {
      const redirectToDestination = (isOnboarded: boolean) => {
        if (cancelled) {
          return;
        }

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

        router.push('/profile');
      };

      try {
        const url = new URL(window.location.href);
        const error = url.searchParams.get('error');

        appLogger.debug('google_callback_started', { route: url.pathname });

        if (error) {
          appLogger.error('google_callback_oauth_error', { error_code: error });
          authRedirectService.clear();
          router.push('/auth/signin?error=oauth-error');
          return;
        }

        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          useAuthStore.getState().setUser(currentUser);
          redirectToDestination(currentUser.isOnboarded);
        } else {
          appLogger.warn('google_callback_session_missing');
          retryTimeout = window.setTimeout(async () => {
            if (cancelled) {
              return;
            }

            const retryUser = await authService.getCurrentUser();
            if (cancelled) {
              return;
            }

            if (retryUser) {
              useAuthStore.getState().setUser(retryUser);
              redirectToDestination(retryUser.isOnboarded);
            } else {
              appLogger.error('google_callback_session_missing_after_retry');
              authRedirectService.clear();
              router.push('/auth/signin?error=callback-failed');
            }
          }, 1000);
        }
      } catch (error) {
        appLogger.error('google_callback_processing_failed', { error });
        authRedirectService.clear();
        router.push('/auth/signin?error=callback-error');
      }
    };

    void handleCallback();

    return () => {
      cancelled = true;
      if (retryTimeout !== undefined) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [router]);

  return (
    <PageLoader
      message="Completing Google sign in..."
      subtitle="Please wait while we process your authentication."
    />
  );
}

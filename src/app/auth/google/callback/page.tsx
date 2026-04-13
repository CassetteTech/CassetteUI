'use client';

import { useEffect } from 'react';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { pendingActionService } from '@/utils/pending-action';
import { PageLoader } from '@/components/ui/page-loader';
import { authRedirectService } from '@/utils/auth-redirect';

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const redirectToDestination = (isOnboarded: boolean) => {
        if (!isOnboarded) {
          console.log('🔄 [Google Callback] User not onboarded, redirecting to onboarding');
          router.push('/onboarding');
          return;
        }

        const pendingAction = pendingActionService.get();
        if (pendingAction?.returnUrl) {
          console.log('🔄 [Google Callback] Redirecting to pending action URL:', pendingAction.returnUrl);
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

        console.log('🔄 [Google Callback] Starting callback processing');
        console.log('URL:', url.toString());
        console.log('Search params:', Object.fromEntries(url.searchParams.entries()));
        console.log('Hash:', window.location.hash);

        if (error) {
          console.error('Google OAuth error:', error);
          authRedirectService.clear();
          router.push('/auth/signin?error=oauth-error');
          return;
        }

        console.log('🔄 [Google Callback] Checking current session...');
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          useAuthStore.getState().setUser(currentUser);
          console.log('✅ [Google Callback] User already authenticated:', currentUser);
          redirectToDestination(currentUser.isOnboarded);
        } else {
          console.error('❌ [Google Callback] No valid authentication found');
          setTimeout(async () => {
            const retryUser = await authService.getCurrentUser();
            if (retryUser) {
              useAuthStore.getState().setUser(retryUser);
              console.log('✅ [Google Callback] User found on retry:', retryUser);
              redirectToDestination(retryUser.isOnboarded);
            } else {
              console.error('❌ [Google Callback] Still no authentication after retry');
              authRedirectService.clear();
              router.push('/auth/signin?error=callback-failed');
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Google callback processing error:', error);
        authRedirectService.clear();
        router.push('/auth/signin?error=callback-error');
      }
    };

    void handleCallback();
  }, [router]);

  return (
    <PageLoader
      message="Completing Google sign in..."
      subtitle="Please wait while we process your authentication."
    />
  );
}

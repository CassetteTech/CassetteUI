'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { pendingActionService } from '@/utils/pending-action';
import { PageLoader } from '@/components/ui/page-loader';

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Helper to redirect to pending action URL or default (checks onboarding first)
      const redirectToDestination = () => {
        const user = useAuthStore.getState().user;

        // Always check onboarding first - don't bypass it for pending actions
        if (!user?.isOnboarded) {
          console.log('🔄 [Google Callback] User not onboarded, redirecting to onboarding');
          // Keep pending action for after onboarding completes
          router.push('/onboarding');
          return;
        }

        // User is onboarded - honor pending action if exists
        const pendingAction = pendingActionService.get();
        if (pendingAction?.returnUrl) {
          console.log('🔄 [Google Callback] Redirecting to pending action URL:', pendingAction.returnUrl);
          pendingActionService.clear();
          window.location.href = pendingAction.returnUrl;
        } else {
          router.push('/profile');
        }
      };

      try {
        console.log('🔄 [Google Callback] Starting callback processing');
        console.log('URL:', window.location.href);
        console.log('Search params:', Object.fromEntries(searchParams.entries()));
        console.log('Hash:', window.location.hash);

        // Check for error parameters
        const error = searchParams.get('error');
        if (error) {
          console.error('Google OAuth error:', error);
          router.push('/auth/signin?error=oauth-error');
          return;
        }

        // Legacy fallback for token-bearing redirects, now exchanged for HttpOnly cookies.
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken') || searchParams.get('refresh_token');
        if (token && refreshToken) {
          await authService.handleOAuthCallback(token, refreshToken);
        }

        console.log('🔄 [Google Callback] Checking current session...');
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          console.log('✅ [Google Callback] User already authenticated:', currentUser);
          redirectToDestination();
        } else {
          console.error('❌ [Google Callback] No valid authentication found');
          setTimeout(async () => {
            const retryUser = await authService.getCurrentUser();
            if (retryUser) {
              console.log('✅ [Google Callback] User found on retry:', retryUser);
              redirectToDestination();
            } else {
              console.error('❌ [Google Callback] Still no authentication after retry');
              router.push('/auth/signin?error=callback-failed');
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Google callback processing error:', error);
        router.push('/auth/signin?error=callback-error');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <PageLoader
      message="Completing Google sign in..."
      subtitle="Please wait while we process your authentication."
    />
  );
}

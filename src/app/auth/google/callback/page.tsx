'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { pendingActionService } from '@/utils/pending-action';

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
        
        // Check for direct token parameters first (if backend redirects with tokens)
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken') || searchParams.get('refresh_token');
        
        if (token && refreshToken) {
          // Backend redirected with tokens directly
          console.log('🔄 [Google Callback] Processing direct token redirect');
          try {
            const user = await authService.handleOAuthCallback(token, refreshToken);
            console.log('✅ [Google Callback] OAuth callback successful, user:', user);
            
            // Ensure the auth store is updated
            useAuthStore.getState().setUser(user);
            
            // Add a small delay to ensure state is propagated
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('🔄 [Google Callback] Redirecting to destination');
            redirectToDestination();
            return;
          } catch (error) {
            console.error('❌ [Google Callback] OAuth callback failed:', error);
            router.push('/auth/signin?error=oauth-callback-failed');
            return;
          }
        }

        // Check for code/state parameters (standard OAuth flow)
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (code && state) {
          console.log('🔄 [Google Callback] Processing OAuth code exchange');
          const user = await authService.handleGoogleCallback(code, state);
          useAuthStore.getState().setUser(user);
          redirectToDestination();
          return;
        }

        // Check for error parameters
        const error = searchParams.get('error');
        if (error) {
          console.error('Google OAuth error:', error);
          router.push('/auth/signin?error=oauth-error');
          return;
        }

        // If we get here, the backend may have completed OAuth and redirected without parameters
        // This suggests the backend handled everything and we need to check for tokens in fragments
        console.log('🔄 [Google Callback] No parameters found, checking URL fragment and current session');
        
        // Check URL fragment for tokens (common OAuth pattern)
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const fragmentToken = params.get('token');
          const fragmentRefreshToken = params.get('refreshToken') || params.get('refresh_token');
          
          if (fragmentToken && fragmentRefreshToken) {
            console.log('🔄 [Google Callback] Found tokens in URL fragment');
            await authService.handleOAuthCallback(fragmentToken, fragmentRefreshToken);
            redirectToDestination();
            return;
          }
        }
        
        // Last resort: check if session is already authenticated
        console.log('🔄 [Google Callback] Checking current session...');
        console.log('Current localStorage tokens:', {
          access_token: !!localStorage.getItem('access_token'),
          refresh_token: !!localStorage.getItem('refresh_token')
        });
        
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          console.log('✅ [Google Callback] User already authenticated:', currentUser);
          redirectToDestination();
        } else {
          console.error('❌ [Google Callback] No valid authentication found');
          console.log('Debug info:', {
            searchParams: Object.fromEntries(searchParams.entries()),
            hash: window.location.hash,
            href: window.location.href,
            hasTokens: {
              access_token: !!localStorage.getItem('access_token'),
              refresh_token: !!localStorage.getItem('refresh_token')
            }
          });
          // Instead of redirecting to sign in immediately, let's wait a moment and try again
          // This might be a timing issue
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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-foreground font-atkinson">Completing Google sign in...</p>
        <p className="text-muted-foreground text-sm">Please wait while we process your authentication.</p>
      </div>
    </div>
  );
}

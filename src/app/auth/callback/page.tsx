'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse the URL fragment
        const hash = window.location.hash;
        
        // Immediately remove tokens from browser history
        history.replaceState({}, '', window.location.pathname);
        
        if (!hash) {
          console.error('No hash fragment found in OAuth callback');
          router.replace('/auth/signin?error=invalid-callback');
          return;
        }

        // Parse the fragment parameters
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('token');
        const refreshToken = params.get('refresh_token');
        const error = params.get('error');

        if (error) {
          console.error('OAuth authorization error:', error);
          if (error === 'state_expired') {
            router.replace('/auth/signin?error=session-expired');
          } else {
            router.replace('/auth/signin?error=oauth-denied');
          }
          return;
        }

        if (!token || !refreshToken) {
          console.error('Missing tokens in OAuth callback');
          router.replace('/auth/signin?error=invalid-callback');
          return;
        }

        // Handle the OAuth tokens
        await authService.handleOAuthCallback(token, refreshToken);
        
        // Success - redirect to profile
        router.replace('/profile');
        
      } catch (error) {
        console.error('OAuth callback processing error:', error);
        router.replace('/auth/signin?error=callback-failed');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-foreground font-atkinson">Completing sign in...</p>
        <p className="text-muted-foreground text-sm">Please wait while we securely process your authentication.</p>
      </div>
    </div>
  );
}
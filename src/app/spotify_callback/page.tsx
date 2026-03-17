'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { platformConnectService } from '@/services/platform-connect';
import { pendingActionService } from '@/utils/pending-action';
import { PageLoader } from '@/components/ui/page-loader';
import { apiService } from '@/services/api';

export default function SpotifyCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Helper to get return URL from storage
      const getReturnUrl = (): string | null => {
        const platformReturnUrl = platformConnectService.getReturnUrl('spotify');
        if (platformReturnUrl) return platformReturnUrl;
        const pendingAction = pendingActionService.get();
        return pendingAction?.returnUrl || null;
      };

      // Helper to redirect with optional query param
      const redirectTo = (baseUrl: string, param?: string) => {
        const separator = baseUrl.includes('?') ? '&' : '?';
        window.location.href = param ? `${baseUrl}${separator}${param}` : baseUrl;
      };

      // Helper to clean up stored URLs
      const cleanupStorage = () => {
        platformConnectService.clearReturnUrl('spotify');
        // Note: Don't clear pending action here - it will be used/cleared on the post page
      };

      if (error) {
        console.error('Spotify authorization error:', error);
        const returnUrl = getReturnUrl();
        cleanupStorage();
        if (returnUrl) {
          redirectTo(returnUrl, 'error=spotify-auth-denied');
        } else {
          router.replace('/profile?error=spotify-auth-denied');
        }
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state in Spotify callback');
        const returnUrl = getReturnUrl();
        cleanupStorage();
        if (returnUrl) {
          redirectTo(returnUrl, 'error=spotify-invalid-callback');
        } else {
          router.replace('/profile?error=spotify-invalid-callback');
        }
        return;
      }

      try {
        await apiService.handleSpotifyCallback(code, state);

        const returnUrl = getReturnUrl();
        cleanupStorage();
        if (returnUrl) {
          redirectTo(returnUrl, 'spotify_connected=true');
        } else {
          window.location.href = '/profile?success=spotify-connected';
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        const returnUrl = getReturnUrl();
        cleanupStorage();
        if (returnUrl) {
          redirectTo(returnUrl, 'error=spotify-callback-failed');
        } else {
          router.replace('/profile?error=spotify-callback-failed');
        }
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <PageLoader
      message="Connecting your Spotify account..."
      subtitle="Please wait while we securely save your connection."
    />
  );
}

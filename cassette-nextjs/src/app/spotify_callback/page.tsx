'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SpotifyCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('Spotify authorization error:', error);
        router.replace('/profile?error=spotify-auth-denied');
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state in Spotify callback');
        router.replace('/profile?error=spotify-invalid-callback');
        return;
      }

      try {
        // Get the access token from local storage
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          console.error('No access token found, cannot complete Spotify connection.');
          // Redirect to login
          router.replace('/auth/signin?error=session-expired');
          return;
        }

        // Create headers object with the token
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };

        // Forward the callback to our secure API endpoint with authorization
        const response = await fetch('/api/auth/spotify/callback?' + new URLSearchParams({
          code,
          state
        }), {
          headers: headers
        });

        if (response.redirected) {
          // Follow the redirect from the API
          window.location.href = response.url;
        } else if (response.ok) {
          // Success - redirect to profile and refresh the page to show new connection
          // Using window.location.href to force a full page reload and data refetch
          window.location.href = '/profile?success=spotify-connected';
        } else {
          // Error - redirect with error message
          router.replace('/profile?error=spotify-callback-failed');
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        router.replace('/profile?error=spotify-callback-failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        <p className="text-white font-atkinson">Connecting your Spotify account...</p>
        <p className="text-gray-400 text-sm">Please wait while we securely save your connection.</p>
      </div>
    </div>
  );
}
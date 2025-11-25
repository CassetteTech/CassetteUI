'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

interface ConnectSpotifyButtonProps {
  isConnected?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ConnectSpotifyButton({ 
  isConnected = false, 
  onDisconnect 
}: ConnectSpotifyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      console.log("Attempting to connect to Spotify...");
      
      // Get the access token from local storage
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        console.error('No access token found');
        // Could redirect to login or show error
        setIsLoading(false);
        return;
      }

      // Use Next.js API route instead of direct backend call
      const response = await fetch('/api/auth/spotify/connect', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get Spotify auth URL');
      }

      const data = await response.json();
      
      console.log("Full response from API:", data);
      console.log("Response type:", typeof data);
      console.log("Response authUrl:", data?.authUrl);

      // Check if we got the URL successfully
      if (data && data.authUrl) {
        console.log("Received auth URL, redirecting user to Spotify:", data.authUrl);
        // Open Spotify auth in a new tab
        window.open(data.authUrl, '_blank');
      } else {
        console.error("Did not receive a valid authUrl from the backend.");
        console.error("Response was:", data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to initiate Spotify connection:", error);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement disconnect functionality
      onDisconnect?.();
    } catch (error) {
      console.error('Failed to disconnect from Spotify:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Image
            src="/images/social_images/ic_spotify.png"
            alt="Spotify"
            width={32}
            height={32}
            className="mr-2"
          />
          <CardTitle className="text-success">Spotify</CardTitle>
        </div>
        <CardDescription>
          {isConnected 
            ? 'Your Spotify account is connected'
            : 'Connect your Spotify account to import your music'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center justify-center text-success">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                  clipRule="evenodd"
                />
              </svg>
              Connected
            </div>
            <Button 
              onClick={handleDisconnect}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-success hover:bg-success/90 text-white"
          >
            {isLoading ? 'Connecting...' : 'Connect with Spotify'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
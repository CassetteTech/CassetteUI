'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

interface ConnectAppleMusicButtonProps {
  isConnected?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

declare global {
  interface Window {
    MusicKit: {
      configure: (options: {
        developerToken: string;
        app: {
          name: string;
          build: string;
        };
      }) => Promise<void>;
      getInstance: () => {
        authorize: () => Promise<string>;
      };
    };
  }
}

export function ConnectAppleMusicButton({ 
  isConnected = false, 
  onConnect, 
  onDisconnect 
}: ConnectAppleMusicButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [developerToken, setDeveloperToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the developer token from our backend
    const fetchDeveloperToken = async () => {
      try {
        const response = await fetch('/api/auth/apple-music/dev-token');
        const data = await response.json();
        if (data.developerToken) {
          setDeveloperToken(data.developerToken);
        }
      } catch (error) {
        console.error('Failed to fetch Apple Music developer token:', error);
      }
    };

    fetchDeveloperToken();
  }, []);

  const handleConnect = async () => {
    if (!developerToken) {
      console.error('Developer token not available');
      return;
    }

    setIsLoading(true);
    try {
      // Configure MusicKit with the developer token
      await window.MusicKit.configure({
        developerToken: developerToken,
        app: {
          name: 'Cassette',
          build: '1.0.0',
        },
      });

      // Request user authorization
      const musicUserToken = await window.MusicKit.getInstance().authorize();
      
      if (musicUserToken) {
        // Send the user token to our backend for secure storage
        const response = await fetch('/api/auth/apple-music/save-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: musicUserToken }),
        });

        if (response.ok) {
          onConnect?.();
        } else {
          throw new Error('Failed to save Apple Music token');
        }
      }
    } catch (error) {
      console.error('Failed to connect to Apple Music:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement disconnect functionality
      onDisconnect?.();
    } catch (error) {
      console.error('Failed to disconnect from Apple Music:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Image
            src="/images/social_images/ic_apple.png"
            alt="Apple Music"
            width={32}
            height={32}
            className="mr-2"
          />
          <CardTitle className="text-[#FA2D48]">Apple Music</CardTitle>
        </div>
        <CardDescription>
          {isConnected 
            ? 'Your Apple Music account is connected'
            : 'Connect your Apple Music account to import your music'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center justify-center text-green-600 dark:text-green-400">
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
            disabled={isLoading || !developerToken}
            className="w-full bg-[#FA2D48] hover:bg-[#E0244E] text-white"
          >
            {isLoading ? 'Connecting...' : 'Connect with Apple Music'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
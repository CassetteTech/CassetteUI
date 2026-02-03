'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';

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
        unauthorize: () => Promise<void>;
        isAuthorized: boolean;
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

  // Fetch the developer token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await apiService.getAppleMusicDeveloperToken();
        setDeveloperToken(response.developerToken);
      } catch (error) {
        console.error('Failed to fetch Apple Music developer token:', error);
      }
    };

    fetchToken();
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

      const instance = window.MusicKit.getInstance();

      // Clear any cached authorization to force fresh consent
      // This ensures the user explicitly authorizes THIS Cassette account
      if (instance.isAuthorized) {
        await instance.unauthorize();
      }

      // Request user authorization
      const musicUserToken = await instance.authorize();
      
      if (musicUserToken) {
        // Send the user token to our backend for secure storage
        const response = await apiService.connectAppleMusic(musicUserToken);

        if (response.success) {
          // Refetch user to get updated connectedServices and update auth store
          const updatedUser = await authService.getCurrentUser();
          if (updatedUser) {
            useAuthStore.getState().setUser(updatedUser);
          }
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
          <CardTitle className="text-danger">Apple Music</CardTitle>
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
            disabled={isLoading || !developerToken}
            className="w-full bg-danger hover:bg-danger/90 text-white"
          >
            {isLoading ? 'Connecting...' : !developerToken ? 'Apple Music Not Available' : 'Connect with Apple Music'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

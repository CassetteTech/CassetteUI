'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { appleMusicAuth } from '@/services/apple-music-auth';

interface ConnectAppleMusicButtonProps {
  isConnected?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ConnectAppleMusicButton({ 
  isConnected = false, 
  onConnect, 
  onDisconnect 
}: ConnectAppleMusicButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await appleMusicAuth.authorize();
      console.log('Apple Music connected successfully');
      onConnect?.();
    } catch (error) {
      console.error('Failed to connect to Apple Music:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Apple Music');
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
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
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
            className="w-full bg-danger hover:bg-danger/90 text-white"
          >
            {isLoading ? 'Connecting...' : 'Connect with Apple Music'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
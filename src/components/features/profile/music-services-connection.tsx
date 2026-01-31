'use client';

import { ConnectSpotifyButton } from './connect-spotify-button';
import { ConnectAppleMusicButton } from './connect-apple-music-button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';

export function MusicServicesConnection() {
  const { user, isLoading } = useAuthStore();
  
  const connectedServices = user?.connectedServices || [];
  
  console.log('🔍 [MusicConnection] Connected services:', connectedServices);

  const handleSpotifyConnect = () => {
    // TODO: Implement actual Spotify connection logic
    console.log('Connecting to Spotify...');
  };

  const handleSpotifyDisconnect = () => {
    // TODO: Implement actual Spotify disconnection logic
    console.log('Disconnecting from Spotify...');
  };

  const handleAppleMusicConnect = () => {
    // TODO: Implement actual Apple Music connection logic
    console.log('Connecting to Apple Music...');
  };

  const handleAppleMusicDisconnect = () => {
    // TODO: Implement actual Apple Music disconnection logic
    console.log('Disconnecting from Apple Music...');
  };

  const spotifyConnection = connectedServices.find(service => service.serviceType === 'Spotify');
  const appleMusicConnection = connectedServices.find(service => service.serviceType === 'AppleMusic');

  if (isLoading) {
    return (
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Spinner size="md" variant="primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connected Services Display */}
      {connectedServices.length > 0 && (
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-muted/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {connectedServices.map(service => (
                  <div key={service.serviceType} className="relative">
                    {service.serviceType === 'Spotify' && (
                      <Image
                        src="/images/social_images/spotify_logo_colored.png"
                        alt="Spotify"
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                    )}
                    {service.serviceType === 'AppleMusic' && (
                      <Image
                        src="/images/social_images/apple_music_logo_colored.png"
                        alt="Apple Music"
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Connected</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConnectSpotifyButton
          isConnected={!!spotifyConnection}
          onConnect={handleSpotifyConnect}
          onDisconnect={handleSpotifyDisconnect}
        />
        
        <ConnectAppleMusicButton
          isConnected={!!appleMusicConnection}
          onConnect={handleAppleMusicConnect}
          onDisconnect={handleAppleMusicDisconnect}
        />
      </div>
    </div>
  );
}
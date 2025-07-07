'use client';

import { ConnectSpotifyButton } from './connect-spotify-button';
import { ConnectAppleMusicButton } from './connect-apple-music-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';

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
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Music Services</CardTitle>
          <CardDescription>Loading your music service connections...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Music Services</CardTitle>
        <CardDescription>
          Connect your music streaming services to import your playlists and tracks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        
        {connectedServices.length > 0 && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Connected Services</h3>
              <div className="space-y-2">
                {connectedServices.map(service => (
                  <div key={service.serviceType} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{service.serviceType}</span>
                      {service.profileUrl && (
                        <a href={service.profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                          View Profile
                        </a>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      Connected {new Date(service.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
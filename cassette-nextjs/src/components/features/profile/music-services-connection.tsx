'use client';

import { useState, useEffect } from 'react';
import { ConnectSpotifyButton } from './connect-spotify-button';
import { ConnectAppleMusicButton } from './connect-apple-music-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MusicConnection {
  service: string;
  isConnected: boolean;
  connectedAt?: string;
  serviceUsername?: string;
}

export function MusicServicesConnection() {
  const [connections, setConnections] = useState<MusicConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch user's music service connections from API
    // For now, we'll use placeholder data
    const fetchConnections = async () => {
      try {
        // This would be replaced with actual API call
        const mockConnections: MusicConnection[] = [
          { service: 'spotify', isConnected: false },
          { service: 'apple_music', isConnected: false },
        ];
        setConnections(mockConnections);
      } catch (error) {
        console.error('Failed to fetch music connections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, []);

  const handleSpotifyConnect = () => {
    setConnections(prev => prev.map(conn => 
      conn.service === 'spotify' 
        ? { ...conn, isConnected: true, connectedAt: new Date().toISOString() }
        : conn
    ));
  };

  const handleSpotifyDisconnect = () => {
    setConnections(prev => prev.map(conn => 
      conn.service === 'spotify' 
        ? { ...conn, isConnected: false, connectedAt: undefined }
        : conn
    ));
  };

  const handleAppleMusicConnect = () => {
    setConnections(prev => prev.map(conn => 
      conn.service === 'apple_music' 
        ? { ...conn, isConnected: true, connectedAt: new Date().toISOString() }
        : conn
    ));
  };

  const handleAppleMusicDisconnect = () => {
    setConnections(prev => prev.map(conn => 
      conn.service === 'apple_music' 
        ? { ...conn, isConnected: false, connectedAt: undefined }
        : conn
    ));
  };

  const spotifyConnection = connections.find(conn => conn.service === 'spotify');
  const appleMusicConnection = connections.find(conn => conn.service === 'apple_music');

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
            isConnected={spotifyConnection?.isConnected}
            onConnect={handleSpotifyConnect}
            onDisconnect={handleSpotifyDisconnect}
          />
          
          <ConnectAppleMusicButton
            isConnected={appleMusicConnection?.isConnected}
            onConnect={handleAppleMusicConnect}
            onDisconnect={handleAppleMusicDisconnect}
          />
        </div>
        
        {connections.some(conn => conn.isConnected) && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Connected Services</h3>
              <div className="space-y-2">
                {connections
                  .filter(conn => conn.isConnected)
                  .map(conn => (
                    <div key={conn.service} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="capitalize">{conn.service.replace('_', ' ')}</span>
                        {conn.serviceUsername && (
                          <span className="text-sm text-gray-500">({conn.serviceUsername})</span>
                        )}
                      </div>
                      {conn.connectedAt && (
                        <span className="text-sm text-gray-500">
                          Connected {new Date(conn.connectedAt).toLocaleDateString()}
                        </span>
                      )}
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
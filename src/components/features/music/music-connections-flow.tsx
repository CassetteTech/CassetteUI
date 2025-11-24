'use client';

import { useState, useEffect } from 'react';
import { ConnectSpotifyButton } from '@/components/features/profile/connect-spotify-button';
import { ConnectAppleMusicButton } from '@/components/features/profile/connect-apple-music-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '@/services/api';

interface MusicConnection {
  serviceType: string;
  isConnected: boolean;
  connectedAt?: string;
  isValid?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiration?: string;
}

interface MusicConnectionsFlowProps {
  className?: string;
  onConnectionChange?: (hasConnections: boolean) => void;
}

export function MusicConnectionsFlow({ 
  className = "",
  onConnectionChange
}: MusicConnectionsFlowProps) {
  const [connections, setConnections] = useState<MusicConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        console.log('MusicConnectionsFlow: Fetching connections from API...');

        const { services = [] } = await apiService.getMusicConnections();
        const normalized = services.map((s) => (typeof s === 'string' ? s : String(s)).toLowerCase());
        const normalizedClean = normalized.map((s) => s.replace(/[^a-z0-9]/gi, ''));
        const mapped: MusicConnection[] = [];

        if (normalizedClean.includes('spotify')) {
          mapped.push({
            serviceType: 'Spotify',
            isConnected: true,
            connectedAt: new Date().toISOString(),
            isValid: true,
          });
        }

        if (normalizedClean.includes('applemusic')) {
          mapped.push({
            serviceType: 'AppleMusic',
            isConnected: true,
            connectedAt: new Date().toISOString(),
            isValid: true,
          });
        }

        ['Spotify', 'AppleMusic'].forEach(serviceType => {
          if (!mapped.find(conn => conn.serviceType === serviceType)) {
            mapped.push({
              serviceType,
              isConnected: false
            });
          }
        });

        console.log('MusicConnectionsFlow: Transformed connections:', mapped);
        setConnections(mapped);
      } catch (error) {
        console.error('MusicConnectionsFlow: Failed to fetch music connections:', error);
        setConnections([
          { serviceType: 'Spotify', isConnected: false },
          { serviceType: 'AppleMusic', isConnected: false },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, []);

  const handleSpotifyConnect = () => {
    setConnections(prev => {
      const updated = prev.map(conn => 
        conn.serviceType === 'Spotify' 
          ? { ...conn, isConnected: true, connectedAt: new Date().toISOString() }
          : conn
      );
      const hasConnections = updated.some(conn => conn.isConnected);
      onConnectionChange?.(hasConnections);
      return updated;
    });
  };

  const handleSpotifyDisconnect = () => {
    setConnections(prev => {
      const updated = prev.map(conn => 
        conn.serviceType === 'Spotify' 
          ? { ...conn, isConnected: false, connectedAt: undefined }
          : conn
      );
      const hasConnections = updated.some(conn => conn.isConnected);
      onConnectionChange?.(hasConnections);
      return updated;
    });
  };

  const handleAppleMusicConnect = () => {
    setConnections(prev => {
      const updated = prev.map(conn => 
        conn.serviceType === 'AppleMusic' 
          ? { ...conn, isConnected: true, connectedAt: new Date().toISOString() }
          : conn
      );
      const hasConnections = updated.some(conn => conn.isConnected);
      onConnectionChange?.(hasConnections);
      return updated;
    });
  };

  const handleAppleMusicDisconnect = () => {
    setConnections(prev => {
      const updated = prev.map(conn => 
        conn.serviceType === 'AppleMusic' 
          ? { ...conn, isConnected: false, connectedAt: undefined }
          : conn
      );
      const hasConnections = updated.some(conn => conn.isConnected);
      onConnectionChange?.(hasConnections);
      return updated;
    });
  };

  const spotifyConnection = connections.find(conn => conn.serviceType === 'Spotify');
  const appleMusicConnection = connections.find(conn => conn.serviceType === 'AppleMusic');
  const hasConnections = connections.some(conn => conn.isConnected);
  const hasDisconnectedServices = connections.some(conn => !conn.isConnected);

  console.log('🎵 MusicConnectionsFlow: All connections:', connections);
  console.log('🎵 MusicConnectionsFlow: Spotify connection:', spotifyConnection);
  console.log('🎵 MusicConnectionsFlow: Apple Music connection:', appleMusicConnection);
  console.log('🎵 MusicConnectionsFlow: Has connections:', hasConnections);
  console.log('🎵 MusicConnectionsFlow: Has disconnected services:', hasDisconnectedServices);

  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Music Services</CardTitle>
              <CardDescription>Loading your connections...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Music Services</CardTitle>
            <CardDescription>
              {hasConnections 
                ? "Connected services for easier music discovery"
                : "Connect your streaming services for easier music discovery"
              }
            </CardDescription>
          </div>
          {hasConnections && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1"
            >
              {hasDisconnectedServices ? 'Connect More' : 'Manage'}
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Connected Services Summary */}
        {hasConnections && !isExpanded && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {connections
                .filter(conn => conn.isConnected)
                .map(conn => (
                  <Badge key={conn.serviceType} variant="secondary" className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {conn.serviceType === 'Spotify' ? 'Spotify' : 'Apple Music'}
                  </Badge>
                ))}
            </div>
            {hasDisconnectedServices && (
              <p className="text-sm text-muted-foreground">
                Connect more services to discover music from all your platforms
              </p>
            )}
          </div>
        )}

        {/* Connection Flow */}
        {(!hasConnections || isExpanded) && (
          <div className="space-y-4">
            {hasDisconnectedServices && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!spotifyConnection?.isConnected && (
                  <ConnectSpotifyButton
                    isConnected={spotifyConnection?.isConnected}
                    onConnect={handleSpotifyConnect}
                    onDisconnect={handleSpotifyDisconnect}
                  />
                )}
                
                {!appleMusicConnection?.isConnected && (
                  <ConnectAppleMusicButton
                    isConnected={appleMusicConnection?.isConnected}
                    onConnect={handleAppleMusicConnect}
                    onDisconnect={handleAppleMusicDisconnect}
                  />
                )}
              </div>
            )}

            {/* Connected Services Detail */}
            {hasConnections && isExpanded && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Connected Services</h4>
                <div className="space-y-2">
                  {connections
                    .filter(conn => conn.isConnected)
                    .map(conn => (
                      <div key={conn.serviceType} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="capitalize font-medium">
                            {conn.serviceType === 'Spotify' ? 'Spotify' : 'Apple Music'}
                          </span>
                        </div>
                        {conn.connectedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(conn.connectedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
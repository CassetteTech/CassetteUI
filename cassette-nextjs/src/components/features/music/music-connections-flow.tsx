'use client';

import { useState, useEffect } from 'react';
import { ConnectSpotifyButton } from '@/components/features/profile/connect-spotify-button';
import { ConnectAppleMusicButton } from '@/components/features/profile/connect-apple-music-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MusicConnection {
  serviceType: string;
  isConnected: boolean;
  connectedAt?: string;
  isValid?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiration?: string;
}

interface ConnectedMusicService {
  serviceType: string;
  accessToken: string;
  connectedAt: string;
  isValid: boolean;
  refreshToken: string;
  tokenExpiration: string;
}

interface UserApiResponse {
  connectedMusicServices?: ConnectedMusicService[];
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
        console.log('🎵 MusicConnectionsFlow: Fetching connections from API...');
        
        // Get the access token from localStorage
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          console.log('🎵 MusicConnectionsFlow: No access token found, using empty connections');
          setConnections([]);
          return;
        }

        // Fetch from your backend API
        const response = await fetch('http://localhost:5173/api/v1/auth/session', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const userData: UserApiResponse = await response.json();
        console.log('🎵 MusicConnectionsFlow: API response:', userData);

        // Transform the API response to our format
        const connections: MusicConnection[] = [];
        
        if (userData.connectedMusicServices && Array.isArray(userData.connectedMusicServices)) {
          userData.connectedMusicServices.forEach((service: ConnectedMusicService) => {
            connections.push({
              serviceType: service.serviceType,
              isConnected: service.isValid === true,
              connectedAt: service.connectedAt,
              isValid: service.isValid,
              accessToken: service.accessToken,
              refreshToken: service.refreshToken,
              tokenExpiration: service.tokenExpiration
            });
          });
        }

        // Add missing services as disconnected
        const serviceTypes = ['Spotify', 'AppleMusic'];
        serviceTypes.forEach(serviceType => {
          if (!connections.find(conn => conn.serviceType === serviceType)) {
            connections.push({
              serviceType,
              isConnected: false
            });
          }
        });

        console.log('🎵 MusicConnectionsFlow: Transformed connections:', connections);
        setConnections(connections);
      } catch (error) {
        console.error('🎵 MusicConnectionsFlow: Failed to fetch music connections:', error);
        // Fallback to empty connections on error
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
'use client';

import { Music } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';

interface MusicConnection {
  serviceType: string;
  isConnected: boolean;
  connectedAt?: string;
  isValid?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiration?: string;
}



interface MusicConnectionsStatusProps {
  variant?: 'sidebar' | 'profile' | 'compact';
  className?: string;
}

export function MusicConnectionsStatus({ 
  variant = 'sidebar',
  className = ""
}: MusicConnectionsStatusProps) {
  const { user, isLoading } = useAuthStore();
  
  // Get connected services from auth store
  const connectedServices = user?.connectedServices || [];
  
  // Transform to our format and add missing services
  const connections: MusicConnection[] = [];
  
  // Add connected services
  connectedServices.forEach(service => {
    connections.push({
      serviceType: service.serviceType,
      isConnected: true,
      connectedAt: service.connectedAt,
    });
  });
  
  // Add missing services as disconnected
  const serviceTypes = ['Spotify', 'AppleMusic'];
  serviceTypes.forEach(serviceType => {
    // Check both capitalized and lowercase versions
    const exists = connections.find(conn => 
      conn.serviceType.toLowerCase() === serviceType.toLowerCase()
    );
    if (!exists) {
      connections.push({
        serviceType,
        isConnected: false
      });
    }
  });

  const connectedServicesFiltered = connections.filter(conn => conn.isConnected);
  const hasConnections = connectedServicesFiltered.length > 0;

  if (isLoading) {
    return (
      <div className={`${className}`}>
        {variant === 'sidebar' && (
          <div className="flex items-center gap-2 p-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-3 bg-muted rounded flex-1 animate-pulse"></div>
          </div>
        )}
        {variant === 'profile' && (
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg animate-pulse">
            <div className="w-8 h-8 bg-muted-foreground/20 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-muted-foreground/20 rounded mb-1"></div>
              <div className="h-3 bg-muted-foreground/20 rounded w-2/3"></div>
            </div>
          </div>
        )}
        {variant === 'compact' && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
          </div>
        )}
      </div>
    );
  }

  // Sidebar variant - minimal display
  if (variant === 'sidebar') {
    return (
      <div className={`${className}`}>
        {hasConnections ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {connectedServicesFiltered.map(conn => (
                <div key={conn.serviceType} className="relative">
                  {conn.serviceType.toLowerCase() === 'spotify' && (
                    <Image
                      src="/images/social_images/ic_spotify.png"
                      alt="Spotify Connected"
                      width={16}
                      height={16}
                      className="rounded-sm"
                    />
                  )}
                  {conn.serviceType.toLowerCase() === 'applemusic' && (
                    <Image
                      src="/images/social_images/ic_apple.png"
                      alt="Apple Music Connected"
                      width={16}
                      height={16}
                      className="rounded-sm"
                    />
                  )}
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background"></div>
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {connectedServicesFiltered.length} service{connectedServicesFiltered.length !== 1 ? 's' : ''} connected
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">No music services</span>
          </div>
        )}
      </div>
    );
  }

  // Profile variant - compact card display
  if (variant === 'profile') {
    return (
      <div className={`bg-card border rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Music className="h-4 w-4" />
            Music Services
          </h4>
          {hasConnections && (
            <span className="text-xs text-muted-foreground">
              {connectedServicesFiltered.length} connected
            </span>
          )}
        </div>

        {hasConnections ? (
          <div className="flex items-center gap-2 mt-2">
            {connectedServicesFiltered.map(conn => (
              <div key={conn.serviceType} className="relative">
                {conn.serviceType === 'Spotify' && (
                  <Image
                    src="/images/social_images/ic_spotify.png"
                    alt="Spotify Connected"
                    width={24}
                    height={24}
                    className="rounded"
                  />
                )}
                {conn.serviceType === 'AppleMusic' && (
                  <Image
                    src="/images/social_images/ic_apple.png"
                    alt="Apple Music Connected"
                    width={24}
                    height={24}
                    className="rounded"
                  />
                )}
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-background"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
              <Music className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">No services connected</span>
          </div>
        )}
      </div>
    );
  }

  // Compact variant - inline display
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {hasConnections ? (
          <>
            <div className="flex items-center gap-1">
              {connectedServicesFiltered.map(conn => (
                <div key={conn.serviceType} className="relative">
                  {conn.serviceType.toLowerCase() === 'spotify' && (
                    <Image
                      src="/images/social_images/ic_spotify.png"
                      alt="Spotify"
                      width={14}
                      height={14}
                      className="rounded-sm"
                    />
                  )}
                  {conn.serviceType.toLowerCase() === 'applemusic' && (
                    <Image
                      src="/images/social_images/ic_apple.png"
                      alt="Apple Music"
                      width={14}
                      height={14}
                      className="rounded-sm"
                    />
                  )}
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {connectedServicesFiltered.length} connected
            </span>
          </>
        ) : (
          <>
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">No services</span>
          </>
        )}
      </div>
    );
  }

  return null;
}
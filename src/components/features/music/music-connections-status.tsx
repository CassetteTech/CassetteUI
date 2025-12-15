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
  const normalize = (value: unknown) => (typeof value === 'string' ? value : value ? String(value) : '').toLowerCase();
  
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
      normalize(conn.serviceType) === serviceType.toLowerCase()
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
      <div className={`bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-3 shadow-lg ${className}`}>
        {hasConnections ? (
          <>
            {/* Desktop version - with text */}
            <div className="hidden md:flex flex-col items-start gap-2">
              <span className="text-xs font-medium text-foreground/80">Connected</span>
              <div className="flex items-center gap-2">
                {connectedServicesFiltered.map(conn => (
                  <div key={conn.serviceType} className="relative">
                    {normalize(conn.serviceType) === 'spotify' && (
                      <Image
                        src="/images/spotify_logo_colored.png"
                        alt="Spotify Connected"
                        width={20}
                        height={20}
                        className="rounded-md shadow-sm"
                      />
                    )}
                    {normalize(conn.serviceType) === 'applemusic' && (
                      <Image
                        src="/images/apple_music_logo_colored.png"
                        alt="Apple Music Connected"
                        width={20}
                        height={20}
                        className="rounded-md shadow-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Mobile version - only icons */}
            <div className="flex md:hidden items-center gap-2">
              {connectedServicesFiltered.map(conn => (
                <div key={conn.serviceType} className="relative">
                  {normalize(conn.serviceType) === 'spotify' && (
                    <Image
                      src="/images/spotify_logo_colored.png"
                      alt="Spotify Connected"
                      width={24}
                      height={24}
                      className="rounded-md shadow-sm"
                    />
                  )}
                  {normalize(conn.serviceType) === 'applemusic' && (
                    <Image
                      src="/images/apple_music_logo_colored.png"
                      alt="Apple Music Connected"
                      width={24}
                      height={24}
                      className="rounded-md shadow-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted/50 rounded-md flex items-center justify-center">
              <Music className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground/60">No Services</span>
          </div>
        )}
      </div>
    );
  }

  // Profile variant - compact card display
  if (variant === 'profile') {
    return (
      <div className={`bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-3 shadow-lg ${className}`}>
        {hasConnections ? (
          <>
            {/* Desktop version - with text */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                {connectedServicesFiltered.map(conn => (
                  <div key={conn.serviceType} className="relative">
                    {normalize(conn.serviceType) === 'spotify' && (
                      <Image
                        src="/images/spotify_logo_colored.png"
                        alt="Spotify Connected"
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                    )}
                    {normalize(conn.serviceType) === 'applemusic' && (
                      <Image
                        src="/images/apple_music_logo_colored.png"
                        alt="Apple Music Connected"
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
            
            {/* Mobile version - only icons */}
            <div className="flex md:hidden items-center gap-2">
              {connectedServicesFiltered.map(conn => (
                <div key={conn.serviceType} className="relative">
                  {normalize(conn.serviceType) === 'spotify' && (
                    <Image
                      src="/images/spotify_logo_colored.png"
                      alt="Spotify Connected"
                      width={28}
                      height={28}
                      className="rounded-md shadow-sm"
                    />
                  )}
                  {normalize(conn.serviceType) === 'applemusic' && (
                    <Image
                      src="/images/apple_music_logo_colored.png"
                      alt="Apple Music Connected"
                      width={28}
                      height={28}
                      className="rounded-md shadow-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted/50 rounded-md flex items-center justify-center">
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
                  {normalize(conn.serviceType) === 'spotify' && (
                    <Image
                      src="/images/spotify_logo_colored.png"
                      alt="Spotify"
                      width={14}
                      height={14}
                      className="rounded-sm"
                    />
                  )}
                  {normalize(conn.serviceType) === 'applemusic' && (
                    <Image
                      src="/images/apple_music_logo_colored.png"
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

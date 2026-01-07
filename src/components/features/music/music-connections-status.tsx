'use client';

import { Music } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  variant?: 'sidebar' | 'sidebar-enhanced' | 'profile' | 'compact';
  className?: string;
  /** Optional external user's connected services (for viewing other profiles) */
  connectedServicesOverride?: Array<{ serviceType: string; connectedAt?: string }>;
}

export function MusicConnectionsStatus({
  variant = 'sidebar',
  className = "",
  connectedServicesOverride
}: MusicConnectionsStatusProps) {
  const { user, isLoading } = useAuthStore();
  const normalize = (value: unknown) => (typeof value === 'string' ? value : value ? String(value) : '').toLowerCase();

  // When override is provided, we have the data - don't use auth store loading state
  const hasOverride = connectedServicesOverride !== undefined;

  // Get connected services - use override if provided (for viewing other profiles)
  const connectedServices = connectedServicesOverride ?? user?.connectedServices ?? [];

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

  // Only show loading state if we're using auth store data (no override) and it's loading
  if (isLoading && !hasOverride) {
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
        {variant === 'sidebar-enhanced' && (
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-6 h-6 bg-muted rounded-md animate-pulse"></div>
            <div className="w-6 h-6 bg-muted rounded-md animate-pulse"></div>
          </div>
        )}
      </div>
    );
  }

  // Sidebar variant - compact inline display
  if (variant === 'sidebar') {
    if (!hasConnections) {
      return null; // Don't show anything if no connections
    }

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {connectedServicesFiltered.map(conn => (
          <div key={conn.serviceType} className="relative">
            {normalize(conn.serviceType) === 'spotify' && (
              <Image
                src="/images/spotify_logo_colored.png"
                alt="Spotify"
                width={20}
                height={20}
                className="rounded"
              />
            )}
            {normalize(conn.serviceType) === 'applemusic' && (
              <Image
                src="/images/apple_music_logo_colored.png"
                alt="Apple Music"
                width={20}
                height={20}
                className="rounded"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Sidebar-enhanced variant - larger icons with tooltips for redesigned sidebar
  if (variant === 'sidebar-enhanced') {
    // Hide completely if no connections
    if (!hasConnections) {
      return null;
    }

    // Helper to check service type - handles both string and numeric enum values
    // Backend enum: 0 = Spotify, 1 = AppleMusic, 2 = Deezer
    const isSpotify = (serviceType: string | number) => {
      if (typeof serviceType === 'number') {
        return serviceType === 0;
      }
      const normalized = normalize(serviceType);
      return normalized === 'spotify' || normalized === '0';
    };

    const isAppleMusic = (serviceType: string | number) => {
      if (typeof serviceType === 'number') {
        return serviceType === 1;
      }
      const normalized = normalize(serviceType).replace(/\s+/g, '');
      return normalized === 'applemusic' || normalized === 'apple_music' || normalized === 'apple' || normalized === '1';
    };

    const getServiceName = (serviceType: string | number) => {
      if (isSpotify(serviceType)) return 'Spotify';
      if (isAppleMusic(serviceType)) return 'Apple Music';
      return String(serviceType);
    };

    const getServiceIcon = (serviceType: string | number): string | null => {
      if (isSpotify(serviceType)) return '/images/spotify_logo_colored.png';
      if (isAppleMusic(serviceType)) return '/images/apple_music_logo_colored.png';
      console.warn('[MusicConnectionsStatus] Unknown service type:', serviceType);
      return null;
    };

    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {connectedServicesFiltered.map(conn => {
          const iconSrc = getServiceIcon(conn.serviceType);
          const serviceName = getServiceName(conn.serviceType);

          return (
            <Tooltip key={conn.serviceType}>
              <TooltipTrigger asChild>
                <div className="relative group cursor-default">
                  {iconSrc ? (
                    <Image
                      src={iconSrc}
                      alt={serviceName}
                      width={24}
                      height={24}
                      className="rounded-md transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center">
                      <Music className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-card" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {serviceName} Connected
              </TooltipContent>
            </Tooltip>
          );
        })}
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

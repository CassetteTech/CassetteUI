'use client';

import { Music } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlatformPreferenceInfo } from '@/types';

interface MusicConnectionsStatusProps {
  variant?: 'sidebar' | 'sidebar-enhanced' | 'profile' | 'compact';
  className?: string;
  /** Optional external user's platform preferences (for viewing other profiles) */
  platformPreferencesOverride?: PlatformPreferenceInfo[];
  /** Legacy: Optional external user's connected services (for backward compatibility) */
  connectedServicesOverride?: Array<{ serviceType: string; connectedAt?: string }>;
}

const PLATFORM_CONFIG: Record<string, { name: string; iconSrc: string }> = {
  spotify: {
    name: 'Spotify',
    iconSrc: '/images/spotify_logo_colored.png',
  },
  applemusic: {
    name: 'Apple Music',
    iconSrc: '/images/apple_music_logo_colored.png',
  },
  deezer: {
    name: 'Deezer',
    iconSrc: '/images/deezer_logo_colored.png',
  },
};

export function MusicConnectionsStatus({
  variant = 'sidebar',
  className = "",
  platformPreferencesOverride,
  connectedServicesOverride
}: MusicConnectionsStatusProps) {
  const { user, isLoading } = useAuthStore();
  const normalize = (value: unknown) => (typeof value === 'string' ? value : value ? String(value) : '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // When override is provided, we have the data - don't use auth store loading state
  const hasOverride = platformPreferencesOverride !== undefined || connectedServicesOverride !== undefined;

  // Get platforms to display - prefer platformPreferences, fall back to connectedServices for backward compatibility
  let displayPlatforms: Array<{ platform: string; name: string; iconSrc: string }> = [];

  if (platformPreferencesOverride && platformPreferencesOverride.length > 0) {
    // Use platform preferences (new system)
    displayPlatforms = platformPreferencesOverride
      .map(pref => {
        const normalizedPlatform = normalize(pref.platform);
        const config = PLATFORM_CONFIG[normalizedPlatform];
        if (config) {
          return { platform: normalizedPlatform, ...config };
        }
        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  } else if (connectedServicesOverride && connectedServicesOverride.length > 0) {
    // Fall back to connected services (legacy)
    displayPlatforms = connectedServicesOverride
      .map(service => {
        const normalizedPlatform = normalize(service.serviceType);
        const config = PLATFORM_CONFIG[normalizedPlatform];
        if (config) {
          return { platform: normalizedPlatform, ...config };
        }
        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  } else if (user?.connectedServices) {
    // Use auth store data
    displayPlatforms = user.connectedServices
      .map(service => {
        const normalizedPlatform = normalize(service.serviceType);
        const config = PLATFORM_CONFIG[normalizedPlatform];
        if (config) {
          return { platform: normalizedPlatform, ...config };
        }
        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }

  const hasConnections = displayPlatforms.length > 0;

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
        {displayPlatforms.map(platform => (
          <div key={platform.platform} className="relative">
            <Image
              src={platform.iconSrc}
              alt={platform.name}
              width={20}
              height={20}
              className="rounded"
            />
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

    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {displayPlatforms.map(platform => (
          <Tooltip key={platform.platform}>
            <TooltipTrigger asChild>
              <div className="relative group cursor-default">
                <Image
                  src={platform.iconSrc}
                  alt={platform.name}
                  width={24}
                  height={24}
                  className="rounded-md transition-transform group-hover:scale-110"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success rounded-full border border-card" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {platform.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  // Profile variant - compact card display
  if (variant === 'profile') {
    return (
      <div className={`bg-card/20 backdrop-blur-md border border-border/20 rounded-xl p-3 shadow-lg ${className}`}>
        {hasConnections ? (
          <>
            {/* Desktop version - with text */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                {displayPlatforms.map(platform => (
                  <Image
                    key={platform.platform}
                    src={platform.iconSrc}
                    alt={platform.name}
                    width={24}
                    height={24}
                    className="rounded-sm"
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {displayPlatforms.length === 1 ? displayPlatforms[0].name : 'Connected'}
              </span>
            </div>

            {/* Mobile version - only icons */}
            <div className="flex md:hidden items-center gap-2">
              {displayPlatforms.map(platform => (
                <Image
                  key={platform.platform}
                  src={platform.iconSrc}
                  alt={platform.name}
                  width={28}
                  height={28}
                  className="rounded-md shadow-sm"
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted/50 rounded-md flex items-center justify-center">
              <Music className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">No services selected</span>
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
              {displayPlatforms.map(platform => (
                <div key={platform.platform} className="relative">
                  <Image
                    src={platform.iconSrc}
                    alt={platform.name}
                    width={14}
                    height={14}
                    className="rounded-sm"
                  />
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-success rounded-full"></div>
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {displayPlatforms.length} selected
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

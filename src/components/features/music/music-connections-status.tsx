'use client';

/** Connected platform marks with a live dot, for the sidebar profile card.
    Platform preferences win over the legacy connected-services list. */

import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlatformPreferenceInfo } from '@/types';
import { getDisplayPlatformDefinition } from '@/lib/platforms';

interface MusicConnectionsStatusProps {
  className?: string;
  /** Optional external user's platform preferences (for viewing other profiles) */
  platformPreferencesOverride?: PlatformPreferenceInfo[];
  /** Legacy: Optional external user's connected services (for backward compatibility) */
  connectedServicesOverride?: Array<{ serviceType: string; connectedAt?: string }>;
}

export function MusicConnectionsStatus({
  className = '',
  platformPreferencesOverride,
  connectedServicesOverride,
}: MusicConnectionsStatusProps) {
  const { user, isLoading } = useAuthStore();
  // When an override is provided we already have the data, so the auth store's loading state does not apply.
  const hasOverride = platformPreferencesOverride !== undefined || connectedServicesOverride !== undefined;

  const types = platformPreferencesOverride?.length
    ? platformPreferencesOverride.map((pref) => pref.platform)
    : (connectedServicesOverride ?? user?.connectedServices ?? []).map((service) => service.serviceType);
  const displayPlatforms = types.flatMap((type) => {
    const config = getDisplayPlatformDefinition(type);
    return config ? [{ platform: config.uiKey, name: config.displayName, iconSrc: config.logoSrc }] : [];
  });

  if (isLoading && !hasOverride) {
    return (
      <div className={`flex items-center justify-center gap-2.5 ${className}`}>
        <div className="w-6 h-6 bg-muted rounded-md animate-pulse" />
        <div className="w-6 h-6 bg-muted rounded-md animate-pulse" />
      </div>
    );
  }

  if (displayPlatforms.length === 0) return null;

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

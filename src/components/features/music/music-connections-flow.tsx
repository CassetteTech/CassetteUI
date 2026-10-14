'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { platformConnectService } from '@/services/platform-connect';
import { appLogger } from '@/lib/observability/logger';
import { PendingLabel } from '@/components/ui/interior/loading-button';
import { cn } from '@/lib/utils';
import {
  ACTIVE_PLATFORM_DEFINITIONS,
  ACTIVE_PLATFORM_PREFERENCE_KEYS,
  type PlatformPreferenceKey,
} from '@/lib/platforms';

interface PlatformState {
  isSelected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  addedAt?: string;
}

type ServiceId = PlatformPreferenceKey;

const MUSIC_SERVICES = ACTIVE_PLATFORM_DEFINITIONS.map((platform) => ({
  id: platform.preferenceKey,
  name: platform.displayName,
  iconSrc: platform.logoSrc,
  requiresAuth: platform.requiresAuthForPlaylistCreation,
  description: platform.connectionDescription,
}));

const createEmptyPlatformStates = (): Record<ServiceId, PlatformState> =>
  Object.fromEntries(
    ACTIVE_PLATFORM_PREFERENCE_KEYS.map((platform) => [
      platform,
      { isSelected: false, isAuthenticated: false, isLoading: false },
    ]),
  ) as Record<ServiceId, PlatformState>;

export function MusicConnectionsFlow() {
  const [platformStates, setPlatformStates] = useState<Record<ServiceId, PlatformState>>(createEmptyPlatformStates);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        void platformConnectService.preloadAppleMusic().catch((error) => {
          appLogger.warn('apple_music_preload_failed', { error });
        });

        appLogger.debug('music_connections_preferences_fetch_started');
        const response = await apiService.getPlatformPreferences();

        if (response.preferences) {
          const newStates = createEmptyPlatformStates();

          response.preferences.forEach(pref => {
            const platform = pref.platform as ServiceId;
            if (newStates[platform]) {
              newStates[platform] = {
                isSelected: true,
                isAuthenticated: pref.isAuthenticated,
                isLoading: false,
                addedAt: pref.addedAt,
              };
            }
          });

          setPlatformStates(newStates);
          appLogger.debug('music_connections_preferences_loaded', {
            selected_platform_count: Object.values(newStates).filter((state) => state.isSelected).length,
          });
        }
      } catch (error) {
        appLogger.error('music_connections_preferences_fetch_failed', { error });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const getSelectedPlatforms = (overrides: Partial<Record<ServiceId, boolean>> = {}) =>
    Object.entries(platformStates)
      .filter(([id, state]) => overrides[id as ServiceId] ?? state.isSelected)
      .map(([id]) => id);

  const handleAppleMusicAuthorization = async (ensureSelected = false) => {
    setPlatformStates(prev => ({
      ...prev,
      AppleMusic: { ...prev.AppleMusic, isLoading: true },
    }));

    try {
      const success = await platformConnectService.connectAppleMusic(window.location.pathname);

      if (!success) {
        setPlatformStates(prev => ({
          ...prev,
          AppleMusic: { ...prev.AppleMusic, isLoading: false },
        }));
        toast.error('Failed to connect Apple Music', {
          description: 'Authorization was cancelled or failed.',
        });
        return;
      }

      await apiService.setPlatformPreferences(
        getSelectedPlatforms(ensureSelected ? { AppleMusic: true } : {})
      );

      setPlatformStates(prev => ({
        ...prev,
        AppleMusic: {
          ...prev.AppleMusic,
          isSelected: ensureSelected || prev.AppleMusic.isSelected,
          isAuthenticated: true,
          isLoading: false,
          addedAt: prev.AppleMusic.addedAt ?? new Date().toISOString(),
        },
      }));

      toast.success(ensureSelected ? 'Apple Music connected!' : 'Apple Music authorized!');
    } catch (error) {
      appLogger.error('music_connections_apple_music_connect_failed', { error, platform: 'AppleMusic' });
      setPlatformStates(prev => ({
        ...prev,
        AppleMusic: { ...prev.AppleMusic, isLoading: false },
      }));
      const message = error instanceof Error ? error.message : 'Please try again.';
      toast.error('Failed to connect Apple Music', {
        description: message,
      });
    }
  };

  const handleDeezerAuthorization = async () => {
    setPlatformStates(prev => ({
      ...prev,
      Deezer: { ...prev.Deezer, isLoading: true },
    }));

    try {
      await platformConnectService.connectDeezer(window.location.href);
    } catch (error) {
      appLogger.error('music_connections_deezer_connect_failed', { error, platform: 'Deezer' });
      setPlatformStates(prev => ({
        ...prev,
        Deezer: { ...prev.Deezer, isLoading: false },
      }));
      toast.error('Failed to connect Deezer', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleToggle = async (serviceId: ServiceId) => {
    const service = MUSIC_SERVICES.find(s => s.id === serviceId);
    if (!service) return;

    const currentState = platformStates[serviceId];
    const newIsSelected = !currentState.isSelected;

    if (newIsSelected && service.requiresAuth) {
      if (serviceId === 'Deezer') {
        await handleDeezerAuthorization();
        return;
      }

      await handleAppleMusicAuthorization(true);
      return;
    }

    setPlatformStates(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], isLoading: true },
    }));

    try {
      const newSelectedPlatforms = Object.entries(platformStates)
        .filter(([id, state]) => {
          if (id === serviceId) return newIsSelected;
          return state.isSelected;
        })
        .map(([id]) => id);

      await apiService.setPlatformPreferences(newSelectedPlatforms);

      setPlatformStates(prev => ({
        ...prev,
        [serviceId]: {
          ...prev[serviceId],
          isSelected: newIsSelected,
          isLoading: false,
        },
      }));

      if (newIsSelected) {
        toast.success(`${service.name} added to your profile`);
      } else {
        toast.info(`${service.name} removed from your profile`);
      }
    } catch (error) {
      appLogger.error('music_connections_preference_update_failed', {
        error,
        platform: serviceId,
      });
      setPlatformStates(prev => ({
        ...prev,
        [serviceId]: { ...prev[serviceId], isLoading: false },
      }));
      toast.error(`Failed to update ${service.name}`);
    }
  };

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 py-5 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Loading music services…
      </p>
    );
  }

  return (
    <>
      {MUSIC_SERVICES.map(service => {
        const state = platformStates[service.id];
        const needsAuthorization = service.requiresAuth && state.isSelected && !state.isAuthenticated;

        return (
          <div key={service.id} className="flex items-center gap-4 py-5">
            <Image src={service.iconSrc} alt="" width={32} height={32} className="size-8 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-none">{service.name}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {needsAuthorization ? 'Authorization required to create playlists' : service.description}
              </p>
            </div>
            {needsAuthorization && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={state.isLoading}
                className="shrink-0"
                onClick={() => {
                  if (service.id === 'Deezer') {
                    void handleDeezerAuthorization();
                  } else {
                    void handleAppleMusicAuthorization();
                  }
                }}
              >
                <PendingLabel
                  pending={state.isLoading}
                  label={<>Authorize<span className="sr-only"> {service.name}</span></>}
                  pendingLabel="Authorizing…"
                />
              </Button>
            )}
            <span className="relative grid shrink-0 place-items-center">
              <Loader2
                aria-hidden
                className={cn('pointer-events-none col-start-1 row-start-1 size-5 animate-spin text-muted-foreground transition-opacity', state.isLoading ? 'opacity-100' : 'opacity-0')}
              />
              <Switch
                checked={state.isSelected}
                onCheckedChange={() => handleToggle(service.id)}
                disabled={state.isLoading}
                aria-label={`Toggle ${service.name}`}
                data-testid={`music-service-toggle-${service.id.toLowerCase()}`}
                className={cn('col-start-1 row-start-1 transition-opacity', state.isLoading ? 'opacity-0' : 'opacity-100')}
              />
            </span>
          </div>
        );
      })}
    </>
  );
}

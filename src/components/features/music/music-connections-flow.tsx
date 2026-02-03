'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { platformConnectService } from '@/services/platform-connect';

interface PlatformState {
  isSelected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  addedAt?: string;
}

type ServiceId = 'Spotify' | 'AppleMusic' | 'Deezer';

const MUSIC_SERVICES = [
  {
    id: 'Spotify' as ServiceId,
    name: 'Spotify',
    iconSrc: '/images/spotify_logo_colored.png',
    bgColor: 'bg-[#1DB954]',
    requiresAuth: false,
    description: 'Share music and create playlists',
  },
  {
    id: 'AppleMusic' as ServiceId,
    name: 'Apple Music',
    iconSrc: '/images/apple_music_logo_colored.png',
    bgColor: 'bg-gradient-to-br from-[#FA233B] to-[#FB5C74]',
    requiresAuth: true,
    description: 'Requires authorization for playlists',
  },
  {
    id: 'Deezer' as ServiceId,
    name: 'Deezer',
    iconSrc: '/images/deezer_logo_colored.png',
    bgColor: 'bg-black',
    requiresAuth: false,
    description: 'Share music from Deezer',
  },
];

interface MusicConnectionsFlowProps {
  className?: string;
  onConnectionChange?: (hasConnections: boolean) => void;
}

export function MusicConnectionsFlow({
  className = "",
  onConnectionChange
}: MusicConnectionsFlowProps) {
  const [platformStates, setPlatformStates] = useState<Record<ServiceId, PlatformState>>({
    Spotify: { isSelected: false, isAuthenticated: false, isLoading: false },
    AppleMusic: { isSelected: false, isAuthenticated: false, isLoading: false },
    Deezer: { isSelected: false, isAuthenticated: false, isLoading: false },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        console.log('MusicConnectionsFlow: Fetching preferences from API...');
        const response = await apiService.getPlatformPreferences();

        if (response.preferences) {
          const newStates: Record<ServiceId, PlatformState> = {
            Spotify: { isSelected: false, isAuthenticated: false, isLoading: false },
            AppleMusic: { isSelected: false, isAuthenticated: false, isLoading: false },
            Deezer: { isSelected: false, isAuthenticated: false, isLoading: false },
          };

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
          console.log('MusicConnectionsFlow: Loaded preferences:', newStates);

          const hasConnections = Object.values(newStates).some(s => s.isSelected);
          onConnectionChange?.(hasConnections);
        }
      } catch (error) {
        console.error('MusicConnectionsFlow: Failed to fetch preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [onConnectionChange]);

  const handleToggle = async (serviceId: ServiceId) => {
    const service = MUSIC_SERVICES.find(s => s.id === serviceId);
    if (!service) return;

    const currentState = platformStates[serviceId];
    const newIsSelected = !currentState.isSelected;

    // If turning on and requires auth (Apple Music), trigger auth flow
    if (newIsSelected && service.requiresAuth) {
      setPlatformStates(prev => ({
        ...prev,
        [serviceId]: { ...prev[serviceId], isLoading: true },
      }));

      try {
        const returnUrl = window.location.pathname;
        const success = await platformConnectService.connectAppleMusic(returnUrl);

        if (success) {
          // Save preference after successful auth
          const newSelectedPlatforms = Object.entries(platformStates)
            .filter(([id, state]) => state.isSelected || id === serviceId)
            .map(([id]) => id);

          await apiService.setPlatformPreferences(newSelectedPlatforms);

          setPlatformStates(prev => {
            const updated = {
              ...prev,
              [serviceId]: { isSelected: true, isAuthenticated: true, isLoading: false },
            };
            onConnectionChange?.(Object.values(updated).some(s => s.isSelected));
            return updated;
          });
          toast.success(`${service.name} connected!`);
        } else {
          setPlatformStates(prev => ({
            ...prev,
            [serviceId]: { ...prev[serviceId], isLoading: false },
          }));
          toast.error(`Failed to connect ${service.name}`, {
            description: 'Authorization was cancelled or failed.',
          });
        }
      } catch (error) {
        console.error(`Failed to connect ${service.name}:`, error);
        setPlatformStates(prev => ({
          ...prev,
          [serviceId]: { ...prev[serviceId], isLoading: false },
        }));
        toast.error(`Failed to connect ${service.name}`);
      }
      return;
    }

    // For Spotify/Deezer (or turning off Apple Music), just toggle the preference
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

      setPlatformStates(prev => {
        const updated = {
          ...prev,
          [serviceId]: {
            ...prev[serviceId],
            isSelected: newIsSelected,
            isLoading: false,
          },
        };
        onConnectionChange?.(Object.values(updated).some(s => s.isSelected));
        return updated;
      });

      if (newIsSelected) {
        toast.success(`${service.name} added to your profile`);
      } else {
        toast.info(`${service.name} removed from your profile`);
      }
    } catch (error) {
      console.error(`Failed to update ${service.name} preference:`, error);
      setPlatformStates(prev => ({
        ...prev,
        [serviceId]: { ...prev[serviceId], isLoading: false },
      }));
      toast.error(`Failed to update ${service.name}`);
    }
  };

  const selectedPlatforms = MUSIC_SERVICES.filter(s => platformStates[s.id].isSelected);
  const hasConnections = selectedPlatforms.length > 0;
  const hasUnselectedServices = selectedPlatforms.length < MUSIC_SERVICES.length;

  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Music Services</CardTitle>
              <CardDescription>Loading your preferences...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                ? "Streaming services on your profile"
                : "Select the streaming services you use"
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
              {hasUnselectedServices ? 'Add More' : 'Manage'}
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
              {selectedPlatforms.map(service => (
                <Badge key={service.id} variant="secondary" className="flex items-center gap-1.5 py-1 px-2">
                  <Image
                    src={service.iconSrc}
                    alt={service.name}
                    width={16}
                    height={16}
                    className="rounded-sm"
                  />
                  {service.name}
                </Badge>
              ))}
            </div>
            {hasUnselectedServices && (
              <p className="text-sm text-muted-foreground">
                Click &quot;Add More&quot; to add additional streaming services
              </p>
            )}
          </div>
        )}

        {/* Full Platform List */}
        {(!hasConnections || isExpanded) && (
          <div className="space-y-3">
            {MUSIC_SERVICES.map(service => {
              const state = platformStates[service.id];

              return (
                <div
                  key={service.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    state.isSelected ? 'bg-green-500/5 border-green-500/30' : 'bg-muted/50 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${service.bgColor} flex items-center justify-center p-1.5`}>
                      <Image
                        src={service.iconSrc}
                        alt={service.name}
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                        {state.isSelected && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Switch
                        checked={state.isSelected}
                        onCheckedChange={() => handleToggle(service.id)}
                        disabled={state.isLoading}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

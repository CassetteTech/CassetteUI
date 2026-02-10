'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Music, Check, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { platformConnectService } from '@/services/platform-connect';
import { apiService } from '@/services/api';
import { Switch } from '@/components/ui/switch';

interface FormData {
  username: string;
  displayName: string;
  avatarFile: File | null;
}

interface ConnectMusicStepProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface PlatformState {
  isSelected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const MUSIC_SERVICES = [
  {
    id: 'Spotify' as const,
    name: 'Spotify',
    iconSrc: '/images/spotify_logo_colored.png',
    description: 'Add Spotify to your profile',
    bgColor: 'bg-[#1DB954]',
    requiresAuth: false,
  },
  {
    id: 'AppleMusic' as const,
    name: 'Apple Music',
    iconSrc: '/images/apple_music_logo_colored.png',
    description: 'Connect to create playlists',
    bgColor: 'bg-gradient-to-br from-[#FA233B] to-[#FB5C74]',
    requiresAuth: true,
  },
  {
    id: 'Deezer' as const,
    name: 'Deezer',
    iconSrc: '/images/deezer_logo_colored.png',
    description: 'Add Deezer to your profile',
    bgColor: 'bg-black',
    requiresAuth: false,
  },
];

type ServiceId = 'Spotify' | 'AppleMusic' | 'Deezer';

export function ConnectMusicStep({
  onBack,
  onNext,
  isLastStep,
}: ConnectMusicStepProps) {
  const [platformStates, setPlatformStates] = useState<Record<ServiceId, PlatformState>>({
    Spotify: { isSelected: false, isAuthenticated: false, isLoading: false },
    AppleMusic: { isSelected: false, isAuthenticated: false, isLoading: false },
    Deezer: { isSelected: false, isAuthenticated: false, isLoading: false },
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Fetch existing preferences and auth status on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
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
              };
            }
          });

          setPlatformStates(newStates);
        }
      } catch (error) {
        console.error('Failed to fetch platform preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    }
    fetchPreferences();
  }, []);

  // Check URL params for connection success (after OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spotifyConnected = params.get('spotify_connected');
    const appleMusicConnected = params.get('applemusic_connected');

    if (spotifyConnected === 'true') {
      setPlatformStates(prev => ({
        ...prev,
        Spotify: { ...prev.Spotify, isSelected: true, isAuthenticated: true },
      }));
      toast.success('Spotify connected!');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (appleMusicConnected === 'true') {
      setPlatformStates(prev => ({
        ...prev,
        AppleMusic: { ...prev.AppleMusic, isSelected: true, isAuthenticated: true },
      }));
      toast.success('Apple Music connected!');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
          await apiService.setPlatformPreferences([
            ...Object.entries(platformStates)
              .filter(([id, state]) => state.isSelected && id !== serviceId)
              .map(([id]) => id),
            serviceId,
          ]);

          setPlatformStates(prev => ({
            ...prev,
            [serviceId]: { isSelected: true, isAuthenticated: true, isLoading: false },
          }));
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
        const message = error instanceof Error ? error.message : 'Please try again.';
        toast.error(`Failed to connect ${service.name}`, {
          description: message,
        });
      }
      return;
    }

    // For Spotify/Deezer, just toggle the preference
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
      console.error(`Failed to update ${service.name} preference:`, error);
      setPlatformStates(prev => ({
        ...prev,
        [serviceId]: { ...prev[serviceId], isLoading: false },
      }));
      toast.error(`Failed to update ${service.name}`);
    }
  };

  const selectedCount = Object.values(platformStates).filter(s => s.isSelected).length;

  const handlePrimaryAction = () => {
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center text-muted-foreground mb-6">
        <p>Select the streaming services you use.</p>
        <p className="text-xs mt-1 text-muted-foreground/70">You can always change these later in settings</p>
      </div>

      {isLoadingPreferences ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {MUSIC_SERVICES.map((service, index) => {
            const state = platformStates[service.id];

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`p-4 transition-all duration-200 ${state.isSelected ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Service Icon */}
                      <div className={`w-12 h-12 rounded-lg ${service.bgColor} flex items-center justify-center text-white flex-shrink-0 overflow-hidden p-2`}>
                        <Image
                          src={service.iconSrc}
                          alt={service.name}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>

                      {/* Service Info */}
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">{service.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{service.description}</p>
                      </div>
                    </div>

                    {/* Toggle/Status */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {state.isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          {state.isSelected && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                          <Switch
                            checked={state.isSelected}
                            onCheckedChange={() => handleToggle(service.id)}
                            disabled={state.isLoading}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Success Message */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  {selectedCount === 1
                    ? 'Great! You\'ve selected 1 streaming service.'
                    : `Great! You've selected ${selectedCount} streaming services.`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          {selectedCount === 0 && (
            <Button
              variant="ghost"
              onClick={handlePrimaryAction}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
          <Button
            onClick={handlePrimaryAction}
            className="px-8 gap-2"
          >
            <Music className="w-4 h-4" />
            {isLastStep ? 'Finish Setup' : 'Next'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

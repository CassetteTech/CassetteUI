'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Music, Check, ExternalLink, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { platformConnectService, type PlatformKey } from '@/services/platform-connect';
import { apiService } from '@/services/api';

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


const MUSIC_SERVICES = [
  {
    id: 'spotify' as PlatformKey,
    name: 'Spotify',
    iconSrc: '/images/spotify_logo_colored.png',
    description: 'Connect to share and discover music',
    bgColor: 'bg-[#1DB954]',
  },
  {
    id: 'appleMusic' as PlatformKey,
    name: 'Apple Music',
    iconSrc: '/images/apple_music_logo_colored.png',
    description: 'Connect to share playlists',
    bgColor: 'bg-gradient-to-br from-[#FA233B] to-[#FB5C74]',
  },
  {
    id: 'deezer' as PlatformKey,
    name: 'Deezer',
    iconSrc: '/images/deezer_logo_colored.png',
    description: 'Connect for music sharing',
    bgColor: 'bg-black',
  },
];

export function ConnectMusicStep({
  onBack,
  onNext,
  isLastStep,
}: ConnectMusicStepProps) {
  const [connectedServices, setConnectedServices] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);

  // Fetch existing connections on mount
  useEffect(() => {
    async function fetchConnections() {
      try {
        const response = await apiService.getMusicConnections();
        if (response.services && response.services.length > 0) {
          setConnectedServices(response.services);
        }
      } catch (error) {
        console.error('Failed to fetch music connections:', error);
      } finally {
        setIsLoadingConnections(false);
      }
    }
    fetchConnections();
  }, []);

  // Check URL params for connection success (after OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spotifyConnected = params.get('spotify_connected');
    const appleMusicConnected = params.get('applemusic_connected');

    if (spotifyConnected === 'true') {
      setConnectedServices(prev => [...new Set([...prev, 'spotify'])]);
      toast.success('Spotify connected!', {
        description: 'Your account has been linked successfully.',
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (appleMusicConnected === 'true') {
      setConnectedServices(prev => [...new Set([...prev, 'appleMusic'])]);
      toast.success('Apple Music connected!', {
        description: 'Your account has been linked successfully.',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async (serviceId: PlatformKey) => {
    const service = MUSIC_SERVICES.find(s => s.id === serviceId);
    if (!service) return;

    setIsConnecting(serviceId);

    try {
      // Store return URL so we come back to onboarding after OAuth
      const returnUrl = window.location.pathname;

      switch (serviceId) {
        case 'spotify':
          // This will redirect to Spotify OAuth
          await platformConnectService.connectSpotify(returnUrl);
          // Note: Page will redirect, so we won't reach here
          break;

        case 'appleMusic':
          // Apple Music uses a modal, not redirect
          const success = await platformConnectService.connectAppleMusic(returnUrl);
          if (success) {
            setConnectedServices(prev => [...prev, serviceId]);
            toast.success(`${service.name} connected!`, {
              description: 'Your account has been linked successfully.',
            });
          } else {
            toast.error(`Failed to connect ${service.name}`, {
              description: 'Authorization was cancelled or failed.',
            });
          }
          break;

        case 'deezer':
          // Deezer not yet implemented
          toast.info('Coming Soon', {
            description: 'Deezer connection will be available soon.',
          });
          break;
      }
    } catch (error) {
      console.error(`Failed to connect ${service.name}:`, error);
      toast.error(`Failed to connect ${service.name}`, {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (serviceId: string) => {
    const service = MUSIC_SERVICES.find(s => s.id === serviceId);
    if (!service) return;

    try {
      await apiService.disconnectMusicService(serviceId);
      setConnectedServices(prev => prev.filter(id => id !== serviceId));
      toast.info(`${service.name} disconnected`);
    } catch (error) {
      console.error(`Failed to disconnect ${service.name}:`, error);
      toast.error(`Failed to disconnect ${service.name}`);
    }
  };

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
        <p>Connect your music streaming services to enhance your experience.</p>
        <p className="text-xs mt-1 text-muted-foreground/70">You can always add these later in settings</p>
      </div>

      {isLoadingConnections ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {MUSIC_SERVICES.map((service, index) => {
            const isConnected = connectedServices.includes(service.id);
            const isLoading = isConnecting === service.id;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`p-4 transition-all duration-200 ${isConnected ? 'border-green-500/50 bg-green-500/5' : ''}`}>
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

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      <AnimatePresence mode="wait">
                        {isConnected ? (
                          <motion.div
                            key="connected"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="flex items-center gap-2"
                          >
                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                              <Check className="w-4 h-4" />
                              Connected
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDisconnect(service.id)}
                              className="text-muted-foreground text-xs h-7 px-2"
                            >
                              Disconnect
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="connect"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConnect(service.id)}
                              disabled={isLoading}
                              className="gap-1.5"
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="w-4 h-4" />
                                  Connect
                                </>
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
        {connectedServices.length > 0 && (
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
                  {connectedServices.length === 1
                    ? 'Great! You\'ve connected 1 music service.'
                    : `Great! You've connected ${connectedServices.length} music services.`}
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
          {connectedServices.length === 0 && (
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

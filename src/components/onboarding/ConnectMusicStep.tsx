'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Music, Check, ExternalLink } from 'lucide-react';

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
  onFinish: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const MUSIC_SERVICES = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎵',
    description: 'Connect your Spotify account to share and discover music',
    color: 'bg-green-500',
  },
  {
    id: 'appleMusic',
    name: 'Apple Music',
    icon: '🍎',
    description: 'Connect your Apple Music account to share playlists',
    color: 'bg-gray-800',
  },
  {
    id: 'deezer',
    name: 'Deezer',
    icon: '🎧',
    description: 'Connect your Deezer account for music sharing',
    color: 'bg-orange-500',
  },
];

export function ConnectMusicStep({
  onBack,
  onFinish,
}: ConnectMusicStepProps) {
  const [connectedServices, setConnectedServices] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const handleConnect = async (serviceId: string) => {
    setIsConnecting(serviceId);
    
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!connectedServices.includes(serviceId)) {
        setConnectedServices(prev => [...prev, serviceId]);
      }
    } catch (error) {
      console.error(`Failed to connect ${serviceId}:`, error);
    } finally {
      setIsConnecting(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="text-center text-muted-foreground mb-6">
        <p>Connect your music streaming services to enhance your Cassette experience.</p>
        <p className="text-sm mt-1">You can always add these later in your settings.</p>
      </div>

      <div className="space-y-3">
        {MUSIC_SERVICES.map((service) => {
          const isConnected = connectedServices.includes(service.id);
          const isLoading = isConnecting === service.id;

          return (
            <Card key={service.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg ${service.color} flex items-center justify-center text-white text-xl`}>
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(service.id)}
                      disabled={isLoading}
                      className="flex items-center space-x-1"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      <span>{isLoading ? 'Connecting...' : 'Connect'}</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {connectedServices.length > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Great! You&apos;ve connected {connectedServices.length} music service{connectedServices.length > 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          onClick={onFinish}
          className="px-8"
        >
          <Music className="w-4 h-4 mr-2" />
          Finish Setup
        </Button>
      </div>
    </div>
  );
}

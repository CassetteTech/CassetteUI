'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserBio, ConnectedService } from '@/types';
import { profileService } from '@/services/profile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';

const editProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

interface EditProfileFormProps {
  initialData?: UserBio;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditProfileFormComponent({ 
  initialData, 
  onSuccess, 
  onCancel 
}: EditProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveOnCooldown, setIsSaveOnCooldown] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [connectedServices, setConnectedServices] = useState<ConnectedService[]>(
    initialData?.connectedServices || []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      fullName: initialData?.displayName || '',
      username: initialData?.username || '',
      bio: initialData?.bio || '',
      avatarUrl: initialData?.avatarUrl || '',
    },
  });

  const watchedUsername = watch('username');

  useEffect(() => {
    const validateUsername = async (username: string) => {
      if (username === initialData?.username) {
        setUsernameError(null);
        return true;
      }

      const isAvailable = await profileService.checkUsernameAvailability(username);
      if (!isAvailable) {
        setUsernameError('Username already exists. Please choose a different one.');
        return false;
      }
      
      setUsernameError(null);
      return true;
    };

    const timeoutId = setTimeout(() => {
      if (watchedUsername && watchedUsername.length >= 3) {
        validateUsername(watchedUsername);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedUsername, initialData?.username]);

  const startCooldown = () => {
    setIsSaveOnCooldown(true);
    setTimeout(() => setIsSaveOnCooldown(false), 3000);
  };

  const onSubmit = async (data: EditProfileForm) => {
    if (isSaveOnCooldown) return;

    if (usernameError) {
      startCooldown();
      return;
    }

    // Check username availability one more time before submitting
    if (data.username !== initialData?.username) {
      const isAvailable = await profileService.checkUsernameAvailability(data.username);
      if (!isAvailable) {
        setUsernameError('Username already exists. Please choose a different one.');
        startCooldown();
        return;
      }
    }

    setIsLoading(true);
    
    try {
      await profileService.updateProfile({
        username: data.username,
        fullName: data.fullName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error updating profile:', error);
      startCooldown();
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = () => {
    // TODO: Implement image upload functionality
    alert('Image upload functionality coming soon');
  };

  const addService = (serviceType: string) => {
    const newService: ConnectedService = {
      serviceType,
      connectedAt: new Date().toISOString(),
    };
    setConnectedServices(prev => [...prev, newService]);
  };

  const removeService = (serviceType: string) => {
    setConnectedServices(prev => prev.filter(service => service.serviceType !== serviceType));
  };

  const availableServices = [
    'Spotify',
    'Apple Music',
    'YouTube Music',
    'Tidal',
    'Deezer',
  ].filter(service => !connectedServices.some(cs => cs.serviceType === service));

  return (
    <div className="max-w-md mx-auto p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white/20">
              <AvatarImage
                src={watch('avatarUrl') || '/images/default-avatar.png'}
                alt="Profile"
              />
              <AvatarFallback>P</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={handleImageUpload}
              className="absolute bottom-0 right-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-[#1a1a1a] hover:bg-green-600 transition-colors"
            >
              <Image
                src="/images/ic_edit.png"
                alt="Edit"
                width={16}
                height={16}
                className="invert"
              />
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <TextField
            label="Full Name"
            {...register('fullName')}
            error={errors.fullName?.message}
            className="w-full"
          />

          <TextField
            label="Username"
            {...register('username')}
            error={errors.username?.message || usernameError || undefined}
            className="w-full"
          />

          <div className="w-full">
            <label className="block text-sm font-bold text-white mb-1 font-atkinson tracking-wide">
              Bio
            </label>
            <textarea
              {...register('bio')}
              rows={5}
              className="w-full px-3 py-2 rounded-md border-2 transition-colors duration-200 font-atkinson text-sm font-normal tracking-wide placeholder:text-gray-400 placeholder:font-atkinson placeholder:font-normal focus:outline-none focus:ring-0 border-white/20 focus:border-red-500 bg-[#2a2a2a] text-white"
              placeholder="Tell us about yourself..."
            />
            {errors.bio && (
              <p className="mt-1 text-sm font-normal text-red-500 font-atkinson">
                {errors.bio.message}
              </p>
            )}
          </div>
        </div>

        {/* Connected Services */}
        <Card className="p-4 bg-[#1a1a1a] border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Connected Services</h3>
            {availableServices.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addService(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-[#2a2a2a] text-white text-sm rounded px-2 py-1 border border-white/20"
              >
                <option value="">Add Service</option>
                {availableServices.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="space-y-2">
            {connectedServices.map((service, index) => (
              <div
                key={`${service.serviceType}-${index}`}
                className="flex items-center justify-between p-2 bg-[#2a2a2a] rounded"
              >
                <div className="flex items-center gap-2">
                  <ServiceIcon serviceType={service.serviceType} />
                  <span className="text-white text-sm">{service.serviceType}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeService(service.serviceType)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Image
                    src="/images/ic_delete.png"
                    alt="Remove"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-transparent border border-white/20 text-white py-3 px-6 rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isLoading || isSaveOnCooldown}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ServiceIcon({ serviceType }: { serviceType: string }) {
  const getServiceIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      'spotify': '/images/social_images/ic_spotify.png',
      'apple music': '/images/social_images/ic_apple.png',
      'youtube music': '/images/social_images/ic_yt_music.png',
      'tidal': '/images/social_images/ic_tidal.png',
      'deezer': '/images/social_images/ic_deezer.png',
    };
    
    return iconMap[type.toLowerCase()] || '/images/social_images/ic_spotify.png';
  };

  const getServiceColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'spotify': 'bg-green-500',
      'apple music': 'bg-gray-700',
      'youtube music': 'bg-red-500',
      'tidal': 'bg-blue-500',
      'deezer': 'bg-purple-500',
    };
    
    return colorMap[type.toLowerCase()] || 'bg-gray-500';
  };

  return (
    <div className={`w-6 h-6 rounded-full p-1 ${getServiceColor(serviceType)}`}>
      <Image
        src={getServiceIcon(serviceType)}
        alt={serviceType}
        width={16}
        height={16}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
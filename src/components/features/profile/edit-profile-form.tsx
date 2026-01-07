'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserBio } from '@/types';
import { profileService } from '@/services/profile';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
        displayName: data.fullName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      });

      // Refresh the auth store with updated user data (including bio)
      const updatedUser = await authService.getCurrentUser();
      if (updatedUser) {
        useAuthStore.getState().setUser(updatedUser);
      }

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


  return (
    <div className="max-w-xl mx-auto p-6 w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="w-36 h-36 border-4 border-white/20">
              <AvatarImage
                src={watch('avatarUrl')}
                alt="Profile"
              />
              <AvatarFallback className="text-xl">P</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={handleImageUpload}
              className="absolute bottom-0 right-0 w-11 h-11 bg-green-500 rounded-full flex items-center justify-center border-4 border-[#1a1a1a] hover:bg-green-600 transition-colors"
            >
              <Image
                src="/images/ic_edit.png"
                alt="Edit"
                width={18}
                height={18}
                className="invert"
              />
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <TextField
            label="Full Name"
            inputSize="lg"
            {...register('fullName')}
            error={errors.fullName?.message}
            className="w-full"
          />

          <TextField
            label="Username"
            inputSize="lg"
            {...register('username')}
            error={errors.username?.message || usernameError || undefined}
            className="w-full"
          />

          <div className="w-full">
            <label className="block text-sm font-bold text-text-primary mb-2 font-atkinson tracking-wide">
              Bio
            </label>
            <textarea
              {...register('bio')}
              rows={5}
              className="w-full px-4 py-3 rounded-md border-2 transition-colors duration-200 font-atkinson text-sm font-normal tracking-wide placeholder:text-text-hint placeholder:font-atkinson placeholder:font-normal focus:outline-none focus:ring-0 border-text-hint focus:border-primary text-foreground bg-transparent"
              placeholder="Tell us about yourself..."
            />
            {errors.bio && (
              <p className="mt-1 text-sm font-normal text-red-500 font-atkinson">
                {errors.bio.message}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-transparent border border-white/20 text-white py-3.5 px-6 rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading || isSaveOnCooldown}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3.5 px-6 rounded-lg font-medium disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}


'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserBio } from '@/types';
import { profileService } from '@/services/profile';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useInvalidateProfileQueries } from '@/hooks/use-profile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TextField } from '@/components/ui/text-field';
import { DeleteAccountModal } from './delete-account-modal';
import { AlertTriangle } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
    reset,
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
  const avatarUrl = useWatch({ control, name: 'avatarUrl' });
  const activeAvatarUrl = avatarPreviewUrl || avatarUrl;
  const { invalidateBio } = useInvalidateProfileQueries();
  const normalizeUsername = (value: string) => value.trim().toLowerCase();

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    const validateUsername = async (username: string) => {
      if (normalizeUsername(username) === normalizeUsername(initialData?.username || '')) {
        setUsernameError(null);
        return true;
      }

      const isAvailable = await profileService.checkUsernameAvailability(
        normalizeUsername(username),
      );
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

  useEffect(() => {
    reset({
      fullName: initialData?.displayName || '',
      username: initialData?.username || '',
      bio: initialData?.bio || '',
      avatarUrl: initialData?.avatarUrl || '',
    });
    setAvatarError(null);
    setUsernameError(null);
    setAvatarFile(null);
    setAvatarPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, [initialData, reset]);

  const startCooldown = () => {
    setIsSaveOnCooldown(true);
    setTimeout(() => setIsSaveOnCooldown(false), 3000);
  };

  const onSubmit = async (data: EditProfileForm) => {
    if (isSaveOnCooldown) return;
    const normalizedUsername = normalizeUsername(data.username);

    if (usernameError) {
      startCooldown();
      return;
    }

    // Check username availability one more time before submitting
    if (normalizedUsername !== normalizeUsername(initialData?.username || '')) {
      const isAvailable = await profileService.checkUsernameAvailability(
        normalizedUsername,
      );
      if (!isAvailable) {
        setUsernameError('Username already exists. Please choose a different one.');
        startCooldown();
        return;
      }
    }

    setIsLoading(true);

    try {
      await profileService.updateProfile({
        username: normalizedUsername,
        displayName: data.fullName,
        bio: data.bio,
        avatarUrl: avatarFile ? undefined : data.avatarUrl,
        avatarFile,
      });

      // Refresh the auth store with updated user data (including bio)
      const updatedUser = await authService.getCurrentUser();
      if (updatedUser) {
        useAuthStore.getState().setUser(updatedUser);
      }

      if (initialData?.id) invalidateBio(initialData.id);
      if (initialData?.username) invalidateBio(initialData.username);

      onSuccess();
    } catch (error) {
      console.error('Error updating profile:', error);
      startCooldown();
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setAvatarError(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError('Please use a JPEG, PNG, or WebP image.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAvatarError('File size must be 5MB or less.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setAvatarError(null);
    setAvatarFile(file);

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(previewUrl);
  };


  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="w-24 h-24 sm:w-36 sm:h-36 border-4 border-border/20">
              <AvatarImage
                src={activeAvatarUrl}
                alt="Profile"
              />
              <AvatarFallback className="text-xl">P</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={handleImageUpload}
              className="absolute bottom-0 right-0 w-9 h-9 sm:w-11 sm:h-11 bg-green-500 rounded-full flex items-center justify-center border-4 border-background hover:bg-green-600 transition-colors"
            >
              <Image
                src="/images/ic_edit.png"
                alt="Edit"
                width={18}
                height={18}
                className="invert"
              />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          JPEG, PNG, or WebP. Max 5MB.
        </div>
        {avatarError && (
          <p className="text-center text-sm font-normal text-red-500 font-atkinson">
            {avatarError}
          </p>
        )}

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
            className="flex-1 bg-transparent border border-border text-foreground py-3.5 px-6 rounded-lg font-medium hover:bg-muted/50 transition-colors"
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

        {/* Danger Zone */}
        <div className="mt-8 pt-6 sm:mt-12 sm:pt-8">
          <div className="rounded-lg border border-[#FF004C]/30 bg-[#FF004C]/5 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF004C]/10">
                <AlertTriangle className="h-5 w-5 text-[#FF004C]" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-[#FF004C]">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-2 bg-transparent border border-[#FF004C]/50 text-[#FF004C] py-2 px-4 rounded-md text-sm font-medium hover:bg-[#FF004C]/10 hover:border-[#FF004C] transition-all"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        username={initialData?.username || ''}
      />
    </div>
  );
}


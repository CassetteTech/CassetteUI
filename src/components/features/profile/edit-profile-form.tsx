'use client';

import { useState, useEffect, useRef } from 'react';
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
import { AlertTriangle, Camera, Globe2, Lock } from 'lucide-react';
import { AvatarCropDialog } from '@/components/shared/avatar-crop-dialog';

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
  likedPostsPrivacy: z.enum(['public', 'private']),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

interface EditProfileFormProps {
  initialData?: UserBio;
  onSuccess: () => void;
  onCancel: () => void;
  footerContent?: React.ReactNode;
}

export function EditProfileFormComponent({ 
  initialData, 
  onSuccess, 
  onCancel,
  footerContent,
}: EditProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveOnCooldown, setIsSaveOnCooldown] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
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
      likedPostsPrivacy: initialData?.likedPostsPrivacy || initialData?.likedPostsVisibility || (initialData?.showLikedPosts === false ? 'private' : 'public'),
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
      likedPostsPrivacy: initialData?.likedPostsPrivacy || initialData?.likedPostsVisibility || (initialData?.showLikedPosts === false ? 'private' : 'public'),
    });
    setAvatarError(null);
    setUsernameError(null);
    setAvatarFile(null);
    setPendingAvatarFile(null);
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
        likedPostsPrivacy: data.likedPostsPrivacy,
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
    setPendingAvatarFile(file);
  };

  const handleAvatarCropCancel = () => {
    setPendingAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarCropApply = async (croppedFile: File) => {
    setPendingAvatarFile(null);
    setAvatarFile(croppedFile);

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(croppedFile);
    setAvatarPreviewUrl(previewUrl);
  };


  const bioValue = watch('bio') || '';

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-5 border-b border-border">
          <div className="relative shrink-0">
            <Avatar className="w-16 h-16 border border-border">
              <AvatarImage src={activeAvatarUrl} alt="Profile" />
              <AvatarFallback className="text-lg">
                {(initialData?.displayName || initialData?.username || 'P').slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              data-testid="profile-avatar-file-input"
              className="hidden"
            />
          </div>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={handleImageUpload}
              data-testid="profile-avatar-choose"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              Change photo
            </button>
            <p className="text-xs text-muted-foreground mt-1.5">JPEG, PNG, or WebP. Max 5MB.</p>
            {avatarError && (
              <p className="text-xs text-destructive mt-1">{avatarError}</p>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <TextField
            label="Full name"
            {...register('fullName')}
            error={errors.fullName?.message}
            className="w-full bg-card force-light-surface text-foreground"
          />

          <TextField
            label="Username"
            {...register('username')}
            error={errors.username?.message || usernameError || undefined}
            className="w-full bg-card force-light-surface text-foreground"
          />

          <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="profile-bio"
                className="text-sm font-medium text-foreground"
              >
                Bio
              </label>
              <span className="text-xs text-muted-foreground">{bioValue.length}/200</span>
            </div>
            <textarea
              id="profile-bio"
              {...register('bio')}
              rows={3}
              maxLength={200}
              className="w-full rounded-md border border-border bg-card force-light-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="Tell us about yourself"
            />
            {errors.bio && (
              <p className="mt-1 text-xs text-destructive">{errors.bio.message}</p>
            )}
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Liked posts visibility
            </label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {[
                { value: 'public', label: 'Public', Icon: Globe2 },
                { value: 'private', label: 'Private', Icon: Lock },
              ].map(({ value, label, Icon }) => (
                <label
                  key={value}
                  className="relative flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card force-light-surface px-3 py-2 text-sm text-foreground hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary transition-colors"
                >
                  <input
                    type="radio"
                    value={value}
                    {...register('likedPostsPrivacy')}
                    className="sr-only"
                  />
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Controls whether other users can see your Liked tab.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-transparent border border-border text-foreground py-2 px-4 rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || isSaveOnCooldown}
            data-testid="profile-save"
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving…' : 'Save'}
          </button>
        </div>

        {footerContent}

        {/* Danger Zone */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-1">Danger zone</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 border border-destructive/50 text-destructive py-1.5 px-3 rounded-md text-sm font-medium hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Delete account
          </button>
        </div>
      </form>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        username={initialData?.username || ''}
      />
      <AvatarCropDialog
        open={pendingAvatarFile !== null}
        file={pendingAvatarFile}
        onApply={handleAvatarCropApply}
        onCancel={handleAvatarCropCancel}
      />
    </div>
  );
}

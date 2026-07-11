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
import { appLogger } from '@/lib/observability/logger';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_USERNAME_LENGTH = 30;
const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_BIO_LENGTH = 200;

const editProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(MAX_DISPLAY_NAME_LENGTH, `Full name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters long')
    .max(MAX_USERNAME_LENGTH, `Username must be ${MAX_USERNAME_LENGTH} characters or less`)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string().max(MAX_BIO_LENGTH, `Bio must be ${MAX_BIO_LENGTH} characters or less`).optional(),
  avatarUrl: z.string().optional(),
  likedPostsPrivacy: z.enum(['public', 'private']),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;
type UsernameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

// Mono annotation label — the form's editorial voice; shared TextField keeps its
// own label style for auth flows, so fields here pass `id` and label locally.
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5"
    >
      {children}
    </label>
  );
}

interface EditProfileFormProps {
  initialData?: UserBio;
  onSuccess: (username: string) => void;
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
  const [usernameStatus, setUsernameStatus] = useState<UsernameAvailabilityStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const usernameError = usernameStatus === 'taken'
    ? 'Username already exists. Please choose a different one.'
    : usernameStatus === 'error'
      ? 'Could not check username availability. Try saving again.'
      : null;

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    const normalizedUsername = normalizeUsername(watchedUsername || '');
    const initialUsername = normalizeUsername(initialData?.username || '');

    if (normalizedUsername === initialUsername) {
      setUsernameStatus('idle');
      return;
    }

    if (
      normalizedUsername.length < 3 ||
      normalizedUsername.length > MAX_USERNAME_LENGTH ||
      !/^[a-z0-9_]+$/.test(normalizedUsername)
    ) {
      setUsernameStatus('idle');
      return;
    }

    let isCancelled = false;
    setUsernameStatus('idle');
    const timeoutId = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const isAvailable = await profileService.checkUsernameAvailability(normalizedUsername);
        if (!isCancelled) {
          setUsernameStatus(isAvailable ? 'available' : 'taken');
        }
      } catch {
        if (!isCancelled) {
          setUsernameStatus('error');
        }
      }
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
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
    setUsernameStatus('idle');
    setSaveError(null);
    setAvatarFile(null);
    setPendingAvatarFile(null);
    setAvatarPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, [initialData, reset]);

  const onSubmit = async (data: EditProfileForm) => {
    if (isLoading || usernameStatus === 'checking' || usernameStatus === 'taken') return;
    const normalizedUsername = normalizeUsername(data.username);
    setIsLoading(true);
    setSaveError(null);

    try {
      // Availability can change after the debounced check, so verify once at submit.
      if (normalizedUsername !== normalizeUsername(initialData?.username || '')) {
        try {
          const isAvailable = await profileService.checkUsernameAvailability(normalizedUsername);
          if (!isAvailable) {
            setUsernameStatus('taken');
            return;
          }
        } catch {
          setUsernameStatus('error');
          setSaveError('Could not verify username availability. Check your connection and try again.');
          return;
        }
      }

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

      onSuccess(normalizedUsername);
    } catch (error) {
      appLogger.error('profile_update_failed', { error, route: '/profile/edit' });
      setSaveError(getUserFacingApiErrorMessage(error, 'Failed to save profile. Please try again.'));
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

    if (file.size > MAX_SOURCE_FILE_SIZE) {
      setAvatarError('Please choose an image smaller than 20MB.');
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
    if (croppedFile.size > MAX_UPLOAD_FILE_SIZE) {
      throw new Error('Cropped avatar must be 5MB or less.');
    }

    setPendingAvatarFile(null);
    setAvatarError(null);
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
        <div className="flex items-center gap-4 pb-5 border-b border-border/70">
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

        {/* Identity */}
        <div className="space-y-4">
          <div className="w-full">
            <FieldLabel htmlFor="profile-full-name">Full name</FieldLabel>
            <TextField
              id="profile-full-name"
              {...register('fullName')}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              error={errors.fullName?.message}
              className="w-full bg-field text-foreground"
            />
          </div>

          <div className="w-full">
            <FieldLabel htmlFor="profile-username">Username</FieldLabel>
            <TextField
              id="profile-username"
              {...register('username')}
              maxLength={MAX_USERNAME_LENGTH}
              error={errors.username?.message || usernameError || undefined}
              className="w-full bg-field text-foreground"
            />
            {(usernameStatus === 'checking' || usernameStatus === 'available') && (
              <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
                {usernameStatus === 'checking' ? 'Checking availability…' : 'Username is available.'}
              </p>
            )}
          </div>

          <div className="w-full">
            <div className="flex items-baseline justify-between">
              <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
              <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
                {bioValue.length}/{MAX_BIO_LENGTH}
              </span>
            </div>
            <textarea
              id="profile-bio"
              {...register('bio')}
              rows={3}
              maxLength={MAX_BIO_LENGTH}
              className="w-full rounded-md border border-border bg-field px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="Tell us about yourself"
            />
            {errors.bio && (
              <p className="mt-1 text-xs text-destructive">{errors.bio.message}</p>
            )}
          </div>
        </div>

        {/* Privacy */}
        <div className="w-full border-t border-border/70 pt-5">
          <FieldLabel>Liked posts visibility</FieldLabel>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {[
              { value: 'public', label: 'Public', Icon: Globe2 },
              { value: 'private', label: 'Private', Icon: Lock },
            ].map(({ value, label, Icon }) => (
              <label
                key={value}
                className="relative flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-field px-3 py-2 text-sm text-foreground hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary transition-colors"
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

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-border/70 pt-5">
          {saveError && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-border bg-transparent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || usernameStatus === 'checking' || usernameStatus === 'taken'}
              data-testid="profile-save"
              className="flex-1 rounded-md bg-primary px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground elev-1 transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {footerContent}

        {/* Danger Zone */}
        <div className="mt-8 pt-6 border-t border-border/70">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-destructive mb-1.5">
            Danger zone
          </h3>
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

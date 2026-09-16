'use client';

/** Profile settings form: photo, identity, links, privacy, account, and the
    danger zone as Studio-style sections, with one sticky save bar. */

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserBio } from '@/types';
import { profileService } from '@/services/profile';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useInvalidateProfileQueries } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StudioChip, StudioSection } from '@/components/features/curator/studio-shell';
import { DeleteAccountModal } from './delete-account-modal';
import { AlertTriangle, Globe2, Lock, Plus, X } from 'lucide-react';
import { AvatarCropDialog } from '@/components/shared/avatar-crop-dialog';
import { FileDropField } from '@/components/ui/file-drop-field';
import { appLogger } from '@/lib/observability/logger';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_USERNAME_LENGTH = 30;
const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_BIO_LENGTH = 200;
const MAX_PROFILE_LINKS = 5;
const MAX_PROFILE_LINK_LENGTH = 500;

// Mirrors the server rules: absolute http(s) URLs only. Bare domains get https:// prepended.
function normalizeProfileLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (withScheme.length > MAX_PROFILE_LINK_LENGTH) return null;
    return withScheme;
  } catch {
    return null;
  }
}

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

/** Field error line, linked to its control through aria-describedby. */
function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return <p id={id} role="alert" className="text-xs text-destructive">{children}</p>;
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
  const [links, setLinks] = useState<string[]>(initialData?.profileLinks ?? []);
  const [linksError, setLinksError] = useState<string | null>(null);

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
    setLinks(initialData?.profileLinks ?? []);
    setLinksError(null);
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

    const enteredLinks = links.map((l) => l.trim()).filter((l) => l.length > 0);
    const normalizedLinks = enteredLinks.map(normalizeProfileLink);
    if (normalizedLinks.some((l) => l === null)) {
      setLinksError('Each link must be a valid web address (e.g. instagram.com/yourname).');
      return;
    }
    setLinksError(null);

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
        // SAFETY: the null check above returned early, so every entry is a string.
        profileLinks: normalizedLinks as string[],
      });

      // Refresh the auth store with updated user data (including bio)
      const updatedUser = await authService.getCurrentUser();
      if (updatedUser) {
        useAuthStore.getState().setUser(updatedUser);
      }

      if (initialData?.id) void invalidateBio(initialData.id);
      if (initialData?.username) void invalidateBio(initialData.username);

      onSuccess(normalizedUsername);
    } catch (error) {
      appLogger.error('profile_update_failed', { error, route: '/profile/edit' });
      setSaveError(getUserFacingApiErrorMessage(error, 'Failed to save profile. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarFile = (file: File | null) => {
    if (!file) {
      setAvatarError(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError('Please use a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_SOURCE_FILE_SIZE) {
      setAvatarError('Please choose an image smaller than 20MB.');
      return;
    }
    setAvatarError(null);
    setPendingAvatarFile(file);
  };

  const handleAvatarCropCancel = () => setPendingAvatarFile(null);

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
  const fullNameError = errors.fullName?.message;
  const usernameFieldError = errors.username?.message || usernameError || undefined;
  const bioError = errors.bio?.message;
  const usernameChip = usernameStatus === 'checking'
    ? <StudioChip tone="neutral">Checking…</StudioChip>
    : usernameStatus === 'available'
      ? <StudioChip tone="positive">Available</StudioChip>
      : null;

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <StudioSection
          id="profile-photo"
          eyebrow="Profile"
          title="Photo"
          headingId="profile-photo-title"
          description="Shown on your page, your posts, and comments."
        >
          <FileDropField
            dropLabel="Drop a photo here"
            browseLabel="Choose photo"
            replaceLabel="Replace photo"
            browseTestId="profile-avatar-choose"
            hint="JPEG, PNG, or WebP up to 5 MB. You can crop it before it uploads."
            error={avatarError}
            onFile={handleAvatarFile}
            inputProps={{ accept: 'image/jpeg,image/png,image/webp', 'data-testid': 'profile-avatar-file-input' }}
            previewUrl={activeAvatarUrl || null}
            previewAlt="Your current profile photo"
          />
        </StudioSection>

        <StudioSection
          id="profile-identity"
          eyebrow="Profile"
          title="Identity"
          headingId="profile-identity-title"
          description="Your name and handle appear on every post. The bio sits under your photo."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">Full name</Label>
              <Input
                id="profile-full-name"
                {...register('fullName')}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                autoComplete="name"
                aria-invalid={fullNameError ? true : undefined}
                aria-describedby={fullNameError ? 'profile-full-name-error' : undefined}
              />
              {fullNameError && <FieldError id="profile-full-name-error">{fullNameError}</FieldError>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="profile-username">Username</Label>
                <span aria-live="polite">{usernameChip}</span>
              </div>
              <Input
                id="profile-username"
                {...register('username')}
                maxLength={MAX_USERNAME_LENGTH}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="font-mono"
                aria-invalid={usernameFieldError ? true : undefined}
                aria-describedby={usernameFieldError ? 'profile-username-error profile-username-help' : 'profile-username-help'}
              />
              {usernameFieldError && <FieldError id="profile-username-error">{usernameFieldError}</FieldError>}
              <p id="profile-username-help" className="text-xs text-muted-foreground">
                Letters, numbers, and underscores. Your page lives at cassette.tech/profile/your-username.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="profile-bio">Bio</Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {bioValue.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
              <Textarea
                id="profile-bio"
                {...register('bio')}
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                className="resize-none"
                placeholder="Tell us about yourself"
                aria-invalid={bioError ? true : undefined}
                aria-describedby={bioError ? 'profile-bio-error' : undefined}
              />
              {bioError && <FieldError id="profile-bio-error">{bioError}</FieldError>}
            </div>
          </div>
        </StudioSection>

        <StudioSection
          id="profile-links"
          eyebrow="Profile"
          title="Links"
          headingId="profile-links-title"
          description="Instagram, TikTok, Spotify, or anywhere else. Shown on your page and your curator card."
          chip={<span className="font-mono text-xs tabular-nums text-muted-foreground">{links.length}/{MAX_PROFILE_LINKS}</span>}
        >
          <div className="space-y-3">
            {links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="url"
                  value={link}
                  onChange={(e) => {
                    const next = [...links];
                    next[index] = e.target.value;
                    setLinks(next);
                  }}
                  maxLength={MAX_PROFILE_LINK_LENGTH}
                  placeholder="https://instagram.com/yourname"
                  aria-label={`Link ${index + 1}`}
                  aria-describedby={linksError ? 'profile-links-error' : undefined}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLinks(links.filter((_, i) => i !== index))}
                  aria-label={`Remove link ${index + 1}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X aria-hidden />
                </Button>
              </div>
            ))}
            {links.length === 0 && (
              <p className="text-sm text-muted-foreground">No links yet.</p>
            )}
            {links.length < MAX_PROFILE_LINKS && (
              <Button type="button" variant="outline" size="sm" onClick={() => setLinks([...links, ''])}>
                <Plus aria-hidden />
                Add link
              </Button>
            )}
            {linksError && <FieldError id="profile-links-error">{linksError}</FieldError>}
          </div>
        </StudioSection>

        <StudioSection
          id="profile-privacy"
          eyebrow="Profile"
          title="Privacy"
          headingId="profile-privacy-title"
          description="Controls whether other users can see your Liked tab."
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Liked posts visibility</legend>
            <div className="grid max-w-sm grid-cols-2 gap-2">
              {[
                { value: 'public', label: 'Public', Icon: Globe2 },
                { value: 'private', label: 'Private', Icon: Lock },
              ].map(({ value, label, Icon }) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:font-semibold has-[:checked]:text-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
                >
                  <input
                    type="radio"
                    value={value}
                    {...register('likedPostsPrivacy')}
                    className="sr-only"
                  />
                  <Icon aria-hidden className="size-4" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </StudioSection>

        {/* Save bar: sticks to the bottom so the action stays in reach of every section. */}
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border/70 bg-background/85 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {saveError ? (
              <p className="text-sm text-destructive" role="alert">{saveError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Changes show on your page as soon as you save.</p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || usernameStatus === 'checking' || usernameStatus === 'taken'}
                data-testid="profile-save"
                className="flex-1 sm:flex-none"
              >
                {isLoading ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        {footerContent}

        <section
          aria-labelledby="profile-danger-title"
          className="rounded-lg border border-destructive/40 px-5 py-4 sm:px-6"
        >
          <p className="text-xs text-destructive">Danger zone</p>
          <h2 id="profile-danger-title" className="mt-0.5 text-lg font-semibold leading-tight tracking-tight">
            Delete account
          </h2>
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="mt-4 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <AlertTriangle aria-hidden />
            Delete account
          </Button>
        </section>
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

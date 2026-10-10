'use client';

/** Profile settings form in two tabs: Profile (public profile, music services)
    and Account (privacy, email, account deletion). Both panels stay mounted in
    one form, so edits survive a tab switch and one save bar covers both. The
    URL mirrors the active tab (?tab=account). */

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserBio } from '@/types';
import { profileService } from '@/services/profile';
import { authService } from '@/services/auth';
import { useInvalidateProfileQueries } from '@/hooks/use-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabUnderline } from '@/components/ui/tab-underline';
import { MusicConnectionsFlow } from '@/components/features/music/music-connections-flow';
import { DeleteAccountModal } from './delete-account-modal';
import { EmailPreferencesSettings } from './email-preferences-settings';
import { SettingsField, SettingsSection } from './settings-section';
import { Plus, X } from 'lucide-react';
import { AvatarCropDialog } from '@/components/shared/avatar-crop-dialog';
import { appLogger } from '@/lib/observability/logger';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';
import { PendingLabel } from '@/components/ui/interior/loading-button';
import { cn } from '@/lib/utils';

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
    .min(1, 'Name is required')
    .max(MAX_DISPLAY_NAME_LENGTH, `Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`),
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
type SettingsTab = 'profile' | 'account';

function formValuesFrom(bio?: UserBio): EditProfileForm {
  return {
    fullName: bio?.displayName || '',
    username: bio?.username || '',
    bio: bio?.bio || '',
    avatarUrl: bio?.avatarUrl || '',
    likedPostsPrivacy: bio?.likedPostsPrivacy || bio?.likedPostsVisibility || (bio?.showLikedPosts === false ? 'private' : 'public'),
  };
}

/** Field error line, linked to its control through aria-describedby. */
function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return <p id={id} role="alert" className="mt-1.5 text-xs text-destructive">{children}</p>;
}

interface EditProfileFormProps {
  initialData?: UserBio;
  onSuccess: (username: string) => void;
}

export function EditProfileFormComponent({ initialData, onSuccess }: EditProfileFormProps) {
  const urlTab: SettingsTab = useSearchParams().get('tab') === 'account' ? 'account' : 'profile';
  const [tab, setTab] = useState(urlTab);
  // Follow URL changes made outside this form (back, forward, links) while it stays mounted.
  const [lastUrlTab, setLastUrlTab] = useState(urlTab);
  if (urlTab !== lastUrlTab) {
    setLastUrlTab(urlTab);
    setTab(urlTab);
  }
  // replaceState updates the URL without a navigation, so a refresh or a shared link keeps the tab.
  const selectTab = (next: SettingsTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'account') url.searchParams.set('tab', 'account');
    else url.searchParams.delete('tab');
    window.history.replaceState(null, '', url);
  };
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const linksLabelId = useId();
  const likedLabelId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    control,
    reset,
    setFocus,
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: formValuesFrom(initialData),
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
  const initialLinks = initialData?.profileLinks ?? [];
  const linksChanged = links.length !== initialLinks.length || links.some((link, index) => link !== initialLinks[index]);
  const hasChanges = isDirty || avatarFile !== null || linksChanged;

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

  const resetToInitial = useCallback(() => {
    reset(formValuesFrom(initialData));
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

  useEffect(() => {
    resetToInitial();
  }, [resetToInitial]);

  // The taken-username error sits on the Profile tab: show the tab, then focus the field.
  const revealUsernameError = () => {
    flushSync(() => selectTab('profile'));
    setFocus('username');
  };

  const onSubmit = async (data: EditProfileForm) => {
    if (isLoading || usernameStatus === 'checking') return;
    if (usernameStatus === 'taken') {
      revealUsernameError();
      return;
    }
    const normalizedUsername = normalizeUsername(data.username);

    const enteredLinks = links.map((l) => l.trim()).filter((l) => l.length > 0);
    const normalizedLinks = enteredLinks.map(normalizeProfileLink);
    if (normalizedLinks.some((l) => l === null)) {
      setLinksError('Each link must be a valid web address (e.g. instagram.com/yourname).');
      selectTab('profile');
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
            revealUsernameError();
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
      await authService.refreshSession({ restart: true });

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
  const fullNameValue = watch('fullName') || '';
  const fullNameError = errors.fullName?.message;
  const usernameFieldError = errors.username?.message || usernameError || undefined;
  const bioError = errors.bio?.message;

  return (
    <div className="w-full">
      {/* Every validated field is on the Profile tab, so a failed submit opens it. */}
      <form onSubmit={handleSubmit(onSubmit, () => selectTab('profile'))}>
        <Tabs
          value={tab}
          // SAFETY: the only trigger values are 'profile' and 'account'.
          onValueChange={(next) => selectTab(next as SettingsTab)}
          className="gap-0"
        >
          <TabsList
            aria-label="Settings"
            className="relative flex h-auto w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0"
          >
            <TabUnderline value={tab} />
            {([['profile', 'Profile'], ['account', 'Account']] as const).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-10 flex-none rounded-none border-0 px-0 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
              >
                <span className="tab-label" data-label={label}>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" forceMount className="mt-8 space-y-12 data-[state=inactive]:hidden">
            <SettingsSection title="Public profile" description="Shown on your profile page and next to your posts.">
              <SettingsField label="Photo" description="JPEG, PNG, or WebP, up to 5 MB.">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16 outline outline-1 -outline-offset-1 outline-foreground/10">
                    {activeAvatarUrl && (
                      <AvatarImage src={activeAvatarUrl} alt="Your profile photo" className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary font-teko text-3xl font-bold text-primary-foreground">
                      {(fullNameValue.trim()[0] || initialData?.username?.[0] || '?').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-describedby={avatarError ? 'profile-avatar-error' : undefined}
                  >
                    {activeAvatarUrl ? 'Replace photo' : 'Upload photo'}
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    data-testid="profile-avatar-file-input"
                    // Clear first so picking the same file again still fires onChange.
                    onClick={(event) => { event.currentTarget.value = ''; }}
                    onChange={(event) => handleAvatarFile(event.target.files?.[0] ?? null)}
                  />
                </div>
                {avatarError && <FieldError id="profile-avatar-error">{avatarError}</FieldError>}
              </SettingsField>

              <SettingsField label="Name" htmlFor="profile-full-name">
                <Input
                  id="profile-full-name"
                  {...register('fullName')}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  autoComplete="name"
                  aria-invalid={fullNameError ? true : undefined}
                  aria-describedby={fullNameError ? 'profile-full-name-error' : undefined}
                />
                {fullNameError && <FieldError id="profile-full-name-error">{fullNameError}</FieldError>}
              </SettingsField>

              <SettingsField label="Username" htmlFor="profile-username">
                {/* The URL prefix and the input share one border, so the field reads as the page address. */}
                <div
                  className={cn(
                    'flex h-9 overflow-hidden rounded-md border border-input shadow-xs transition-[color,box-shadow] focus-within:border-foreground/60 focus-within:ring-[3px] focus-within:ring-foreground/[0.07] dark:bg-input/30',
                    usernameFieldError && 'border-destructive ring-destructive/20 dark:ring-destructive/40',
                  )}
                >
                  <span aria-hidden className="flex select-none items-center border-r border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                    cassette.tech/profile/
                  </span>
                  <input
                    id="profile-username"
                    {...register('username')}
                    maxLength={MAX_USERNAME_LENGTH}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
                    aria-invalid={usernameFieldError ? true : undefined}
                    aria-describedby={usernameFieldError ? 'profile-username-error profile-username-help' : 'profile-username-help'}
                  />
                </div>
                <div className="mt-1.5 flex justify-between gap-3 text-xs">
                  <p id="profile-username-help" className="text-muted-foreground">Letters, numbers, and underscores.</p>
                  <span aria-live="polite" className={usernameStatus === 'available' ? 'text-success-text' : 'text-muted-foreground'}>
                    {usernameStatus === 'checking' ? 'Checking…' : usernameStatus === 'available' ? 'Available' : null}
                  </span>
                </div>
                {usernameFieldError && <FieldError id="profile-username-error">{usernameFieldError}</FieldError>}
              </SettingsField>

              <SettingsField label="Bio" htmlFor="profile-bio">
                <Textarea
                  id="profile-bio"
                  {...register('bio')}
                  rows={3}
                  maxLength={MAX_BIO_LENGTH}
                  className="resize-none"
                  placeholder="A line about what you share"
                  aria-invalid={bioError ? true : undefined}
                  aria-describedby={bioError ? 'profile-bio-error profile-bio-count' : 'profile-bio-count'}
                />
                <p id="profile-bio-count" className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground">
                  {bioValue.length}/{MAX_BIO_LENGTH}
                </p>
                {bioError && <FieldError id="profile-bio-error">{bioError}</FieldError>}
              </SettingsField>

              <SettingsField label="Links" labelId={linksLabelId} description={`Up to ${MAX_PROFILE_LINKS}. Instagram, TikTok, or anywhere else.`}>
                <fieldset aria-labelledby={linksLabelId} className="min-w-0 space-y-2">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {/* Text, not type="url": a bare domain is valid here and gets https:// on save. */}
                      <Input
                        type="text"
                        inputMode="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={link}
                        onChange={(e) => {
                          const next = [...links];
                          next[index] = e.target.value;
                          setLinks(next);
                        }}
                        maxLength={MAX_PROFILE_LINK_LENGTH}
                        placeholder="instagram.com/yourname"
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
                  {links.length < MAX_PROFILE_LINKS && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLinks([...links, ''])}
                      className="-ml-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <Plus aria-hidden />
                      Add link
                    </Button>
                  )}
                </fieldset>
                {linksError && <FieldError id="profile-links-error">{linksError}</FieldError>}
              </SettingsField>
            </SettingsSection>

            <SettingsSection title="Music services" description="The services you listen on. They show on your profile.">
              <MusicConnectionsFlow />
            </SettingsSection>
          </TabsContent>

          <TabsContent value="account" forceMount className="mt-8 space-y-12 data-[state=inactive]:hidden">
            <SettingsSection title="Privacy">
              <SettingsField label="Liked posts" labelId={likedLabelId} description="Who can see the Liked tab on your profile.">
                <div role="radiogroup" aria-labelledby={likedLabelId} className="flex gap-6 sm:pt-1.5">
                  {(['public', 'private'] as const).map((value) => (
                    <label key={value} className="flex min-h-6 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        value={value}
                        {...register('likedPostsPrivacy')}
                        className="size-4 accent-primary"
                      />
                      {value === 'public' ? 'Public' : 'Private'}
                    </label>
                  ))}
                </div>
              </SettingsField>
            </SettingsSection>

            <SettingsSection title="Email">
              <EmailPreferencesSettings />
            </SettingsSection>

            <SettingsSection title="Delete account">
              <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <p className="min-w-0 text-sm text-muted-foreground">
                  Permanently delete your account and all of its data. This cannot be undone.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-fit shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Delete account
                </Button>
              </div>
            </SettingsSection>
          </TabsContent>
        </Tabs>

        {/* Save bar: appears with the first unsaved change and sticks to the bottom
            of the viewport until the end of the page. Other sections save on their own. */}
        {(hasChanges || saveError) && (
          <div className="sticky bottom-0 z-10 -mx-4 mt-12 border-t border-border/70 bg-background px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              {saveError ? (
                <p className="min-w-0 text-sm text-destructive" role="alert">{saveError}</p>
              ) : (
                <p className="min-w-0 text-sm text-muted-foreground">Unsaved changes</p>
              )}
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="ghost" onClick={resetToInitial} disabled={isLoading}>
                  Discard
                </Button>
                <Button
                  type="submit"
                  // A taken username stays submittable so the submit can reveal its error on the Profile tab.
                  disabled={isLoading || usernameStatus === 'checking'}
                  data-testid="profile-save"
                >
                  <PendingLabel pending={isLoading} label="Save changes" pendingLabel="Saving…" />
                </Button>
              </div>
            </div>
          </div>
        )}
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

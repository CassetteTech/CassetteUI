'use client';

/** Profile settings: one responsive column of sections. The sidebar shell
    scrolls on desktop; the document scrolls on phones. */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { EditProfileFormComponent } from '@/components/features/profile/edit-profile-form';
import { EditProfileSkeleton } from '@/components/features/profile/edit-profile-skeleton';
import { MusicConnectionsFlow } from '@/components/features/music/music-connections-flow';
import { profileService } from '@/services/profile';
import { UserBio } from '@/types';
import { BackButton } from '@/components/ui/back-button';
import { appLogger } from '@/lib/observability/logger';
import { EmailPreferencesSettings } from '@/components/features/profile/email-preferences-settings';
import { StudioSection } from '@/components/features/curator/studio-shell';

export default function EditProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const { user } = useAuthState();

  const [userBio, setUserBio] = useState<UserBio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userIdentifier = Array.isArray(username) ? username[0] : username;

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Determine the user ID to fetch
        const isEditRoute = userIdentifier === 'edit';
        const userIdToFetch = isEditRoute ? user.id : userIdentifier;

        // Check if the current user can edit this profile
        const canEdit = user.id === userIdToFetch ||
                       user.username?.toLowerCase() === userIdToFetch?.toLowerCase() ||
                       isEditRoute;

        if (!canEdit) {
          router.push(`/profile/${userIdentifier}`);
          return;
        }

        // Fetch user bio for editing
        const bio = await profileService.fetchUserBio(userIdToFetch || user.id);
        setUserBio(bio);
      } catch (e) {
        appLogger.error('profile_edit_load_failed', { error: e, route: '/profile/[username]/edit' });
        setError(e instanceof Error ? e.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user, userIdentifier, router]);

  const handleSuccess = (updatedUsername: string) => {
    // Navigate back to profile page
    router.push(`/profile/${updatedUsername}`);
  };

  const handleCancel = () => {
    // Navigate back to profile page
    router.push(`/profile/${user?.username || userIdentifier}`);
  };

  // Show skeleton while loading, actual content when ready
  const showSkeleton = isLoading && !userBio;

  if (error || (!isLoading && !userBio)) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-foreground">{error ? 'Error' : 'Profile Not Found'}</h1>
          <p className="mb-4 text-muted-foreground">
            {error ?? 'The profile you’re trying to edit doesn’t exist.'}
          </p>
          <BackButton variant="button" fallbackRoute="/" />
        </div>
      </div>
    );
  }

  return (
    <div className="studio-surface mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-4 lg:hidden">
        <BackButton route={`/profile/${user?.username || userIdentifier}`} />
      </div>
      {showSkeleton ? (
        <EditProfileSkeleton />
      ) : userBio ? (
        <>
          <header className="mb-6">
            <p className="text-sm text-muted-foreground">Profile settings</p>
            <h1 className="mt-1 font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
              Edit profile
            </h1>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              What visitors see on your public page, plus your email and connected services.
            </p>
          </header>
          <EditProfileFormComponent
            initialData={userBio}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            footerContent={
              <>
                <StudioSection
                  id="profile-email"
                  eyebrow="Account"
                  title="Email"
                  headingId="profile-email-title"
                  description="Which Cassette emails reach your account address."
                >
                  <EmailPreferencesSettings />
                </StudioSection>
                <MusicConnectionsFlow className="mt-6" />
              </>
            }
          />
        </>
      ) : null}
    </div>
  );
}

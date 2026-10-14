'use client';

/** Profile settings: a title, then the tabbed settings form. The sidebar
    shell scrolls on desktop; the document scrolls on phones. */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { EditProfileFormComponent } from '@/components/features/profile/edit-profile-form';
import { EditProfileSkeleton } from '@/components/features/profile/edit-profile-skeleton';
import { profileService } from '@/services/profile';
import { UserBio } from '@/types';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { appLogger } from '@/lib/observability/logger';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

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

  const profilePath = `/profile/${user?.username || userIdentifier}`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-4 lg:hidden">
        <BackButton route={profilePath} />
      </div>
      {showSkeleton ? (
        <EditProfileSkeleton />
      ) : userBio ? (
        <>
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
              Edit profile
            </h1>
            <Button asChild variant="outline" size="sm">
              <Link href={profilePath}>
                View profile
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          </header>
          <EditProfileFormComponent initialData={userBio} onSuccess={handleSuccess} />
        </>
      ) : null}
    </div>
  );
}

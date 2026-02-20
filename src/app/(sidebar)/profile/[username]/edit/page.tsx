'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { EditProfileFormComponent } from '@/components/features/profile/edit-profile-form';
import { EditProfileSkeleton } from '@/components/features/profile/edit-profile-skeleton';
import { MusicConnectionsFlow } from '@/components/features/music/music-connections-flow';
import { profileService } from '@/services/profile';
import { UserBio } from '@/types';
import { Container } from '@/components/ui/container';
import { BackButton } from '@/components/ui/back-button';

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
        console.error('❌ Error loading user data:', e);
        setError(e instanceof Error ? e.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user, userIdentifier, router]);

  const handleSuccess = () => {
    // Navigate back to profile page
    router.push(`/profile/${user?.username || userIdentifier}`);
  };

  const handleCancel = () => {
    // Navigate back to profile page
    router.push(`/profile/${user?.username || userIdentifier}`);
  };

  // Show skeleton while loading, actual content when ready
  const showSkeleton = isLoading && !userBio;

  if (error) {
    return (
      <>
        {/* Mobile Error */}
        <div className="bg-background lg:hidden">
          <Container className="min-h-screen bg-transparent p-0 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <BackButton variant="button" fallbackRoute="/" />
            </div>
          </Container>
        </div>

        {/* Desktop Error - sidebar provided by layout */}
        <div className="hidden lg:flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <BackButton variant="button" fallbackRoute="/" />
          </div>
        </div>
      </>
    );
  }

  // Show "not found" only after loading completes
  if (!isLoading && !userBio) {
    return (
      <>
        {/* Mobile Not Found */}
        <div className="bg-background lg:hidden">
          <Container className="min-h-screen bg-transparent p-0 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
              <p className="text-muted-foreground mb-4">The profile you&apos;re trying to edit doesn&apos;t exist.</p>
              <BackButton variant="button" fallbackRoute="/" />
            </div>
          </Container>
        </div>

        {/* Desktop Not Found - sidebar provided by layout */}
        <div className="hidden lg:flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
            <p className="text-muted-foreground mb-4">The profile you&apos;re trying to edit doesn&apos;t exist.</p>
            <BackButton variant="button" fallbackRoute="/" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="bg-background lg:hidden">
        <Container className="min-h-screen bg-transparent p-0">
          <div className="py-4 sm:py-6 md:py-8 px-4">
            {/* Back to profile */}
            <div className="mb-4">
              <BackButton route={`/profile/${user?.username || userIdentifier}`} />
            </div>
            {showSkeleton ? (
              <EditProfileSkeleton />
            ) : userBio ? (
              <>
                {/* Header */}
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Edit Your Profile</h1>
                  <p className="text-muted-foreground">Update your profile information and connected services</p>
                </div>

                {/* Edit Form */}
                <EditProfileFormComponent
                  initialData={userBio}
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />

                {/* Music Services Connection */}
                <div className="mt-6 sm:mt-8">
                  <MusicConnectionsFlow />
                </div>
              </>
            ) : null}
          </div>
        </Container>
      </div>

      {/* Desktop Layout - sidebar provided by layout */}
      <div className="hidden lg:flex lg:flex-col lg:flex-1 p-6 overflow-y-auto">
        {showSkeleton ? (
          <EditProfileSkeleton />
        ) : userBio ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Edit Your Profile</h1>
              <p className="text-muted-foreground">Update your profile information and connected services</p>
            </div>

            {/* Edit Form */}
            <EditProfileFormComponent
              initialData={userBio}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />

            {/* Music Services Connection */}
            <div className="mt-8 max-w-xl mx-auto">
              <MusicConnectionsFlow />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
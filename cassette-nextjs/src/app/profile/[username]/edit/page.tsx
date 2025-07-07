'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { EditProfileFormComponent } from '@/components/features/profile/edit-profile-form';
import { profileService } from '@/services/profile';
import { UserBio } from '@/types';
import { Container } from '@/components/ui/container';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

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

  if (isLoading) {
    return (
      <Container className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Go Back
          </button>
        </div>
      </Container>
    );
  }

  if (!userBio) {
    return (
      <Container className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-300 mb-4">The profile you&apos;re trying to edit doesn&apos;t exist.</p>
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Go Back
          </button>
        </div>
      </Container>
    );
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="bg-background lg:hidden">
        <Container className="min-h-screen bg-transparent p-0">
          <div className="py-8 px-4">
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
          </div>
        </Container>
      </div>

      {/* Desktop Layout with Sidebar */}
      <div className="hidden lg:block min-h-screen bg-background">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          
          {/* Main Content Area */}
          <SidebarInset>
            <div className="flex flex-col h-screen overflow-hidden p-6">
              <div className="flex-1 overflow-y-auto">
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
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
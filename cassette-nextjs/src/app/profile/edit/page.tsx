'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { EditProfileFormComponent } from '@/components/features/profile/edit-profile-form';
import { profileService } from '@/services/profile';
import { UserBio } from '@/types';
import { Container } from '@/components/ui/container';

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuthState();
  
  const [userBio, setUserBio] = useState<UserBio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch current user's bio for editing
        const bio = await profileService.fetchUserBio(user.id);
        setUserBio(bio);
      } catch (e) {
        console.error('❌ Error loading user data:', e);
        setError(e instanceof Error ? e.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user, router]);

  const handleSuccess = () => {
    // Navigate back to profile page
    router.push(`/profile/${user?.username}`);
  };

  const handleCancel = () => {
    // Navigate back to profile page
    router.push(`/profile/${user?.username}`);
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
          <p className="text-gray-300 mb-4">Unable to load your profile for editing.</p>
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
    <Container className="min-h-screen bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]">
      <div className="py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Edit Your Profile</h1>
          <p className="text-gray-300">Update your profile information and connected services</p>
        </div>

        {/* Edit Form */}
        <EditProfileFormComponent
          initialData={userBio}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </Container>
  );
}
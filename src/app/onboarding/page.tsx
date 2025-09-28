'use client';

import { authFetch } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { ChooseHandleStep } from '@/components/onboarding/ChooseHandleStep';
import { AvatarStep } from '@/components/onboarding/AvatarStep';
import { ConnectMusicStep } from '@/components/onboarding/ConnectMusicStep';

const STEPS = [
  { id: 'handle', title: 'Choose Your Handle', component: ChooseHandleStep },
  { id: 'avatar', title: 'Profile Picture', component: AvatarStep },
  { id: 'music', title: 'Connect Music Services', component: ConnectMusicStep },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthState();
  const setUser = useAuthStore((state) => state.setUser);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    displayName: user?.displayName || '',
    avatarFile: null as File | null,
  });

  // Update form data when user loads
  useEffect(() => {
    if (user && !formData.username && !formData.displayName) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        displayName: user.displayName || '',
      }));
    }
  }, [user, formData.username, formData.displayName]);

  // Redirect if already onboarded or not authenticated
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/auth/signin');
        return;
      }
      if (user.isOnboarded) {
        router.replace('/profile');
        return;
      }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-foreground font-atkinson">Loading...</p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    try {
     // Hard guard: if no token, bounce to signin
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Your session expired. Please sign in again.');
        router.replace('/auth/signin');
        return;
      }

      // Soft guard: ensure server sees you as authenticated *now*
      const ok = await verifySession();
      if (!ok) {
        alert('Your session is invalid or expired. Please sign in again.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.replace('/auth/signin');
        return;
      }

      // Create FormData for file upload
      const form = new FormData();
      form.append('username', formData.username);
      form.append('displayName', formData.displayName);
      form.append('isOnboarded', 'true'); // Must be string!
      
      // Optional avatar file
      if (formData.avatarFile) {
        form.append('avatar', formData.avatarFile);
      }

      // Use authFetch so Authorization is attached correctly
      const response = await authFetch('/api/v1/profile', {
        method: 'PUT',
        body: form, // no Content-Type here
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = 'Failed to update profile';
        
        // Handle specific error cases based on your API spec
        switch (response.status) {
          case 400:
            errorMessage = errorData.message || 'Username taken, file too large, or invalid file type';
            break;
          case 401:
            errorMessage = 'Invalid or expired login session';
            break;
          case 404:
            errorMessage = 'User not found';
            break;
          case 500:
            errorMessage = 'Server error occurred';
            break;
          default:
            errorMessage = errorData.message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Update the auth store with the updated user (API returns user object in data.user)
      if (data.success && data.user) {
        setUser(data.user);

        // Force a fresh session read so guards see the updated value
        const res = await authFetch('/api/v1/auth/session', { method: 'GET' });
        if (res.ok) {
          const s = await res.json().catch(() => null);
          if (s?.success && s.user) {
            setUser(s.user);
          }
        }

        // Redirect to profile using the returned username
        router.replace(`/profile/${data.user.username}`);
      } else if (user) {
        // Fallback: Update the existing user with the new onboarding status
        const updatedUser = {
          ...user,
          username: formData.username,
          displayName: formData.displayName,
          isOnboarded: true,
        };
        setUser(updatedUser);
        router.replace(`/profile/${formData.username}`);
      } else {
        throw new Error('Failed to update user data');
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
      // Handle error (could show toast, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to complete onboarding: ${errorMessage}`);
    }
  };

  async function verifySession(): Promise<boolean> {
    const res = await authFetch('/api/v1/auth/session');
    if (!res.ok) return false;
    const js = await res.json().catch(() => null);
    return !!(js && js.success && js.user);
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex justify-between items-center mb-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  index <= currentStep
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="relative">
            <div className="h-2 bg-muted rounded-full">
              <div
                className="h-2 bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            {STEPS[currentStep].title}
          </h1>
          
          <CurrentStepComponent
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            onFinish={handleFinish}
            isFirstStep={currentStep === 0}
            isLastStep={currentStep === STEPS.length - 1}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

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
    profilePicture: null as File | null,
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
  if (!isLoading) {
    if (!user) {
      router.replace('/auth/signin');
      return null;
    }
    if (user.isOnboarded) {
      router.replace('/profile');
      return null;
    }
  }

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
      const API_URL = process.env.NEXT_PUBLIC_API_URL_LOCAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5173';
      
      // Update user profile on the backend
      const response = await fetch(`${API_URL}/api/v1/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          username: formData.username,
          displayName: formData.displayName,
          isOnboarded: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const data = await response.json();
      
      // Update the auth store with the updated user
      if (data.user) {
        setUser(data.user);
      } else if (user) {
        // Update the existing user with the new onboarding status
        setUser({
          ...user,
          username: formData.username,
          displayName: formData.displayName,
          isOnboarded: true,
        });
      }

      // Redirect to profile
      router.replace(`/profile/${formData.username}`);
    } catch (error) {
      console.error('Onboarding completion error:', error);
      // Handle error (could show toast, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to complete onboarding: ${errorMessage}`);
    }
  };

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
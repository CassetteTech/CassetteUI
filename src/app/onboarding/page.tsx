'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Check, Disc3 } from 'lucide-react';
import Image from 'next/image';

import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { ChooseHandleStep } from '@/components/onboarding/ChooseHandleStep';
import { AvatarStep } from '@/components/onboarding/AvatarStep';
import { ConnectMusicStep } from '@/components/onboarding/ConnectMusicStep';
import { CompletionStep } from '@/components/onboarding/CompletionStep';
import { authService } from '@/services/auth';
import { pendingActionService } from '@/utils/pending-action';
import { captureClientEvent } from '@/lib/analytics/client';

// Step definitions (excluding welcome and completion which are special)
const STEPS = [
  { id: 'handle', title: 'Choose Handle', subtitle: 'Pick your username' },
  { id: 'avatar', title: 'Profile Picture', subtitle: 'Add a photo' },
  { id: 'music', title: 'Connect Music', subtitle: 'Link your services' },
];

type OnboardingPhase = 'welcome' | 'steps' | 'submitting' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthState();
  const setUser = useAuthStore((state) => state.setUser);

  const [phase, setPhase] = useState<OnboardingPhase>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
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

  // Create avatar preview when file changes
  useEffect(() => {
    if (formData.avatarFile) {
      const url = URL.createObjectURL(formData.avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAvatarPreview(null);
    }
  }, [formData.avatarFile]);

  // Redirect if already onboarded or not authenticated
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/auth/signin');
        return;
      }
      if (user.isOnboarded) {
        // Check for pending action before redirecting (e.g., user came from playlist page)
        const pendingAction = pendingActionService.get();
        if (pendingAction?.returnUrl) {
          pendingActionService.clear();
          window.location.href = pendingAction.returnUrl;
        } else {
          router.replace('/profile');
        }
        return;
      }
    }
  }, [isLoading, user, router]);

  const handleStartOnboarding = () => {
    void captureClientEvent('onboarding_started', {
      route: '/onboarding',
      source_surface: 'onboarding',
      user_id: user?.id,
      is_authenticated: true,
    });
    setPhase('steps');
  };

  const handleNext = () => {
    const currentStepId = STEPS[currentStep]?.id;
    if (phase === 'steps' && (currentStepId === 'handle' || currentStepId === 'avatar' || currentStepId === 'music')) {
      void captureClientEvent('onboarding_step_completed', {
        route: '/onboarding',
        source_surface: 'onboarding',
        step: currentStepId,
        user_id: user?.id,
        is_authenticated: true,
      });
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step - submit
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = useCallback(async () => {
    setPhase('submitting');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL_LOCAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Create FormData for file upload
      const form = new FormData();
      const normalizedUsername = formData.username.trim().toLowerCase();
      form.append('username', normalizedUsername);
      form.append('displayName', formData.displayName);
      form.append('isOnboarded', 'true');

      if (formData.avatarFile) {
        form.append('avatar', formData.avatarFile, formData.avatarFile.name);
        form.append('Avatar', formData.avatarFile, formData.avatarFile.name);
      }

      const response = await fetch(`${API_URL}/api/v1/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = 'Failed to update profile';

        switch (response.status) {
          case 400:
            errorMessage = errorData.message || 'Username taken or invalid data';
            break;
          case 401:
            errorMessage = 'Session expired. Please sign in again.';
            break;
          case 404:
            errorMessage = 'User not found';
            break;
          case 500:
            errorMessage = 'Server error. Please try again.';
            break;
          default:
            errorMessage = errorData.message || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        // Refresh the session to get complete user data including connectedServices
        // The profile update response may not include all user fields (like connectedServices)
        const freshUser = await authService.getCurrentUser();

        if (freshUser) {
          setUser(freshUser);
        } else if (data.user && typeof data.user === 'object') {
          // Fallback to response data if session refresh fails
          // Ensure auth store shape is normalized (profilePicture, connectedServices, etc.)
          setUser(authService.normalizeAuthUser(data.user as Record<string, unknown>));
        } else if (user) {
          // Last resort fallback
          const updatedUser = {
            ...user,
            username: formData.username,
            displayName: formData.displayName,
            isOnboarded: true,
          };
          setUser(updatedUser);
        }

        setPhase('complete');
        toast.success('Profile created successfully!');
      } else {
        throw new Error('Failed to update user data');
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Failed to complete setup', {
        description: errorMessage,
      });
      setPhase('steps');
    }
  }, [formData, user, setUser]);

  const handleGoToProfile = () => {
    // Check for pending action (e.g., user came from playlist page to convert)
    const pendingAction = pendingActionService.get();
    if (pendingAction?.returnUrl) {
      pendingActionService.clear();
      window.location.href = pendingAction.returnUrl;
      return;
    }

    router.replace(`/profile/${formData.username}`);
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Disc3 className="w-12 h-12 text-primary animate-spin" style={{ animationDuration: '2s' }} />
          <p className="text-foreground font-atkinson">Loading...</p>
        </div>
      </div>
    );
  }

  // Render step component based on current step
  const renderStepContent = () => {
    const commonProps = {
      formData,
      updateFormData,
      onNext: handleNext,
      onBack: handleBack,
      isFirstStep: currentStep === 0,
      isLastStep: currentStep === STEPS.length - 1,
    };

    switch (STEPS[currentStep].id) {
      case 'handle':
        return <ChooseHandleStep {...commonProps} />;
      case 'avatar':
        return <AvatarStep {...commonProps} />;
      case 'music':
        return <ConnectMusicStep {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        {/* Welcome Phase */}
        <AnimatePresence mode="wait">
          {phase === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <WelcomeStep
                onNext={handleStartOnboarding}
                displayName={user?.displayName}
              />
            </motion.div>
          )}

          {/* Steps Phase */}
          {phase === 'steps' && (
            <motion.div
              key="steps"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo Header */}
              <div className="flex justify-center mb-6">
                <Image
                  src="/images/app_logo_text_small.png"
                  alt="Cassette"
                  width={120}
                  height={30}
                  className="opacity-80"
                />
              </div>

              {/* Improved Stepper */}
              <div className="mb-8">
                {/* Step Indicators */}
                <div className="flex items-center justify-between relative">
                  {/* Connecting Line (Background) */}
                  <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted mx-4 -z-10" />

                  {/* Progress Line */}
                  <motion.div
                    className="absolute left-4 top-4 h-0.5 bg-primary -z-10"
                    initial={{ width: 0 }}
                    animate={{
                      width: `calc(${(currentStep / (STEPS.length - 1)) * 100}% - 2rem)`,
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  {STEPS.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                      <div key={step.id} className="flex flex-col items-center z-10">
                        <motion.div
                          initial={false}
                          animate={{
                            scale: isCurrent ? 1.1 : 1,
                            backgroundColor: isCompleted || isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                            isCompleted || isCurrent
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30 bg-background text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </motion.div>

                        {/* Step Label (visible on larger screens) */}
                        <div className="mt-2 text-center hidden sm:block">
                          <p className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                            {step.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Current Step Info (mobile) */}
                <div className="mt-4 text-center sm:hidden">
                  <p className="text-sm text-muted-foreground">
                    Step {currentStep + 1} of {STEPS.length}
                  </p>
                </div>
              </div>

              {/* Step Title */}
              <motion.div
                key={STEPS[currentStep].id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
              >
                <h1 className="text-2xl font-bold text-foreground font-teko tracking-wide">
                  {STEPS[currentStep].title}
                </h1>
              </motion.div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                <motion.div key={currentStep}>
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* Submitting/Complete Phase */}
          {(phase === 'submitting' || phase === 'complete') && (
            <motion.div
              key="completion"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CompletionStep
                username={formData.username}
                displayName={formData.displayName}
                avatarPreview={avatarPreview}
                isSubmitting={phase === 'submitting'}
                onComplete={handleGoToProfile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

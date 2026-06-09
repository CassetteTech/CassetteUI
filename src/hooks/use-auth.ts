import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { SignInForm, SignUpForm } from '@/types';
import { useRouter } from 'next/navigation';
import { pendingActionService } from '@/utils/pending-action';
import { appLogger } from '@/lib/observability/logger';

export const useSignIn = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignInForm) => authService.signIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      // Get the user from store (already set by authService.signIn)
      const user = useAuthStore.getState().user;
      const pendingAction = pendingActionService.get();

      // Always check onboarding first - don't bypass it for pending actions
      if (!user?.isOnboarded) {
        // Keep pending action for after onboarding completes
        window.location.href = '/onboarding';
        return;
      }

      // User is onboarded - honor pending action if exists
      if (pendingAction?.returnUrl) {
        window.location.href = pendingAction.returnUrl;
        return;
      }

      // Default: Navigate to profile
      router.push('/profile');
    },
    onError: (error: Error) => {
      appLogger.error('signin_failed', { error });
    },
  });
};

export const useSignUp = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SignUpForm) => authService.signUp(data),
    onSuccess: (result) => {
      const user = useAuthStore.getState().user;
      if (result?.success && user) {
        // Get the user from store (already set by authService.signUp)
        const pendingAction = pendingActionService.get();

        // Always check onboarding first - don't bypass it for pending actions
        if (!user?.isOnboarded) {
          // Keep pending action for after onboarding completes
          window.location.href = '/onboarding';
          return;
        }

        // User is onboarded - honor pending action if exists
        if (pendingAction?.returnUrl) {
          window.location.href = pendingAction.returnUrl;
          return;
        }

        router.push('/profile');
      }
    },
    onError: (error: Error) => {
      appLogger.error('signup_failed', { error });
    },
  });
};

export const useSignOut = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      queryClient.clear();
      router.push('/auth/signin');
    },
    onError: (error: Error) => {
      appLogger.error('signout_failed', { error });
    },
  });
};

export const useSignInWithProvider = () => {
  return useMutation({
    mutationFn: (provider: 'google' | 'apple') => 
      authService.signInWithProvider(provider),
    onError: (error: Error) => {
      appLogger.error('oauth_signin_failed', { error });
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (email: string) => authService.resetPassword(email),
    onError: (error: Error) => {
      appLogger.error('reset_password_failed', { error });
    },
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: (password: string) => authService.updatePassword(password),
    onError: (error: Error) => {
      appLogger.error('update_password_failed', { error });
    },
  });
};

export const useAuthState = () => {
  const { user, isLoading, isAuthenticated } = useAuthStore();

  return {
    user,
    isLoading,
    isAuthenticated,
  };
};

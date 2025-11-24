import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { SignInForm, SignUpForm } from '@/types';
import { useRouter } from 'next/navigation';

export const useSignIn = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignInForm) => authService.signIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Navigate to profile (which will handle onboarding redirect if needed)
      router.push('/profile');
    },
    onError: (error: Error) => {
      console.error('Sign in error:', error);
    },
  });
};

export const useSignUp = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SignUpForm) => {
      console.log('🚀 [useSignUp] Calling authService.signUp with:', { ...data, password: '[REDACTED]', confirmPassword: '[REDACTED]' });
      return authService.signUp(data);
    },
    onSuccess: (result) => {
      console.log('✅ [useSignUp] Signup successful:', result);
      // Navigate to profile only if auto-login tokens were returned
      if (result?.token) {
        router.push('/profile');
      }
    },
    onError: (error: Error) => {
      console.error('❌ [useSignUp] Sign up error:', error);
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
      console.error('Sign out error:', error);
    },
  });
};

export const useSignInWithProvider = () => {
  return useMutation({
    mutationFn: (provider: 'google' | 'apple') => 
      authService.signInWithProvider(provider),
    onError: (error: Error) => {
      console.error('OAuth sign in error:', error);
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (email: string) => authService.resetPassword(email),
    onError: (error: Error) => {
      console.error('Reset password error:', error);
    },
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: (password: string) => authService.updatePassword(password),
    onError: (error: Error) => {
      console.error('Update password error:', error);
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

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { appLogger } from '@/lib/observability/logger';

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

export const useAuthState = () =>
  useAuthStore(
    useShallow((state) => ({
      user: state.user,
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      activeMembershipCount: state.activeMembershipCount,
      feedCuratorCount: state.feedCuratorCount,
      sessionCheckedAt: state.sessionCheckedAt,
      sessionError: state.sessionError,
      isRefreshingSession: state.isRefreshingSession,
    })),
  );

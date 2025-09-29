'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { SignInForm, SignUpForm } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

export const useSignIn = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignInForm) => authService.signIn(data),

    onSuccess: async () => {
      // Kill any stale cached “profile”
      await queryClient.cancelQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      // Hydrate auth store from the server session (fresh)
      const user = await authService.getCurrentUser(); // returns null | user
      // Decide destination based on the hydrated user object
      if (user?.isOnboarded) {
        router.replace(`/profile/${user.username ?? ''}`.replace(/\/$/, '/profile'));
      } else {
        router.replace('/onboarding');
      }
      // Optional: refresh to bust any cached layouts using RSC data
      router.refresh();
    },

    onError: (e: Error) => {
      console.error('❌ [useSignIn] error:', e);
    },
  });
};

export const useSignUp = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SignUpForm) => authService.signUp(data),
    onSuccess: async (_result, variables) => {
      // If token didn’t get set for any reason, fall back to password sign-in
      const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
      if (!hasToken) {
        await authService.signIn({
          email: variables.email,
          password: variables.password,
          acceptTerms: true,
        });
      }

      // Hydrate the store so RequireAuth sees a user on the next page
      await authService.getCurrentUser();

      // Use replace to avoid back to /auth/signup
      router.replace('/profile');
    },
    onError: (error: Error) => {
      console.error('❌ [useSignUp] Sign up error:', error);
    },
  });
};

export const useSignOut = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: async () => {
      // Belt & suspenders: clear tokens here too
      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
      } catch {}

      // Clear store immediately
      setUser(null);

      // Cancel any in-flight queries, then wipe cache
      await queryClient.cancelQueries();
      queryClient.clear();

      // Hard reload router cache so layouts/guards don’t see stale data
      router.replace('/auth/signin');
      router.refresh();
    },
    onError: (err: Error) => {
      console.error('[useSignOut] error:', err);
      // Still perform local cleanup
      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
      } catch {}
      setUser(null);
      queryClient.clear();
      router.replace('/auth/signin');
      router.refresh();
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

export function useAuthState() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Never run during SSR
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch('/api/v1/auth/session');
        if (!res.ok) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (!cancelled) setUser(null);
        } else {
          const data = await res.json().catch(() => null);
          if (data?.success && data.user) {
            if (!cancelled) setUser(data.user);
          } else {
            if (!cancelled) setUser(null);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [setUser]);

  return { user, isLoading, isAuthenticated: !!user };
}
import { create } from 'zustand';
import type { AuthSession, AuthUser, FeedSourceCounts } from '@/types';

export const SESSION_MAX_AGE_MS = 60_000;

interface AuthState {
  user: AuthUser | null;
  activeMembershipCount: number | null;
  feedCuratorCount: number | null;
  sessionCheckedAt: number | null;
  sessionError: boolean;
  isRefreshingSession: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  setSessionError: (user?: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  setFeedSourceCounts: (counts: FeedSourceCounts) => void;
  setRefreshingSession: (refreshing: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  activeMembershipCount: null,
  feedCuratorCount: null,
  sessionCheckedAt: null,
  sessionError: false,
  isRefreshingSession: false,
  isLoading: true,
  isAuthenticated: false,
  setSession: ({ user, activeMembershipCount, feedCuratorCount }) =>
    set({
      user,
      activeMembershipCount,
      feedCuratorCount,
      sessionCheckedAt: Date.now(),
      sessionError: false,
      isAuthenticated: true,
      isLoading: false,
    }),
  setSessionError: (user) =>
    set((state) => {
      const nextUser = user ?? state.user;
      const sameUser = nextUser?.id === state.user?.id;
      return {
        user: nextUser,
        activeMembershipCount: sameUser ? state.activeMembershipCount : null,
        feedCuratorCount: sameUser ? state.feedCuratorCount : null,
        sessionCheckedAt: sameUser ? state.sessionCheckedAt : null,
        sessionError: true,
        isAuthenticated: !!nextUser,
        isLoading: false,
      };
    }),
  updateUser: (user) =>
    set((state) =>
      user.id === state.user?.id
        ? { user }
        : {
            user,
            activeMembershipCount: null,
            feedCuratorCount: null,
            sessionCheckedAt: null,
            isAuthenticated: true,
            isLoading: false,
          },
    ),
  setFeedSourceCounts: ({ activeMembershipCount, feedCuratorCount }) => set({ activeMembershipCount, feedCuratorCount }),
  setRefreshingSession: (isRefreshingSession) => set({ isRefreshingSession }),
  signOut: () =>
    set({
      user: null,
      activeMembershipCount: null,
      feedCuratorCount: null,
      sessionCheckedAt: null,
      sessionError: false,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

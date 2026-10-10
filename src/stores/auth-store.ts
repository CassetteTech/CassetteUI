import { create } from 'zustand';
import type { AuthSession, AuthUser, FeedSourceCounts } from '@/types';

/** A session read older than this is refreshed on focus, on Feed entry, and while Feed is visible. */
export const SESSION_MAX_AGE_MS = 60_000;

interface AuthState {
  user: AuthUser | null;
  /** From the latest session read for this user; null until one arrives. */
  activeMembershipCount: number | null;
  /** The Feed's curators, joined or followed, from the same read; null until one arrives. */
  feedCuratorCount: number | null;
  /** When the server last confirmed the session, in epoch milliseconds. */
  sessionCheckedAt: number | null;
  /** The latest session read failed, so the counts cannot be trusted until a read succeeds. */
  sessionError: boolean;
  isRefreshingSession: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  /** Records a failed read. Keeps the known user unless a sign-in names one. */
  setSessionError: (user?: AuthUser) => void;
  /** A profile edit: the same user keeps the counts; another user starts unknown. */
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

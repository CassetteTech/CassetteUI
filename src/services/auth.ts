'use client';

import { SESSION_MAX_AGE_MS, useAuthStore } from '@/stores/auth-store';
import { AuthUser, SignInForm, SignUpForm, ConnectedService, SignupAttribution, type FeedSourceCounts } from '@/types';
import {
  readSessionResponse,
  readSignedInBody,
  type SessionRead,
  type SessionUser,
  type SignedInBody,
} from '@/services/auth-session';
import { prefetchProfileArtwork } from '@/services/profile-artwork-cache';
import { platformConnectService } from '@/services/platform-connect';
import { captureClientEvent } from '@/lib/analytics/client';
import { pendingActionService } from '@/utils/pending-action';
import { normalizeConnectedServicePayload } from '@/utils/platform-normalization';
import { appLogger } from '@/lib/observability/logger';

const AUTH_API_BASE = '/api/auth';

export type SessionRefresh =
  | { kind: 'authenticated'; user: AuthUser }
  | { kind: 'signed-out' }
  | { kind: 'error' }
  | { kind: 'superseded' };

type ApiResponsePayload = {
  success?: boolean;
  message?: string;
  authUrl?: string;
};

class AuthService {
  private initialized = false;
  private lastArtworkWarmupUserId: string | null = null;
  private sessionRead: { promise: Promise<SessionRefresh>; controller: AbortController } | null = null;
  private appliedSessionUser: { json: string; user: AuthUser } | null = null;

  private resolveAvatarUrl(userData: Record<string, unknown>): string {
    return String(
      userData.avatarUrl ||
        userData.AvatarUrl ||
        userData.profilePicture ||
        userData.ProfilePicture ||
        ''
    );
  }

  private normalizeConnectedServices(userData: Record<string, unknown>): ConnectedService[] {
    const raw = userData.connectedServices;
    if (!Array.isArray(raw)) {
      return [];
    }

    const normalized = raw
      .map((service): ConnectedService | null => {
        return normalizeConnectedServicePayload(service, new Date().toISOString());
      });

    return normalized.filter((service): service is ConnectedService => service !== null);
  }

  private normalizeSignupAttribution(userData: Record<string, unknown>): SignupAttribution | undefined {
    const rawAttribution = userData.signupAttribution ?? userData.SignupAttribution;
    if (!rawAttribution || typeof rawAttribution !== 'object') {
      return undefined;
    }

    const attribution = rawAttribution as Record<string, unknown>;
    const normalized: SignupAttribution = {
      source:
        typeof attribution.source === 'string'
          ? attribution.source
          : typeof attribution.Source === 'string'
            ? attribution.Source
            : undefined,
      medium:
        typeof attribution.medium === 'string'
          ? attribution.medium
          : typeof attribution.Medium === 'string'
            ? attribution.Medium
            : undefined,
      campaign:
        typeof attribution.campaign === 'string'
          ? attribution.campaign
          : typeof attribution.Campaign === 'string'
            ? attribution.Campaign
            : undefined,
      trafficSource:
        typeof attribution.trafficSource === 'string'
          ? attribution.trafficSource
          : typeof attribution.TrafficSource === 'string'
            ? attribution.TrafficSource
            : undefined,
      trafficMedium:
        typeof attribution.trafficMedium === 'string'
          ? attribution.trafficMedium
          : typeof attribution.TrafficMedium === 'string'
            ? attribution.TrafficMedium
            : undefined,
      trafficCampaign:
        typeof attribution.trafficCampaign === 'string'
          ? attribution.trafficCampaign
          : typeof attribution.TrafficCampaign === 'string'
            ? attribution.TrafficCampaign
            : undefined,
      trafficContent:
        typeof attribution.trafficContent === 'string'
          ? attribution.trafficContent
          : typeof attribution.TrafficContent === 'string'
            ? attribution.TrafficContent
            : undefined,
      redditSubreddit:
        typeof attribution.redditSubreddit === 'string'
          ? attribution.redditSubreddit
          : typeof attribution.RedditSubreddit === 'string'
            ? attribution.RedditSubreddit
            : undefined,
      redditPostId:
        typeof attribution.redditPostId === 'string'
          ? attribution.redditPostId
          : typeof attribution.RedditPostId === 'string'
            ? attribution.RedditPostId
            : undefined,
      firstReferrerDomain:
        typeof attribution.firstReferrerDomain === 'string'
          ? attribution.firstReferrerDomain
          : typeof attribution.FirstReferrerDomain === 'string'
            ? attribution.FirstReferrerDomain
            : undefined,
      capturedAt:
        typeof attribution.capturedAt === 'string'
          ? attribution.capturedAt
          : typeof attribution.CapturedAt === 'string'
            ? attribution.CapturedAt
            : undefined,
    };

    if (
      !normalized.source &&
      !normalized.medium &&
      !normalized.campaign &&
      !normalized.trafficSource &&
      !normalized.trafficMedium &&
      !normalized.trafficCampaign &&
      !normalized.trafficContent &&
      !normalized.redditSubreddit &&
      !normalized.redditPostId &&
      !normalized.firstReferrerDomain &&
      !normalized.capturedAt
    ) {
      return undefined;
    }

    return normalized;
  }

  private warmProfileArtworkCache(user: AuthUser | null) {
    const userIdentifier = user?.username || user?.id;
    if (!userIdentifier) return;
    if (this.lastArtworkWarmupUserId === userIdentifier) return;

    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/profile')) {
      return;
    }

    this.lastArtworkWarmupUserId = userIdentifier;
    void prefetchProfileArtwork(userIdentifier).catch(() => {});
  }

  async clearTokens() {
    await platformConnectService.clearAppleMusicAuthorization();
    pendingActionService.clear();
  }

  async signUp({ email, password, username, acceptTerms }: SignUpForm) {
    if (!acceptTerms) {
      throw new Error('Please agree to all the terms and conditions before signing up');
    }

    void captureClientEvent('auth_signup_submitted', {
      source_surface: 'auth',
      route: typeof window !== 'undefined' ? window.location.pathname : '/auth/signup',
      is_authenticated: false,
    });

    const response = await fetch(`${AUTH_API_BASE}/signup`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password,
        username: username.trim().toLowerCase(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create account');
    }

    const signedIn = readSignedInBody(data);
    if (signedIn) {
      const user = this.startSession(signedIn);

      void captureClientEvent('auth_signed_up', {
        source_surface: 'auth',
        route: typeof window !== 'undefined' ? window.location.pathname : '/auth/signup',
        is_authenticated: true,
        user_id: user.id,
        auth_provider: 'email',
      });
    }

    return data;
  }

  async signIn({ email, password }: SignInForm) {
    void captureClientEvent('auth_signin_submitted', {
      source_surface: 'auth',
      route: typeof window !== 'undefined' ? window.location.pathname : '/auth/signin',
      is_authenticated: false,
    });

    const response = await fetch(`${AUTH_API_BASE}/signin`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password,
      }),
    });

    const data = await response.json();
    const signedIn = readSignedInBody(data);
    if (!response.ok || !signedIn) {
      throw new Error(data.message || 'Failed to sign in');
    }

    this.startSession(signedIn);
    return data;
  }

  async signOut() {
    try {
      await fetch(`${AUTH_API_BASE}/signout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      appLogger.warn('signout_api_failed', { error });
    }

    await this.clearTokens();
    this.abortSessionRead();
    useAuthStore.getState().signOut();
  }

  async deleteAccount(): Promise<void> {
    const response = await fetch(`${AUTH_API_BASE}/account`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete account');
    }

    await this.clearTokens();
    this.abortSessionRead();
    useAuthStore.getState().signOut();
  }

  async signInWithProvider(provider: 'google' | 'apple') {
    if (provider !== 'google') {
      throw new Error('Only Google sign-in is implemented.');
    }

    void captureClientEvent('auth_google_oauth_started', {
      source_surface: 'auth',
      route: typeof window !== 'undefined' ? window.location.pathname : '/auth/signin',
      is_authenticated: false,
      source_platform: 'unknown',
    });

    const response = await fetch(`${AUTH_API_BASE}/google/init`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data: ApiResponsePayload = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok || !data.success || !data.authUrl) {
      appLogger.error('google_oauth_initiation_failed', {
        status: response.status,
        message: data.message,
        success: data.success,
        hasAuthUrl: Boolean(data.authUrl),
      });

      const details = data.message ? ` ${data.message}` : '';
      throw new Error(
        `Failed to initiate Google sign-in. Status: ${response.status}.${details}`
      );
    }

    window.location.href = data.authUrl;
  }

  async startPasswordResetSession(accessToken: string, refreshToken: string) {
    const response = await fetch(`${AUTH_API_BASE}/reset/session`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
        refreshToken,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to validate reset session');
    }

    return data;
  }

  async hasPasswordResetSession() {
    const response = await fetch(`${AUTH_API_BASE}/reset/session`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success === true;
  }

  async resetPassword(email: string) {
    const response = await fetch(`${AUTH_API_BASE}/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to reset password');
    }

    return data;
  }

  async updatePassword(password: string) {
    const response = await fetch(`${AUTH_API_BASE}/update-password`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update password');
    }

    const signedIn = readSignedInBody(data);
    if (signedIn) {
      this.startSession(signedIn);
    }

    return data;
  }

  private mapToAuthUser(userData: Record<string, unknown>): AuthUser {
    const userId = userData.userId || userData.UserId || userData.id;
    const username = userData.username || userData.Username;
    const bio = userData.bio || userData.Bio;
    const isOnboardedRaw = userData.isOnboarded ?? userData.IsOnboarded ?? userData.is_onboarded;
    const accountTypeRaw = userData.accountType ?? userData.AccountType ?? userData.account_type;
    const likedPostsPrivacyRaw = userData.likedPostsPrivacy ?? userData.LikedPostsPrivacy;
    const signupAttribution = this.normalizeSignupAttribution(userData);

    return {
      id: String(userId || ''),
      email: String(userData.email || userData.Email || ''),
      username: String(username || ''),
      displayName: String(userData.displayName || userData.DisplayName || username || ''),
      bio: bio ? String(bio) : undefined,
      likedPostsPrivacy:
        likedPostsPrivacyRaw === 'private'
          ? 'private'
          : likedPostsPrivacyRaw === 'public'
            ? 'public'
            : undefined,
      profilePicture: this.resolveAvatarUrl(userData),
      isEmailVerified: true,
      isOnboarded:
        isOnboardedRaw === true ||
        isOnboardedRaw === 'true' ||
        isOnboardedRaw === 1 ||
        isOnboardedRaw === '1',
      accountType: accountTypeRaw as AuthUser['accountType'],
      createdAt: String(userData.joinDate || userData.createdAt || new Date().toISOString()),
      updatedAt: String(userData.updatedAt || new Date().toISOString()),
      connectedServices: this.normalizeConnectedServices(userData),
      signupAttribution,
    };
  }

  normalizeAuthUser(userData: Record<string, unknown>): AuthUser {
    return this.mapToAuthUser(userData);
  }

  private startSession({ user: userData, counts }: SignedInBody): AuthUser {
    this.abortSessionRead();
    if (counts) {
      return this.applySession(userData, counts);
    }
    const user = this.mapToAuthUser(userData);
    useAuthStore.getState().setSessionError(user);
    this.warmProfileArtworkCache(user);
    return user;
  }

  private applySession(userData: SessionUser, counts: FeedSourceCounts): AuthUser {
    const current = useAuthStore.getState().user;
    const json = JSON.stringify(userData);
    // An unchanged account keeps its user object, so a periodic read does not
    // re-run the effects keyed on it (profile editing, page-view analytics).
    // Only the object built from this same payload qualifies; a profile edit
    // or another sign-in in between replaced it.
    const applied = this.appliedSessionUser;
    const user = applied && applied.user === current && applied.json === json
      ? applied.user
      : this.mapToAuthUser(userData);
    this.appliedSessionUser = { json, user };
    useAuthStore.getState().setSession({ user, ...counts });
    this.warmProfileArtworkCache(user);
    return user;
  }

  private abortSessionRead() {
    this.sessionRead?.controller.abort();
    this.sessionRead = null;
    useAuthStore.getState().setRefreshingSession(false);
  }

  private async fetchSession(signal: AbortSignal): Promise<SessionRead> {
    try {
      const response = await fetch(`${AUTH_API_BASE}/session`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
      const body: unknown = response.status === 200 ? await response.json().catch(() => null) : null;
      return readSessionResponse(response.status, body);
    } catch (error) {
      if (!signal.aborted) {
        appLogger.warn('session_fetch_failed', { error });
      }
      return { kind: 'error' };
    }
  }

  refreshSession({ restart = false }: { restart?: boolean } = {}): Promise<SessionRefresh> {
    if (this.sessionRead && !restart) {
      return this.sessionRead.promise;
    }

    this.sessionRead?.controller.abort();
    const controller = new AbortController();
    useAuthStore.getState().setRefreshingSession(true);
    const promise = this.fetchSession(controller.signal)
      .then((read): SessionRefresh | Promise<SessionRefresh> => {
        if (controller.signal.aborted) {
          return this.sessionRead?.promise ?? { kind: 'superseded' };
        }
        this.endSessionRead(controller);
        switch (read.kind) {
          case 'authenticated':
            return { kind: 'authenticated', user: this.applySession(read.user, read.counts) };
          case 'signed-out':
            useAuthStore.getState().signOut();
            return read;
          case 'error':
            useAuthStore.getState().setSessionError();
            return read;
        }
      })
      .finally(() => this.endSessionRead(controller));
    this.sessionRead = { promise, controller };
    return promise;
  }

  private endSessionRead(controller: AbortController) {
    if (this.sessionRead?.controller !== controller) return;
    this.sessionRead = null;
    useAuthStore.getState().setRefreshingSession(false);
  }

  initializeAuthListener() {
    if (this.initialized) {
      return () => {};
    }

    this.initialized = true;
    void this.refreshSession();

    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      const { user, sessionError, sessionCheckedAt } = useAuthStore.getState();
      if (!user && !sessionError) return;
      if (sessionCheckedAt !== null && Date.now() - sessionCheckedAt < SESSION_MAX_AGE_MS) return;
      void this.refreshSession();
    };
    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', refreshIfStale);

    return () => {
      this.initialized = false;
      window.removeEventListener('focus', refreshIfStale);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }
}

export const authService = new AuthService();

'use client';

import { useAuthStore } from '@/stores/auth-store';
import { AuthUser, SignInForm, SignUpForm, ConnectedService, SignupAttribution } from '@/types';
import { prefetchProfileArtwork } from '@/services/profile-artwork-cache';
import { platformConnectService } from '@/services/platform-connect';
import { captureClientEvent } from '@/lib/analytics/client';
import { pendingActionService } from '@/utils/pending-action';

const AUTH_API_BASE = '/api/auth';
const PLATFORM_BY_ENUM_INDEX = ['Spotify', 'AppleMusic', 'Deezer'] as const;

class AuthService {
  private initialized = false;
  private lastArtworkWarmupUserId: string | null = null;

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
        if (!service || typeof service !== 'object') {
          return null;
        }

        const payload = service as Record<string, unknown>;
        const rawType = payload.serviceType ?? payload.ServiceType;
        const serviceType =
          typeof rawType === 'number'
            ? PLATFORM_BY_ENUM_INDEX[rawType] ?? String(rawType)
            : typeof rawType === 'string'
              ? rawType
              : '';

        if (!serviceType) {
          return null;
        }

        const connectedAt = payload.connectedAt ?? payload.ConnectedAt;
        return {
          serviceType,
          connectedAt: typeof connectedAt === 'string' ? connectedAt : new Date().toISOString(),
          profileUrl:
            typeof payload.profileUrl === 'string'
              ? payload.profileUrl
              : typeof payload.ProfileUrl === 'string'
                ? payload.ProfileUrl
                : undefined,
        };
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

    if (data.success && data.authenticated === true && data.user) {
      const user = this.mapToAuthUser(data.user);
      useAuthStore.getState().setUser(user);
      this.warmProfileArtworkCache(user);
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
    if (!response.ok || !data.success || data.authenticated !== true || !data.user) {
      throw new Error(data.message || 'Failed to sign in');
    }

    const user = this.mapToAuthUser(data.user);
    useAuthStore.getState().setUser(user);
    this.warmProfileArtworkCache(user);
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
      console.error('Sign out API error:', error);
    }

    await this.clearTokens();
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

    const data = await response.json();
    if (!response.ok || !data.success || !data.authUrl) {
      throw new Error(data.message || 'Failed to initiate Google sign-in.');
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

    if (data.user) {
      const user = this.mapToAuthUser(data.user);
      useAuthStore.getState().setUser(user);
      this.warmProfileArtworkCache(user);
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

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${AUTH_API_BASE}/session`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.success && data.user ? this.mapToAuthUser(data.user) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  initializeAuthListener() {
    if (this.initialized) {
      return () => {};
    }

    this.initialized = true;
    const { setUser, setLoading } = useAuthStore.getState();
    setLoading(true);

    let cancelled = false;
    this.getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setUser(user);
        this.warmProfileArtworkCache(user);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      this.initialized = false;
    };
  }
}

export const authService = new AuthService();

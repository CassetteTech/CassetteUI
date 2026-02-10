'use client';

import { useAuthStore } from '@/stores/auth-store';
import { AuthUser, SignInForm, SignUpForm, ConnectedService } from '@/types';
import { prefetchProfileArtwork } from '@/services/profile-artwork-cache';

// Use your local API URL for development
const API_URL = process.env.NEXT_PUBLIC_API_URL_LOCAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class AuthService {
  private sessionIntervalId: number | null = null;
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
  
  private warmProfileArtworkCache(user: AuthUser | null) {
    const userIdentifier = user?.username || user?.id;
    if (!userIdentifier) return;
    if (this.lastArtworkWarmupUserId === userIdentifier) return;

    // Avoid duplicate load pressure when profile page is already requesting activity.
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/profile')) {
      return;
    }

    this.lastArtworkWarmupUserId = userIdentifier;
    void prefetchProfileArtwork(userIdentifier).catch(() => {});
  }

  // Store tokens securely
  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  }

  async signUp({ email, password, username, acceptTerms }: SignUpForm) {
    if (!acceptTerms) {
      throw new Error('Please agree to all the terms and conditions before signing up');
    }

    const url = `${API_URL}/api/v1/auth/signup`;
    const payload = {
      email: email.toLowerCase().trim(),
      password,
      username: username.trim().toLowerCase(),
    };

    console.log('🔄 [Auth] Starting signup request');
    console.log('🔄 [Auth] API_URL:', API_URL);
    console.log('🔄 [Auth] Full URL:', url);
    console.log('🔄 [Auth] Payload:', { ...payload, password: '[REDACTED]' });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('✅ [Auth] Response received:', response.status, response.statusText);

    const data = await response.json();
    console.log('📦 [Auth] Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create account');
    }

    // Check if we got a successful response
    if (data.success) {
      if (data.user && data.token) {
        console.log('✅ [Auth] Storing tokens and user data');
        console.log('📦 [Auth] User data from server:', data.user);
        
        // Store tokens
        this.setTokens(data.token, data.refreshToken || '');
        
        // Normalize user data like Flutter does
        const normalizedUser = {
          ...data.user,
          userId: data.user.userId || data.user.UserId || data.user.id,
          authUserId: data.user.authUserId || data.user.AuthUserId,
          username: data.user.username || data.user.Username,
          email: data.user.email || data.user.Email,
          bio: data.user.bio || data.user.Bio || null,
          avatarUrl: this.resolveAvatarUrl(data.user),
          joinDate: data.user.joinDate || data.user.JoinDate || new Date().toISOString(),
        };
        
        console.log('✅ [Auth] Normalized user data:', normalizedUser);
        localStorage.setItem('user_data', JSON.stringify(normalizedUser));
        
        // Update auth store with the proper auth user format
        const authUser = this.mapToAuthUser(normalizedUser);
        useAuthStore.getState().setUser(authUser);
        this.warmProfileArtworkCache(authUser);
        
        console.log('✅ [Auth] Auth user stored in state:', authUser);
        
        // Add delay like Flutter to ensure state updates propagate
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.log('ℹ️ [Auth] Signup successful but no token returned (Email confirmation likely required).');
      }

      return data;
    }

    console.error('❌ [Auth] Invalid response structure:', data);
    throw new Error('Invalid response from server');
  }

  async signIn({ email, password }: SignInForm) {
    const response = await fetch(`${API_URL}/api/v1/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to sign in');
    }

    // Store tokens and user data
    this.setTokens(data.token, data.refreshToken);
    const normalizedUser = {
      ...data.user,
      userId: data.user.id || data.user.userId,
      authUserId: data.user.authUserId,
    };
    
    localStorage.setItem('user_data', JSON.stringify(normalizedUser));
    
    // Update auth store
    const authUser = this.mapToAuthUser(normalizedUser);
    useAuthStore.getState().setUser(authUser);
    this.warmProfileArtworkCache(authUser);

    return data;
  }

  async signOut() {
    try {
      // Call backend signout endpoint if available
      const token = this.getAccessToken();
      if (token) {
        await fetch(`${API_URL}/api/v1/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Sign out API error:', error);
    }

    // Clear local storage and update store
    this.clearTokens();
    useAuthStore.getState().signOut();
  }

  async deleteAccount(): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('🔄 [Auth] Starting account deletion request');

    const response = await fetch(`${API_URL}/api/v1/auth/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('📦 [Auth] Delete account response:', data);

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete account');
    }

    console.log('✅ [Auth] Account deleted successfully, clearing local data');

    // Clear tokens and sign out
    this.clearTokens();
    useAuthStore.getState().signOut();
  }

  async signInWithProvider(provider: 'google' | 'apple') {
    if (provider !== 'google') {
      throw new Error('Only Google sign-in is implemented.');
    }

    const response = await fetch(`${API_URL}/api/v1/auth/google/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/auth/google/callback`,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.authUrl) {
      throw new Error(data.message || 'Failed to initiate Google sign-in.');
    }

    window.location.href = data.authUrl;
  }

  async handleGoogleCallback(code: string, state: string) {
    const response = await fetch(`${API_URL}/api/v1/auth/google/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to handle Google callback.');
    }

    this.setTokens(data.token, data.refreshToken);
    const fresh = await this.getCurrentUser().catch(() => null);
    const authUser = fresh ?? this.mapToAuthUser(data.user);
    useAuthStore.getState().setUser(authUser);
    this.warmProfileArtworkCache(authUser);

    return authUser;
  }

  async handleOAuthCallback(accessToken: string, refreshToken: string) {
    console.log('🟪 [AuthService] handleOAuthCallback called');
    console.log('🟪 [AuthService] Token length:', accessToken.length);

    try {
      // 1. Store tokens
      this.setTokens(accessToken, refreshToken);
      console.log('🟪 [AuthService] Tokens saved to localStorage');
      
      // 2. Verify we can read them back
      const stored = this.getAccessToken();
      if (stored !== accessToken) {
        throw new Error('LocalStorage failed to save token');
      }

      // 3. Fetch User
      console.log('🟪 [AuthService] Fetching user profile...');
      const user = await this.getCurrentUser();

      if (!user) {
        console.error('🟥 [AuthService] getCurrentUser returned null after token set');
        throw new Error('Failed to fetch user profile with new token');
      }

      useAuthStore.getState().setUser(user);
      this.warmProfileArtworkCache(user);
      try { localStorage.setItem('user_data', JSON.stringify(user)); } catch {}
      console.log('🟩 [AuthService] User successfully set in store:', user.email);
      
      return user;
    } catch (e) {
      console.error('🟥 [AuthService] Error in handleOAuthCallback:', e);
      // Clear bad tokens so we don't get stuck in a weird state
      this.clearTokens();
      throw e;
    }
  }

  async resetPassword(email: string) {
    const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
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
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/api/v1/auth/update-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update password');
    }

    return data;
  }

  private mapToAuthUser(userData: Record<string, unknown>): AuthUser {
    // Handle both camelCase and PascalCase field names from backend
    const userId = userData.userId || userData.UserId || userData.id;
    const username = userData.username || userData.Username;
    const bio = userData.bio || userData.Bio;

    return {
      id: String(userId || ''),
      email: String(userData.email || userData.Email || ''),
      username: String(username || ''),
      displayName: String(userData.displayName || username || ''),
      bio: bio ? String(bio) : undefined,
      profilePicture: this.resolveAvatarUrl(userData),
      isEmailVerified: true, // Assume verified if coming from backend
      isOnboarded: Boolean(userData.isOnboarded || userData.IsOnboarded || false),
      createdAt: String(userData.joinDate || userData.createdAt || new Date().toISOString()),
      updatedAt: String(userData.updatedAt || new Date().toISOString()),
      // Include connected services from backend
      connectedServices: (userData.connectedServices as ConnectedService[]) || [],
    };
  }

  normalizeAuthUser(userData: Record<string, unknown>): AuthUser {
    return this.mapToAuthUser(userData);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getAccessToken();
    if (!token) {
      console.log('🔄 [Auth] No access token found');
      return null;
    }

    try {
      console.log('🔄 [Auth] Fetching current user session');
      const response = await fetch(`${API_URL}/api/v1/auth/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ [Auth] Session response:', response.status, response.statusText);

      if (!response.ok) {
        // Try to refresh token
        console.log('🔄 [Auth] Session failed, attempting token refresh');
        const refreshed = await this.refreshSession();
        if (refreshed) {
          return this.getCurrentUser();
        }
        return null;
      }

      const data = await response.json();
      console.log('📦 [Auth] Session data:', data);
      
      if (data.success && data.user) {
        return this.mapToAuthUser(data.user);
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async refreshSession() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.setTokens(data.token, data.refreshToken);
        if (data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  // Initialize auth state listener
  initializeAuthListener() {
    if (this.initialized) {
      // Already initialized; return a no-op disposer
      return () => {};
    }
    this.initialized = true;

    const { setUser, setLoading } = useAuthStore.getState();
    setLoading(true);

    let cancelled = false;
    this.getCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        this.warmProfileArtworkCache(u);
      })
      .finally(() => !cancelled && setLoading(false));

    this.sessionIntervalId = window.setInterval(() => {
      this.getCurrentUser().then((user) => {
        if (user) useAuthStore.getState().setUser(user);
        else {
          this.clearTokens();
          useAuthStore.getState().setUser(null);
        }
      });
    }, 4 * 60 * 1000);

    // Return disposer for React effect cleanup
    return () => {
      cancelled = true;
      if (this.sessionIntervalId !== null) {
        clearInterval(this.sessionIntervalId);
        this.sessionIntervalId = null;
      }
      this.initialized = false;
    };
  }
}

export const authService = new AuthService();

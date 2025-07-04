import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { AuthUser, SignInForm, SignUpForm } from '@/types';

class AuthService {
  async signUp({ email, password, username }: SignUpForm) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) throw error;
    return data;
  }

  async signIn({ email, password }: SignInForm) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    useAuthStore.getState().signOut();
  }

  async signInWithProvider(provider: 'google' | 'apple') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
  }

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return {
      id: user.id,
      email: user.email!,
      username: user.user_metadata?.username || '',
      displayName: user.user_metadata?.display_name || user.user_metadata?.username || '',
      profilePicture: user.user_metadata?.avatar_url || '',
      isEmailVerified: user.email_confirmed_at !== null,
      createdAt: user.created_at,
      updatedAt: user.updated_at!,
    };
  }

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  }

  // Initialize auth state listener
  initializeAuthListener() {
    const { setUser, setLoading } = useAuthStore.getState();

    setLoading(true);

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const user = await this.getCurrentUser();
        setUser(user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        const user = await this.getCurrentUser();
        setUser(user);
      }
      
      setLoading(false);
    });

    // Check initial session
    this.getCurrentUser().then(setUser).finally(() => setLoading(false));
  }
}

export const authService = new AuthService();
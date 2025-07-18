// Use the same API URL configuration as auth service
const API_URL = process.env.NEXT_PUBLIC_API_URL_LOCAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5173';

interface AppleMusicAuthService {
  getDeveloperToken(): Promise<string>;
  saveUserToken(musicUserToken: string): Promise<void>;
  authorize(): Promise<void>;
}

interface DeveloperTokenResponse {
  success: boolean;
  developerToken: string;
  message?: string;
}

interface UserTokenResponse {
  success: boolean;
  message: string;
}

declare global {
  interface Window {
    MusicKit: {
      configure: (options: {
        developerToken: string;
        app: {
          name: string;
          build: string;
        };
      }) => any;
      getInstance: () => {
        authorize: () => Promise<string>;
      };
    };
  }
}

class AppleMusicAuth implements AppleMusicAuthService {
  private getAuthHeaders(): HeadersInit {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      throw new Error('User not authenticated');
    }
    
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getDeveloperToken(): Promise<string> {
    const url = `${API_URL}/api/v1/music-services/apple-music/developer-token`;
    console.log('🎵 [Apple Music] Fetching developer token from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎵 [Apple Music] Developer token error:', response.status, errorText);
      throw new Error(`Failed to get developer token: ${response.status} ${errorText}`);
    }

    const data: DeveloperTokenResponse = await response.json();
    
    if (!data.success || !data.developerToken) {
      throw new Error(data.message || 'Failed to get developer token');
    }

    return data.developerToken;
  }

  async saveUserToken(musicUserToken: string): Promise<void> {
    const url = `${API_URL}/api/v1/music-services/apple-music/user-token`;
    console.log('🎵 [Apple Music] Saving user token to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ musicUserToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎵 [Apple Music] Save token error:', response.status, errorText);
      throw new Error(`Failed to save user token: ${response.status} ${errorText}`);
    }

    const data: UserTokenResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to save Apple Music token');
    }
  }

  async authorize(): Promise<void> {
    // Step 1: Get developer token
    const developerToken = await this.getDeveloperToken();

    // Step 2: Configure MusicKit
    const musicKit = window.MusicKit.configure({
      developerToken: developerToken,
      app: {
        name: 'CassetteBridge',
        build: '1.0.0',
      },
    });

    // Step 3: Authorize user and get user token
    const musicUserToken = await musicKit.authorize();

    if (!musicUserToken) {
      throw new Error('Authorization failed - no user token received');
    }

    // Step 4: Save user token to backend
    await this.saveUserToken(musicUserToken);
  }
}

export const appleMusicAuth = new AppleMusicAuth();
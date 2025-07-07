// Removed unused import since we use fetch directly

export interface MusicConnection {
  id: string;
  userId: string;
  service: 'spotify' | 'apple_music' | 'deezer' | 'tidal' | 'youtube_music';
  serviceUserId?: string;
  serviceUsername?: string;
  connectedAt: string;
  expiresAt?: string;
}

class MusicConnectionsService {
  async getUserConnections(): Promise<MusicConnection[]> {
    try {
      // Use the Next.js API route which forwards to your backend API
      const response = await fetch('/api/user/music-connections');
      
      if (!response.ok) {
        throw new Error('Failed to fetch music connections');
      }

      const data = await response.json();
      return data.connections || [];
    } catch (error) {
      console.error('Failed to fetch user music connections:', error);
      throw new Error('Failed to fetch music connections');
    }
  }

  async disconnectService(service: MusicConnection['service']): Promise<void> {
    try {
      // Use the Next.js API route which forwards to your backend API
      const response = await fetch(`/api/user/music-connections?service=${service}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect music service');
      }
    } catch (error) {
      console.error('Failed to disconnect music service:', error);
      throw new Error('Failed to disconnect music service');
    }
  }

  async isTokenExpired(connection: MusicConnection): Promise<boolean> {
    if (!connection.expiresAt) {
      return false; // No expiry means it doesn't expire (like Apple Music)
    }

    const expiryTime = new Date(connection.expiresAt);
    const now = new Date();
    
    // Add 5 minute buffer
    const bufferTime = new Date(now.getTime() + 5 * 60 * 1000);
    
    return expiryTime <= bufferTime;
  }

  async refreshSpotifyToken(): Promise<void> {
    try {
      // Your backend API should handle token refresh automatically
      // This would be triggered when the backend detects expired tokens
      console.log('Token refresh should be handled automatically by the backend');
    } catch (error) {
      console.error('Failed to refresh Spotify token:', error);
      throw error;
    }
  }
}

export const musicConnectionsService = new MusicConnectionsService();
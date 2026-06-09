import { apiService } from './api';
import { appLogger } from '@/lib/observability/logger';

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
      const data = await apiService.getMusicConnections();
      const normalizeService = (value: string): MusicConnection['service'] => {
        switch (value.toLowerCase()) {
          case 'applemusic':
          case 'apple_music':
            return 'apple_music';
          case 'youtube_music':
          case 'youtubemusic':
            return 'youtube_music';
          default:
            return value.toLowerCase() as MusicConnection['service'];
        }
      };

      return (data.services || []).map((service) => ({
        id: service,
        userId: '',
        service: normalizeService(service),
        connectedAt: new Date().toISOString(),
      }));
    } catch (error) {
      appLogger.error('music_connections_fetch_failed', { error });
      throw new Error('Failed to fetch music connections');
    }
  }

  async disconnectService(service: MusicConnection['service']): Promise<void> {
    try {
      await apiService.disconnectMusicService(service);
    } catch (error) {
      appLogger.error('music_connection_disconnect_failed', { error, service });
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
      appLogger.debug('spotify_token_refresh_delegated');
    } catch (error) {
      appLogger.error('spotify_token_refresh_failed', { error });
      throw error;
    }
  }
}

export const musicConnectionsService = new MusicConnectionsService();

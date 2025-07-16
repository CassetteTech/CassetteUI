import { UserBio, PaginatedActivityResponse } from '@/types';

export class ProfileService {
  private bioCache = new Map<string, { bio: UserBio; timestamp: number }>();
  private activityCache = new Map<string, { activity: PaginatedActivityResponse; timestamp: number }>();
  private readonly cacheDuration = 5 * 60 * 1000; // 5 minutes

  async fetchUserBio(userIdentifier: string): Promise<UserBio> {
    try {
      // Handle edit path
      const path = userIdentifier === 'edit' 
        ? '/api/v1.0/profile/edit/bio' 
        : `/api/v1.0/profile/${userIdentifier}/bio`;

      console.log('🔍 Fetching bio from:', path);
      
      // Use the existing apiService request method
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_LOCAL}${path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        return data as UserBio;
      } else if (response.status === 404) {
        console.log('❌ User not found:', userIdentifier);
        throw new Error('User not found');
      } else {
        console.log('❌ Error fetching bio:', response.status);
        throw new Error('Failed to load profile');
      }
    } catch (e) {
      console.log('❌ Bio fetch error:', e);
      throw e;
    }
  }

  async fetchUserActivity(
    userIdentifier: string,
    options: {
      page?: number;
      pageSize?: number;
      elementType?: string;
    } = {}
  ): Promise<PaginatedActivityResponse> {
    try {
      const { page = 1, pageSize = 20, elementType } = options;
      
      // Handle edit path
      const path = userIdentifier === 'edit'
        ? '/api/v1.0/profile/edit/activity'
        : `/api/v1.0/profile/${userIdentifier}/activity`;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (elementType) {
        queryParams.append('elementType', elementType);
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL_LOCAL}${path}?${queryParams}`;
      
      console.log('🔍 Fetching activity from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      if (response.status === 200) {
        const json = await response.json();
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: json.items?.map((item: any) => ({
            postId: item.postId,
            elementType: item.elementType,
            title: item.title,
            subtitle: item.subtitle,
            imageUrl: item.imageUrl,
            username: item.username,
            userId: item.userId,
            createdAt: item.createdAt,
          })) || [],
          page: json.page || page,
          totalItems: json.totalItems || 0,
          totalPages: json.totalPages || 0,
          hasNext: json.hasNext || false,
          hasPrevious: json.hasPrevious || false,
        };
      } else if (response.status === 404) {
        console.log('❌ User not found:', userIdentifier);
        throw new Error('User not found');
      } else {
        console.log('❌ Error fetching activity:', response.status);
        throw new Error('Failed to load activity');
      }
    } catch (e) {
      console.log('❌ Activity fetch error:', e);
      throw e;
    }
  }

  // Convenience methods for specific element types
  async fetchUserTracks(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Track',
    });
  }

  async fetchUserAlbums(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Album',
    });
  }

  async fetchUserArtists(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Artist',
    });
  }

  async fetchUserPlaylists(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Playlist',
    });
  }

  async updateProfile(data: {
    username?: string;
    fullName?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_LOCAL}/api/v1.0/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
        body: JSON.stringify(data),
      });

      if (response.status !== 200) {
        throw new Error('Failed to update profile');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to update profile');
      }
    } catch (e) {
      throw new Error(`Error updating profile: ${e}`);
    }
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_LOCAL}/api/v1.0/user/check-username/${username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        return data.available;
      }
      return false;
    } catch (e) {
      console.log('❌ Error checking username availability:', e);
      return false;
    }
  }
}

export const profileService = new ProfileService();
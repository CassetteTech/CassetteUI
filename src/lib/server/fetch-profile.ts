import { cache } from 'react';
import { getApiUrl } from '@/lib/utils/url';
import { appLogger } from '@/lib/observability/logger';

interface ProfileMetadata {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

interface ProfilePayload {
  username?: string;
  Username?: string;
  displayName?: string;
  DisplayName?: string;
  bio?: string;
  Bio?: string;
  avatarUrl?: string;
  AvatarUrl?: string;
}

export const fetchProfileForMetadata = cache(async function fetchProfileForMetadata(
  username: string,
): Promise<ProfileMetadata | null> {
  try {
    const response = await fetch(
      `${getApiUrl()}/api/v1/profile/${encodeURIComponent(username)}/bio`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(2000),
      },
    );

    if (!response.ok) {
      appLogger.warn('metadata_profile_fetch_failed', {
        profile_username: username,
        http_status: response.status,
      });
      return null;
    }

    const profile = (await response.json()) as ProfilePayload;
    const resolvedUsername = profile.username || profile.Username;
    if (!resolvedUsername) return null;

    return {
      username: resolvedUsername,
      displayName: profile.displayName || profile.DisplayName || resolvedUsername,
      bio: profile.bio || profile.Bio || '',
      avatarUrl: profile.avatarUrl || profile.AvatarUrl,
    };
  } catch (error) {
    appLogger.warn('metadata_profile_fetch_failed', { error, profile_username: username });
    return null;
  }
});

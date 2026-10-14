import { clientConfig } from '@/lib/config-client';
import { PLAYLIST_CREATION_PLATFORM_UI_KEYS, type PlatformUiKey } from '@/lib/platforms';

/**
 * While Spotify copies go to Cassette's own account, a Spotify copy is one public playlist that every
 * fan opens, not a copy in the fan's account. Spotify is then a listen row, never a copy button.
 */
export function sharesCassetteSpotifyCopy(sourcePlatform: PlatformUiKey | null | undefined): boolean {
  return clientConfig.features.useCassetteSpotifyAccount && sourcePlatform !== 'spotify';
}

/** The services a playlist's copy block offers: each one with nothing to open, where the copy is the fan's. */
export function playlistCopyTargets(
  sourcePlatform: PlatformUiKey | null | undefined,
  listenLinks: Partial<Record<PlatformUiKey, string>>,
): PlatformUiKey[] {
  return PLAYLIST_CREATION_PLATFORM_UI_KEYS.filter(
    (platform) => !listenLinks[platform] && !(platform === 'spotify' && sharesCassetteSpotifyCopy(sourcePlatform)),
  );
}

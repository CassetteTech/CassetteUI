import { clientConfig } from '@/lib/config-client';
import { getPlatformDefinition, PLAYLIST_CREATION_PLATFORM_UI_KEYS, type PlatformKey, type PlatformUiKey } from '@/lib/platforms';
import { detectContentType } from '@/utils/content-type-detection';

/** A value for some of the services, by service: a playlist's links, or a problem with each. */
export type ByService<T> = Partial<Record<PlatformUiKey, T>>;

/** Owner link changes as Bridge takes them: a link sets that platform's link, null removes it. */
export type BridgePlatformLinkChanges = Partial<Record<PlatformKey, string | null>>;

/**
 * While Spotify copies go to Cassette's own account, a Spotify copy is one public playlist that every
 * fan opens, not a copy in the fan's account. The first fan's tap in the copy block makes it, with no
 * sign-in; from then on Spotify is a listen row that opens it.
 */
export function sharesCassetteSpotifyCopy(sourcePlatform: PlatformUiKey | null | undefined): boolean {
  return clientConfig.features.useCassetteSpotifyAccount && sourcePlatform !== 'spotify';
}

/** The caption of the Spotify listen row that opens Cassette's shared copy of a playlist. */
export const CASSETTE_SPOTIFY_COPY_CAPTION = 'Copy made by Cassette';

/** The services a playlist's copy block offers: each one with nothing to open. */
export function playlistCopyTargets(listenLinks: ByService<string>): PlatformUiKey[] {
  return PLAYLIST_CREATION_PLATFORM_UI_KEYS.filter((platform) => !listenLinks[platform]);
}

/** The services a playlist post takes its owner's own link for: every one but the source, which opens the original. */
export function curatorLinkPlatforms(sourcePlatform: PlatformUiKey | null | undefined): PlatformUiKey[] {
  return PLAYLIST_CREATION_PLATFORM_UI_KEYS.filter((platform) => platform !== sourcePlatform);
}

/** The owner's links that open as listen rows, in service order so the skeleton and the post agree. */
export function curatorListenRows(
  sourcePlatform: PlatformUiKey | null | undefined,
  links: ByService<string> | null | undefined,
): Array<[PlatformUiKey, string]> {
  return curatorLinkPlatforms(sourcePlatform).flatMap((platform): Array<[PlatformUiKey, string]> => {
    const url = links?.[platform];
    return url ? [[platform, url]] : [];
  });
}

/** The caption of a listen row that opens the post owner's own link. Cassette cannot verify who made it. */
export function curatorLinkCaption(handle: string | null | undefined): string {
  return handle ? `Added by @${handle}` : 'Added by the curator';
}

/** Why a pasted link is not a playlist link from this service, or null. Bridge checks every link again. */
export function playlistLinkProblem(platform: PlatformUiKey, url: string): string | null {
  const definition = getPlatformDefinition(platform);
  const detected = detectContentType(url.trim());
  // A share link (spotify.link, link.deezer.com) names no type until Bridge resolves it.
  const typeKnown = detected.id !== '';
  return definition && detected.platform === definition.analyticsKey && (detected.type === 'playlist' || !typeKnown)
    ? null
    : `Use a playlist link from ${definition?.displayName ?? 'that service'}.`;
}

/** The problem with each filled-in link, by service. */
export function playlistLinkErrors(links: ByService<string>) {
  const errors: ByService<string> = {};
  for (const platform of PLAYLIST_CREATION_PLATFORM_UI_KEYS) {
    const url = links[platform]?.trim();
    const problem = url ? playlistLinkProblem(platform, url) : null;
    if (problem) errors[platform] = problem;
  }
  return errors;
}

/** Bridge's links (keyed by Bridge platform) keyed by service. */
export function fromBridgePlatformLinks(links: Record<string, string> | null | undefined) {
  const result: ByService<string> = {};
  for (const [platform, url] of Object.entries(links ?? {})) {
    const key = getPlatformDefinition(platform)?.uiKey;
    if (key && url) result[key] = url;
  }
  return result;
}

/** Owner links keyed the way Bridge stores platforms; an empty value removes that platform's link. */
export function toBridgePlatformLinks(links: ByService<string | null>) {
  const result: BridgePlatformLinkChanges = {};
  for (const [platform, url] of Object.entries(links)) {
    const key = getPlatformDefinition(platform)?.key;
    if (key) result[key] = url?.trim() || null;
  }
  return result;
}

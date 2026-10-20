import { z } from 'zod';
import {
  ElementType,
  type MediaListTrack,
  type MusicLinkConversion,
  type PostByIdResponse,
  type PostResponseTrack,
} from '@/types';
import { fromBridgePlatformLinks } from '@/lib/playlist-copy-placement';
import { detectContentType } from '@/utils/content-type-detection';
import { curatorFollowStateSchema } from '@/services/curator';

const postCuratorSchema = z.object({
  curatorProfileId: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  membership: z.object({
    planName: z.string().min(1),
    amountMinor: z.number().int().nonnegative().safe(),
    serviceFeeMinor: z.number().int().nonnegative().safe(),
    currency: z.string().length(3),
    membersOnlyPostCount: z.number().int().nonnegative(),
    viewerIsMember: z.boolean(),
  }).nullable(),
  /** The follow endpoint's state for a signed-in viewer other than the owner; null otherwise. */
  viewerFollow: curatorFollowStateSchema.nullable(),
});

/** The curator behind a post's content; absent when the owner has no curator page or Bridge predates it. */
export type PostCurator = z.infer<typeof postCuratorSchema>;

export type PostPageData = Omit<MusicLinkConversion, 'conversionSuccessCount'> & {
  previewUrl?: string;
  description?: string;
  isRepost?: boolean;
  originalPostId?: string | null;
  redirectPostId?: string;
  paidPromotionCampaignId?: string | null;
  curatorId?: string | null;
  isMemberView?: boolean;
  curator?: PostCurator;
  cassetteSpotifyCopyUrl?: string | null;
  /** The owner's own link for each service on a playlist post. */
  curatorLinks?: Partial<Record<NormalizedPlatformKey, string>>;
  repostedByCurrentUser?: boolean;
  username?: string;
  userId?: string | null;
  createdAt?: string;
  genres?: string[];
  albumName?: string;
  releaseDate?: string | null;
  trackCount?: number;
  details?: { artists?: Array<{ name: string; role: string; }>; };
  musicElementId?: string;
  sourcePlatform?: string;
  privacy?: string;
  conversionSuccessCount?: number | null;
  likeCount?: number;
  likedByCurrentUser?: boolean;
  commentsEnabled?: boolean;
};

export type NormalizedPlatformKey = 'spotify' | 'appleMusic' | 'deezer';

export const normalizePlatformKey = (platform?: string | null): NormalizedPlatformKey | null => {
  if (!platform) return null;
  const normalized = platform.toLowerCase().replace(/[\s_-]/g, '');

  if (normalized === 'spotify') return 'spotify';
  if (normalized === 'deezer') return 'deezer';
  if (normalized === 'applemusic' || normalized === 'apple') return 'appleMusic';

  return null;
};

const normalizeElementType = (elementType?: string | null): 'track' | 'album' | 'artist' | 'playlist' => {
  const normalized = elementType?.toLowerCase();
  if (normalized === 'track' || normalized === 'album' || normalized === 'artist' || normalized === 'playlist') {
    return normalized;
  }
  return 'track';
};

const resolvePlatformUrl = (
  platform: NormalizedPlatformKey,
  platformData: { url?: string; uri?: string; platformSpecificId?: string; elementType?: string } | undefined,
  fallbackElementType: string | undefined,
): string => {
  const directUrl = platformData?.url?.trim();
  if (directUrl) {
    return directUrl;
  }

  const uriAsUrl = platformData?.uri?.trim();
  if (uriAsUrl && /^https?:\/\//i.test(uriAsUrl)) {
    return uriAsUrl;
  }

  const platformSpecificId = platformData?.platformSpecificId?.trim();
  if (!platformSpecificId) {
    return '';
  }

  const elementType = normalizeElementType(platformData?.elementType || fallbackElementType);

  if (platform === 'spotify') {
    return `https://open.spotify.com/${elementType}/${platformSpecificId}`;
  }

  if (platform === 'deezer') {
    return `https://www.deezer.com/${elementType}/${platformSpecificId}`;
  }

  const applePathType = elementType === 'track' ? 'song' : elementType;
  return `https://music.apple.com/us/${applePathType}/${platformSpecificId}`;
};

const buildArtistSearchUrl = (platform: NormalizedPlatformKey, artistName: string): string => {
  const query = encodeURIComponent(artistName.trim());
  if (!query) return '';

  if (platform === 'spotify') {
    return `https://open.spotify.com/search/${query}`;
  }

  if (platform === 'deezer') {
    return `https://www.deezer.com/search/${query}`;
  }

  return `https://music.apple.com/us/search?term=${query}`;
};

const optionalNumber = z.number().optional().catch(undefined);

const mapTracks = (tracks: PostResponseTrack[] | undefined, topLevel: boolean): MediaListTrack[] | undefined =>
  Array.isArray(tracks) && tracks.length > 0
    ? tracks.map((t, idx) => ({
        trackNumber: topLevel ? optionalNumber.parse(t.trackNumber) ?? idx + 1 : t.trackNumber,
        title: t.title ?? 'Untitled',
        duration: t.duration,
        artists: topLevel && t.artist ? [t.artist] : Array.isArray(t.artists) ? t.artists : undefined,
        previewUrl: t.previewUrl ?? undefined,
        isrc: t.isrc,
        spotifyTrackId: t.spotifyTrackId,
        appleMusicTrackId: t.appleMusicTrackId,
      }))
    : undefined;

export function parsePostResponse(response: PostByIdResponse, requestedPostId: string): PostPageData {
  const elementTypeLower = response.elementType?.toLowerCase();
  const typeVal = elementTypeLower === 'track'
    ? ElementType.TRACK
    : elementTypeLower === 'album'
      ? ElementType.ALBUM
      : elementTypeLower === 'artist'
        ? ElementType.ARTIST
        : ElementType.PLAYLIST;

  const originalLink =
    response.originalLink ||
    response.sourceUrl ||
    response.platforms?.spotify?.url ||
    response.platforms?.applemusic?.url ||
    response.platforms?.appleMusic?.url ||
    response.platforms?.deezer?.url ||
    '';
  const data: PostPageData = {
    originalUrl: originalLink,
    convertedUrls: {},
    metadata: {
      type: typeVal,
      title: response.details?.title || response.details?.name || response.name || 'Unknown',
      artist: response.details?.artist || '',
      artwork: response.details?.coverArtUrl || response.details?.imageUrl || response.imageUrl || '',
      duration: response.metadata?.duration || response.details?.duration || '',
    },
    description: response.description || response.caption,
    isRepost: Boolean(response.isRepost),
    originalPostId: response.originalPostId ?? null,
    redirectPostId: response.redirectPostId || response.postId || requestedPostId,
    paidPromotionCampaignId: response.paidPromotionCampaignId ?? null,
    curatorId: response.curatorId ?? null,
    isMemberView: response.isMemberView === true,
    curator: postCuratorSchema.optional().catch(undefined).parse(response.curator),
    cassetteSpotifyCopyUrl: response.cassetteSpotifyCopyUrl ?? null,
    curatorLinks: fromBridgePlatformLinks(response.curatorLinks),
    repostedByCurrentUser:
      response.repostedByCurrentUser === true ||
      response.RepostedByCurrentUser === true ||
      response.isRepostedByCurrentUser === true ||
      response.IsRepostedByCurrentUser === true,
    username: response.username,
    userId: response.userId ?? null,
    createdAt: response.createdAt,
    privacy: response.privacy,
    conversionSuccessCount: response.conversionSuccessCount,
    likeCount: optionalNumber.parse(response.likeCount) ?? 0,
    likedByCurrentUser: Boolean(response.likedByCurrentUser),
    commentsEnabled: response.commentsEnabled ?? true,
    genres: response.details?.genres || response.metadata?.genres || [],
    albumName: response.metadata?.albumName || response.details?.album || '',
    releaseDate: response.metadata?.releaseDate || response.details?.releaseDate || null,
    trackCount: optionalNumber.parse(response.details?.trackCount) ?? optionalNumber.parse(response.numberOfTracks),
    details: {
      artists: response.details?.artists || [],
    },
    musicElementId: response.musicElementId || '',
    // Some responses provide tracks at the top level.
    tracks: mapTracks(response.details?.tracks, false) ?? mapTracks(response.tracks, true),
    sourcePlatform: detectContentType(originalLink).platform,
    postId: response.postId || requestedPostId,
  };

  let fallbackArtwork = '';
  let fallbackPreview = '';
  if (response.platforms) {
    Object.entries(response.platforms).forEach(([platform, platformData]) => {
      const platformKey = normalizePlatformKey(platform);
      if (platformKey) {
        const resolvedUrl = resolvePlatformUrl(platformKey, platformData, elementTypeLower);
        if (resolvedUrl) {
          data.convertedUrls[platformKey] = resolvedUrl;
        }
      }

      if (platformData?.artworkUrl && !fallbackArtwork) {
        fallbackArtwork = platformData.artworkUrl;
      }

      if (platformData?.previewUrl && platformData.previewUrl.trim() !== '' && !fallbackPreview) {
        fallbackPreview = platformData.previewUrl;
      }
    });

    data.previewUrl = response.details?.previewUrl || fallbackPreview;
  }

  if (!data.metadata.artwork && fallbackArtwork) {
    data.metadata.artwork = fallbackArtwork;
  }

  // Artist posts can have partial platform data persisted in DB.
  // Keep destination buttons visible by falling back to platform search links.
  if (typeVal === ElementType.ARTIST) {
    const artistSearchName = (data.metadata.title || data.metadata.artist || '').trim();
    if (artistSearchName) {
      data.convertedUrls.spotify ||= buildArtistSearchUrl('spotify', artistSearchName);
      data.convertedUrls.appleMusic ||= buildArtistSearchUrl('appleMusic', artistSearchName);
      data.convertedUrls.deezer ||= buildArtistSearchUrl('deezer', artistSearchName);
    }
  }

  return data;
}

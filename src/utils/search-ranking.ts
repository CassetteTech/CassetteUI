import { Track, MusicSearchResult } from '@/types';

export interface RankedItem {
  id: string;
  title: string;
  artist?: string;
  type: 'track' | 'album' | 'artist' | 'playlist';
  artwork: string;
  externalUrls?: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
  isExplicit?: boolean;
}

/**
 * Normalize a string for comparison (lowercase, trim, remove special chars)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Create a deduplication key for tracks
 * Combines normalized title + artist to identify duplicates
 */
function createTrackKey(title: string, artist: string): string {
  return `${normalizeString(title)}|${normalizeString(artist)}`;
}

/**
 * Deduplicate tracks, preferring explicit versions
 */
function deduplicateTracks(tracks: Track[]): Track[] {
  const trackMap = new Map<string, Track>();

  for (const track of tracks) {
    const key = createTrackKey(track.title, track.artist);
    const existing = trackMap.get(key);

    if (!existing) {
      trackMap.set(key, track);
    } else if (track.isExplicit && !existing.isExplicit) {
      // Replace clean version with explicit version
      trackMap.set(key, track);
    }
    // If existing is explicit and current is not, keep existing
  }

  return Array.from(trackMap.values());
}

/**
 * Check if an artist name matches the query
 */
function artistMatchesQuery(artistName: string, query: string): boolean {
  const normalizedArtist = normalizeString(artistName);
  const normalizedQuery = normalizeString(query);

  // Exact match
  if (normalizedArtist === normalizedQuery) return true;

  // Query is contained in artist name (e.g., "drake" matches "Drake")
  if (normalizedArtist.includes(normalizedQuery)) return true;

  // Artist name is contained in query (e.g., "drake songs" -> "drake")
  if (normalizedQuery.includes(normalizedArtist) && normalizedArtist.length >= 3) return true;

  return false;
}

/**
 * Rank and combine search results intelligently
 *
 * Strategy:
 * 1. If query matches an artist name, prioritize that artist first
 * 2. Deduplicate tracks (prefer explicit versions)
 * 3. Show albums by matching artists next
 * 4. Then remaining content
 */
export function rankSearchResults(
  results: MusicSearchResult,
  query: string
): RankedItem[] {
  const items: RankedItem[] = [];

  // 1. Deduplicate tracks first
  const deduplicatedTracks = deduplicateTracks(results.tracks);

  // 2. Find artists that match the query
  const matchingArtists = results.artists.filter((artist) =>
    artistMatchesQuery(artist.name, query)
  );
  const nonMatchingArtists = results.artists.filter(
    (artist) => !artistMatchesQuery(artist.name, query)
  );

  // 3. Add matching artists first (high priority)
  for (const artist of matchingArtists) {
    items.push({
      id: artist.id,
      title: artist.name,
      type: 'artist',
      artwork: artist.artwork,
      externalUrls: artist.externalUrls,
    });
  }

  // 4. Add albums by matching artists next
  const matchingArtistNames = new Set(
    matchingArtists.map((a) => normalizeString(a.name))
  );

  const priorityAlbums = results.albums.filter((album) =>
    matchingArtistNames.has(normalizeString(album.artist))
  );
  const otherAlbums = results.albums.filter(
    (album) => !matchingArtistNames.has(normalizeString(album.artist))
  );

  for (const album of priorityAlbums.slice(0, 3)) {
    items.push({
      id: album.id,
      title: album.title,
      artist: album.artist,
      type: 'album',
      artwork: album.artwork,
      externalUrls: album.externalUrls,
    });
  }

  // 5. Add tracks (deduplicated)
  for (const track of deduplicatedTracks) {
    items.push({
      id: track.id,
      title: track.title,
      artist: track.artist,
      type: 'track',
      artwork: track.artwork,
      externalUrls: track.externalUrls,
      isExplicit: track.isExplicit,
    });
  }

  // 6. Add remaining albums
  for (const album of otherAlbums) {
    items.push({
      id: album.id,
      title: album.title,
      artist: album.artist,
      type: 'album',
      artwork: album.artwork,
      externalUrls: album.externalUrls,
    });
  }

  // 7. Add non-matching artists
  for (const artist of nonMatchingArtists) {
    items.push({
      id: artist.id,
      title: artist.name,
      type: 'artist',
      artwork: artist.artwork,
      externalUrls: artist.externalUrls,
    });
  }

  // 8. Add playlists last
  for (const playlist of results.playlists) {
    items.push({
      id: playlist.id,
      title: playlist.title,
      artist: playlist.owner,
      type: 'playlist',
      artwork: playlist.artwork,
      externalUrls: playlist.externalUrls,
    });
  }

  return items.slice(0, 50);
}

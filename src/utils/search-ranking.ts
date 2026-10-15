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

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function createTrackKey(title: string, artist: string): string {
  return `${normalizeString(title)}|${normalizeString(artist)}`;
}

function deduplicateTracks(tracks: Track[]): Track[] {
  const trackMap = new Map<string, Track>();

  for (const track of tracks) {
    const key = createTrackKey(track.title, track.artist);
    const existing = trackMap.get(key);

    if (!existing) {
      trackMap.set(key, track);
    } else if (track.isExplicit && !existing.isExplicit) {
      trackMap.set(key, track);
    }
  }

  return Array.from(trackMap.values());
}

function artistMatchesQuery(artistName: string, query: string): boolean {
  const normalizedArtist = normalizeString(artistName);
  const normalizedQuery = normalizeString(query);

  if (normalizedArtist === normalizedQuery) return true;

  if (normalizedArtist.includes(normalizedQuery)) return true;

  if (normalizedQuery.includes(normalizedArtist)) return true;

  return false;
}

export function rankSearchResults(
  results: MusicSearchResult,
  query: string
): RankedItem[] {
  const items: RankedItem[] = [];

  const deduplicatedTracks = deduplicateTracks(results.tracks);

  const matchingArtists = results.artists.filter((artist) =>
    artistMatchesQuery(artist.name, query)
  );
  const nonMatchingArtists = results.artists.filter(
    (artist) => !artistMatchesQuery(artist.name, query)
  );

  for (const artist of matchingArtists) {
    items.push({
      id: artist.id,
      title: artist.name,
      type: 'artist',
      artwork: artist.artwork,
      externalUrls: artist.externalUrls,
    });
  }

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

  for (const artist of nonMatchingArtists) {
    items.push({
      id: artist.id,
      title: artist.name,
      type: 'artist',
      artwork: artist.artwork,
      externalUrls: artist.externalUrls,
    });
  }

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

import type { MusicAudience, MusicType } from '@/components/features/curator/studio-routes';
import type { OwnerVisibility } from '@/components/features/post/post-visibility';

export const typeDetails = {
  playlists: { elementType: 'Playlist', label: 'Playlists', one: 'playlist', many: 'playlists' },
  tracks: { elementType: 'Track', label: 'Tracks', one: 'track', many: 'tracks' },
  albums: { elementType: 'Album', label: 'Albums', one: 'album', many: 'albums' },
  artists: { elementType: 'Artist', label: 'Artists', one: 'artist', many: 'artists' },
} satisfies Record<MusicType, { elementType: string; label: string; one: string; many: string }>;

export const audienceDetails = {
  public: { privacy: 'public', adjective: 'public' },
  members: { privacy: 'subscriber', adjective: 'members-only' },
  private: { privacy: 'private', adjective: 'private' },
} satisfies Record<MusicAudience, { privacy: OwnerVisibility; adjective: string }>;

export function nounsOf(type: MusicType | null) {
  return type ? typeDetails[type] : { one: 'post', many: 'posts' };
}

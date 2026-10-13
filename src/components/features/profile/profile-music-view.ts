/** The public page's Music views: everything, the members-only posts, or one type of music. A view
    lives in the URL, so a link opens the same view; the old `?tab=` links still open their type. */

import { musicTypes, type MusicType } from '../curator/studio-routes';
import type { CuratorElementType, CuratorPage, CuratorPageFilter } from '@/services/curator';

export type ProfileMusicView = 'all' | 'members' | MusicType;

export const musicViewLabels = {
  all: 'All',
  members: 'Members only',
  playlists: 'Playlists',
  tracks: 'Tracks',
  albums: 'Albums',
  artists: 'Artists',
} satisfies Record<ProfileMusicView, string>;

const elementTypeOf = {
  playlists: 'Playlist',
  tracks: 'Track',
  albums: 'Album',
  artists: 'Artist',
} satisfies Record<MusicType, CuratorElementType>;

/** The view a profile URL opens: `?type=` names a type, `?filter=members` the members-only posts.
    An old `?tab=playlists|tracks|albums|artists` link opens its type. */
export function profileMusicViewOf(params: URLSearchParams): ProfileMusicView {
  const type = params.get('type') ?? params.get('tab');
  const musicType = musicTypes.find((value) => value === type);
  if (musicType) return musicType;
  return params.get('filter') === 'members' ? 'members' : 'all';
}

/** The profile query with `view` written in, and the old `tab` value gone. Other values stay. */
export function withProfileMusicView(params: URLSearchParams, view: ProfileMusicView) {
  const next = new URLSearchParams(params);
  next.delete('tab');
  next.delete('type');
  next.delete('filter');
  if (view === 'members') next.set('filter', 'members');
  else if (view !== 'all') next.set('type', view);
  return next;
}

export function curatorPageFilterOf(view: ProfileMusicView): CuratorPageFilter {
  if (view === 'all') return { elementType: null, membersOnly: false };
  if (view === 'members') return { elementType: null, membersOnly: true };
  return { elementType: elementTypeOf[view], membersOnly: false };
}

/** The views a curator page offers. Members only, for a member, or for the owner of a live plan
    with member posts. A type, when the page holds two types or more; the open view always shows,
    so a link to an empty type keeps its pill. */
export function curatorMusicViews(page: CuratorPage, open: ProfileMusicView): ProfileMusicView[] {
  const memberPosts = page.membership?.benefits.some((benefit) => benefit.featureKey === 'member_posts') === true;
  const counted = new Set(page.posts.typeCounts?.map((count) => count.elementType));
  const types = new Set(musicTypes.filter((type) => counted.has(elementTypeOf[type])));
  return [
    'all',
    ...(page.viewer.isMember || (page.viewer.isOwner && memberPosts) || open === 'members' ? ['members' as const] : []),
    ...musicTypes.filter((type) => (types.size > 1 && types.has(type)) || type === open),
  ];
}

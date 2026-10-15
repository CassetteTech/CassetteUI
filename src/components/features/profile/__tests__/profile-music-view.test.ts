import assert from 'node:assert/strict';
import test from 'node:test';
import type { CuratorPage } from '../../../../services/curator';
import { AccountType } from '../../../../types';
import {
  curatorMusicViews,
  curatorPageFilterOf,
  profileMusicViewOf,
  withProfileMusicView,
} from '../profile-music-view';

const view = (query: string) => profileMusicViewOf(new URLSearchParams(query));

const page = (overrides: {
  viewer?: Partial<CuratorPage['viewer']>;
  memberPosts?: boolean;
  typeCounts?: NonNullable<CuratorPage['posts']['typeCounts']>;
}): CuratorPage => ({
  curator: {
    id: 'cpr_Test',
    username: 'crate',
    displayName: 'Crate',
    bio: null,
    avatarUrl: null,
    profileLinks: [],
    accountType: AccountType.REGULAR,
    headline: null,
    about: null,
    declaredGenres: [],
    declaredPlatforms: [],
    curatorSinceUtc: '2026-01-01T00:00:00Z',
  },
  membership: overrides.memberPosts === undefined ? null : {
    planId: 'mpl_Test',
    name: 'Crate Notes',
    description: '',
    amountMinor: 500,
    serviceFeeMinor: 50,
    annualAmountMinor: null,
    annualServiceFeeMinor: null,
    currency: 'USD',
    benefits: overrides.memberPosts ? [{ featureKey: 'member_posts', name: 'Member posts', description: '' }] : [],
  },
  viewer: { isOwner: false, isMember: false, hasMemberBadge: false, ...overrides.viewer },
  posts: { items: [], totalItems: 0, page: 1, pageSize: 20, typeCounts: overrides.typeCounts },
});

void test('a profile URL names its Music view, and old tab links open their type', () => {
  assert.equal(view(''), 'all');
  assert.equal(view('type=albums'), 'albums');
  assert.equal(view('tab=tracks'), 'tracks');
  assert.equal(view('tab=posts'), 'all');
  assert.equal(view('tab=liked'), 'all');
  assert.equal(view('filter=members'), 'members');
  assert.equal(view('type=podcasts'), 'all');
});

void test('writing a view drops the old tab value and keeps the rest of the query', () => {
  const params = new URLSearchParams('tab=playlists&membership=return&interval=year');
  assert.equal(withProfileMusicView(params, 'playlists').toString(), 'membership=return&interval=year&type=playlists');
  assert.equal(withProfileMusicView(new URLSearchParams('type=tracks'), 'members').toString(), 'filter=members');
  assert.equal(withProfileMusicView(new URLSearchParams('filter=members'), 'all').toString(), '');
});

void test('each view asks Bridge for one filter', () => {
  assert.deepEqual(curatorPageFilterOf('all'), { elementType: null, membersOnly: false });
  assert.deepEqual(curatorPageFilterOf('members'), { elementType: null, membersOnly: true });
  assert.deepEqual(curatorPageFilterOf('artists'), { elementType: 'Artist', membersOnly: false });
});

void test('a curator page offers types it holds, and Members only to members and to the owner of member posts', () => {
  const twoTypes = [{ elementType: 'Playlist' as const, count: 2 }, { elementType: 'Track' as const, count: 1 }];
  assert.deepEqual(curatorMusicViews(page({ typeCounts: twoTypes }), 'all'), ['all', 'playlists', 'tracks']);
  assert.deepEqual(
    curatorMusicViews(page({ typeCounts: twoTypes, memberPosts: true, viewer: { isMember: true } }), 'all'),
    ['all', 'members', 'playlists', 'tracks'],
  );
  assert.deepEqual(curatorMusicViews(page({ typeCounts: twoTypes, memberPosts: true, viewer: { isOwner: true } }), 'all'),
    ['all', 'members', 'playlists', 'tracks']);
  assert.deepEqual(curatorMusicViews(page({ typeCounts: twoTypes, memberPosts: false, viewer: { isOwner: true } }), 'all'),
    ['all', 'playlists', 'tracks']);
  assert.deepEqual(curatorMusicViews(page({ typeCounts: [{ elementType: 'Playlist', count: 3 }] }), 'all'), ['all']);
  assert.deepEqual(curatorMusicViews(page({ typeCounts: [{ elementType: 'Playlist', count: 3 }] }), 'albums'), ['all', 'albums']);
});

import './browser-service-environment';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ElementType, type PostByIdResponse } from '../../types';
import { parsePostResponse } from '../post-response';

const post = (overrides: Partial<PostByIdResponse> = {}): PostByIdResponse => ({
  success: true,
  postId: 'post-1',
  elementType: 'Track',
  musicElementId: 'track-1',
  details: { title: 'Night Drive', artist: 'Mia Groove' },
  ...overrides,
});

void test('platform links come from the URL, an http URI, or a rebuilt platform ID', () => {
  const parsed = parsePostResponse(post({
    originalLink: 'https://open.spotify.com/track/abc',
    platforms: {
      spotify: { url: ' https://open.spotify.com/track/abc ', artworkUrl: 'https://img.test/a.jpg', previewUrl: ' ' },
      deezer: { url: '', uri: 'https://www.deezer.com/track/9', previewUrl: 'https://preview.test/9.mp3' },
      AppleMusic: { url: '', platformSpecificId: '42' },
    },
  }), 'requested');

  assert.deepEqual(parsed.convertedUrls, {
    spotify: 'https://open.spotify.com/track/abc',
    deezer: 'https://www.deezer.com/track/9',
    appleMusic: 'https://music.apple.com/us/song/42',
  });
  assert.equal(parsed.metadata.type, ElementType.TRACK);
  assert.equal(parsed.metadata.artwork, 'https://img.test/a.jpg');
  assert.equal(parsed.previewUrl, 'https://preview.test/9.mp3');
  assert.equal(parsed.sourcePlatform, 'spotify');
  assert.equal(parsed.postId, 'post-1');
  assert.equal(parsed.redirectPostId, 'post-1');
});

void test('album tracks prefer details and fall back to top-level tracks', () => {
  const detailed = parsePostResponse(post({
    elementType: 'album',
    details: { tracks: [{ title: 'One', trackNumber: 3, artist: 'ignored', artists: ['A'] }] },
    tracks: [{ title: 'Top' }],
  }), 'post-1');
  assert.deepEqual(detailed.tracks?.map((t) => [t.trackNumber, t.title, t.artists]), [[3, 'One', ['A']]]);

  const topLevel = parsePostResponse(post({
    elementType: 'album',
    details: { tracks: [] },
    tracks: [{ artist: 'Solo', previewUrl: null }, { title: 'Two', trackNumber: 7, artists: ['B'] }],
  }), 'post-1');
  assert.deepEqual(topLevel.tracks?.map((t) => [t.trackNumber, t.title, t.artists, t.previewUrl]), [
    [1, 'Untitled', ['Solo'], undefined],
    [7, 'Two', ['B'], undefined],
  ]);
  assert.equal(parsePostResponse(post({ details: {} }), 'post-1').tracks, undefined);
});

void test('artist posts fill missing destinations with search links and read every reposted flag', () => {
  const parsed = parsePostResponse(post({
    postId: '',
    elementType: 'Artist',
    details: { name: 'Mia Groove' },
    platforms: { spotify: { url: 'https://open.spotify.com/artist/1' } },
    IsRepostedByCurrentUser: true,
  }), 'requested');

  assert.deepEqual(parsed.convertedUrls, {
    spotify: 'https://open.spotify.com/artist/1',
    appleMusic: 'https://music.apple.com/us/search?term=Mia%20Groove',
    deezer: 'https://www.deezer.com/search/Mia%20Groove',
  });
  assert.equal(parsed.repostedByCurrentUser, true);
  assert.equal(parsed.postId, 'requested');
  assert.equal(parsePostResponse(post(), 'post-1').repostedByCurrentUser, false);
});

void test('non-numeric counts and track numbers take the missing-value fallbacks', () => {
  const notANumber: number = JSON.parse('"bad"');
  const parsed = parsePostResponse(post({
    elementType: 'album',
    likeCount: notANumber,
    details: { trackCount: notANumber },
    numberOfTracks: 12,
    tracks: [{ title: 'One', trackNumber: notANumber }, { title: 'Two', trackNumber: 7 }],
  }), 'post-1');

  assert.equal(parsed.likeCount, 0);
  assert.equal(parsed.trackCount, 12);
  assert.deepEqual(parsed.tracks?.map((t) => t.trackNumber), [1, 7]);
  assert.equal(parsePostResponse(post({ likeCount: 4, details: { trackCount: 9 }, numberOfTracks: 12 }), 'post-1').trackCount, 9);
});

void test('the curator summary is kept when well formed and dropped when absent or malformed', () => {
  const curator = {
    curatorProfileId: 'cpr_curator',
    userId: '5f0c6c1e-1111-4a8b-9d6e-0c1d2e3f4a5b',
    username: 'nightcurator',
    displayName: 'Night Curator',
    avatarUrl: null,
    membership: {
      planName: 'Night Notes',
      amountMinor: 500,
      serviceFeeMinor: 50,
      currency: 'USD',
      membersOnlyPostCount: 3,
      viewerIsMember: false,
    },
    viewerFollow: { isFollowing: true, hasExplicitFollow: true, hasActiveMembership: false },
  };

  assert.deepEqual(parsePostResponse(post({ curator }), 'requested').curator, curator);
  assert.deepEqual(
    parsePostResponse(post({ curator: { ...curator, membership: null } }), 'requested').curator,
    { ...curator, membership: null },
  );
  assert.equal(parsePostResponse(post(), 'requested').curator, undefined);
  assert.equal(parsePostResponse(post({ curator: { username: 'nightcurator' } }), 'requested').curator, undefined);
});

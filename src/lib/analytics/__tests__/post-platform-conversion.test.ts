import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPostPlatformConversionClickedProps,
  isPostPlatformConversionContext,
} from '../post-platform-conversion';

test('buildPostPlatformConversionClickedProps builds non-playlist destination open payload', () => {
  const payload = buildPostPlatformConversionClickedProps({
    sourceContext: 'destination_open_button',
    route: '/post/abc',
    postId: 'post-abc',
    elementType: 'track',
    targetPlatform: 'appleMusic',
    sourcePlatform: 'spotify',
    sourceDomain: 'https://music.apple.com/us/album/example',
    isAuthenticated: true,
  });

  assert.ok(payload);
  assert.equal(payload?.source_context, 'destination_open_button');
  assert.equal(payload?.target_platform, 'apple');
  assert.equal(payload?.source_platform, 'spotify');
  assert.equal(payload?.element_type, 'track');
  assert.equal(payload?.post_id, 'post-abc');
  assert.equal(payload?.source_domain, 'music.apple.com');
});

test('buildPostPlatformConversionClickedProps builds playlist convert payload', () => {
  const payload = buildPostPlatformConversionClickedProps({
    sourceContext: 'playlist_convert_button',
    route: '/post/playlist-1',
    postId: 'playlist-1',
    elementType: 'playlist',
    targetPlatform: 'spotify',
    sourcePlatform: 'appleMusic',
    sourceDomain: 'https://open.spotify.com/playlist/123',
    isAuthenticated: false,
  });

  assert.ok(payload);
  assert.equal(payload?.source_context, 'playlist_convert_button');
  assert.equal(payload?.target_platform, 'spotify');
  assert.equal(payload?.source_platform, 'apple');
  assert.equal(payload?.element_type, 'playlist');
  assert.equal(payload?.is_authenticated, false);
});

test('buildPostPlatformConversionClickedProps builds playlist open payload', () => {
  const payload = buildPostPlatformConversionClickedProps({
    sourceContext: 'playlist_open_button',
    route: '/post/playlist-2',
    postId: 'playlist-2',
    elementType: 'playlist',
    targetPlatform: 'deezer',
    sourcePlatform: 'spotify',
    sourceDomain: 'https://www.deezer.com/playlist/456',
  });

  assert.ok(payload);
  assert.equal(payload?.source_context, 'playlist_open_button');
  assert.equal(payload?.target_platform, 'deezer');
  assert.equal(payload?.element_type, 'playlist');
  assert.equal(payload?.source_domain, 'www.deezer.com');
});

test('source attribution context is excluded from post platform conversion event', () => {
  assert.equal(isPostPlatformConversionContext('source_attribution_badge'), false);

  const payload = buildPostPlatformConversionClickedProps({
    sourceContext: 'source_attribution_badge',
    route: '/post/test',
    targetPlatform: 'spotify',
  });

  assert.equal(payload, null);
});

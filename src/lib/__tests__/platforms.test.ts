import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_PLATFORM_KEYS,
  ACTIVE_PLATFORM_PREFERENCE_KEYS,
  ACTIVE_PLATFORM_UI_KEYS,
  PLAYLIST_CREATION_PLATFORM_UI_KEYS,
  getDisplayPlatformDefinition,
  getPlatformDefinition,
  extractMatchReviewProviderIdentity,
  normalizePlatformKey,
  normalizePlatformPreferenceKey,
  normalizePlatformUiKey,
} from '../platforms';

test('active platform constants match the current Bridge platform set', () => {
  assert.deepEqual(ACTIVE_PLATFORM_KEYS, ['spotify', 'applemusic', 'deezer']);
  assert.deepEqual(ACTIVE_PLATFORM_UI_KEYS, ['spotify', 'appleMusic', 'deezer']);
  assert.deepEqual(ACTIVE_PLATFORM_PREFERENCE_KEYS, ['Spotify', 'AppleMusic', 'Deezer']);
});

test('match review identities retain only bounded provider IDs from supported hosts', () => {
  assert.deepEqual(
    extractMatchReviewProviderIdentity('https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=secret'),
    { platform: 'spotify', providerId: '4iV5W9uYEdYUVa79Axb7Rh' },
  );
  assert.deepEqual(
    extractMatchReviewProviderIdentity('https://music.apple.com/us/album/example/1440833098?i=1440833105'),
    { platform: 'applemusic', providerId: '1440833105' },
  );
  assert.deepEqual(
    extractMatchReviewProviderIdentity('https://www.deezer.com/us/track/3135556'),
    { platform: 'deezer', providerId: '3135556' },
  );
  assert.equal(extractMatchReviewProviderIdentity('https://evil.example/track/secret'), undefined);
  assert.equal(extractMatchReviewProviderIdentity('not a url'), undefined);
});

test('platform aliases normalize to canonical, UI, and preference keys', () => {
  assert.equal(normalizePlatformKey('apple_music'), 'applemusic');
  assert.equal(normalizePlatformKey('Apple Music'), 'applemusic');
  assert.equal(normalizePlatformUiKey('apple'), 'appleMusic');
  assert.equal(normalizePlatformPreferenceKey('am'), 'AppleMusic');
  assert.equal(normalizePlatformPreferenceKey('deezer'), 'Deezer');
});

test('platform definitions expose display metadata from one source', () => {
  assert.equal(getPlatformDefinition('applemusic')?.displayName, 'Apple Music');
  assert.equal(getPlatformDefinition('apple')?.analyticsKey, 'apple');
  assert.equal(getDisplayPlatformDefinition('youtube_music')?.displayName, 'YouTube Music');
});

test('playlist creation list includes every currently supported target', () => {
  assert.deepEqual(PLAYLIST_CREATION_PLATFORM_UI_KEYS, ['spotify', 'appleMusic', 'deezer']);
});

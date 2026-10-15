import test from 'node:test';
import assert from 'node:assert/strict';

import { detectContentType, getPlatformDisplayName } from '../content-type-detection';
import {
  getMusicSourceLabel,
  isSupportedMusicLink,
  normalizeMusicLinkInput,
  validateMusicLink,
} from '../music-link-input';

const contentTypeCases = [
  ['Spotify track', 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh', 'track', 'spotify', '4iV5W9uYEdYUVa79Axb7Rh'],
  ['Spotify album', 'https://open.spotify.com/album/1A2GTWGtFfWp7KSQTwWOyo', 'album', 'spotify', '1A2GTWGtFfWp7KSQTwWOyo'],
  ['Spotify artist', 'https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi', 'artist', 'spotify', '4tZwfgrHOc3mvqYlEYSvVi'],
  ['Spotify playlist', 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', 'playlist', 'spotify', '37i9dQZF1DXcBWIGoYBM5M'],
  ['Apple Music song', 'https://music.apple.com/us/song/as-it-was/1615585803', 'track', 'apple', '1615585803'],
  ['Apple Music album track (?i=)', 'https://music.apple.com/us/album/harrys-house/1615584999?i=1615585803', 'track', 'apple', '1615585803'],
  ['Apple Music album', 'https://music.apple.com/us/album/harrys-house/1615584999', 'album', 'apple', '1615584999'],
  ['Apple Music artist', 'https://music.apple.com/us/artist/harry-styles/1252689966', 'artist', 'apple', '1252689966'],
  ['Apple Music playlist', 'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb', 'playlist', 'apple', 'pl.f4d106fed2bd41149aaacabb233eb5eb'],
  ['Deezer track', 'https://www.deezer.com/track/1677006422', 'track', 'deezer', '1677006422'],
  ['Deezer album', 'https://www.deezer.com/album/287842312', 'album', 'deezer', '287842312'],
  ['Deezer artist', 'https://www.deezer.com/artist/4050205', 'artist', 'deezer', '4050205'],
  ['Deezer playlist', 'https://www.deezer.com/playlist/1362917922', 'playlist', 'deezer', '1362917922'],
  ['Spotify track with query parameters', 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=abc123', 'track', 'spotify', '4iV5W9uYEdYUVa79Axb7Rh'],
  ['upper-case Spotify track', 'HTTPS://OPEN.SPOTIFY.COM/TRACK/4iV5W9uYEdYUVa79Axb7Rh', 'track', 'spotify', '4iV5W9uYEdYUVa79Axb7Rh'],
  ['unknown site', 'https://example.com/some/path', 'track', 'unknown', ''],
] as const;

for (const [name, url, type, platform, id] of contentTypeCases) {
  void test(`detectContentType reads the type, platform, and id of this link: ${name}`, () => {
    const { type: actualType, platform: actualPlatform, id: actualId } = detectContentType(url);
    assert.deepEqual({ type: actualType, platform: actualPlatform, id: actualId }, { type, platform, id });
  });
}

test('detectContentType extracts ids across current supported platforms', () => {
  assert.deepEqual(detectContentType('https://open.spotify.com/TRACK/4iV5W9uYEdYUVa79Axb7Rh'), {
    type: 'track',
    estimatedCount: 1,
    platform: 'spotify',
    id: '4iV5W9uYEdYUVa79Axb7Rh',
  });
  assert.deepEqual(detectContentType('https://music.apple.com/us/album/name/1615584999?i=1615585000'), {
    type: 'track',
    estimatedCount: 1,
    platform: 'apple',
    id: '1615585000',
  });
  assert.equal(
    detectContentType('https://music.apple.com/us/playlist/name/pl.u-123456789').id,
    'pl.u-123456789',
  );
  const deezerPlaylist = detectContentType('https://www.deezer.com/us/playlist/908622995');
  assert.equal(deezerPlaylist.type, 'playlist');
  assert.equal(deezerPlaylist.platform, 'deezer');
  assert.equal(deezerPlaylist.id, '908622995');
});

test('detectContentType keeps unknown links out of supported platform parsing', () => {
  assert.deepEqual(detectContentType('https://music.youtube.com/watch?v=abc123'), {
    type: 'track',
    estimatedCount: 1,
    platform: 'unknown',
    id: '',
  });
});

test('music link input helpers normalize pasted text and classify support', () => {
  const pasted = 'Listen here: https://open.spotify.com/album/0ETFjACtuP2ADo6LFhL6HN?si=test';

  assert.equal(
    normalizeMusicLinkInput(pasted),
    'https://open.spotify.com/album/0ETFjACtuP2ADo6LFhL6HN?si=test',
  );
  assert.equal(isSupportedMusicLink(pasted), true);
  assert.equal(isSupportedMusicLink('https://open.spotify.com'), false);
  assert.equal(isSupportedMusicLink('https://music.youtube.com/watch?v=abc123'), false);
  assert.equal(isSupportedMusicLink('https://link.deezer.com/s/short123'), true);
  assert.equal(isSupportedMusicLink('https://deezer.page.link/short123'), true);
  assert.equal(isSupportedMusicLink('https://dzr.page.link/short123'), true);
  assert.equal(isSupportedMusicLink('https://link.deezer.com/'), false);
  assert.equal(isSupportedMusicLink('https://link.deezer.com/s/'), false);
  assert.equal(isSupportedMusicLink('https://evil.link.deezer.com/s/short123'), false);
  assert.equal(isSupportedMusicLink('https://spotify.link/short123'), true);
  assert.equal(isSupportedMusicLink('https://spotify.link/'), false);
  assert.equal(isSupportedMusicLink('https://evil.spotify.link/short123'), false);
  assert.equal(isSupportedMusicLink('httpss://open.spotify.com/track/abc123'), false);
});

test('music link input helpers expose source labels and validation messages from one parser', () => {
  assert.equal(getPlatformDisplayName('apple'), 'Apple Music');
  assert.equal(getMusicSourceLabel('https://music.apple.com/us/song/name/1615585000'), 'Apple Music');
  assert.equal(getMusicSourceLabel('https://link.deezer.com/s/short123'), 'Deezer');
  assert.equal(getMusicSourceLabel('https://spotify.link/short123'), 'Spotify');
  assert.equal(
    validateMusicLink('https://music.apple.com/us/library/playlist/p.abc123'),
    "You've pasted a private Apple Music playlist link. Please use the 'Share Playlist' option to copy the correct link.",
  );
  assert.equal(
    validateMusicLink('https://open.spotify.com'),
    'Please paste a Spotify track, album, artist, or playlist link.',
  );
  assert.equal(
    validateMusicLink('https://music.youtube.com/watch?v=abc123'),
    "This music service isn't supported yet. Please use a link from Spotify, Apple Music, or Deezer.",
  );
  assert.equal(validateMusicLink('https://link.deezer.com/s/short123'), null);
  assert.equal(validateMusicLink('https://spotify.link/short123'), null);
  assert.equal(
    validateMusicLink('httpss://open.spotify.com/track/abc123'),
    'Please enter a valid URL starting with http:// or https://',
  );
  assert.equal(
    validateMusicLink('https://example.com/music/abc123'),
    "This music service isn't supported yet. Please use a link from Spotify, Apple Music, or Deezer.",
  );
});

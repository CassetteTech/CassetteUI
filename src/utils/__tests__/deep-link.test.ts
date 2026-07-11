import test from 'node:test';
import assert from 'node:assert/strict';

import { handleStreamingLinkClick, isAppleMusicLibraryUrl } from '../deep-link';

interface ClickOverrides {
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  button?: number;
  defaultPrevented?: boolean;
}

function makeClick(overrides: ClickOverrides = {}) {
  const event = {
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    button: 0,
    ...overrides,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
}

const SPOTIFY_TRACK_URL = 'https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3';
const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
const APPLE_MUSIC_URL = 'https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699';

test('plain left-click on a Spotify track link is intercepted for the app attempt', () => {
  const event = makeClick();
  handleStreamingLinkClick(event, SPOTIFY_TRACK_URL);
  assert.equal(event.defaultPrevented, true);
});

test('plain left-click on a Spotify playlist link is intercepted for the app attempt', () => {
  const event = makeClick();
  handleStreamingLinkClick(event, SPOTIFY_PLAYLIST_URL);
  assert.equal(event.defaultPrevented, true);
});

test('Apple Music links keep native anchor behavior (Universal Links open the app)', () => {
  const event = makeClick();
  handleStreamingLinkClick(event, APPLE_MUSIC_URL);
  assert.equal(event.defaultPrevented, false);
});

test('modified clicks keep native anchor behavior', () => {
  for (const overrides of [
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ]) {
    const event = makeClick(overrides);
    handleStreamingLinkClick(event, SPOTIFY_TRACK_URL);
    assert.equal(event.defaultPrevented, false, JSON.stringify(overrides));
  }
});

test('an already-handled event is left alone', () => {
  const event = makeClick({ defaultPrevented: true });
  handleStreamingLinkClick(event, SPOTIFY_TRACK_URL);
  assert.equal(event.defaultPrevented, true);
});

test('isAppleMusicLibraryUrl distinguishes library playlists from catalog URLs', () => {
  assert.equal(isAppleMusicLibraryUrl('https://music.apple.com/library/playlist/p.abc123'), true);
  assert.equal(isAppleMusicLibraryUrl(APPLE_MUSIC_URL), false);
});

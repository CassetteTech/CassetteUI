import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConnectedServicePayload,
  normalizeStreamingServiceType,
} from '../platform-normalization';

test('normalizeStreamingServiceType canonicalizes Apple Music service names from API responses', () => {
  assert.equal(normalizeStreamingServiceType('applemusic'), 'AppleMusic');
  assert.equal(normalizeStreamingServiceType('apple_music'), 'AppleMusic');
  assert.equal(normalizeStreamingServiceType('Apple Music'), 'AppleMusic');
  assert.equal(normalizeStreamingServiceType('apple'), 'AppleMusic');
});

test('normalizeStreamingServiceType canonicalizes known enum values', () => {
  assert.equal(normalizeStreamingServiceType(0), 'Spotify');
  assert.equal(normalizeStreamingServiceType(1), 'AppleMusic');
  assert.equal(normalizeStreamingServiceType(2), 'Deezer');
});

test('normalizeStreamingServiceType preserves unknown service names', () => {
  assert.equal(normalizeStreamingServiceType('tidal'), 'tidal');
  assert.equal(normalizeStreamingServiceType(9), '9');
  assert.equal(normalizeStreamingServiceType(null), '');
});

test('normalizeConnectedServicePayload drops invalid or reconnect-required services', () => {
  assert.equal(
    normalizeConnectedServicePayload(
      { serviceType: 'applemusic', isConnected: false, requiresReconnect: true },
      '',
    ),
    null,
  );
  assert.equal(normalizeConnectedServicePayload({ serviceType: 'Spotify', isValid: false }, ''), null);
});

test('normalizeConnectedServicePayload returns canonical connected services', () => {
  assert.deepEqual(
    normalizeConnectedServicePayload(
      { serviceType: 'applemusic', connectedAt: '2026-05-27T12:00:00Z' },
      '',
    ),
    {
      serviceType: 'AppleMusic',
      connectedAt: '2026-05-27T12:00:00Z',
      profileUrl: undefined,
    },
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConnectedServicePayload,
  normalizeStreamingServiceType,
} from '../platform-normalization';

for (const [value, serviceType] of [
  ['applemusic', 'AppleMusic'],
  ['apple_music', 'AppleMusic'],
  ['Apple Music', 'AppleMusic'],
  ['apple', 'AppleMusic'],
  [0, 'Spotify'],
  [1, 'AppleMusic'],
  [2, 'Deezer'],
  ['tidal', 'tidal'],
  [9, '9'],
  [null, ''],
] as const) {
  test(`normalizeStreamingServiceType maps ${JSON.stringify(value)} to ${JSON.stringify(serviceType)}`, () => {
    assert.equal(normalizeStreamingServiceType(value), serviceType);
  });
}

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

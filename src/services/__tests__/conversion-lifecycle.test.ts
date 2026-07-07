import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLifecycleConversionPlaceholder,
  getLifecycleConversionFailureMessage,
  toElementType,
} from '../conversion-lifecycle';
import { ElementType } from '../../types';

test('toElementType maps detected content types to the UI enum', () => {
  assert.equal(toElementType('track'), ElementType.TRACK);
  assert.equal(toElementType('album'), ElementType.ALBUM);
  assert.equal(toElementType('artist'), ElementType.ARTIST);
  assert.equal(toElementType('playlist'), ElementType.PLAYLIST);
});

test('createLifecycleConversionPlaceholder builds the lifecycle-only conversion shape', () => {
  assert.deepEqual(
    createLifecycleConversionPlaceholder({
      originalUrl: 'https://open.spotify.com/album/0ETFjACtuP2ADo6LFhL6HN',
      detectedType: 'album',
      description: 'A favorite',
      postId: 'post-123',
      conversionJobId: 'job-456',
      correlationId: 'corr-789',
    }),
    {
      originalUrl: 'https://open.spotify.com/album/0ETFjACtuP2ADo6LFhL6HN',
      convertedUrls: {},
      metadata: {
        type: ElementType.ALBUM,
        title: 'Loading...',
        artist: '',
        artwork: '',
      },
      description: 'A favorite',
      postId: 'post-123',
      conversionJobId: 'job-456',
      correlationId: 'corr-789',
    },
  );
});

test('getLifecycleConversionFailureMessage prefers backend message, then error code', () => {
  assert.equal(
    getLifecycleConversionFailureMessage({ success: false, status: 'failed', message: 'No match found' }),
    'No match found',
  );
  assert.equal(
    getLifecycleConversionFailureMessage({ success: false, status: 'failed', errorCode: 'UPSTREAM_TIMEOUT' }),
    'UPSTREAM_TIMEOUT',
  );
  assert.equal(
    getLifecycleConversionFailureMessage({ success: false, status: 'failed' }),
    'Failed to convert music link',
  );
});

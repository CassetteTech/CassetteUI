import test from 'node:test';
import assert from 'node:assert/strict';

import { getUserFacingApiErrorMessage } from '../user-facing-api-error';

test('maps common API failure categories to stable product copy', () => {
  assert.equal(
    getUserFacingApiErrorMessage({ status: 400, errorCode: 'INVALID_SOURCE_LINK', message: 'router failed' }),
    'This music link could not be read. Check the link and try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 401, message: 'token missing' }),
    'Your session expired. Please sign in and try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 404, message: 'missing' }),
    "We couldn't find what you were looking for.",
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 422, errorCode: 'PLAYLIST_EMPTY', message: 'raw empty error' }),
    'This playlist does not contain any tracks to import.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 429, message: 'slow down' }),
    'Too many requests. Wait a moment and try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 503, message: 'upstream unavailable' }),
    'Cassette is temporarily unavailable. Please try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage(new Error('Request timed out after 60s: /api/v1/convert')),
    'This is taking longer than expected. Please try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 500, errorCode: 'timeout', message: 'Conversion failed.' }),
    'This is taking longer than expected. Please try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 500, errorCode: 'rate_limited', message: 'Conversion failed.' }),
    'Too many requests. Wait a moment and try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 500, errorCode: 'service_unavailable', message: 'Conversion failed.' }),
    'Cassette is temporarily unavailable. Please try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 500, errorCode: 'upstream_error', message: 'Conversion failed.' }),
    'Cassette is temporarily unavailable. Please try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 500, errorCode: 'not_found', message: 'Conversion failed.' }),
    "We couldn't find what you were looking for.",
  );
  assert.equal(
    getUserFacingApiErrorMessage({ status: 500, errorCode: 'bad_request', message: 'Conversion failed.' }),
    'Check the request details and try again.',
  );
});

test('keeps friendly specific messages and uses the supplied unexpected fallback', () => {
  assert.equal(getUserFacingApiErrorMessage(new Error('No matching track was found.')), 'No matching track was found.');
  assert.equal(
    getUserFacingApiErrorMessage({ status: 500, message: 'database stack trace' }, 'Failed to create playlist. Please try again.'),
    'Failed to create playlist. Please try again.',
  );
  assert.equal(
    getUserFacingApiErrorMessage(null, 'Failed to convert this link. Please try again.'),
    'Failed to convert this link. Please try again.',
  );
});

test('does not replace or mutate ApiError control metadata', () => {
  const error = {
    status: 401,
    errorCode: 'AUTH_EXPIRED',
    message: 'raw provider response',
    requiresReauth: true,
    retryAfterMs: 900,
    correlationId: 'corr-123',
  };

  assert.equal(
    getUserFacingApiErrorMessage(error),
    'Your connection has expired. Reconnect and try again.',
  );
  assert.deepEqual(error, {
    status: 401,
    errorCode: 'AUTH_EXPIRED',
    message: 'raw provider response',
    requiresReauth: true,
    retryAfterMs: 900,
    correlationId: 'corr-123',
  });
});

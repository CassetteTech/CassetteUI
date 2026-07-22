import test from 'node:test';
import assert from 'node:assert/strict';

import { getApiConnectionErrorMessage } from '../api-connection-error';

test('keeps local API diagnostics in development', () => {
  assert.equal(
    getApiConnectionErrorMessage('http://localhost:5001/api/v1/posts', true),
    'Cannot connect to API at http://localhost:5001/api/v1/posts. Is your local server running on port 5001?',
  );
});

test('does not expose local API details in production', () => {
  const message = getApiConnectionErrorMessage('http://localhost:5000/api/v1/posts', false);

  assert.equal(message, 'Cannot connect to Cassette. Please try again.');
  assert.doesNotMatch(message, /localhost|5000/);
});

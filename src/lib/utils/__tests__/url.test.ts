import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiUrl } from '../url';

void test('getApiUrl skips values that a deployment set to the text undefined or null', () => {
  const saved = { ...process.env };
  process.env.NEXT_PUBLIC_API_URL_LOCAL = 'undefined';
  process.env.NEXT_PUBLIC_API_URL = ' https://api.cassette.test ';
  try {
    assert.equal(getApiUrl(), 'https://api.cassette.test');
    process.env.NEXT_PUBLIC_API_URL = 'null';
    assert.throws(() => getApiUrl(), /Missing API base URL/);
  } finally {
    process.env = saved;
  }
});

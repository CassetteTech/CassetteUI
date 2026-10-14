import assert from 'node:assert/strict';
import test from 'node:test';
import { CONVERTING_HEADLINES } from '../conversion-copy';

void test('no headline claims every platform, service, or app', () => {
  for (const headline of CONVERTING_HEADLINES) {
    assert.doesNotMatch(headline, /\bevery (platform|service|app)/i);
  }
});

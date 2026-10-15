import assert from 'node:assert/strict';
import test from 'node:test';
import { ignoreFailure, tryStorage } from '../best-effort';

void test('a storage access that throws returns the fallback', () => {
  assert.equal(tryStorage(() => { throw new Error('QuotaExceededError'); }, 'fallback'), 'fallback');
  assert.equal(tryStorage(() => 'stored', 'fallback'), 'stored');
});

void test('a failed step returns undefined instead of throwing', () => {
  assert.equal(ignoreFailure(() => { throw new Error('blocked'); }), undefined);
  assert.equal(ignoreFailure(() => 3), 3);
});

void test('a rejected promise resolves to undefined', async () => {
  assert.equal(await ignoreFailure(Promise.reject(new Error('offline'))), undefined);
  assert.equal(await ignoreFailure(Promise.resolve('post')), 'post');
});

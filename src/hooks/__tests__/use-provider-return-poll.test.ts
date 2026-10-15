import assert from 'node:assert/strict';
import test from 'node:test';
import { settlingData } from '../use-provider-return-poll';

void test('settles on a read completed after mount', () => {
  assert.equal(settlingData({ data: 'active', isFetchedAfterMount: true, isFetching: false }), 'active');
});

void test('ignores a cached read from before the provider handoff', () => {
  assert.equal(settlingData({ data: 'active', isFetchedAfterMount: false, isFetching: false }), undefined);
});

void test('waits while a read is in flight', () => {
  assert.equal(settlingData({ data: 'active', isFetchedAfterMount: true, isFetching: true }), undefined);
});

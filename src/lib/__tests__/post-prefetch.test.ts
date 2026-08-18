/** Ensures prefetched post handoffs cannot retain curator or member attribution. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { savePrefetchedPost, takePrefetchedPost } from '../post-prefetch';
import type { PostByIdResponse } from '@/types';

const post: PostByIdResponse = {
  success: true,
  postId: 'post_1',
  elementType: 'track',
  musicElementId: 'track_1',
  details: {},
  curatorId: 'cpr_0123AbCd',
  isMemberView: true,
  paidPromotionCampaignId: 'pmc_0123AbCd',
};

void test('prefetched posts cannot carry server-owned analytics attribution', () => {
  const values = new Map<string, string>();
  const previousStorage = globalThis.sessionStorage;
  const storage: Storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    get length() { return values.size; },
  };
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });

  try {
    savePrefetchedPost(post.postId, post);
    const saved = values.get(`cassette:prefetched-post:${post.postId}`) ?? '';
    assert.doesNotMatch(saved, /curatorId|isMemberView|paidPromotionCampaignId/);

    values.set(`cassette:prefetched-post:${post.postId}`, JSON.stringify(post));
    const restored = takePrefetchedPost(post.postId);
    assert.equal(restored?.curatorId, undefined);
    assert.equal(restored?.isMemberView, undefined);
    assert.equal(restored?.paidPromotionCampaignId, undefined);
  } finally {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: previousStorage,
    });
  }
});

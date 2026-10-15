import test from 'node:test';
import assert from 'node:assert/strict';
import { savePrefetchedPost, takePrefetchedPost } from '../post-prefetch';
import type { PostByIdResponse } from '@/types';
import { createMemoryStorage } from './memory-storage';

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
  const previousStorage = globalThis.sessionStorage;
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });

  try {
    savePrefetchedPost(post.postId, post);
    const saved = storage.getItem(`cassette:prefetched-post:${post.postId}`) ?? '';
    assert.doesNotMatch(saved, /curatorId|isMemberView|paidPromotionCampaignId/);

    storage.setItem(`cassette:prefetched-post:${post.postId}`, JSON.stringify(post));
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

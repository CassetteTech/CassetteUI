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

function withSessionStorage(run: (storage: Storage) => void) {
  const previousStorage = globalThis.sessionStorage;
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try {
    run(storage);
  } finally {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: previousStorage });
  }
}

void test('prefetched posts cannot carry server-owned analytics attribution', () => {
  withSessionStorage((storage) => {
    savePrefetchedPost(post.postId, post, 'user-a');
    const saved = storage.getItem(`cassette:prefetched-post:${post.postId}`) ?? '';
    assert.doesNotMatch(saved, /curatorId|isMemberView|paidPromotionCampaignId/);

    storage.setItem(`cassette:prefetched-post:${post.postId}`, JSON.stringify({ viewerId: 'user-a', post }));
    const restored = takePrefetchedPost(post.postId, 'user-a');
    assert.equal(restored?.postId, post.postId);
    assert.equal(restored?.curatorId, undefined);
    assert.equal(restored?.isMemberView, undefined);
    assert.equal(restored?.paidPromotionCampaignId, undefined);
  });
});

void test('a prefetched post serves only the account that read it', () => {
  withSessionStorage((storage) => {
    for (const privacy of ['public', 'private', 'subscriber'] as const) {
      const cached = { ...post, privacy };
      for (const viewerId of [null, 'user-b']) {
        savePrefetchedPost(post.postId, cached, 'user-a');
        assert.equal(takePrefetchedPost(post.postId, viewerId), null, `${privacy} for ${viewerId}`);
        assert.equal(storage.getItem(`cassette:prefetched-post:${post.postId}`), null, 'a refused entry is removed');
      }
      savePrefetchedPost(post.postId, cached, 'user-a');
      assert.equal(takePrefetchedPost(post.postId, 'user-a')?.privacy, privacy);
    }

    savePrefetchedPost(post.postId, post, null);
    assert.equal(takePrefetchedPost(post.postId, 'user-a'), null, 'an anonymous read does not serve an account');
  });
});

void test('a read made with no known account serves only a public post', () => {
  withSessionStorage(() => {
    for (const privacy of [undefined, 'public'] as const) {
      savePrefetchedPost(post.postId, { ...post, privacy }, null);
      assert.equal(takePrefetchedPost(post.postId, null)?.postId, post.postId);
    }
    for (const privacy of ['private', 'subscriber', 'friends'] as const) {
      savePrefetchedPost(post.postId, { ...post, privacy }, null);
      assert.equal(takePrefetchedPost(post.postId, null), null, privacy);
    }
  });
});

void test('an entry without an account binding is not served', () => {
  withSessionStorage((storage) => {
    storage.setItem(`cassette:prefetched-post:${post.postId}`, JSON.stringify(post));
    assert.equal(takePrefetchedPost(post.postId, null), null);
    storage.setItem(`cassette:prefetched-post:${post.postId}`, '{not json');
    assert.equal(takePrefetchedPost(post.postId, null), null);
  });
});

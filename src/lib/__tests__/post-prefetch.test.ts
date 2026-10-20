import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFETCHED_POST_MAX_AGE_MS, startPrefetchRead, takePrefetchedPost } from '../post-prefetch';
import { useAuthStore } from '../../stores/auth-store';
import type { AuthUser, PostByIdResponse } from '@/types';
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
const KEY = `cassette:prefetched-post:${post.postId}`;

const account = (id: string): AuthUser => ({
  id,
  email: `${id}@cassette.test`,
  username: id,
  displayName: id,
  profilePicture: '',
  isEmailVerified: true,
  isOnboarded: true,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

const signIn = (id: string | null) => {
  if (id) useAuthStore.getState().setSession({ user: account(id), activeMembershipCount: 0, feedCuratorCount: 0 });
  else useAuthStore.getState().signOut();
};

/** A read started and completed as the current account, on a page still on screen. */
const saveAsCurrent = (cached: PostByIdResponse = post) => startPrefetchRead(() => true)(cached.postId, cached);

function withSessionStorage(run: (storage: Storage) => void) {
  const previousStorage = globalThis.sessionStorage;
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try {
    run(storage);
  } finally {
    signIn(null);
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: previousStorage });
  }
}

void test('prefetched posts cannot carry server-owned analytics attribution', () => {
  withSessionStorage((storage) => {
    signIn('user-a');
    saveAsCurrent();
    assert.doesNotMatch(storage.getItem(KEY) ?? '', /curatorId|isMemberView|paidPromotionCampaignId/);

    storage.setItem(KEY, JSON.stringify({ viewerId: 'user-a', savedAt: Date.now(), post }));
    const restored = takePrefetchedPost(post.postId, 'user-a');
    assert.equal(restored?.postId, post.postId);
    assert.equal(restored?.curatorId, undefined);
    assert.equal(restored?.isMemberView, undefined);
    assert.equal(restored?.paidPromotionCampaignId, undefined);
  });
});

void test('a prefetched post serves only the account that read it', () => {
  withSessionStorage((storage) => {
    signIn('user-a');
    for (const privacy of ['public', 'private', 'subscriber'] as const) {
      const cached = { ...post, privacy };
      for (const viewerId of [null, 'user-b']) {
        saveAsCurrent(cached);
        assert.equal(takePrefetchedPost(post.postId, viewerId), null, `${privacy} for ${viewerId}`);
        assert.equal(storage.getItem(KEY), null, 'a refused entry is removed');
      }
      saveAsCurrent(cached);
      assert.equal(takePrefetchedPost(post.postId, 'user-a')?.privacy, privacy);
    }
  });
});

void test('a read made with no known account serves only a public post', () => {
  withSessionStorage(() => {
    for (const privacy of [undefined, 'public'] as const) {
      saveAsCurrent({ ...post, privacy });
      assert.equal(takePrefetchedPost(post.postId, null)?.postId, post.postId);
    }
    for (const privacy of ['private', 'subscriber', 'friends'] as const) {
      saveAsCurrent({ ...post, privacy });
      assert.equal(takePrefetchedPost(post.postId, null), null, privacy);
    }
    saveAsCurrent();
    assert.equal(takePrefetchedPost(post.postId, 'user-a'), null, 'an anonymous read does not serve an account');
  });
});

void test('a read is not stored when the account changes before it completes', () => {
  withSessionStorage((storage) => {
    signIn('user-a');
    const toB = startPrefetchRead(() => true);
    signIn('user-b');
    toB(post.postId, post);
    assert.equal(storage.getItem(KEY), null, 'A to B');

    // The account returns to A before the read completes; the change is still detected.
    const backToA = startPrefetchRead(() => true);
    signIn('user-a');
    signIn('user-b');
    signIn('user-a');
    backToA(post.postId, post);
    assert.equal(storage.getItem(KEY), null, 'A to B to A');

    const signedOut = startPrefetchRead(() => true);
    signIn(null);
    signedOut(post.postId, post);
    assert.equal(storage.getItem(KEY), null, 'A to signed out');
  });
});

void test('a read is not stored after its page leaves the screen', () => {
  withSessionStorage((storage) => {
    signIn('user-a');
    let onScreen = true;
    const save = startPrefetchRead(() => onScreen);
    onScreen = false;
    save(post.postId, post);
    assert.equal(storage.getItem(KEY), null);
  });
});

void test('a session change clears every stashed post', () => {
  withSessionStorage((storage) => {
    signIn('user-a');
    saveAsCurrent();
    storage.setItem('unrelated', 'kept');
    signIn(null);
    assert.equal(storage.getItem(KEY), null);
    assert.equal(storage.getItem('unrelated'), 'kept');

    signIn('user-a');
    saveAsCurrent();
    signIn('user-b');
    assert.equal(storage.getItem(KEY), null, 'an account change clears it too');
  });
});

void test('an expired or undated entry is not served', () => {
  withSessionStorage((storage) => {
    signIn('user-a');
    for (const savedAt of [Date.now() - PREFETCHED_POST_MAX_AGE_MS - 1_000, Date.now() + 60_000, undefined]) {
      storage.setItem(KEY, JSON.stringify({ viewerId: 'user-a', savedAt, post }));
      assert.equal(takePrefetchedPost(post.postId, 'user-a'), null, String(savedAt));
      assert.equal(storage.getItem(KEY), null, 'an expired entry is removed');
    }
    storage.setItem(KEY, JSON.stringify(post));
    assert.equal(takePrefetchedPost(post.postId, null), null, 'an unbound entry is not served');
    storage.setItem(KEY, '{not json');
    assert.equal(takePrefetchedPost(post.postId, null), null);
  });
});

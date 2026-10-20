import test from 'node:test';
import assert from 'node:assert/strict';

import { pendingActionService } from '../pending-action';

const ORIGIN = 'https://cassette.test';
const STORAGE_KEY = 'cassette_pending_action';

// The service reads sessionStorage and the page origin; a stored action
// can make an account write, so every read is checked like untrusted input.
function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

function withSessionStorage(run: (storage: Storage) => void) {
  // SAFETY: the test owns these globals and deletes them after the run.
  const globals = globalThis as { window?: { location: { origin: string } }; sessionStorage?: Storage };
  const storage = createStorage();
  globals.window = { location: { origin: ORIGIN } };
  globals.sessionStorage = storage;
  try {
    run(storage);
  } finally {
    delete globals.window;
    delete globals.sessionStorage;
  }
}

// Overrides may break the stored shape on purpose.
type StoredFieldOverrides = Partial<
  Record<'type' | 'platform' | 'playlistId' | 'postId' | 'returnUrl' | 'timestamp', string | number | string[] | null>
>;

const playlistAction = (overrides: StoredFieldOverrides = {}) => JSON.stringify({
  type: 'create_playlist',
  platform: 'spotify',
  playlistId: 'playlist-1',
  returnUrl: '/post/post-1',
  timestamp: Date.now(),
  ...overrides,
});

const addToProfileAction = (overrides: StoredFieldOverrides = {}) => JSON.stringify({
  type: 'add_to_profile',
  postId: 'post-1',
  returnUrl: '/post/post-1',
  timestamp: Date.now(),
  ...overrides,
});

function assertRejected(storage: Storage, stored: string) {
  storage.setItem(STORAGE_KEY, stored);
  assert.equal(pendingActionService.get(), null, stored);
  assert.equal(storage.getItem(STORAGE_KEY), null, 'a rejected action is cleared');
}

void test('returns valid playlist and post-save actions', () => {
  withSessionStorage((storage) => {
    for (const platform of ['spotify', 'appleMusic', 'deezer']) {
      storage.setItem(STORAGE_KEY, playlistAction({ platform }));
      assert.equal(pendingActionService.get()?.type, 'create_playlist');
    }

    const created = pendingActionService.createAddToProfileAction('post 1/x');
    assert.equal(created.returnUrl, '/post/post%201%2Fx');
    pendingActionService.save(created);
    assert.deepEqual(pendingActionService.get(), created);
  });
});

void test('turns a same-origin playlist page URL into its local path', () => {
  withSessionStorage((storage) => {
    storage.setItem(STORAGE_KEY, playlistAction({ returnUrl: `${ORIGIN}/post/post-1?from=%2Fexplore#tracks` }));
    assert.equal(pendingActionService.get()?.returnUrl, '/post/post-1?from=%2Fexplore#tracks');
  });
});

void test('rejects malformed JSON and unknown shapes', () => {
  withSessionStorage((storage) => {
    for (const value of [
      '{not json',
      'null',
      '"create_playlist"',
      '[]',
      '{}',
      JSON.stringify({ type: 'delete_account', returnUrl: '/post/post-1', timestamp: Date.now() }),
      playlistAction({ platform: 'tidal' }),
      playlistAction({ playlistId: '' }),
      playlistAction({ playlistId: 7 }),
      playlistAction({ returnUrl: undefined }),
      addToProfileAction({ postId: undefined }),
      addToProfileAction({ postId: '' }),
      addToProfileAction({ postId: ['post-1'] }),
    ]) {
      assertRejected(storage, value);
    }
  });
});

void test('rejects missing, non-numeric, future, and expired timestamps', () => {
  withSessionStorage((storage) => {
    for (const timestamp of [
      undefined,
      null,
      String(Date.now()),
      Date.now() + 60_000,
      Date.now() - 10 * 60 * 1000 - 1_000,
    ]) {
      assertRejected(storage, addToProfileAction({ timestamp }));
      assertRejected(storage, playlistAction({ timestamp }));
    }
    // JSON turns NaN and Infinity into null; a stored string cannot carry them.
    assertRejected(storage, `{"type":"add_to_profile","postId":"post-1","returnUrl":"/post/post-1","timestamp":1e999}`);
  });
});

void test('rejects return paths that leave the site or the saved post', () => {
  withSessionStorage((storage) => {
    for (const returnUrl of [
      'https://evil.example/post/post-1',
      '//evil.example/post/post-1',
      '/\\evil.example',
      '/%2F%2Fevil.example',
      'javascript:alert(1)',
    ]) {
      assertRejected(storage, playlistAction({ returnUrl }));
      assertRejected(storage, addToProfileAction({ returnUrl }));
    }
    assertRejected(storage, addToProfileAction({ returnUrl: '/post/post-2' }));
    assertRejected(storage, addToProfileAction({ returnUrl: '/settings' }));
  });
});

void test('a cleared action is not returned again', () => {
  withSessionStorage((storage) => {
    storage.setItem(STORAGE_KEY, addToProfileAction());
    assert.equal(pendingActionService.get()?.type, 'add_to_profile');
    pendingActionService.clear();
    assert.equal(pendingActionService.get(), null);
  });
});

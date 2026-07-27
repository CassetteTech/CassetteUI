import test from 'node:test';
import assert from 'node:assert/strict';

import {
  authRedirectService,
  isPromoteIntentRedirect,
  normalizeAuthRedirect,
} from '../auth-redirect';

test('accepts internal auth return routes', () => {
  assert.equal(normalizeAuthRedirect('/add-music'), '/add-music');
  assert.equal(normalizeAuthRedirect('/post/post-1?from=%2Fexplore'), '/post/post-1?from=%2Fexplore');
});

test('rejects external and encoded protocol-relative auth redirects', () => {
  assert.equal(normalizeAuthRedirect('https://evil.example'), null);
  assert.equal(normalizeAuthRedirect('//evil.example'), null);
  assert.equal(normalizeAuthRedirect('/\\evil.example'), null);
  assert.equal(normalizeAuthRedirect('/%5Cevil.example'), null);
  assert.equal(normalizeAuthRedirect('/%255Cevil.example'), null);
  assert.equal(normalizeAuthRedirect('/%2F%2Fevil.example'), null);
  assert.equal(normalizeAuthRedirect('/%252F%252Fevil.example'), null);
  assert.equal(normalizeAuthRedirect('/\t/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/\n/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/\r/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/%09/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/%0A/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/%0D/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/bad%escape'), null);
});

test('detects promote-intent redirects without over-matching', () => {
  assert.equal(isPromoteIntentRedirect('/promote'), true);
  assert.equal(isPromoteIntentRedirect('/promote/new'), true);
  assert.equal(isPromoteIntentRedirect('/promote?src=outreach-tag'), true);
  assert.equal(isPromoteIntentRedirect('/promoter-tools'), false);
  assert.equal(isPromoteIntentRedirect('/add-music'), false);
  assert.equal(isPromoteIntentRedirect('//promote'), false);
  assert.equal(isPromoteIntentRedirect(null), false);
  assert.equal(isPromoteIntentRedirect(undefined), false);
});

// The service persists to localStorage so the redirect survives resuming in
// a different tab (email-verification links). These tests stub the browser
// storage; the same store standing in for two "tabs" mirrors how
// localStorage is shared per-origin.
function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function withBrowserStorage(run: (storage: Storage) => void) {
  const globals = globalThis as { window?: unknown; localStorage?: Storage };
  const storage = createStorage();
  globals.window = {};
  globals.localStorage = storage;
  try {
    run(storage);
  } finally {
    delete globals.window;
    delete globals.localStorage;
  }
}

test('saved redirects survive a fresh tab and are consumed once', () => {
  withBrowserStorage(() => {
    authRedirectService.save('/promote/new');
    // A second tab shares the same per-origin storage.
    assert.equal(authRedirectService.consume(), '/promote/new');
    assert.equal(authRedirectService.get(), null);
  });
});

test('saving an absent redirect leaves an existing one intact', () => {
  withBrowserStorage(() => {
    authRedirectService.save('/promote/new');
    // A paramless sign-in page load must not wipe another tab's redirect.
    authRedirectService.save(null);
    authRedirectService.save(undefined);
    assert.equal(authRedirectService.get(), '/promote/new');
  });
});

test('saving an invalid redirect clears the stored one', () => {
  withBrowserStorage(() => {
    authRedirectService.save('/promote/new');
    authRedirectService.save('https://evil.example');
    assert.equal(authRedirectService.get(), null);
  });
});

test('expired redirects are dropped on read', () => {
  withBrowserStorage((storage) => {
    authRedirectService.save('/promote/new');
    const stored = JSON.parse(storage.getItem('cassette_auth_redirect') ?? '{}') as {
      value: string;
      expiresAt: number;
    };
    storage.setItem(
      'cassette_auth_redirect',
      JSON.stringify({ ...stored, expiresAt: Date.now() - 1 }),
    );
    assert.equal(authRedirectService.get(), null);
    assert.equal(storage.getItem('cassette_auth_redirect'), null);
  });
});

test('malformed or tampered stored values are rejected on read', () => {
  withBrowserStorage((storage) => {
    storage.setItem('cassette_auth_redirect', 'not-json');
    assert.equal(authRedirectService.get(), null);

    storage.setItem(
      'cassette_auth_redirect',
      JSON.stringify({ value: 'https://evil.example', expiresAt: Date.now() + 60_000 }),
    );
    assert.equal(authRedirectService.get(), null);
    assert.equal(storage.getItem('cassette_auth_redirect'), null);
  });
});

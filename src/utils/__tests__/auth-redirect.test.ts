import test from 'node:test';
import assert from 'node:assert/strict';

import {
  authRedirectService,
  buildAuthPath,
  isPromoteIntentRedirect,
  normalizeAuthRedirect,
  parseMembershipIntentRedirect,
} from '../auth-redirect';
import { createMemoryStorage } from '../../lib/__tests__/memory-storage';

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

void test('builds auth paths that return only to safe local destinations', () => {
  assert.equal(buildAuthPath('/auth/signin', '/post/post-1'), '/auth/signin?redirect=%2Fpost%2Fpost-1');
  assert.equal(
    buildAuthPath('/auth/signup', '/studio/curator?step=plan'),
    '/auth/signup?redirect=%2Fstudio%2Fcurator%3Fstep%3Dplan',
  );
  for (const unsafe of ['https://evil.example', '//evil.example', '/%2F%2Fevil.example', '/\\evil.example']) {
    assert.equal(buildAuthPath('/auth/signin', unsafe), '/auth/signin');
  }
  for (const noReturn of [null, undefined, '', '/', '/auth/signin', '/auth/signup?redirect=%2Fx', '/onboarding']) {
    assert.equal(buildAuthPath('/auth/signin', noReturn), '/auth/signin');
  }
  assert.equal(buildAuthPath('/auth/signin', '/authors'), '/auth/signin?redirect=%2Fauthors');
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

test('parses membership-intent redirects and rejects malformed or unsafe ones', () => {
  assert.deepEqual(
    parseMembershipIntentRedirect('/profile/dj_matt?membership=join&interval=year'),
    { username: 'dj_matt', interval: 'year' },
  );
  assert.deepEqual(
    parseMembershipIntentRedirect('/profile/dj_matt?interval=month&membership=join'),
    { username: 'dj_matt', interval: 'month' },
  );
  assert.equal(parseMembershipIntentRedirect('/profile/dj_matt?membership=join&interval=week'), null);
  assert.equal(parseMembershipIntentRedirect('/profile/dj_matt?membership=join'), null);
  assert.equal(parseMembershipIntentRedirect('/profile/dj_matt?membership=canceled&interval=year'), null);
  assert.equal(parseMembershipIntentRedirect('/profile/dj_matt/posts?membership=join&interval=year'), null);
  assert.equal(parseMembershipIntentRedirect('/profile/dj%2Fmatt?membership=join&interval=year'), null);
  assert.equal(parseMembershipIntentRedirect('//evil.example/profile/x?membership=join&interval=year'), null);
  assert.equal(parseMembershipIntentRedirect('https://evil.example/profile/x?membership=join&interval=year'), null);
  assert.equal(parseMembershipIntentRedirect('/promote/new'), null);
  assert.equal(parseMembershipIntentRedirect(null), null);
});

function withBrowserStorage(run: (storage: Storage) => void) {
  const globals = globalThis as { window?: unknown; localStorage?: Storage };
  const storage = createMemoryStorage();
  globals.window = {};
  globals.localStorage = storage;
  try {
    run(storage);
  } finally {
    delete globals.window;
    delete globals.localStorage;
  }
}

test('a saved redirect is consumed once', () => {
  withBrowserStorage(() => {
    authRedirectService.save('/promote/new');
    assert.equal(authRedirectService.consume(), '/promote/new');
    assert.equal(authRedirectService.get(), null);
  });
});

test('saving an absent redirect leaves an existing one intact', () => {
  withBrowserStorage(() => {
    authRedirectService.save('/promote/new');
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

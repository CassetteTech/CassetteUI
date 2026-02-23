import test from 'node:test';
import assert from 'node:assert/strict';
import { captureClientEvent, identifyClientUser, resetAnalyticsContextForTests } from '../client';
import { shouldSuppressClientCapture, isCassetteInternalAccount, isInternalOrDemoRoute } from '../internal-suppression';

type MemoryStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function setupBrowserMocks(pathname = '/auth/signup') {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousFetch = globalThis.fetch;
  const previousNavigator = (globalThis as { navigator?: { sendBeacon?: (url: string, data: Blob) => boolean } }).navigator;
  const previousSendBeacon = previousNavigator?.sendBeacon;

  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  const fetchPayloads: Array<Record<string, unknown>> = [];
  const beaconPayloads: Blob[] = [];

  (globalThis as { window?: unknown }).window = {
    localStorage,
    sessionStorage,
    location: {
      pathname,
      origin: 'https://cassette.test',
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };

  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    if (init?.body && typeof init.body === 'string') {
      fetchPayloads.push(JSON.parse(init.body));
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    } as Response;
  }) as typeof fetch;

  if (previousNavigator && typeof previousNavigator === 'object') {
    try {
      previousNavigator.sendBeacon = (_url: string, data: Blob) => {
        beaconPayloads.push(data);
        return true;
      };
    } catch {
      // ignore navigator mutation failures
    }
  }

  return {
    localStorage,
    fetchPayloads,
    beaconPayloads,
    restore() {
      (globalThis as { window?: unknown }).window = previousWindow;
      globalThis.fetch = previousFetch;
      if (previousNavigator && typeof previousNavigator === 'object') {
        try {
          previousNavigator.sendBeacon = previousSendBeacon;
        } catch {
          // ignore navigator mutation failures
        }
      }
    },
  };
}

async function collectCapturedPayloads(
  fetchPayloads: Array<Record<string, unknown>>,
  beaconPayloads: Blob[],
): Promise<Array<Record<string, unknown>>> {
  const captured = [...fetchPayloads];

  for (const blob of beaconPayloads) {
    try {
      const text = await blob.text();
      if (!text) continue;
      captured.push(JSON.parse(text));
    } catch {
      // ignore parse failures
    }
  }

  return captured;
}

test('captureClientEvent is a no-op when PostHog env keys are missing', { concurrency: false }, async () => {
  const previous = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  resetAnalyticsContextForTests();

  const result = await captureClientEvent('profile_viewed', {
    route: '/profile/test',
    source_surface: 'profile',
  });

  assert.equal(result, false);
  process.env.NEXT_PUBLIC_POSTHOG_KEY = previous;
});

test('identifyClientUser emits alias merge and identify for anon-to-user transitions', { concurrency: false }, async () => {
  const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
  resetAnalyticsContextForTests();

  const mocks = setupBrowserMocks('/auth/signup');
  mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:test-user');

  const result = await identifyClientUser({
    userId: 'user-123',
    isAuthenticated: true,
    accountType: 'Regular',
  });

  const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
  const events = captured.map((payload) => payload.event);

  assert.equal(result, true);
  assert.ok(events.includes('$create_alias'));
  assert.ok(events.includes('$identify'));

  const aliasPayload = captured.find((payload) => payload.event === '$create_alias');
  assert.equal(aliasPayload?.distinct_id, 'anon:test-user');
  assert.equal((aliasPayload?.properties as Record<string, unknown>)?.alias, 'user-123');

  mocks.restore();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});

test('identifyClientUser emits identify only when anonymous id equals user id', { concurrency: false }, async () => {
  const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
  resetAnalyticsContextForTests();

  const mocks = setupBrowserMocks('/auth/signup');
  mocks.localStorage.setItem('cassette_posthog_distinct_id', 'user-123');

  const result = await identifyClientUser({
    userId: 'user-123',
    isAuthenticated: true,
    accountType: 'Regular',
  });

  const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
  const aliasEvents = captured.filter((payload) => payload.event === '$create_alias');
  const identifyEvents = captured.filter((payload) => payload.event === '$identify');

  assert.equal(result, true);
  assert.equal(aliasEvents.length, 0);
  assert.equal(identifyEvents.length, 1);

  mocks.restore();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});

test('identifyClientUser alias merge is idempotent for same anon-user pair', { concurrency: false }, async () => {
  const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
  resetAnalyticsContextForTests();

  const mocks = setupBrowserMocks('/auth/signup');
  mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:repeat');

  await identifyClientUser({
    userId: 'user-123',
    isAuthenticated: true,
    accountType: 'Regular',
  });

  await identifyClientUser({
    userId: 'user-123',
    isAuthenticated: true,
    accountType: 'Regular',
  });

  const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
  const aliasEvents = captured.filter((payload) => payload.event === '$create_alias');
  const identifyEvents = captured.filter((payload) => payload.event === '$identify');

  assert.equal(aliasEvents.length, 1);
  assert.equal(identifyEvents.length, 2);

  mocks.restore();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});

test('identifyClientUser respects internal/demo suppression', { concurrency: false }, async () => {
  const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
  resetAnalyticsContextForTests();

  const mocks = setupBrowserMocks('/debug');
  mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:suppressed');

  const result = await identifyClientUser({
    userId: 'user-123',
    isAuthenticated: true,
    accountType: 'Regular',
  });

  const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
  assert.equal(result, false);
  assert.equal(captured.length, 0);

  mocks.restore();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});

test('suppression logic blocks internal/demo routes but not cassette team actors', () => {
  assert.equal(isInternalOrDemoRoute('/debug'), true);
  assert.equal(isInternalOrDemoRoute('/demo/profile'), true);
  assert.equal(isInternalOrDemoRoute('/post/abc'), false);

  assert.equal(shouldSuppressClientCapture({ route: '/profile/test', accountType: 'CassetteTeam', allowInDev: true }), false);
  assert.equal(shouldSuppressClientCapture({ route: '/post/abc', accountType: 'Regular', allowInDev: true }), false);
});

test('cassette team actor classification is account-type based', () => {
  assert.equal(isCassetteInternalAccount('CassetteTeam'), true);
  assert.equal(isCassetteInternalAccount('cassette_team'), true);
  assert.equal(isCassetteInternalAccount('Cassette Team'), true);
  assert.equal(isCassetteInternalAccount('cassette-team'), true);
  assert.equal(isCassetteInternalAccount(2), true);
  assert.equal(isCassetteInternalAccount('Verified'), false);
  assert.equal(isCassetteInternalAccount('Regular'), false);
  assert.equal(isCassetteInternalAccount(undefined), false);
});

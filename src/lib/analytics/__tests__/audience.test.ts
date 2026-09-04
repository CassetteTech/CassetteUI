import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserCohort, rememberUserCohort } from '../audience';

function withSessionStorage(run: () => void) {
  const store = new Map<string, string>();
  const globals = globalThis as { window?: unknown };
  const previousWindow = globals.window;
  globals.window = {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
  try {
    run();
  } finally {
    globals.window = previousWindow;
  }
}

test('user cohort is the remembered journey for that user only, and expires', () => {
  withSessionStorage(() => {
    const now = Date.parse('2026-09-04T12:00:00Z');
    assert.equal(getUserCohort(null, now), undefined);
    assert.equal(getUserCohort('user-a', now), 'existing');

    rememberUserCohort('user-a', 'new', now);
    assert.equal(getUserCohort('user-a', now), 'new');
    assert.equal(getUserCohort(undefined, now), undefined);
    // Another account in the same tab never inherits the new-user journey.
    assert.equal(getUserCohort('user-b', now), 'existing');
    // Bounded: a day later the record is stale.
    assert.equal(getUserCohort('user-a', now + 25 * 60 * 60 * 1000), 'existing');
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserCohort, rememberUserCohort } from '../audience';
import { createMemoryStorage } from '../../__tests__/memory-storage';

function withSessionStorage(run: () => void) {
  const globals = globalThis as { window?: unknown };
  const previousWindow = globals.window;
  globals.window = { sessionStorage: createMemoryStorage() };
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
    assert.equal(getUserCohort('user-b', now), 'existing');
    assert.equal(getUserCohort('user-a', now + 25 * 60 * 60 * 1000), 'existing');
  });
});

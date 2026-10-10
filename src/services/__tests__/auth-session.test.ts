/** Covers the web-session envelope: only a 401 signs out, and only two valid counts make a session. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readSessionResponse, readSignedInBody } from '../auth-session';

type BodyOverrides = {
  success?: boolean;
  authenticated?: boolean;
  user?: { userId?: string; username?: string } | null;
  activeMembershipCount?: number | string | null;
  feedCuratorCount?: number | string | null;
};

const user = { userId: 'user-member', username: 'miagroove' };
const signedIn = (overrides: BodyOverrides = {}) => ({
  success: true,
  authenticated: true,
  user,
  activeMembershipCount: 2,
  feedCuratorCount: 3,
  ...overrides,
});

void test('a signed-in session carries the user and both Feed source counts', () => {
  assert.deepEqual(readSessionResponse(200, signedIn()), {
    kind: 'authenticated',
    user,
    counts: { activeMembershipCount: 2, feedCuratorCount: 3 },
  });
  assert.deepEqual(readSessionResponse(200, signedIn({ activeMembershipCount: 0, feedCuratorCount: 0 })), {
    kind: 'authenticated',
    user,
    counts: { activeMembershipCount: 0, feedCuratorCount: 0 },
  });
});

void test('a Follow-only viewer has Feed sources without a paid membership', () => {
  assert.deepEqual(readSessionResponse(200, signedIn({ activeMembershipCount: 0, feedCuratorCount: 2 })), {
    kind: 'authenticated',
    user,
    counts: { activeMembershipCount: 0, feedCuratorCount: 2 },
  });
});

void test('counts that disagree during a source change are still a session, never an error', () => {
  // Bridge reads the counts in separate statements: a membership that ends between
  // them leaves the paid count above the source count for one response.
  assert.deepEqual(readSessionResponse(200, signedIn({ activeMembershipCount: 1, feedCuratorCount: 0 })), {
    kind: 'authenticated',
    user,
    counts: { activeMembershipCount: 1, feedCuratorCount: 0 },
  });
});

void test('only a 401 means signed out', () => {
  assert.deepEqual(readSessionResponse(401, { success: false }), { kind: 'signed-out' });
  for (const status of [403, 404, 500, 502, 503]) {
    assert.deepEqual(readSessionResponse(status, signedIn()), { kind: 'error' }, `status ${status}`);
  }
});

void test('a missing, negative, fractional, or non-numeric count of either kind is an error, never zero', () => {
  const { activeMembershipCount: _paid, ...withoutPaidCount } = signedIn();
  const { feedCuratorCount: _sources, ...withoutSourceCount } = signedIn();
  const invalid: Array<number | string | null> = [-1, 1.5, '2', null];
  for (const body of [
    withoutPaidCount,
    withoutSourceCount,
    ...invalid.map((value) => signedIn({ activeMembershipCount: value })),
    ...invalid.map((value) => signedIn({ feedCuratorCount: value })),
  ]) {
    assert.deepEqual(readSessionResponse(200, body), { kind: 'error' }, JSON.stringify(body));
  }
});

void test('a sign-in with an invalid count still names the signed-in user', () => {
  assert.deepEqual(readSignedInBody(signedIn({ activeMembershipCount: -1 })), { user, counts: null });
  assert.deepEqual(readSignedInBody(signedIn({ feedCuratorCount: 0.5 })), { user, counts: null });
});

void test('a body that is not a signed-in session is an error', () => {
  for (const body of [
    null,
    'unavailable',
    signedIn({ success: false }),
    signedIn({ authenticated: false }),
    signedIn({ user: null }),
    signedIn({ user: { username: 'no-id' } }),
    signedIn({ user: { userId: '  ' } }),
  ]) {
    assert.deepEqual(readSessionResponse(200, body), { kind: 'error' });
    assert.equal(readSignedInBody(body), null);
  }
});

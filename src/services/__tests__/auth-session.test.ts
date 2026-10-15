import test from 'node:test';
import assert from 'node:assert/strict';
import { readSessionResponse, signedInBodySchema } from '../auth-session';

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
  assert.deepEqual(readSessionResponse(200, signedInBodySchema.safeParse(signedIn()).data), {
    kind: 'authenticated',
    user,
    counts: { activeMembershipCount: 2, feedCuratorCount: 3 },
  });
  assert.deepEqual(readSessionResponse(200, signedInBodySchema.safeParse(signedIn({ activeMembershipCount: 0, feedCuratorCount: 0 })).data), {
    kind: 'authenticated',
    user,
    counts: { activeMembershipCount: 0, feedCuratorCount: 0 },
  });
});

void test('a Follow-only viewer has Feed sources without a paid membership', () => {
  assert.deepEqual(readSessionResponse(200, signedInBodySchema.safeParse(signedIn({ activeMembershipCount: 0, feedCuratorCount: 2 })).data), {
    kind: 'authenticated',
    user,
    counts: { activeMembershipCount: 0, feedCuratorCount: 2 },
  });
});

void test('a membership count above the source count is an error, never a session', () => {
  assert.deepEqual(signedInBodySchema.parse(signedIn({ activeMembershipCount: 2, feedCuratorCount: 1 })), { user, counts: null });
  assert.deepEqual(readSessionResponse(200, signedInBodySchema.safeParse(signedIn({ activeMembershipCount: 1, feedCuratorCount: 0 })).data), { kind: 'error' });
});

void test('only a 401 means signed out', () => {
  assert.deepEqual(readSessionResponse(401, undefined), { kind: 'signed-out' });
  for (const status of [403, 404, 500, 502, 503]) {
    assert.deepEqual(readSessionResponse(status, signedInBodySchema.safeParse(signedIn()).data), { kind: 'error' }, `status ${status}`);
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
    assert.deepEqual(readSessionResponse(200, signedInBodySchema.safeParse(body).data), { kind: 'error' }, JSON.stringify(body));
  }
});

void test('a sign-in with an invalid count still names the signed-in user', () => {
  assert.deepEqual(signedInBodySchema.parse(signedIn({ activeMembershipCount: -1 })), { user, counts: null });
  assert.deepEqual(signedInBodySchema.parse(signedIn({ feedCuratorCount: 0.5 })), { user, counts: null });
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
    assert.deepEqual(readSessionResponse(200, signedInBodySchema.safeParse(body).data), { kind: 'error' });
    assert.equal(signedInBodySchema.safeParse(body).success, false);
  }
});

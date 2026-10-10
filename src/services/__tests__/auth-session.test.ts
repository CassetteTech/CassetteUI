/** Covers the web-session envelope: only a 401 signs out, and only a valid count is a session. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readSessionResponse, readSignedInBody } from '../auth-session';

type BodyOverrides = {
  success?: boolean;
  authenticated?: boolean;
  user?: { userId?: string; username?: string } | null;
  activeMembershipCount?: number | string | null;
};

const user = { userId: 'user-member', username: 'miagroove' };
const signedIn = (overrides: BodyOverrides = {}) => ({
  success: true,
  authenticated: true,
  user,
  activeMembershipCount: 2,
  ...overrides,
});

void test('a signed-in session carries the user and the membership count', () => {
  assert.deepEqual(readSessionResponse(200, signedIn()), { kind: 'authenticated', user, activeMembershipCount: 2 });
  assert.deepEqual(readSessionResponse(200, signedIn({ activeMembershipCount: 0 })), {
    kind: 'authenticated',
    user,
    activeMembershipCount: 0,
  });
});

void test('only a 401 means signed out', () => {
  assert.deepEqual(readSessionResponse(401, { success: false }), { kind: 'signed-out' });
  for (const status of [403, 404, 500, 502, 503]) {
    assert.deepEqual(readSessionResponse(status, signedIn()), { kind: 'error' }, `status ${status}`);
  }
});

void test('a missing, negative, fractional, or non-numeric count is an error, never zero', () => {
  const { activeMembershipCount: _omitted, ...withoutCount } = signedIn();
  for (const body of [
    withoutCount,
    signedIn({ activeMembershipCount: -1 }),
    signedIn({ activeMembershipCount: 1.5 }),
    signedIn({ activeMembershipCount: '2' }),
    signedIn({ activeMembershipCount: null }),
  ]) {
    assert.deepEqual(readSessionResponse(200, body), { kind: 'error' });
  }
});

void test('a sign-in with an invalid count still names the signed-in user', () => {
  assert.deepEqual(readSignedInBody(signedIn({ activeMembershipCount: -1 })), { user, activeMembershipCount: null });
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

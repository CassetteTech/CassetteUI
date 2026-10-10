/** Covers the session that a sign-in, a sign-up, or a password update returns, through the real auth service. */

import './browser-service-environment';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../auth';
import { useAuthStore } from '../../stores/auth-store';

type Answer = { status: number; body: unknown };

const SESSION_PATH = '/api/auth/session';
const NOT_FOUND: Answer = { status: 404, body: {} };

const requests: string[] = [];
let answer: (path: string) => Answer | Promise<Answer> = () => NOT_FOUND;

const stubFetch: typeof fetch = async (input) => {
  const path = input instanceof Request ? input.url : input.toString();
  requests.push(path);
  const { status, body } = await answer(path);
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
};
globalThis.fetch = stubFetch;

/** The envelope Bridge returns for a signed-in web session; an undefined count is left out of the JSON. */
const signedIn = (userId: string, activeMembershipCount: number | undefined) => ({
  success: true,
  authenticated: true,
  user: { userId, username: userId, displayName: userId, isOnboarded: true },
  activeMembershipCount,
});

const credentials = { email: 'mia@cassette.test', password: 'a long password' };
const entries = [
  { name: 'sign-in', path: '/api/auth/signin', start: () => authService.signIn(credentials) },
  {
    name: 'sign-up',
    path: '/api/auth/signup',
    start: () => authService.signUp({ ...credentials, confirmPassword: credentials.password, username: 'mia', acceptTerms: true }),
  },
  { name: 'password update', path: '/api/auth/update-password', start: () => authService.updatePassword(credentials.password) },
];

const sessionReads = () => requests.filter((path) => path === SESSION_PATH).length;

beforeEach(() => {
  useAuthStore.getState().signOut();
  requests.length = 0;
  answer = () => NOT_FOUND;
});

for (const entry of entries) {
  void test(`a ${entry.name} applies the returned user and count in one update, without a session read`, async () => {
    answer = (path) => (path === entry.path ? { status: 200, body: signedIn('user-mia', 3) } : NOT_FOUND);
    const counts: Array<number | null> = [];
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user?.id === 'user-mia') counts.push(state.activeMembershipCount);
    });

    await entry.start();
    unsubscribe();

    assert.deepEqual(counts, [3]);
    const state = useAuthStore.getState();
    assert.equal(state.sessionError, false);
    assert.notEqual(state.sessionCheckedAt, null);
    assert.equal(sessionReads(), 0);
  });

  void test(`a ${entry.name} without a valid count is a session error, never zero memberships`, async () => {
    for (const count of [undefined, -1]) {
      useAuthStore.getState().signOut();
      answer = (path) => (path === entry.path ? { status: 200, body: signedIn('user-mia', count) } : NOT_FOUND);

      await entry.start();

      const state = useAuthStore.getState();
      assert.equal(state.user?.id, 'user-mia', `count ${count}`);
      assert.equal(state.isAuthenticated, true);
      assert.equal(state.sessionError, true);
      assert.equal(state.activeMembershipCount, null);
    }
    assert.equal(sessionReads(), 0);
  });

  void test(`a session read that began before a ${entry.name} cannot restore the earlier account`, async () => {
    answer = (path) => (path === SESSION_PATH ? { status: 200, body: signedIn('user-earlier', 1) } : NOT_FOUND);
    await authService.refreshSession();
    assert.equal(useAuthStore.getState().user?.id, 'user-earlier');

    let release = () => {};
    const released = new Promise<void>((resolve) => { release = resolve; });
    answer = async (path) => {
      if (path === entry.path) return { status: 200, body: signedIn('user-mia', 3) };
      if (path !== SESSION_PATH) return NOT_FOUND;
      // Bridge answers for the earlier account after the new session began.
      await released;
      return { status: 200, body: signedIn('user-earlier', 1) };
    };
    const earlierRead = authService.refreshSession();
    await entry.start();
    release();

    assert.deepEqual(await earlierRead, { kind: 'superseded' });
    const state = useAuthStore.getState();
    assert.equal(state.user?.id, 'user-mia');
    assert.equal(state.activeMembershipCount, 3);
    assert.equal(state.isRefreshingSession, false);
  });
}

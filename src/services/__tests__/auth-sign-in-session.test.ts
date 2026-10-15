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

const signedIn = (
  userId: string,
  activeMembershipCount: number | undefined,
  feedCuratorCount: number | undefined,
) => ({
  success: true,
  authenticated: true,
  user: { userId, username: userId, displayName: userId, isOnboarded: true },
  activeMembershipCount,
  feedCuratorCount,
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
  void test(`a ${entry.name} applies the returned user and both counts in one update, without a session read`, async () => {
    answer = (path) => (path === entry.path ? { status: 200, body: signedIn('user-mia', 3, 5) } : NOT_FOUND);
    const counts: Array<[number | null, number | null]> = [];
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user?.id === 'user-mia') counts.push([state.activeMembershipCount, state.feedCuratorCount]);
    });

    await entry.start();
    unsubscribe();

    assert.deepEqual(counts, [[3, 5]]);
    const state = useAuthStore.getState();
    assert.equal(state.sessionError, false);
    assert.notEqual(state.sessionCheckedAt, null);
    assert.equal(sessionReads(), 0);
  });

  void test(`a ${entry.name} without valid counts is a session error, never zero sources`, async () => {
    const invalid: Array<[number | undefined, number | undefined]> = [[undefined, 2], [-1, 2], [1, undefined], [1, 0.5], [1, 0]];
    for (const [paid, sources] of invalid) {
      useAuthStore.getState().signOut();
      answer = (path) => (path === entry.path ? { status: 200, body: signedIn('user-mia', paid, sources) } : NOT_FOUND);

      await entry.start();

      const state = useAuthStore.getState();
      assert.equal(state.user?.id, 'user-mia', `counts ${paid}, ${sources}`);
      assert.equal(state.isAuthenticated, true);
      assert.equal(state.sessionError, true);
      assert.equal(state.activeMembershipCount, null);
      assert.equal(state.feedCuratorCount, null);
    }
    assert.equal(sessionReads(), 0);
  });

  void test(`a session read that began before a ${entry.name} cannot restore the earlier account`, async () => {
    answer = (path) => (path === SESSION_PATH ? { status: 200, body: signedIn('user-earlier', 1, 2) } : NOT_FOUND);
    await authService.refreshSession();
    assert.equal(useAuthStore.getState().user?.id, 'user-earlier');

    let release = () => {};
    const released = new Promise<void>((resolve) => { release = resolve; });
    answer = async (path) => {
      if (path === entry.path) return { status: 200, body: signedIn('user-mia', 3, 4) };
      if (path !== SESSION_PATH) return NOT_FOUND;
      await released;
      return { status: 200, body: signedIn('user-earlier', 1, 2) };
    };
    const earlierRead = authService.refreshSession();
    await entry.start();
    release();

    assert.deepEqual(await earlierRead, { kind: 'superseded' });
    const state = useAuthStore.getState();
    assert.equal(state.user?.id, 'user-mia');
    assert.equal(state.activeMembershipCount, 3);
    assert.equal(state.feedCuratorCount, 4);
    assert.equal(state.isRefreshingSession, false);
  });
}

void test('a session read replaces both counts together, and a malformed source count keeps the earlier answer as an error', async () => {
  answer = (path) => (path === SESSION_PATH ? { status: 200, body: signedIn('user-mia', 0, 2) } : NOT_FOUND);
  assert.equal((await authService.refreshSession()).kind, 'authenticated');
  let state = useAuthStore.getState();
  assert.deepEqual([state.activeMembershipCount, state.feedCuratorCount, state.sessionError], [0, 2, false]);

  answer = (path) => (path === SESSION_PATH ? { status: 200, body: signedIn('user-mia', 1, 1) } : NOT_FOUND);
  assert.equal((await authService.refreshSession()).kind, 'authenticated');
  state = useAuthStore.getState();
  assert.deepEqual([state.activeMembershipCount, state.feedCuratorCount, state.sessionError], [1, 1, false]);

  for (const sources of [-1, 0]) {
    answer = (path) => (path === SESSION_PATH ? { status: 200, body: signedIn('user-mia', 1, sources) } : NOT_FOUND);
    assert.deepEqual(await authService.refreshSession(), { kind: 'error' }, `source count ${sources}`);
    state = useAuthStore.getState();
    assert.equal(state.user?.id, 'user-mia');
    assert.equal(state.sessionError, true);
    assert.deepEqual([state.activeMembershipCount, state.feedCuratorCount], [1, 1]);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { AuthUser } from '../../types';
import { useAuthStore } from '../auth-store';

const user = (id: string, displayName = id): AuthUser => ({
  id,
  email: `${id}@cassette.test`,
  username: id,
  displayName,
  profilePicture: '',
  isEmailVerified: true,
  isOnboarded: true,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

const initialState = useAuthStore.getState();
const reset = () => useAuthStore.setState(initialState, true);

void test('the session starts unknown, not signed out and not zero', () => {
  reset();
  const state = useAuthStore.getState();
  assert.equal(state.isLoading, true);
  assert.equal(state.user, null);
  assert.equal(state.activeMembershipCount, null);
  assert.equal(state.feedCuratorCount, null);
  assert.equal(state.sessionError, false);
});

void test('a session sets the user, both counts, and check time together', () => {
  reset();
  const before = Date.now();
  useAuthStore.getState().setSession({ user: user('mia'), activeMembershipCount: 0, feedCuratorCount: 1 });
  const state = useAuthStore.getState();
  assert.equal(state.user?.id, 'mia');
  assert.equal(state.activeMembershipCount, 0);
  assert.equal(state.feedCuratorCount, 1);
  assert.ok((state.sessionCheckedAt ?? 0) >= before);
  assert.equal(state.isAuthenticated, true);
  assert.equal(state.isLoading, false);
});

void test('a failed read keeps the known user and counts but marks the session as an error', () => {
  reset();
  useAuthStore.getState().setSession({ user: user('mia'), activeMembershipCount: 2, feedCuratorCount: 3 });
  const checkedAt = useAuthStore.getState().sessionCheckedAt;
  useAuthStore.getState().setSessionError();
  const state = useAuthStore.getState();
  assert.equal(state.user?.id, 'mia');
  assert.equal(state.activeMembershipCount, 2);
  assert.equal(state.feedCuratorCount, 3);
  assert.equal(state.sessionCheckedAt, checkedAt);
  assert.equal(state.sessionError, true);

  useAuthStore.getState().setSession({ user: user('mia'), activeMembershipCount: 1, feedCuratorCount: 2 });
  assert.equal(useAuthStore.getState().sessionError, false);
});

void test('an outage before any answer is an error without a user', () => {
  reset();
  useAuthStore.getState().setSessionError();
  const state = useAuthStore.getState();
  assert.equal(state.isLoading, false);
  assert.equal(state.user, null);
  assert.equal(state.sessionError, true);
});

void test('a sign-in without valid counts names the user and leaves both counts unknown', () => {
  reset();
  useAuthStore.getState().setSession({ user: user('mia'), activeMembershipCount: 2, feedCuratorCount: 3 });
  useAuthStore.getState().setSessionError(user('sam'));
  const state = useAuthStore.getState();
  assert.equal(state.user?.id, 'sam');
  assert.equal(state.activeMembershipCount, null);
  assert.equal(state.feedCuratorCount, null);
  assert.equal(state.sessionCheckedAt, null);
  assert.equal(state.sessionError, true);
});

void test('a profile edit by the same user keeps the membership summary', () => {
  reset();
  useAuthStore.getState().setSession({ user: user('mia'), activeMembershipCount: 3, feedCuratorCount: 4 });
  const checkedAt = useAuthStore.getState().sessionCheckedAt;
  useAuthStore.getState().updateUser(user('mia', 'Mia Groove'));
  const state = useAuthStore.getState();
  assert.equal(state.user?.displayName, 'Mia Groove');
  assert.equal(state.activeMembershipCount, 3);
  assert.equal(state.feedCuratorCount, 4);
  assert.equal(state.sessionCheckedAt, checkedAt);
});

void test('a different user from a profile update starts with unknown counts', () => {
  reset();
  useAuthStore.getState().setSession({ user: user('mia'), activeMembershipCount: 3, feedCuratorCount: 4 });
  useAuthStore.getState().updateUser(user('sam'));
  const state = useAuthStore.getState();
  assert.equal(state.user?.id, 'sam');
  assert.equal(state.activeMembershipCount, null);
  assert.equal(state.feedCuratorCount, null);
  assert.equal(state.sessionCheckedAt, null);
});

void test('sign-out clears the user, summary, and error', () => {
  reset();
  useAuthStore.getState().setSession({ user: user('mia'), activeMembershipCount: 3, feedCuratorCount: 4 });
  useAuthStore.getState().setSessionError();
  useAuthStore.getState().signOut();
  const state = useAuthStore.getState();
  assert.equal(state.user, null);
  assert.equal(state.activeMembershipCount, null);
  assert.equal(state.feedCuratorCount, null);
  assert.equal(state.sessionCheckedAt, null);
  assert.equal(state.sessionError, false);
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.isLoading, false);
});

void test('counts from a Feed page replace both session counts in one update and keep the check time', () => {
  reset();
  useAuthStore.getState().setSession({ user: user('mia'), activeMembershipCount: 1, feedCuratorCount: 2 });
  const checkedAt = useAuthStore.getState().sessionCheckedAt;
  const updates: Array<[number | null, number | null]> = [];
  const unsubscribe = useAuthStore.subscribe((state) => updates.push([state.activeMembershipCount, state.feedCuratorCount]));
  // Counts read in separate statements may disagree; the store keeps them as Bridge sent them.
  useAuthStore.getState().setFeedSourceCounts({ activeMembershipCount: 1, feedCuratorCount: 0 });
  unsubscribe();
  assert.deepEqual(updates, [[1, 0]]);
  assert.equal(useAuthStore.getState().sessionCheckedAt, checkedAt);
  assert.equal(useAuthStore.getState().user?.id, 'mia');
});

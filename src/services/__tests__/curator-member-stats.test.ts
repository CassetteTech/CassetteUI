import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchCuratorMemberStats, memberAxisMax, parseCuratorMemberStats } from '../curator-member-stats';

const payload = {
  days: 7,
  activeMembers: 3,
  newMembers: 1,
  endedMembers: 2,
  notRenewingMembers: 1,
  previousWindow: { activeMembers: 4, newMembers: 2, endedMembers: 1 },
  daily: [5, 5, 4, 4, 3, 3, 3].map((activeMembers, index) => ({
    date: `2026-08-${String(10 + index).padStart(2, '0')}`,
    activeMembers,
  })),
};

void test('parses counts only and rejects identities or inconsistent windows', () => {
  assert.deepEqual(parseCuratorMemberStats(payload), payload);
  assert.throws(() => parseCuratorMemberStats({ ...payload, fanUserIds: ['fan'] }), /Unrecognized key/);
  assert.throws(() => parseCuratorMemberStats({
    ...payload,
    daily: [{ ...payload.daily[0], membershipSubscriptionId: 'msb_secret' }, ...payload.daily.slice(1)],
  }), /Unrecognized key/);
  assert.throws(() => parseCuratorMemberStats({ ...payload, daily: payload.daily.slice(1) }), /inconsistent/);
  for (const date of ['2026-13-01', '2026-02-30', '2026-8-10', '2026-08-10T00:00:00Z']) {
    assert.throws(() => parseCuratorMemberStats({
      ...payload,
      daily: [{ ...payload.daily[0], date }, ...payload.daily.slice(1)],
    }));
  }
  assert.throws(() => parseCuratorMemberStats({ ...payload, notRenewingMembers: 4 }), /inconsistent/);
  assert.throws(() => parseCuratorMemberStats({ ...payload, endedMembers: -1 }));
});

void test('leaves headroom above the busiest day on a whole-number axis', () => {
  const tops = [0, 1, 2, 3, 4, 5, 9, 18, 25, 100, 1234].map(memberAxisMax);
  assert.deepEqual(tops, [2, 2, 3, 4, 6, 10, 15, 30, 40, 150, 2000]);
  for (const [index, peak] of [0, 1, 2, 3, 4, 5, 9, 18, 25, 100, 1234].entries()) {
    assert.ok(tops[index] > peak && Number.isInteger(tops[index]), `axis top ${tops[index]} for peak ${peak}`);
  }
});

void test('loads one authenticated no-store window', async (t) => {
  const calls: Array<{ init?: RequestInit; input: string | URL | Request }> = [];
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ init, input });
    return new Response(JSON.stringify(payload));
  });

  assert.deepEqual(await fetchCuratorMemberStats(7, controller.signal), payload);
  assert.deepEqual(calls, [{
    input: '/api/v1/curators/me/member-stats?days=7',
    init: { cache: 'no-store', credentials: 'include', signal: controller.signal },
  }]);
});

void test('rejects an out-of-range window before sending, and surfaces HTTP failures', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 503 }));

  await assert.rejects(fetchCuratorMemberStats(6));
  await assert.rejects(fetchCuratorMemberStats(366));
  assert.equal(fetchMock.mock.callCount(), 0);
  await assert.rejects(fetchCuratorMemberStats(30), /Failed to load member counts/);
});

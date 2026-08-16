import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchCuratorEarnings,
  parseCuratorEarnings,
} from '../curator-earnings';

const payload = {
  activeMemberCount: 3,
  items: [
    {
      kind: 'allocation',
      amountMinor: 425,
      currency: 'USD',
      status: 'accrued',
      occurredAtUtc: '2026-08-16T12:00:00Z',
      payableAtUtc: '2026-08-30T12:00:00Z',
    },
    {
      kind: 'transfer',
      amountMinor: 900,
      currency: 'USD',
      status: 'succeeded',
      occurredAtUtc: '2026-08-15T12:00:00Z',
    },
  ],
  totalItems: 2,
  page: 1,
  pageSize: 20,
} as const;

void test('parses the private earnings union without sensitive details', () => {
  assert.deepEqual(parseCuratorEarnings(payload), payload);
  assert.throws(() => parseCuratorEarnings({
    ...payload,
    items: [{ ...payload.items[0], sourceRef: 'invoice_secret' }],
  }), /Unrecognized key/);
  assert.throws(() => parseCuratorEarnings({
    ...payload,
    items: [{ ...payload.items[1], payableAtUtc: '2026-08-30T12:00:00Z' }],
  }), /Unrecognized key/);
  assert.throws(() => parseCuratorEarnings({
    ...payload,
    items: [{ ...payload.items[0], amountMinor: Number.MAX_SAFE_INTEGER + 1 }],
  }));
  assert.throws(() => parseCuratorEarnings({ ...payload, pageSize: 1 }), /counts are inconsistent/);
});

void test('loads one authenticated no-store earnings page', async (t) => {
  const calls: Array<{ init?: RequestInit; input: string | URL | Request }> = [];
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ init, input });
    return new Response(JSON.stringify(payload));
  });

  assert.deepEqual(await fetchCuratorEarnings(1, 20, controller.signal), payload);
  assert.deepEqual(calls, [{
    input: '/api/v1/curators/me/earnings?page=1&pageSize=20',
    init: {
      cache: 'no-store',
      credentials: 'include',
      signal: controller.signal,
    },
  }]);
});

void test('rejects invalid pagination before sending a request', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response());

  await assert.rejects(fetchCuratorEarnings(0, 51));
  assert.equal(fetchMock.mock.callCount(), 0);
});

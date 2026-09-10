/** Verifies curator earnings parsing, pagination, and authenticated request behavior. */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchCuratorEarnings,
  ledgerBalances,
  parseCuratorEarnings,
  periodSummary,
  type CuratorEarningsHistoryItem,
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

const now = new Date('2026-09-04T12:00:00Z');
const ledger = [
  { kind: 'allocation', amountMinor: 450, currency: 'USD', status: 'accrued', occurredAtUtc: '2026-09-02T12:00:00Z', payableAtUtc: '2026-09-28T12:00:00Z' },
  { kind: 'transfer', amountMinor: 2700, currency: 'USD', status: 'succeeded', occurredAtUtc: '2026-08-30T09:00:00Z' },
  { kind: 'allocation', amountMinor: 450, currency: 'USD', status: 'payable', occurredAtUtc: '2026-08-21T12:00:00Z', payableAtUtc: '2026-08-28T12:00:00Z' },
  { kind: 'allocation', amountMinor: 450, currency: 'USD', status: 'transferred', occurredAtUtc: '2026-08-07T12:00:00Z', payableAtUtc: '2026-08-28T12:00:00Z' },
  { kind: 'allocation', amountMinor: 125, currency: 'USD', status: 'forfeited', occurredAtUtc: '2026-08-02T12:00:00Z', payableAtUtc: '2026-08-28T12:00:00Z' },
  { kind: 'transfer', amountMinor: 900, currency: 'USD', status: 'failed', occurredAtUtc: '2026-05-30T09:00:00Z' },
  { kind: 'allocation', amountMinor: 450, currency: 'USD', status: 'transferred', occurredAtUtc: '2026-05-18T12:00:00Z', payableAtUtc: '2026-05-28T12:00:00Z' },
] satisfies CuratorEarningsHistoryItem[];

void test('derives balances from the ledger and only counts future clearing dates', () => {
  const balances = ledgerBalances(ledger, now);
  assert.equal(balances.earnedThisMonth, 450);
  assert.equal(balances.accrued, 450);
  assert.equal(balances.payable, 450);
  assert.equal(balances.paidOut, 2700);
  assert.equal(balances.nextPayableAt, '2026-09-28T12:00:00Z');
  // A payable item whose clearing date has passed is not "next"; an empty ledger has nothing next.
  assert.equal(ledgerBalances(ledger.slice(2), now).nextPayableAt, null);
  assert.equal(ledgerBalances([], now).currency, 'USD');
});

void test('buckets earned and paid out by month and flags incomplete windows', () => {
  const summary = periodSummary(ledger, ledger.length, 3, now);
  assert.deepEqual(summary.rows.map((row) => [row.label, row.earned, row.paid]), [
    ['Jul', 0, 0],
    ['Aug', 900, 2700],
    ['Sep', 450, 0],
  ]);
  assert.equal(summary.earned, 1350);
  assert.equal(summary.pending, 900);
  assert.equal(summary.forfeited, 125);
  assert.equal(summary.complete, true);
  // Twelve months with only a partial slice loaded and no event older than the period start.
  assert.equal(periodSummary(ledger.slice(0, 5), 40, 12, now).complete, false);
});

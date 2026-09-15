/** Parses and requests the curator's paginated membership earnings ledger view,
    and derives the period figures the Studio shows from it. */

import { z } from 'zod';
import { CuratorPageError } from './curator';
import { moneyMinorSchema } from './membership';

const int32Schema = z.number().int().nonnegative().max(2_147_483_647);
const pageSchema = int32Schema.min(1);
const pageSizeSchema = int32Schema.min(1).max(50);
const timestampSchema = z.string().datetime({ offset: true });
const currencySchema = z.string().regex(/^[A-Z]{3}$/);

const allocationSchema = z.object({
  kind: z.literal('allocation'),
  amountMinor: moneyMinorSchema,
  currency: currencySchema,
  status: z.enum(['accrued', 'payable', 'blocked', 'transferred', 'forfeited', 'reversed']),
  occurredAtUtc: timestampSchema,
  payableAtUtc: timestampSchema,
}).strict();

const transferSchema = z.object({
  kind: z.literal('transfer'),
  amountMinor: moneyMinorSchema,
  currency: currencySchema,
  status: z.enum(['created', 'succeeded', 'failed', 'reversed']),
  occurredAtUtc: timestampSchema,
}).strict();

const curatorEarningsSchema = z.object({
  activeMemberCount: int32Schema,
  balances: z.object({
    currency: currencySchema,
    earnedThisMonth: moneyMinorSchema,
    accrued: moneyMinorSchema,
    payable: moneyMinorSchema,
    blocked: moneyMinorSchema,
    paidOut: moneyMinorSchema,
    nextPayableAt: timestampSchema.nullable(),
  }).strict(),
  items: z.array(z.discriminatedUnion('kind', [allocationSchema, transferSchema])).max(50),
  totalItems: int32Schema,
  page: pageSchema,
  pageSize: pageSizeSchema,
}).strict().superRefine((earnings, context) => {
  if (earnings.items.length > earnings.pageSize) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Earnings page counts are inconsistent' });
  }
});

export type CuratorEarnings = z.infer<typeof curatorEarningsSchema>;
export type CuratorEarningsBalances = CuratorEarnings['balances'];
export type CuratorEarningsHistoryItem = CuratorEarnings['items'][number];

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseCuratorEarnings = (value: unknown): CuratorEarnings =>
  curatorEarningsSchema.parse(value);

export async function fetchCuratorEarnings(
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<CuratorEarnings> {
  const pagination = z.object({ page: pageSchema, pageSize: pageSizeSchema }).parse({ page, pageSize });
  const query = new URLSearchParams({
    page: String(pagination.page),
    pageSize: String(pagination.pageSize),
    includeBalances: 'true',
  });
  const response = await fetch(`/api/v1/curators/me/earnings?${query}`, {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new CuratorPageError('Failed to load membership earnings', response.status);
  }
  return parseCuratorEarnings(await response.json());
}

type Allocation = Extract<CuratorEarningsHistoryItem, { kind: 'allocation' }>;

/** First day (UTC) of the month `monthsAgo` months before `now`. */
export function monthStart(monthsAgo: number, now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
}

const earned = (item: CuratorEarningsHistoryItem): item is Allocation =>
  item.kind === 'allocation' && item.status !== 'forfeited' && item.status !== 'reversed';
const paidOut = (item: CuratorEarningsHistoryItem) => item.kind === 'transfer' && item.status === 'succeeded';
const sum = (items: CuratorEarningsHistoryItem[]) => items.reduce((total, item) => total + item.amountMinor, 0);

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;

/** Earned versus paid out per calendar month for the trailing `months`, plus
    the period's totals by outcome. Earned follows the allocation date; paid
    out follows the transfer date. `complete` is false when the loaded slice
    (of `totalItems`) does not reach back to the period start. */
export function periodSummary(
  items: CuratorEarningsHistoryItem[],
  totalItems: number,
  months: number,
  now = new Date(),
) {
  const start = monthStart(months - 1, now);
  const rows = Array.from({ length: months }, (_, i) => {
    const d = monthStart(months - 1 - i, now);
    return { key: monthKey(d), label: monthFormatter.format(d), earned: 0, paid: 0 };
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const inPeriod = items.filter((item) => new Date(item.occurredAtUtc) >= start);
  for (const item of inPeriod) {
    const row = byKey.get(monthKey(new Date(item.occurredAtUtc)));
    if (!row) continue;
    if (earned(item)) row.earned += item.amountMinor;
    else if (paidOut(item)) row.paid += item.amountMinor;
  }
  const allocations = inPeriod.filter(earned);
  return {
    rows,
    earned: sum(allocations),
    pending: sum(allocations.filter((item) => item.status !== 'transferred')),
    paid: sum(inPeriod.filter(paidOut)),
    forfeited: sum(inPeriod.filter((item) => item.kind === 'allocation' && item.status === 'forfeited')),
    complete: items.length >= totalItems || items.some((item) => new Date(item.occurredAtUtc) < start),
  };
}

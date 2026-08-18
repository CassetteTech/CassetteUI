/** Parses and requests the curator's paginated membership earnings ledger view. */

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

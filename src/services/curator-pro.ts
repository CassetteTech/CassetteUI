import { z } from 'zod';
import {
  correlationIdSchema,
  httpsUrlSchema,
  membershipStatusSchema,
  moneyMinorSchema,
} from './membership';

const timestampSchema = z.string().datetime({ offset: true });

export const curatorProStatusSchema = z.object({
  hasAccess: z.boolean(),
  canSubscribe: z.boolean(),
  status: membershipStatusSchema.nullable(),
  monthlyPriceMinor: moneyMinorSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  platformFeeBps: z.number().int().min(0).max(10_000),
  discountKind: z.enum(['none', 'temporary', 'forever']),
  discountEndsAtUtc: timestampSchema.nullable(),
  canManage: z.boolean(),
  cancelAtPeriodEnd: z.boolean(),
  paidThroughUtc: timestampSchema.nullable(),
  available: z.boolean(),
  correlationId: correlationIdSchema,
}).strict().refine(
  (status) => (status.discountKind === 'temporary') === (status.discountEndsAtUtc !== null),
  { message: 'Curator Pro discount state is inconsistent' },
).transform(({ correlationId: _correlationId, ...status }) => status);

export const curatorProCheckoutSchema = z.object({
  checkoutUrl: httpsUrlSchema,
  status: membershipStatusSchema,
  monthlyPriceMinor: moneyMinorSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...checkout }) => checkout);

export const curatorProPortalSchema = z.object({
  portalUrl: httpsUrlSchema,
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...portal }) => portal);

export type CuratorProStatus = z.infer<typeof curatorProStatusSchema>;
export type CuratorProCheckout = z.infer<typeof curatorProCheckoutSchema>;
export type CuratorProPortal = z.infer<typeof curatorProPortalSchema>;

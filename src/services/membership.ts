/** Defines strict fan membership status, entitlement, checkout, and portal contracts. */

import { z } from 'zod';

export const membershipStatusSchema = z.enum([
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
  'abandoned',
]);

const membershipIntervalSchema = z.enum(['month', 'year']);
const curatorIdSchema = z.string().regex(/^cpr_[0-9A-Za-z]+$/).max(40);
const planIdSchema = z.string().regex(/^mpl_[0-9A-Za-z]+$/).max(40);
const subscriptionIdSchema = z.string().regex(/^msb_[0-9A-Za-z]+$/).max(40);
export const correlationIdSchema = z.string().uuid().optional();
export const moneyMinorSchema = z.number().int().nonnegative().safe();
export const httpsUrlSchema = z.string().url().refine(
  (value) => new URL(value).protocol === 'https:',
  { message: 'Stripe handoff URL must use HTTPS' },
);

const statusSubscriptionSchema = z.object({
  membershipSubscriptionId: subscriptionIdSchema,
  planId: planIdSchema,
  billingInterval: membershipIntervalSchema,
  status: membershipStatusSchema,
  canManage: z.boolean(),
  cancelAtPeriodEnd: z.boolean(),
  paidThroughUtc: z.string().datetime({ offset: true }).nullable(),
}).strict();

const membershipStatusViewSchema = z.object({
  curatorProfileId: curatorIdSchema,
  canSubscribe: z.boolean(),
  membership: statusSubscriptionSchema.nullable(),
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...status }) => status);

const membershipCheckoutSchema = z.object({
  membershipSubscriptionId: subscriptionIdSchema,
  planId: planIdSchema,
  billingInterval: membershipIntervalSchema,
  status: membershipStatusSchema,
  checkoutUrl: httpsUrlSchema,
  faceAmountMinor: moneyMinorSchema,
  serviceFeeMinor: moneyMinorSchema,
  totalAmountMinor: moneyMinorSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  correlationId: correlationIdSchema,
}).strict().refine(
  (checkout) => Number.isSafeInteger(checkout.faceAmountMinor + checkout.serviceFeeMinor) &&
    checkout.faceAmountMinor + checkout.serviceFeeMinor === checkout.totalAmountMinor,
  { message: 'Membership Checkout total is invalid' },
).transform(({ correlationId: _correlationId, ...checkout }) => checkout);

const membershipPortalSchema = z.object({
  portalUrl: httpsUrlSchema,
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...portal }) => portal);

export type MembershipInterval = z.infer<typeof membershipIntervalSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type MembershipStatusView = z.infer<typeof membershipStatusViewSchema>;
export type MembershipCheckout = z.infer<typeof membershipCheckoutSchema>;
export type MembershipPortal = z.infer<typeof membershipPortalSchema>;

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseMembershipStatus = (value: unknown): MembershipStatusView =>
  membershipStatusViewSchema.parse(value);

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseMembershipCheckout = (value: unknown): MembershipCheckout =>
  membershipCheckoutSchema.parse(value);

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseMembershipPortal = (value: unknown): MembershipPortal =>
  membershipPortalSchema.parse(value);

export const grantsMembershipAccess = (status: MembershipStatus): boolean =>
  status === 'trialing' || status === 'active' || status === 'past_due';

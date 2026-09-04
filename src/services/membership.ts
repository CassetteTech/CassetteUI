/** Defines strict fan membership status, entitlement, checkout, and portal contracts. */

import { z } from 'zod';
import { formatPaidPromotionMinorAmount } from './paid-promotion-lifecycle';

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

const currencySchema = z.string().regex(/^[A-Z]{3}$/);

const statusSubscriptionSchema = z.object({
  membershipSubscriptionId: subscriptionIdSchema,
  planId: planIdSchema,
  billingInterval: membershipIntervalSchema,
  status: membershipStatusSchema,
  canManage: z.boolean(),
  cancelAtPeriodEnd: z.boolean(),
  paidThroughUtc: z.string().datetime({ offset: true }).nullable(),
  faceAmountMinor: moneyMinorSchema,
  serviceFeeMinor: moneyMinorSchema,
  totalAmountMinor: moneyMinorSchema,
  currency: currencySchema,
}).strict().refine(
  (subscription) => Number.isSafeInteger(subscription.faceAmountMinor + subscription.serviceFeeMinor) &&
    subscription.faceAmountMinor + subscription.serviceFeeMinor === subscription.totalAmountMinor,
  { message: 'Membership subscription total is invalid' },
);

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
  currency: currencySchema,
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

const myMembershipsSchema = z.array(z.object({
  curatorProfileId: curatorIdSchema,
  curatorUsername: z.string().min(1),
  curatorDisplayName: z.string(),
  membership: statusSubscriptionSchema,
}).strict());

export type MembershipInterval = z.infer<typeof membershipIntervalSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type MembershipStatusView = z.infer<typeof membershipStatusViewSchema>;
export type MembershipSubscription = z.infer<typeof statusSubscriptionSchema>;
export type MembershipCheckout = z.infer<typeof membershipCheckoutSchema>;
export type MembershipPortal = z.infer<typeof membershipPortalSchema>;
export type MyMembership = z.infer<typeof myMembershipsSchema>[number];

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseMembershipStatus = (value: unknown): MembershipStatusView =>
  membershipStatusViewSchema.parse(value);

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseMembershipCheckout = (value: unknown): MembershipCheckout =>
  membershipCheckoutSchema.parse(value);

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseMembershipPortal = (value: unknown): MembershipPortal =>
  membershipPortalSchema.parse(value);

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseMyMemberships = (value: unknown): MyMembership[] =>
  myMembershipsSchema.parse(value);

export const grantsMembershipAccess = (status: MembershipStatus): boolean =>
  status === 'trialing' || status === 'active' || status === 'past_due';

const membershipDateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export const formatMembershipDate = (utc: string): string =>
  membershipDateFormatter.format(new Date(utc));

/** Fee-inclusive price a fan actually pays, from the subscription's immutable plan price. */
export const formatMembershipPrice = (
  subscription: Pick<MembershipSubscription, 'totalAmountMinor' | 'currency' | 'billingInterval'>,
): string =>
  `${formatPaidPromotionMinorAmount(subscription.totalAmountMinor, subscription.currency)}/${subscription.billingInterval}`;

/** Compact billing line: what renews or ends, and when. Tax is charged on top of any amount still chargeable. */
export function describeMembershipBilling(subscription: MembershipSubscription): string {
  const price = formatMembershipPrice(subscription);
  const end = subscription.paidThroughUtc ? formatMembershipDate(subscription.paidThroughUtc) : null;
  switch (subscription.status) {
    case 'canceled':
      return `${price} · canceled`;
    case 'past_due':
      return `${price} · payment overdue · tax extra`;
    case 'unpaid':
      return `${price} · on hold · tax extra`;
    case 'paused':
      return `${price} · paused · tax extra`;
    case 'active':
    case 'trialing':
      if (subscription.cancelAtPeriodEnd) {
        return end ? `${price} · ends ${end}` : `${price} · ends after the current period`;
      }
      return end ? `${price} · renews ${end} · tax extra` : `${price} · tax extra`;
    default:
      // incomplete / incomplete_expired / abandoned: nothing renews and nothing was charged.
      return price;
  }
}

/** Actionable state guidance; null when the membership is in good standing with no scheduled change. */
export function describeMembershipStanding(subscription: MembershipSubscription): string | null {
  switch (subscription.status) {
    case 'past_due':
      return 'Your last payment failed. Update your payment method in billing settings to keep access.';
    case 'unpaid':
      return 'Your membership is on hold because payment failed. Update your payment method in billing settings to restore access.';
    case 'paused':
      return 'Your membership is paused. Resume it from billing settings to restore access.';
    case 'canceled':
      return 'Your membership is canceled.';
    default:
      if (!subscription.cancelAtPeriodEnd) return null;
      return subscription.paidThroughUtc
        ? `Your membership will end on ${formatMembershipDate(subscription.paidThroughUtc)}. You keep member access until then.`
        : 'Your membership will end after the current billing period. You keep member access until then.';
  }
}

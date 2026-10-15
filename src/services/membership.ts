import { z } from 'zod';
import { formatPaidPromotionMinorAmount } from './paid-promotion-lifecycle';
import { tryStorage } from '../lib/best-effort';

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
  // Optional so a response from a Bridge without the ending fields still parses.
  endReason: z.string().min(1).max(30).nullable().optional(),
  accessEndsAtUtc: z.string().datetime({ offset: true }).nullable().optional(),
  refundStatus: z.enum(['pending', 'refunded', 'none']).nullable().optional(),
}).strict().refine(
  (subscription) => Number.isSafeInteger(subscription.faceAmountMinor + subscription.serviceFeeMinor) &&
    subscription.faceAmountMinor + subscription.serviceFeeMinor === subscription.totalAmountMinor,
  { message: 'Membership subscription total is invalid' },
);

export const membershipStatusViewSchema = z.object({
  curatorProfileId: curatorIdSchema,
  canSubscribe: z.boolean(),
  membership: statusSubscriptionSchema.nullable(),
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...status }) => status);

export const membershipCheckoutSchema = z.object({
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

export const membershipPortalSchema = z.object({
  portalUrl: httpsUrlSchema,
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...portal }) => portal);

export const myMembershipsSchema = z.array(z.object({
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

const portalBaselinePrefix = 'cassette:membership-portal-baseline:';
const portalBaselineSchema = z.object({
  status: membershipStatusSchema,
  cancelAtPeriodEnd: z.boolean(),
}).strict();

export type MembershipPortalBaseline = z.infer<typeof portalBaselineSchema>;

export function rememberMembershipPortalBaseline(subscription: MembershipSubscription): void {
  tryStorage(() => sessionStorage.setItem(
    `${portalBaselinePrefix}${subscription.membershipSubscriptionId}`,
    JSON.stringify({ status: subscription.status, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd }),
  ), undefined);
}

export function takeMembershipPortalBaseline(membershipSubscriptionId: string): MembershipPortalBaseline | null {
  try {
    const key = `${portalBaselinePrefix}${membershipSubscriptionId}`;
    const stored = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    const baseline = portalBaselineSchema.safeParse(JSON.parse(stored ?? 'null'));
    return baseline.success ? baseline.data : null;
  } catch {
    return null;
  }
}

export const grantsMembershipAccess = (status: MembershipStatus): boolean =>
  status === 'trialing' || status === 'active' || status === 'past_due';

const membershipDateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export const formatMembershipDate = (utc: string): string =>
  membershipDateFormatter.format(new Date(utc));

export const formatMembershipPrice = (
  subscription: Pick<MembershipSubscription, 'totalAmountMinor' | 'currency' | 'billingInterval'>,
): string =>
  `${formatPaidPromotionMinorAmount(subscription.totalAmountMinor, subscription.currency)}/${subscription.billingInterval}`;

export const membershipEndOrRenewalUtc = (subscription: MembershipSubscription): string | null =>
  subscription.accessEndsAtUtc ?? subscription.paidThroughUtc;

const scheduledEndReasons = new Set(['plan_archived']);
const immediateEndReasons = new Set(['curator_suspended', 'curator_retired', 'account_deleted']);
const refundCopy = {
  pending: 'A refund for your unused paid time is on its way.',
  refunded: 'Your unused paid time was refunded.',
  none: 'There was no unused paid time to refund.',
} as const;

export type MembershipPhase = 'ended' | 'ending' | 'payment-problem' | 'paused' | 'renewing' | 'pending';

// When a scheduled or past ending cuts off access; null while the membership keeps renewing.
// An older Bridge response has no ending fields; a fan's own cancellation ends at paid-through.
const membershipEndUtc = (subscription: MembershipSubscription): string | null =>
  subscription.accessEndsAtUtc ?? (subscription.cancelAtPeriodEnd ? subscription.paidThroughUtc : null);

const hasScheduledEnd = (subscription: MembershipSubscription): boolean =>
  subscription.cancelAtPeriodEnd || membershipEndUtc(subscription) !== null;

export function membershipPhase(subscription: MembershipSubscription, nowMs = Date.now()): MembershipPhase {
  const endUtc = membershipEndUtc(subscription);
  if (
    subscription.status === 'canceled' ||
    immediateEndReasons.has(subscription.endReason ?? '') ||
    (endUtc !== null && Date.parse(endUtc) <= nowMs)
  ) return 'ended';
  switch (subscription.status) {
    case 'past_due':
    case 'unpaid':
      return 'payment-problem';
    case 'paused':
      return 'paused';
    case 'active':
    case 'trialing':
      return hasScheduledEnd(subscription) ? 'ending' : 'renewing';
    default:
      return 'pending';
  }
}

export const hasMembershipAccess = (subscription: MembershipSubscription, nowMs = Date.now()): boolean =>
  grantsMembershipAccess(subscription.status) && membershipPhase(subscription, nowMs) !== 'ended';

export const membershipDateLabel = (subscription: MembershipSubscription, nowMs = Date.now()): 'Ended' | 'Ends' | 'Renews' =>
  membershipPhase(subscription, nowMs) === 'ended' ? 'Ended' : hasScheduledEnd(subscription) ? 'Ends' : 'Renews';

export function describeMembershipBilling(subscription: MembershipSubscription, nowMs = Date.now()): string {
  const price = formatMembershipPrice(subscription);
  const endUtc = membershipEndOrRenewalUtc(subscription);
  const end = endUtc ? formatMembershipDate(endUtc) : null;
  const ends = hasScheduledEnd(subscription) ? (end ? ` · ends ${end}` : ' · ends after the current period') : '';
  switch (membershipPhase(subscription, nowMs)) {
    case 'ended':
      return subscription.accessEndsAtUtc
        ? `${price} · ended ${formatMembershipDate(subscription.accessEndsAtUtc)}`
        : `${price} · canceled`;
    case 'ending':
      return `${price}${ends}`;
    case 'payment-problem':
      return subscription.status === 'past_due'
        ? `${price} · payment overdue${ends} · tax extra`
        : `${price} · on hold${ends} · tax extra`;
    case 'paused':
      return `${price} · paused${ends} · tax extra`;
    case 'renewing':
      return end ? `${price} · renews ${end} · tax extra` : `${price} · tax extra`;
    case 'pending':
      return price;
  }
}

function statusGuidance(status: MembershipStatus): string | null {
  switch (status) {
    case 'past_due':
      return 'Your last payment failed. Update your payment method in billing settings to keep access.';
    case 'unpaid':
      return 'Your membership is on hold because payment failed. Update your payment method in billing settings to restore access.';
    case 'paused':
      return 'Your membership is paused. Resume it from billing settings to restore access.';
    default:
      return null;
  }
}

export function describeMembershipStanding(subscription: MembershipSubscription, nowMs = Date.now()): string | null {
  const phase = membershipPhase(subscription, nowMs);
  const reason = subscription.endReason ?? '';
  const endUtc = membershipEndOrRenewalUtc(subscription);
  const on = endUtc ? ` on ${formatMembershipDate(endUtc)}` : '';
  if (immediateEndReasons.has(reason)) {
    const ended = `This membership ended${on} because the curator can no longer offer it.`;
    const refund = subscription.refundStatus ? refundCopy[subscription.refundStatus] : null;
    return refund ? `${ended} ${refund}` : ended;
  }
  if (phase === 'ended') {
    if (scheduledEndReasons.has(reason)) return `This curator stopped offering this membership. It ended${on}.`;
    return subscription.status === 'canceled' || !subscription.accessEndsAtUtc
      ? 'Your membership is canceled.'
      : `Your membership ended${on}.`;
  }

  const keepsAccess = phase === 'ending';
  const until = on || ' after the current billing period';
  const ending = scheduledEndReasons.has(reason)
    ? `This curator stopped offering this membership. It ends${until}${keepsAccess ? ', and you keep member access until then.' : '.'}`
    : hasScheduledEnd(subscription)
      ? `Your membership will end${until}.${keepsAccess ? ' You keep member access until then.' : ''}`
      : null;
  return [ending, statusGuidance(subscription.status)].filter(Boolean).join(' ') || null;
}

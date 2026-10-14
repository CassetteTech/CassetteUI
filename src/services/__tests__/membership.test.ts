import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeMembershipBilling,
  describeMembershipStanding,
  grantsMembershipAccess,
  hasMembershipAccess,
  membershipDateLabel,
  membershipPhase,
  parseMembershipCheckout,
  parseMembershipPortal,
  parseMembershipStatus,
  parseMyMemberships,
} from '../membership';

const subscription = {
  membershipSubscriptionId: 'msb_0123456789AbCdEfGhIjK',
  planId: 'mpl_0123456789AbCdEfGhIjK',
  billingInterval: 'month',
  status: 'active',
  canManage: true,
  cancelAtPeriodEnd: false,
  paidThroughUtc: '2026-09-01T00:00:00+00:00',
  faceAmountMinor: 500,
  serviceFeeMinor: 50,
  totalAmountMinor: 550,
  currency: 'USD',
} as const;

const now = Date.parse('2026-08-24T12:00:00Z');

const statusView = {
  curatorProfileId: 'cpr_0123456789AbCdEfGhIjK',
  canSubscribe: false,
  membership: subscription,
};

void test('membership parsers accept the public contract and reject provider fields', () => {
  const parsed = parseMembershipStatus({
    ...statusView,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });
  assert.equal(parsed.membership?.status, 'active');
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseMembershipStatus({
    ...statusView,
    membership: { ...statusView.membership, stripeSubscriptionId: 'sub_secret' },
  }));
  assert.throws(() => parseMembershipStatus({ ...statusView, curatorProfileId: 'curator-1' }));
  assert.throws(() => parseMembershipStatus({
    ...statusView,
    membership: { ...subscription, totalAmountMinor: 551 },
  }));
  assert.throws(() => parseMembershipStatus({
    ...statusView,
    membership: { ...subscription, currency: 'usd' },
  }));
});

void test('my memberships parser keeps only the fan contract', () => {
  const entry = {
    curatorProfileId: 'cpr_0123456789AbCdEfGhIjK',
    curatorUsername: 'crate_digger',
    curatorDisplayName: 'Crate Digger',
    membership: subscription,
  };
  assert.equal(parseMyMemberships([entry]).length, 1);
  assert.deepEqual(parseMyMemberships([]), []);
  assert.throws(() => parseMyMemberships([{ ...entry, fanEmail: 'fan@example.com' }]));
});

void test('billing copy comes from the subscription price and paid-through date', () => {
  assert.equal(describeMembershipBilling(subscription, now), '$5.50/month · renews Sep 1, 2026 · tax extra');
  assert.equal(
    describeMembershipBilling({ ...subscription, cancelAtPeriodEnd: true }, now),
    '$5.50/month · ends Sep 1, 2026',
  );
  assert.equal(
    describeMembershipBilling({ ...subscription, billingInterval: 'year', totalAmountMinor: 5500, faceAmountMinor: 5000, serviceFeeMinor: 500, paidThroughUtc: null }),
    '$55.00/year · tax extra',
  );
  for (const status of ['past_due', 'unpaid', 'paused', 'incomplete'] as const) {
    const line = describeMembershipBilling({ ...subscription, status });
    assert.doesNotMatch(line, /renews|Sep 1, 2026/);
    assert.match(line, /^\$5\.50\/month/);
  }
  assert.match(describeMembershipBilling({ ...subscription, status: 'paused' }), /paused/);
  assert.equal(describeMembershipStanding(subscription), null);
  assert.match(describeMembershipStanding({ ...subscription, status: 'past_due' }) ?? '', /payment method/);
  assert.match(describeMembershipStanding({ ...subscription, cancelAtPeriodEnd: true }, now) ?? '', /Sep 1, 2026/);
});

void test('Checkout parser requires a safe exact total and HTTPS handoff', () => {
  const checkout = {
    membershipSubscriptionId: 'msb_0123456789AbCdEfGhIjK',
    planId: 'mpl_0123456789AbCdEfGhIjK',
    billingInterval: 'year',
    status: 'incomplete',
    checkoutUrl: 'https://checkout.stripe.test/session',
    faceAmountMinor: 5000,
    serviceFeeMinor: 500,
    totalAmountMinor: 5500,
    currency: 'USD',
  };

  const parsed = parseMembershipCheckout({
    ...checkout,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });
  assert.equal(parsed.totalAmountMinor, 5500);
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseMembershipCheckout({ ...checkout, totalAmountMinor: 5501 }));
  assert.throws(() => parseMembershipCheckout({ ...checkout, checkoutUrl: 'http://stripe.test/session' }));
});

void test('Portal parser requires HTTPS and standing access follows the backend lifecycle', () => {
  const parsed = parseMembershipPortal({
    portalUrl: 'https://billing.stripe.test/session',
    correlationId: '44444444-4444-4444-8444-444444444444',
  });
  assert.equal(
    parsed.portalUrl,
    'https://billing.stripe.test/session',
  );
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseMembershipPortal({ portalUrl: 'javascript:alert(1)' }));

  assert.equal(grantsMembershipAccess('trialing'), true);
  assert.equal(grantsMembershipAccess('active'), true);
  assert.equal(grantsMembershipAccess('past_due'), true);
  assert.equal(grantsMembershipAccess('unpaid'), false);
  assert.equal(grantsMembershipAccess('canceled'), false);
});

void test('ending fields parse when present or absent and reject unknown refund states', () => {
  assert.equal(parseMembershipStatus(statusView).membership?.endReason, undefined);
  const ending = parseMembershipStatus({
    ...statusView,
    membership: {
      ...subscription,
      endReason: 'curator_suspended',
      accessEndsAtUtc: '2026-08-20T00:00:00Z',
      refundStatus: 'pending',
    },
  });
  assert.equal(ending.membership?.refundStatus, 'pending');
  assert.throws(() => parseMembershipStatus({
    ...statusView,
    membership: { ...subscription, refundStatus: 'partial' },
  }));
});

void test('curator-side endings explain the access end date and any refund', () => {
  const scheduled = {
    ...subscription,
    cancelAtPeriodEnd: true,
    endReason: 'plan_archived',
    accessEndsAtUtc: '2026-09-01T00:00:00Z',
  };
  assert.match(describeMembershipStanding(scheduled, now) ?? '', /stopped offering.*Sep 1, 2026.*keep member access/);
  assert.doesNotMatch(describeMembershipStanding(scheduled, now) ?? '', /plan_archived|Curator Pro/);

  const immediate = {
    ...subscription,
    status: 'canceled',
    canManage: false,
    endReason: 'curator_suspended',
    accessEndsAtUtc: '2026-08-20T00:00:00Z',
  } as const;
  assert.equal(
    describeMembershipStanding({ ...immediate, refundStatus: 'refunded' }),
    'This membership ended on Aug 20, 2026 because the curator can no longer offer it. Your unused paid time was refunded.',
  );
  assert.match(describeMembershipStanding({ ...immediate, refundStatus: 'pending' }) ?? '', /refund .* on its way/);
  assert.match(describeMembershipStanding({ ...immediate, refundStatus: 'none' }) ?? '', /no unused paid time/);
  assert.doesNotMatch(describeMembershipStanding(immediate) ?? '', /suspend/);
  assert.equal(describeMembershipBilling(immediate), '$5.50/month · ended Aug 20, 2026');

  assert.equal(
    describeMembershipStanding({ ...subscription, status: 'canceled', endReason: 'future_reason' }),
    'Your membership is canceled.',
  );
});

void test('ending metadata outranks a stale provider status in text, pass state, and access', () => {
  const afterCutoff = Date.parse('2026-09-02T00:00:00Z');
  const cases = [
    {
      name: 'immediate ending while Stripe still says active, refund pending',
      membership: { ...subscription, endReason: 'curator_suspended', accessEndsAtUtc: '2026-08-20T00:00:00Z', refundStatus: 'pending' },
      at: now, phase: 'ended', billing: '$5.50/month · ended Aug 20, 2026', standing: /ended on Aug 20, 2026.*refund .* on its way/,
    },
    {
      name: 'immediate ending while Stripe still says past due',
      membership: { ...subscription, status: 'past_due', endReason: 'account_deleted', accessEndsAtUtc: '2026-08-20T00:00:00Z', refundStatus: 'none' },
      at: now, phase: 'ended', billing: '$5.50/month · ended Aug 20, 2026', standing: /ended on Aug 20, 2026.*no unused paid time/,
    },
    {
      name: 'scheduled curator ending before its date',
      membership: { ...subscription, cancelAtPeriodEnd: true, endReason: 'plan_archived', accessEndsAtUtc: '2026-09-01T00:00:00Z' },
      at: now, phase: 'ending', billing: '$5.50/month · ends Sep 1, 2026', standing: /It ends on Sep 1, 2026, and you keep member access/,
    },
    {
      name: 'scheduled curator ending after its date, before Stripe confirms it',
      membership: { ...subscription, cancelAtPeriodEnd: true, endReason: 'plan_archived', accessEndsAtUtc: '2026-09-01T00:00:00Z' },
      at: afterCutoff, phase: 'ended', billing: '$5.50/month · ended Sep 1, 2026', standing: /^This curator stopped offering this membership\. It ended on Sep 1, 2026\.$/,
    },
    {
      name: 'fan cancellation before its date',
      membership: { ...subscription, cancelAtPeriodEnd: true, accessEndsAtUtc: '2026-09-01T00:00:00Z' },
      at: now, phase: 'ending', billing: '$5.50/month · ends Sep 1, 2026', standing: /will end on Sep 1, 2026/,
    },
    {
      name: 'fan cancellation after its date',
      membership: { ...subscription, cancelAtPeriodEnd: true, accessEndsAtUtc: '2026-09-01T00:00:00Z' },
      at: afterCutoff, phase: 'ended', billing: '$5.50/month · ended Sep 1, 2026', standing: /^Your membership ended on Sep 1, 2026\.$/,
    },
    {
      name: 'past due with no ending',
      membership: { ...subscription, status: 'past_due' },
      at: now, phase: 'payment-problem', billing: '$5.50/month · payment overdue · tax extra', standing: /payment method/,
    },
  ] as const;

  for (const { name, membership, at, phase, billing, standing } of cases) {
    assert.equal(membershipPhase(membership, at), phase, name);
    assert.equal(describeMembershipBilling(membership, at), billing, name);
    assert.match(describeMembershipStanding(membership, at) ?? '', standing, name);
    assert.doesNotMatch(describeMembershipBilling(membership, at), /renews/, name);
    assert.equal(hasMembershipAccess(membership, at), phase !== 'ended', name);
  }
});

void test('a future ending keeps payment and pause guidance and promises no access it cannot give', () => {
  const afterCutoff = Date.parse('2026-09-02T00:00:00Z');
  const endings = {
    fan: { cancelAtPeriodEnd: true, accessEndsAtUtc: '2026-09-01T00:00:00Z' },
    curator: { cancelAtPeriodEnd: true, endReason: 'plan_archived', accessEndsAtUtc: '2026-09-01T00:00:00Z' },
  } as const;
  const lead = {
    fan: 'Your membership will end on Sep 1, 2026.',
    curator: 'This curator stopped offering this membership. It ends on Sep 1, 2026.',
  } as const;
  const statuses = {
    past_due: {
      phase: 'payment-problem', access: true, billing: '$5.50/month · payment overdue · ends Sep 1, 2026 · tax extra',
      guidance: 'Your last payment failed. Update your payment method in billing settings to keep access.',
    },
    unpaid: {
      phase: 'payment-problem', access: false, billing: '$5.50/month · on hold · ends Sep 1, 2026 · tax extra',
      guidance: 'Your membership is on hold because payment failed. Update your payment method in billing settings to restore access.',
    },
    paused: {
      phase: 'paused', access: false, billing: '$5.50/month · paused · ends Sep 1, 2026 · tax extra',
      guidance: 'Your membership is paused. Resume it from billing settings to restore access.',
    },
  } as const;

  for (const ender of ['fan', 'curator'] as const) {
    for (const status of ['past_due', 'unpaid', 'paused'] as const) {
      const expected = statuses[status];
      const name = `${ender} ending while ${status}`;
      const membership = { ...subscription, ...endings[ender], status };
      assert.equal(membershipPhase(membership, now), expected.phase, name);
      assert.equal(describeMembershipBilling(membership, now), expected.billing, name);
      assert.equal(describeMembershipStanding(membership, now), `${lead[ender]} ${expected.guidance}`, name);
      assert.equal(membershipDateLabel(membership, now), 'Ends', name);
      assert.equal(hasMembershipAccess(membership, now), expected.access, name);

      assert.equal(membershipPhase(membership, afterCutoff), 'ended', name);
      assert.equal(membershipDateLabel(membership, afterCutoff), 'Ended', name);
      assert.equal(hasMembershipAccess(membership, afterCutoff), false, name);
    }
  }

  assert.equal(membershipDateLabel({ ...subscription, ...endings.fan }, now), 'Ends');
  assert.equal(membershipDateLabel(subscription, now), 'Renews');
  assert.match(describeMembershipStanding({ ...subscription, ...endings.curator }, now) ?? '', /keep member access until then/);
});

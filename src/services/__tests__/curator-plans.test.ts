/** Locks plan contracts, pricing-policy math, and lifecycle request behavior to Bridge. */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCuratorPlanAnnualPrice,
  archiveCuratorPlan,
  calculateCuratorPlanEconomics,
  createCuratorPlan,
  deleteCuratorPlan,
  fetchCuratorFeatures,
  fetchCuratorPlans,
  fetchCuratorPricing,
  memberPostAccessState,
  parseCuratorFeatures,
  parseCuratorPlan,
  parseCuratorPricing,
  publishCuratorPlan,
  updateCuratorPlan,
  type CuratorPricing,
} from '../curator-plans';
import { CuratorPageError } from '../curator';

const pricing: CuratorPricing = {
  curatorProMonthlyPriceMinor: 500,
  currency: 'USD',
  platformFeeBps: 1000,
  serviceFeeBps: 400,
  serviceFeeFixedMinor: 30,
  processingBorneBy: 'platform',
  processingFeeBps: 360,
  processingFeeFixedMinor: 30,
  payoutOpsFeeBps: 150,
  payoutCadence: 'quarterly',
  minPayoutMinor: 2500,
};

const draft = {
  id: 'mpl_0123456789AbCdEfGhIjK',
  name: 'Selector Club',
  description: 'Member-only selections.',
  amountMinor: 700,
  annualAmountMinor: 7000,
  currency: 'USD',
  serviceFeeMinor: null,
  annualServiceFeeMinor: null,
  status: 'draft',
  featureKeys: ['member_posts'],
  createdAtUtc: '2026-08-16T12:00:00Z',
  publishedAtUtc: null,
  archivedAtUtc: null,
} as const;

function requestUrl(input: string | URL | Request): string {
  // SAFETY: every client function under test calls fetch with a string path.
  return input as string;
}

void test('members-only access state follows the curator profile, then a published member-post plan', () => {
  const active = parseCuratorPlan({
    ...draft,
    status: 'active',
    serviceFeeMinor: 58,
    annualServiceFeeMinor: 310,
    publishedAtUtc: '2026-08-16T13:00:00Z',
  });
  const otherFeature = { ...active, featureKeys: ['early_access'] };

  assert.equal(memberPostAccessState(undefined, undefined), 'loading');
  assert.equal(memberPostAccessState(false, undefined), 'needs-plan');
  assert.equal(memberPostAccessState(true, undefined), 'loading');
  assert.equal(memberPostAccessState(true, []), 'needs-plan');
  assert.equal(memberPostAccessState(true, [parseCuratorPlan(draft), otherFeature]), 'needs-plan');
  assert.equal(memberPostAccessState(true, [otherFeature, active]), 'ready');
});

void test('plan and feature parsers enforce the public contract and published evidence', () => {
  assert.equal(parseCuratorPlan(draft).status, 'draft');
  assert.equal(parseCuratorPlan({
    ...draft,
    status: 'active',
    serviceFeeMinor: 58,
    annualServiceFeeMinor: 310,
    publishedAtUtc: '2026-08-16T13:00:00Z',
  }).serviceFeeMinor, 58);

  assert.throws(() => parseCuratorPlan({ ...draft, stripePriceId: 'price_secret' }));
  assert.throws(() => parseCuratorPlan({ ...draft, currency: 'EUR' }));
  assert.throws(() => parseCuratorPlan({ ...draft, status: 'active' }));
  assert.throws(() => parseCuratorPlan({ ...draft, annualAmountMinor: 8401 }));
  assert.throws(() => parseCuratorFeatures([{
    featureKey: 'member_posts',
    displayName: 'Member-only posts',
    description: 'Unlock subscriber posts.',
    stripeProductId: 'prod_secret',
  }]));
});

void test('pricing parser accepts every economics input and rejects internal or invalid fields', () => {
  assert.deepEqual(parseCuratorPricing(pricing), pricing);
  assert.throws(() => parseCuratorPricing({ ...pricing, feeScheduleId: 'msf_internal' }));
  assert.throws(() => parseCuratorPricing({ ...pricing, currency: 'EUR' }));
  assert.throws(() => parseCuratorPricing({
    ...pricing,
    processingBorneBy: 'curator',
  }), /Fan service fees/);
  assert.throws(() => parseCuratorPricing({
    ...pricing,
    processingFeeBps: Number.MAX_SAFE_INTEGER + 1,
  }));
});

void test('economics mirrors separate half-up fees and never subtracts Curator Pro', () => {
  const platformBorne = calculateCuratorPlanEconomics(700, pricing);
  assert.deepEqual(platformBorne, {
    faceMinor: 700,
    serviceFeeMinor: 58,
    fanChargeMinor: 758,
    platformFeeMinor: 70,
    payoutOpsFeeMinor: 11,
    processingFeeMinor: 0,
    curatorAccrualMinor: 619,
  });

  const curatorBorne = calculateCuratorPlanEconomics(700, {
    ...pricing,
    curatorProMonthlyPriceMinor: 50_000,
    serviceFeeBps: 0,
    serviceFeeFixedMinor: 0,
    processingBorneBy: 'curator',
    payoutOpsFeeBps: 0,
  });
  assert.equal(curatorBorne.fanChargeMinor, 700);
  assert.equal(curatorBorne.processingFeeMinor, 55);
  assert.equal(curatorBorne.curatorAccrualMinor, 575);

  assert.equal(calculateCuratorPlanEconomics(500, {
    ...pricing,
    platformFeeBps: 10_000,
    payoutOpsFeeBps: 10_000,
  }).curatorAccrualMinor, 0);
});

void test('plan client uses only the authenticated public lifecycle routes', async (t) => {
  const calls: Array<{ init?: RequestInit; input: string | URL | Request }> = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ init, input });
    const url = requestUrl(input);
    if (url.endsWith('/features')) {
      return new Response(JSON.stringify([{
        featureKey: 'member_posts',
        displayName: 'Member-only posts',
        description: 'Unlock subscriber posts.',
      }]));
    }
    if (url.endsWith('/pricing')) return new Response(JSON.stringify(pricing));
    if (url.endsWith('/publish')) {
      return new Response(JSON.stringify({
        ...draft,
        status: 'active',
        serviceFeeMinor: 58,
        annualServiceFeeMinor: 310,
        publishedAtUtc: '2026-08-16T13:00:00Z',
      }));
    }
    if (url.endsWith('/archive')) {
      return new Response(JSON.stringify({
        ...draft,
        status: 'archived',
        serviceFeeMinor: 58,
        annualServiceFeeMinor: 310,
        publishedAtUtc: '2026-08-16T13:00:00Z',
        archivedAtUtc: '2026-08-16T14:00:00Z',
      }));
    }
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify(url.endsWith('/plans') && init?.method !== 'POST'
      ? [draft]
      : draft));
  });

  await fetchCuratorPlans();
  await fetchCuratorFeatures();
  await fetchCuratorPricing();
  await createCuratorPlan({
    name: ' Selector Club ',
    description: ' Member-only selections. ',
    amountMinor: 700,
    annualAmountMinor: 7000,
    featureKeys: ['member_posts'],
  });
  await updateCuratorPlan(draft.id, {
    name: 'Selector Club',
    description: 'Member-only selections.',
    amountMinor: 800,
    annualAmountMinor: null,
    featureKeys: [],
  });
  await deleteCuratorPlan(draft.id);
  await publishCuratorPlan(draft.id);
  await archiveCuratorPlan(draft.id);

  assert.deepEqual(calls.map(({ init, input }) => ({
    body: init?.body,
    cache: init?.cache,
    credentials: init?.credentials,
    method: init?.method,
    url: requestUrl(input),
  })), [
    { body: undefined, cache: 'no-store', credentials: 'include', method: undefined, url: '/api/v1/curators/plans' },
    { body: undefined, cache: 'no-store', credentials: 'include', method: undefined, url: '/api/v1/curators/plans/features' },
    { body: undefined, cache: 'no-store', credentials: 'include', method: undefined, url: '/api/v1/curators/pricing' },
    {
      body: JSON.stringify({
        name: 'Selector Club',
        description: 'Member-only selections.',
        amountMinor: 700,
        annualAmountMinor: 7000,
        featureKeys: ['member_posts'],
      }),
      cache: undefined,
      credentials: 'include',
      method: 'POST',
      url: '/api/v1/curators/plans',
    },
    {
      body: JSON.stringify({
        name: 'Selector Club',
        description: 'Member-only selections.',
        amountMinor: 800,
        annualAmountMinor: null,
        featureKeys: [],
      }),
      cache: undefined,
      credentials: 'include',
      method: 'PUT',
      url: `/api/v1/curators/plans/${draft.id}`,
    },
    { body: undefined, cache: undefined, credentials: 'include', method: 'DELETE', url: `/api/v1/curators/plans/${draft.id}` },
    { body: undefined, cache: undefined, credentials: 'include', method: 'POST', url: `${'/api/v1/curators/plans'}/${draft.id}/publish` },
    { body: undefined, cache: undefined, credentials: 'include', method: 'POST', url: `${'/api/v1/curators/plans'}/${draft.id}/archive` },
  ]);
});

void test('annual price client posts once, parses the plan strictly, and keeps Bridge conflict copy', async (t) => {
  const active = {
    ...draft,
    annualAmountMinor: null,
    status: 'active',
    serviceFeeMinor: 58,
    publishedAtUtc: '2026-08-16T13:00:00Z',
  };
  const responses = [
    new Response(JSON.stringify({ ...active, annualAmountMinor: 7000, annualServiceFeeMinor: 310 })),
    new Response(JSON.stringify({
      errorCode: 'curator_profile_state_invalid',
      message: 'This plan already has immutable annual pricing.',
    }), { status: 409 }),
    new Response('<html>bad gateway</html>', { status: 502 }),
    // Published with an annual price but no frozen annual fee: inconsistent evidence.
    new Response(JSON.stringify({ ...active, annualAmountMinor: 7000 })),
  ];
  const calls: Array<{ init?: RequestInit; input: string | URL | Request }> = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ init, input });
    return responses[calls.length - 1];
  });

  const saved = await addCuratorPlanAnnualPrice(draft.id, 7000);
  assert.equal(saved.annualAmountMinor, 7000);
  assert.equal(saved.annualServiceFeeMinor, 310);
  assert.deepEqual({
    body: calls[0].init?.body,
    credentials: calls[0].init?.credentials,
    method: calls[0].init?.method,
    url: requestUrl(calls[0].input),
  }, {
    body: JSON.stringify({ annualAmountMinor: 7000 }),
    credentials: 'include',
    method: 'POST',
    url: `/api/v1/curators/plans/${draft.id}/annual-price`,
  });

  await assert.rejects(addCuratorPlanAnnualPrice(draft.id, 7000), (error) =>
    error instanceof CuratorPageError && error.status === 409 &&
    error.message === 'This plan already has immutable annual pricing.');
  await assert.rejects(addCuratorPlanAnnualPrice(draft.id, 7000), (error) =>
    error instanceof CuratorPageError && error.status === 502 && error.message === 'Failed to add annual price');
  await assert.rejects(addCuratorPlanAnnualPrice(draft.id, 7000), /Annual plan fields are inconsistent/);
  // Invalid input never reaches the network.
  await assert.rejects(addCuratorPlanAnnualPrice(draft.id, 0));
  await assert.rejects(addCuratorPlanAnnualPrice('not-a-plan', 7000));
  assert.equal(calls.length, 4);
});

void test('a matching monthly fee does not prove the annual fan charge of a plan\'s frozen fees', () => {
  // A $5 plan frozen under a 10% service fee, and today's policy at a fixed $0.50 fee.
  const frozen = { ...pricing, serviceFeeBps: 1000, serviceFeeFixedMinor: 0 };
  const today = { ...pricing, serviceFeeBps: 0, serviceFeeFixedMinor: 50 };
  assert.equal(calculateCuratorPlanEconomics(500, frozen).serviceFeeMinor, 50);
  assert.equal(calculateCuratorPlanEconomics(500, today).serviceFeeMinor, 50);
  // For a $60 annual price Bridge charges $66.00; today's policy would show $60.50.
  assert.equal(calculateCuratorPlanEconomics(6000, frozen).fanChargeMinor, 6600);
  assert.equal(calculateCuratorPlanEconomics(6000, today).fanChargeMinor, 6050);
});

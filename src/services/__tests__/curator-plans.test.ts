/** Locks plan contracts, pricing-policy math, and lifecycle request behavior to Bridge. */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  archiveCuratorPlan,
  calculateCuratorPlanEconomics,
  createCuratorPlan,
  fetchCuratorFeatures,
  fetchCuratorPlans,
  fetchCuratorPricing,
  parseCuratorFeatures,
  parseCuratorPlan,
  parseCuratorPricing,
  publishCuratorPlan,
  type CuratorPricing,
} from '../curator-plans';

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
    { body: undefined, cache: undefined, credentials: 'include', method: 'POST', url: `${'/api/v1/curators/plans'}/${draft.id}/publish` },
    { body: undefined, cache: undefined, credentials: 'include', method: 'POST', url: `${'/api/v1/curators/plans'}/${draft.id}/archive` },
  ]);
});

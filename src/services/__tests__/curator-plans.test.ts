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
  fetchMemberPostAuthoring,
  MONTHLY_PRICE_MAX_MINOR,
  MONTHLY_PRICE_MIN_MINOR,
  curatorFeaturesSchema,
  curatorPlanSchema,
  curatorPricingSchema,
  publishCuratorPlan,
  updateCuratorPlan,
  type CuratorPlanRequest,
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
  return input instanceof Request ? input.url : String(input);
}

void test('members-only authoring uses the Bridge decision privately and strictly', async (t) => {
  const calls: { input: string; init?: RequestInit }[] = [];
  const answers = [{ canAuthor: true }, { canAuthor: false }, { canAuthor: true, plans: [] }];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ input: requestUrl(input), init });
    return new Response(JSON.stringify(answers.shift()), { status: 200 });
  });

  assert.equal(await fetchMemberPostAuthoring(), true);
  assert.equal(await fetchMemberPostAuthoring(), false);
  await assert.rejects(fetchMemberPostAuthoring());
  assert.equal(calls[0].input, '/api/v1/curators/me/member-post-authoring');
  assert.equal(calls[0].init?.cache, 'no-store');
  assert.equal(calls[0].init?.credentials, 'include');
});

void test('plan and feature parsers enforce the public contract and published evidence', () => {
  assert.equal(curatorPlanSchema.parse(draft).status, 'draft');
  assert.equal(curatorPlanSchema.parse({
    ...draft,
    status: 'active',
    serviceFeeMinor: 58,
    annualServiceFeeMinor: 310,
    publishedAtUtc: '2026-08-16T13:00:00Z',
  }).serviceFeeMinor, 58);

  assert.throws(() => curatorPlanSchema.parse({ ...draft, stripePriceId: 'price_secret' }));
  assert.throws(() => curatorPlanSchema.parse({ ...draft, currency: 'EUR' }));
  assert.throws(() => curatorPlanSchema.parse({ ...draft, status: 'active' }));
  assert.throws(() => curatorPlanSchema.parse({ ...draft, annualAmountMinor: 8401 }));
  assert.throws(() => curatorFeaturesSchema.parse([{
    featureKey: 'member_posts',
    displayName: 'Member-only posts',
    description: 'Unlock subscriber posts.',
    stripeProductId: 'prod_secret',
  }]));
});

void test('pricing parser accepts every economics input and rejects internal or invalid fields', () => {
  assert.deepEqual(curatorPricingSchema.parse(pricing), pricing);
  assert.throws(() => curatorPricingSchema.parse({ ...pricing, feeScheduleId: 'msf_internal' }));
  assert.throws(() => curatorPricingSchema.parse({ ...pricing, currency: 'EUR' }));
  assert.throws(() => curatorPricingSchema.parse({
    ...pricing,
    processingBorneBy: 'curator',
  }), /Fan service fees/);
  assert.throws(() => curatorPricingSchema.parse({
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
  await assert.rejects(addCuratorPlanAnnualPrice(draft.id, 0));
  await assert.rejects(addCuratorPlanAnnualPrice('not-a-plan', 7000));
  assert.equal(calls.length, 4);
});

void test('a matching monthly fee does not prove the annual fan charge of a plan\'s frozen fees', () => {
  const frozen = { ...pricing, serviceFeeBps: 1000, serviceFeeFixedMinor: 0 };
  const today = { ...pricing, serviceFeeBps: 0, serviceFeeFixedMinor: 50 };
  assert.equal(calculateCuratorPlanEconomics(500, frozen).serviceFeeMinor, 50);
  assert.equal(calculateCuratorPlanEconomics(500, today).serviceFeeMinor, 50);
  assert.equal(calculateCuratorPlanEconomics(6000, frozen).fanChargeMinor, 6600);
  assert.equal(calculateCuratorPlanEconomics(6000, today).fanChargeMinor, 6050);
});

void test('plan requests accept monthly prices from 500 to 10,000 minor units only', async (t) => {
  let sent = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    sent++;
    return new Response(JSON.stringify(draft));
  });
  const request = (amountMinor: number): CuratorPlanRequest => ({
    name: 'Selector Club',
    description: '',
    amountMinor,
    annualAmountMinor: null,
    featureKeys: [],
  });

  await createCuratorPlan(request(500));
  await createCuratorPlan(request(10_000));
  await assert.rejects(createCuratorPlan(request(499)));
  await assert.rejects(createCuratorPlan(request(10_001)));

  assert.equal(sent, 2);
  assert.deepEqual([MONTHLY_PRICE_MIN_MINOR, MONTHLY_PRICE_MAX_MINOR], [500, 10_000]);
});

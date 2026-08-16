import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPricingPolicy,
  decimalToHundredths,
  fetchInternalCurators,
  parseInternalCurators,
  parsePricingAssignmentRequest,
  parsePricingAssignments,
  parsePricingPolicies,
  parsePricingPolicyRequest,
} from '../internal-curators';

const timestamp = '2026-08-16T12:00:00Z';

const policy = {
  id: 'msf_standard',
  policyKey: 'standard',
  version: 2,
  displayName: 'Standard',
  isActive: true,
  isDefault: true,
  defaultEffectiveAtUtc: timestamp,
  curatorProMonthlyPriceMinor: 500,
  currency: 'USD',
  platformFeeBps: 1_000,
  serviceFeeBps: 400,
  serviceFeeFixedMinor: 30,
  processingBorneBy: 'platform',
  processingFeeBps: 360,
  processingFeeFixedMinor: 30,
  payoutOpsFeeBps: 150,
  payoutCadence: 'monthly',
  minPayoutMinor: 2_500,
  createdAtUtc: timestamp,
};

const curator = {
  id: 'cpr_curator',
  userId: 'ef9af71d-f7b4-4af7-b4a0-9eaa50b39dc8',
  username: 'curator',
  status: 'active',
  headline: null,
  about: null,
  declaredGenres: ['indie'],
  declaredPlatforms: ['spotify'],
  suspensionReason: null,
  createdAtUtc: timestamp,
  statusChangedAtUtc: timestamp,
};

void test('internal curator contracts reject inconsistent and unexpected fields', () => {
  assert.deepEqual(parseInternalCurators([curator]), [curator]);
  assert.throws(() => parseInternalCurators([{ ...curator, status: 'suspended' }]));
  assert.throws(() => parseInternalCurators([{ ...curator, email: 'private@example.test' }]));
});

void test('pricing policy contracts keep internal economics exact', () => {
  assert.deepEqual(parsePricingPolicies([policy]), [policy]);
  assert.throws(() => parsePricingPolicies([{ ...policy, currency: 'EUR' }]));
  assert.throws(() => parsePricingPolicies([{ ...policy, isActive: false }]));
  assert.throws(() => parsePricingPolicies([{ ...policy, stripePriceId: 'price_secret' }]));

  const request = {
    policyKey: policy.policyKey,
    displayName: policy.displayName,
    isActive: true,
    curatorProMonthlyPriceMinor: policy.curatorProMonthlyPriceMinor,
    currency: policy.currency,
    platformFeeBps: policy.platformFeeBps,
    serviceFeeBps: policy.serviceFeeBps,
    serviceFeeFixedMinor: policy.serviceFeeFixedMinor,
    processingBorneBy: policy.processingBorneBy,
    payoutOpsFeeBps: policy.payoutOpsFeeBps,
    payoutCadence: policy.payoutCadence,
    minPayoutMinor: policy.minPayoutMinor,
  };
  assert.deepEqual(parsePricingPolicyRequest(request), request);
  assert.throws(() => parsePricingPolicyRequest({
    ...request,
    processingBorneBy: 'curator',
  }));
});

void test('assignment contracts preserve actor and effective-time audit fields', () => {
  const assignment = {
    id: 'cfa_assignment',
    curatorProfileId: curator.id,
    policyId: policy.id,
    policyKey: policy.policyKey,
    policyVersion: policy.version,
    policyDisplayName: policy.displayName,
    assignedByUserId: 'e17f5f4f-8d0c-46e4-abac-90652a50b06f',
    assignedByUsername: 'operator',
    reason: 'Launch cohort rate.',
    effectiveAtUtc: timestamp,
    createdAtUtc: timestamp,
  };
  assert.deepEqual(parsePricingAssignments([assignment]), [assignment]);
  assert.throws(() => parsePricingAssignments([{ ...assignment, providerCustomerId: 'cus_secret' }]));

  const request = {
    curatorProfileId: curator.id,
    policyId: policy.id,
    effectiveAtUtc: null,
    reason: 'Immediate assignment.',
  };
  assert.deepEqual(parsePricingAssignmentRequest(request), request);
  assert.throws(() => parsePricingAssignmentRequest({ ...request, reason: ' ' }));
});

void test('decimal inputs convert to exact minor units and basis points', () => {
  assert.equal(decimalToHundredths('19.99'), 1_999);
  assert.equal(decimalToHundredths('0.5'), 50);
  assert.equal(decimalToHundredths('12'), 1_200);
  assert.throws(() => decimalToHundredths('-1'));
  assert.throws(() => decimalToHundredths('1.234'));
  assert.throws(() => decimalToHundredths('not-a-number'));
});

void test('internal client sends authenticated no-store requests and parses responses', async (t) => {
  const calls: Array<{ init?: RequestInit; input: string | URL | Request }> = [];
  const controller = new AbortController();
  const createdPolicy = { ...policy, id: 'msf_created', isDefault: false, defaultEffectiveAtUtc: null };
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ input, init });
    const url = input instanceof Request ? input.url : input.toString();
    return new Response(JSON.stringify(url.endsWith('/curators') ? [curator] : createdPolicy));
  });
  const request = parsePricingPolicyRequest({
    policyKey: policy.policyKey,
    displayName: policy.displayName,
    isActive: true,
    curatorProMonthlyPriceMinor: policy.curatorProMonthlyPriceMinor,
    currency: policy.currency,
    platformFeeBps: policy.platformFeeBps,
    serviceFeeBps: policy.serviceFeeBps,
    serviceFeeFixedMinor: policy.serviceFeeFixedMinor,
    processingBorneBy: policy.processingBorneBy,
    payoutOpsFeeBps: policy.payoutOpsFeeBps,
    payoutCadence: policy.payoutCadence,
    minPayoutMinor: policy.minPayoutMinor,
  });

  assert.deepEqual(await fetchInternalCurators(undefined, controller.signal), [curator]);
  assert.deepEqual(await createPricingPolicy(request), createdPolicy);
  assert.deepEqual(calls.map(({ input, init }) => ({
    body: init?.body,
    cache: init?.cache,
    contentType: new Headers(init?.headers).get('Content-Type'),
    credentials: init?.credentials,
    method: init?.method,
    signal: init?.signal,
    url: input,
  })), [
    {
      body: undefined,
      cache: 'no-store',
      contentType: null,
      credentials: 'include',
      method: undefined,
      signal: controller.signal,
      url: '/api/v1/internal/curators',
    },
    {
      body: JSON.stringify(request),
      cache: 'no-store',
      contentType: 'application/json',
      credentials: 'include',
      method: 'POST',
      signal: undefined,
      url: '/api/v1/internal/memberships/pricing-policies',
    },
  ]);
});

void test('internal client rejects non-success and malformed responses', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ message: 'Pricing service unavailable.' }), { status: 503 }));

  await assert.rejects(fetchInternalCurators(), /Pricing service unavailable/);
  fetchMock.mock.mockImplementation(async () =>
    new Response(JSON.stringify([{ ...curator, stripeAccountId: 'acct_secret' }])));
  await assert.rejects(fetchInternalCurators(), /Unrecognized key/);
});

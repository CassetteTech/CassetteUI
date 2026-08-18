/** Covers public-page privacy invariants plus curator profile and payout API contracts. */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CuratorPageError,
  createCuratorProfile,
  fetchCuratorPayoutAccount,
  fetchCuratorPage,
  fetchOwnCuratorProfile,
  formatCuratorPlanPrice,
  parseCuratorPage,
  parseCuratorPayoutAccount,
  parseCuratorPayoutOnboarding,
  parseCuratorProfile,
  startCuratorPayoutOnboarding,
  updateCuratorProfile,
  type CuratorProfileRequest,
} from '../curator';

function fullPost() {
  return {
    postId: 'pst_public',
    elementType: 'Track',
    createdAt: '2026-08-16T12:00:00Z',
    username: 'selector',
    accountType: 'Regular',
    title: 'Open track',
    subtitle: 'Artist',
    imageUrl: 'https://images.example/open.jpg',
    description: 'Public notes',
    privacy: 'public',
    redirectPostId: 'pst_public',
  };
}

function pagePayload(leakLockedContent = false) {
  const lockedPost = leakLockedContent
    ? {
        kind: 'locked',
        postId: 'pst_locked',
        createdAt: '2026-08-15T12:00:00Z',
        title: 'This must never render',
      }
    : { kind: 'locked', postId: 'pst_locked', createdAt: '2026-08-15T12:00:00Z' };

  return {
    curator: {
      id: 'cpr_selector',
      username: 'selector',
      displayName: 'The Selector',
      bio: 'Music profile bio',
      avatarUrl: null,
      profileLinks: ['https://example.com/selector'],
      accountType: 'Regular',
      headline: 'Rare records, every week.',
      about: 'Independent selections.',
      declaredGenres: ['Soul'],
      declaredPlatforms: ['Spotify'],
      curatorSinceUtc: '2026-08-01T00:00:00Z',
      vettingEvidence: 'must not cross the UI boundary',
    },
    membership: {
      planId: 'mpl_selector',
      name: 'Selector Club',
      description: 'Weekly notes.',
      amountMinor: 500,
      serviceFeeMinor: 50,
      annualAmountMinor: 5000,
      annualServiceFeeMinor: 500,
      currency: 'USD',
      benefits: [{
        featureKey: 'member_posts',
        name: 'Member posts',
        description: 'Unlock every selection.',
      }],
      stripeProductId: 'must_not_survive',
    },
    viewer: { isOwner: false, isMember: false, hasMemberBadge: false },
    posts: {
      items: [
        { kind: 'post', post: fullPost() },
        lockedPost,
      ],
      totalItems: 2,
      page: 1,
      pageSize: 20,
    },
  };
}

function profilePayload() {
  return {
    id: 'cpr_0123456789AbCdEfGhIjK',
    status: 'active',
    headline: 'Rare records, every week.',
    about: 'Independent selections.',
    declaredGenres: ['Soul'],
    declaredPlatforms: ['Spotify'],
    suspensionReason: null,
    createdAtUtc: '2026-08-01T00:00:00Z',
    statusChangedAtUtc: '2026-08-01T00:00:00Z',
  };
}

void test('parses the curator page union and strips internal additive fields', () => {
  const parsed = parseCuratorPage(pagePayload());

  assert.equal(parsed.posts.items[0]?.kind, 'post');
  assert.equal(parsed.posts.items[1]?.kind, 'locked');
  assert.equal('vettingEvidence' in parsed.curator, false);
  assert.equal(parsed.membership && 'stripeProductId' in parsed.membership, false);
});

void test('rejects any content attached to a locked post', () => {
  assert.throws(() => parseCuratorPage(pagePayload(true)), /Unrecognized key/);
});

void test('rejects a partial annual price', () => {
  const payload = pagePayload();

  assert.throws(() => parseCuratorPage({
    ...payload,
    membership: { ...payload.membership, annualServiceFeeMinor: null },
  }), /Annual amount and service fee/);
});

void test('rejects subscriber post state without an active membership plan', () => {
  const payload = pagePayload();

  assert.throws(() => parseCuratorPage({
    ...payload,
    membership: null,
  }), /Subscriber posts require an active membership plan/);
});

void test('rejects subscriber post bodies for an unentitled viewer', () => {
  const payload = pagePayload();

  assert.throws(() => parseCuratorPage({
    ...payload,
    posts: {
      ...payload.posts,
      items: [{ kind: 'post', post: { ...fullPost(), privacy: 'subscriber' } }],
    },
  }), /Subscriber post bodies require an entitled viewer/);
});

void test('rejects unsafe membership totals', () => {
  const payload = pagePayload();

  assert.throws(() => parseCuratorPage({
    ...payload,
    membership: {
      ...payload.membership,
      amountMinor: Number.MAX_SAFE_INTEGER,
      serviceFeeMinor: 1,
    },
  }), /safe money range/);
});

void test('preserves a not-found response as a typed 404', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }));

  await assert.rejects(
    fetchCuratorPage('missing', 1, 20),
    (error) => error instanceof CuratorPageError && error.status === 404,
  );
});

void test('parses the strict self-profile contract and strips the transport correlation ID', () => {
  const profile = profilePayload();
  const parsed = parseCuratorProfile({
    ...profile,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });

  assert.equal(parsed.id, profile.id);
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseCuratorProfile({ ...profile, eligibilityStatus: 'approved' }));
  assert.throws(() => parseCuratorProfile({ ...profile, status: 'pending_review' }));
});

void test('returns null when the authenticated user has no curator profile', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }));

  assert.equal(await fetchOwnCuratorProfile(), null);
});

void test('creates and updates the authenticated curator profile with the public request only', async (t) => {
  const calls: Array<{ init?: RequestInit; input: string | URL | Request }> = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ init, input });
      return new Response(JSON.stringify({
        ...profilePayload(),
        correlationId: '44444444-4444-4444-8444-444444444444',
      }));
    },
  );
  const request: CuratorProfileRequest = {
    headline: 'Rare records, every week.',
    about: null,
    declaredGenres: ['Soul'],
    declaredPlatforms: ['Spotify'],
  };

  await createCuratorProfile(request);
  await updateCuratorProfile(request);

  assert.deepEqual(
    calls.map(({ init, input }) => ({
      body: init?.body,
      credentials: init?.credentials,
      method: init?.method,
      url: input,
    })),
    [
      {
        body: JSON.stringify(request),
        credentials: 'include',
        method: 'POST',
        url: '/api/v1/curators',
      },
      {
        body: JSON.stringify(request),
        credentials: 'include',
        method: 'PUT',
        url: '/api/v1/curators/me',
      },
    ],
  );
});

void test('parses payout status and secure onboarding without provider identifiers', () => {
  const account = {
    onboardingStatus: 'onboarding',
    transfersCapabilityStatus: 'pending',
    requirementsDue: true,
    capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    correlationId: '44444444-4444-4444-8444-444444444444',
  };
  const parsed = parseCuratorPayoutAccount(account);
  assert.equal(parsed.onboardingStatus, 'onboarding');
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseCuratorPayoutAccount({ ...account, stripeAccountId: 'acct_secret' }));

  const onboarding = parseCuratorPayoutOnboarding({
    onboardingUrl: 'https://connect.stripe.test/setup',
    expiresAtUtc: '2026-08-16T13:00:00Z',
    account,
    correlationId: '55555555-5555-4555-8555-555555555555',
  });
  assert.equal(onboarding.onboardingUrl, 'https://connect.stripe.test/setup');
  assert.throws(() => parseCuratorPayoutOnboarding({
    onboardingUrl: 'http://connect.stripe.test/setup',
    expiresAtUtc: '2026-08-16T13:00:00Z',
    account,
  }));
});

void test('loads payout status and starts onboarding through authenticated endpoints', async (t) => {
  const calls: Array<{ init?: RequestInit; input: string | URL | Request }> = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ init, input });
      return new Response(JSON.stringify(calls.length === 1
        ? {
            onboardingStatus: 'created',
            transfersCapabilityStatus: null,
            requirementsDue: false,
            capabilityCheckedAtUtc: null,
          }
        : {
            onboardingUrl: 'https://connect.stripe.test/setup',
            expiresAtUtc: '2026-08-16T13:00:00Z',
            account: {
              onboardingStatus: 'onboarding',
              transfersCapabilityStatus: null,
              requirementsDue: false,
              capabilityCheckedAtUtc: null,
            },
          }));
    },
  );

  await fetchCuratorPayoutAccount(true);
  await startCuratorPayoutOnboarding();

  assert.deepEqual(calls.map(({ init, input }) => ({
    cache: init?.cache,
    credentials: init?.credentials,
    method: init?.method,
    url: input,
  })), [
    {
      cache: 'no-store',
      credentials: 'include',
      method: undefined,
      url: '/api/v1/curators/payout-account?refresh=true',
    },
    {
      cache: undefined,
      credentials: 'include',
      method: 'POST',
      url: '/api/v1/curators/payout-account',
    },
  ]);
});

void test('returns null when no payout account exists', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }));
  assert.equal(await fetchCuratorPayoutAccount(), null);
});

void test('formats the fan charge from face price plus frozen service fee', () => {
  assert.equal(formatCuratorPlanPrice(500, 50, 'USD', 'en-US'), '$5.50');
  assert.equal(formatCuratorPlanPrice(500, 0, 'USD', 'en-US'), '$5.00');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CuratorPageError,
  fetchCuratorPage,
  formatCuratorPlanPrice,
  parseCuratorPage,
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

void test('formats the fan charge from face price plus frozen service fee', () => {
  assert.equal(formatCuratorPlanPrice(500, 50, 'USD', 'en-US'), '$5.50');
  assert.equal(formatCuratorPlanPrice(500, 0, 'USD', 'en-US'), '$5.00');
});

/** Covers the membership Checkout request and the Join links that carry the post a fan joined from. */

import './browser-service-environment';
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { apiService } from '../api';
import { curatorMembershipHref, sourcePostIdOf } from '../membership';

const sourcePostId = 'p_20261001120000_abcdefghij0123';

const checkout = {
  membershipSubscriptionId: 'msb_0123456789AbCdEfGhIjK',
  planId: 'mpl_0123456789AbCdEfGhIjK',
  billingInterval: 'month',
  status: 'incomplete',
  checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test',
  faceAmountMinor: 500,
  serviceFeeMinor: 50,
  totalAmountMinor: 550,
  currency: 'USD',
};

function recordCheckoutBodies(t: TestContext) {
  const bodies: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    assert.match(url, /\/api\/v1\/memberships\/checkout$/);
    bodies.push(JSON.parse(await new Response(init?.body).text()));
    return new Response(JSON.stringify(checkout), { status: 200 });
  });
  return bodies;
}

void test('Checkout sends the source post when a Join came from a post', async (t) => {
  const bodies = recordCheckoutBodies(t);

  await apiService.createMembershipCheckout(checkout.planId, 'month', sourcePostId);

  assert.deepEqual(bodies, [{ planId: checkout.planId, interval: 'month', sourcePostId }]);
});

void test('Checkout from the curator page sends no source post', async (t) => {
  const bodies = recordCheckoutBodies(t);

  await apiService.createMembershipCheckout(checkout.planId, 'year');

  assert.deepEqual(bodies, [{ planId: checkout.planId, interval: 'year' }]);
});

void test('Checkout drops a malformed source post instead of sending it', async (t) => {
  const bodies = recordCheckoutBodies(t);

  await apiService.createMembershipCheckout(checkout.planId, 'month', 'https://cassette.tech/post/p_1');

  assert.deepEqual(bodies, [{ planId: checkout.planId, interval: 'month' }]);
});

void test('only a well-formed post id is a source post', () => {
  assert.equal(sourcePostIdOf(sourcePostId), sourcePostId);
  for (const value of [null, undefined, '', 'p_bad', `${sourcePostId}x`, 'P_20261001120000_ABCDEFGHIJ0123']) {
    assert.equal(sourcePostIdOf(value), undefined);
  }
});

void test('a Join link carries the post it came from to the curator offer', () => {
  assert.equal(
    curatorMembershipHref('night curator', sourcePostId),
    `/profile/night%20curator?source_post=${sourcePostId}#membership-offer`,
  );
  assert.equal(curatorMembershipHref('night-curator'), '/profile/night-curator#membership-offer');
  assert.equal(curatorMembershipHref('night-curator', 'p_bad'), '/profile/night-curator#membership-offer');
});

void test('a Join from a post asks the curator page for its monthly confirmation', () => {
  assert.equal(
    curatorMembershipHref('night-curator', sourcePostId, true),
    `/profile/night-curator?intent=join&interval=month&source_post=${sourcePostId}#membership-offer`,
  );
  assert.equal(
    curatorMembershipHref('night-curator', 'p_bad', true),
    '/profile/night-curator?intent=join&interval=month#membership-offer',
  );
});
